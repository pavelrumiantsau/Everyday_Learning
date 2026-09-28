import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  LlmConfig,
  LlmError,
  ProviderError,
  Router,
  detectLang,
  extractJson,
  openaiAdapter,
  geminiAdapter,
  type Adapter,
  type AdapterResult,
  type UsageEntry,
  type UsageStore,
} from "../src";

const usage = { inputTokens: 100, outputTokens: 50 };

/** A fake provider that plays back a script of results/errors and records the models it was asked for. */
function fake(script: (AdapterResult | ProviderError | string)[]): Adapter & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    async chat(model) {
      calls.push(model);
      const next = script.length > 1 ? script.shift()! : script[0]!;
      if (next instanceof ProviderError) throw next;
      return typeof next === "string" ? { text: next, usage } : next;
    },
    async transcribe(model) {
      calls.push(model);
      return { text: "labas", usage: { inputTokens: 0, outputTokens: 0, audioSeconds: 3 }, language: "lithuanian" };
    },
  };
}

const err = (status: number) => new ProviderError(`HTTP ${status}`, status, status === 429 || status >= 500);

function memoryUsage(spent: Record<string, number> = {}): UsageStore & { entries: UsageEntry[] } {
  const entries: UsageEntry[] = [];
  return {
    entries,
    async monthlySpend(p) {
      return spent[p] ?? 0;
    },
    async log(e) {
      entries.push(e);
    },
  };
}

const config = LlmConfig.parse({
  retries: 1,
  retry_delay_ms: 0,
  providers: {
    groq: { type: "openai", base_url: "https://api.groq.com/openai/v1", key_env: "GROQ_API_KEY" },
    google: { type: "gemini", base_url: "https://generativelanguage.googleapis.com/v1beta", key_env: "GEMINI_API_KEY" },
    anthropic: {
      type: "anthropic",
      base_url: "https://api.anthropic.com/v1",
      key_env: "ANTHROPIC_API_KEY",
      monthly_budget_usd: 2,
      prices: { "claude-haiku-4-5": { input_per_mtok: 1, output_per_mtok: 5 } },
    },
    off: { type: "openai", base_url: "http://localhost:11434/v1", key_env: "OFF_KEY", enabled: false },
  },
  tasks: {
    chat: ["groq:big", "google:flash"],
    paid: ["anthropic:claude-haiku-4-5", "groq:big"],
    skip: ["off:x", "google:flash"],
    stt: ["groq:whisper-large-v3"],
  },
});
const env = { GROQ_API_KEY: "g", GEMINI_API_KEY: "m", ANTHROPIC_API_KEY: "a", OFF_KEY: "o" };

describe("config", () => {
  it("rejects chains that name unknown providers", () => {
    const r = LlmConfig.safeParse({ providers: {}, tasks: { chat: ["nope:model"] } });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toMatch(/unknown provider "nope"/);
  });
  it("fills in defaults", () => {
    const c = LlmConfig.parse({ providers: { groq: { type: "openai", base_url: "https://x.y/v1", key_env: "K" } }, tasks: { a: ["groq:m"] } });
    expect(c.retries).toBe(1);
    expect(c.providers.groq!.enabled).toBe(true);
  });
});

describe("router", () => {
  it("answers from the first provider when it works", async () => {
    const groq = fake(["hello"]), google = fake(["hola"]);
    const u = memoryUsage();
    const r = await new Router({ config, env, adapters: { groq, google }, usage: u }).chat("chat", { messages: [{ role: "user", content: "hi" }] });
    expect(r).toMatchObject({ text: "hello", provider: "groq", model: "big", usage });
    expect(google.calls).toEqual([]);
    expect(u.entries).toMatchObject([{ task: "chat", provider: "groq", ok: true, inputTokens: 100 }]);
  });

  it("retries once on 503, then falls back to the next provider in order", async () => {
    const groq = fake([err(503)]), google = fake(["fallback"]);
    const slept: number[] = [];
    const u = memoryUsage();
    const r = await new Router({ config, env, adapters: { groq, google }, usage: u, sleep: async (ms) => void slept.push(ms) }).chat("chat", { messages: [] });
    expect(r.provider).toBe("google");
    expect(r.text).toBe("fallback");
    expect(groq.calls).toEqual(["big", "big"]); // 1 try + 1 retry
    expect(slept).toHaveLength(1);
    expect(u.entries.map((e) => [e.provider, e.ok])).toEqual([["groq", false], ["groq", false], ["google", true]]);
    expect(u.entries[0]!.error).toMatch(/503/);
  });

  it("recovers on the retry after a 429", async () => {
    const groq = fake([err(429), "second time lucky"]), google = fake(["no"]);
    const r = await new Router({ config, env, adapters: { groq, google }, sleep: async () => {} }).chat("chat", { messages: [] });
    expect(r).toMatchObject({ provider: "groq", text: "second time lucky" });
    expect(google.calls).toEqual([]);
  });

  it("doesn't retry non-retryable errors (401) but still falls back", async () => {
    const groq = fake([err(401)]), google = fake(["ok"]);
    const r = await new Router({ config, env, adapters: { groq, google }, sleep: async () => {} }).chat("chat", { messages: [] });
    expect(groq.calls).toHaveLength(1);
    expect(r.provider).toBe("google");
  });

  it("throws LlmError listing every attempt when all providers fail", async () => {
    const groq = fake([err(500)]), google = fake([err(503)]);
    const p = new Router({ config, env, adapters: { groq, google }, sleep: async () => {} }).chat("chat", { messages: [] });
    await expect(p).rejects.toBeInstanceOf(LlmError);
    await expect(p).rejects.toThrow(/groq:big#1.*groq:big#2.*google:flash#1.*google:flash#2/);
  });

  it("skips disabled providers and providers without a key", async () => {
    const off = fake(["never"]), google = fake(["g"]), groq = fake(["never"]);
    const r1 = await new Router({ config, env, adapters: { off, google } }).chat("skip", { messages: [] });
    expect(off.calls).toEqual([]);
    expect(r1.provider).toBe("google");
    const r2 = await new Router({ config, env: { GEMINI_API_KEY: "m" }, adapters: { groq, google } }).chat("chat", { messages: [] });
    expect(groq.calls).toEqual([]);
    expect(r2.provider).toBe("google");
  });

  it("budget guard: skips a paid provider once its monthly estimate is used up", async () => {
    const anthropic = fake(["claude"]), groq = fake(["groq"]);
    const under = await new Router({ config, env, adapters: { anthropic, groq }, usage: memoryUsage({ anthropic: 1.99 }) }).chat("paid", { messages: [] });
    expect(under.provider).toBe("anthropic");
    expect(under.costUsd).toBeCloseTo((100 * 1 + 50 * 5) / 1e6);
    const over = await new Router({ config, env, adapters: { anthropic, groq }, usage: memoryUsage({ anthropic: 2 }) }).chat("paid", { messages: [] });
    expect(over.provider).toBe("groq");
    expect(anthropic.calls).toHaveLength(1);
  });

  it("json(): validates with zod, retries on invalid JSON, falls back when still invalid", async () => {
    const schema = z.object({ reply: z.string(), n: z.number() });
    // groq: invalid JSON twice → google: fenced valid JSON
    const groq = fake(["not json at all", '{"reply": "x"}']), google = fake(['```json\n{"reply":"labas","n":2}\n```']);
    const u = memoryUsage();
    const r = await new Router({ config, env, adapters: { groq, google }, usage: u, sleep: async () => {} }).json("chat", { messages: [] }, schema);
    expect(r.output).toEqual({ reply: "labas", n: 2 });
    expect(r.provider).toBe("google");
    expect(groq.calls).toHaveLength(2);
    expect(u.entries[1]!.error).toMatch(/schema/);
    expect(u.entries[1]!.inputTokens).toBe(100); // tokens of an unusable answer are still logged
  });

  it("json(): a valid answer on the retry is accepted", async () => {
    const groq = fake(["{oops", '{"reply":"ok","n":1}']);
    const r = await new Router({ config, env, adapters: { groq }, sleep: async () => {} }).json("chat", { messages: [] }, z.object({ reply: z.string(), n: z.number() }));
    expect(r).toMatchObject({ provider: "groq", output: { reply: "ok", n: 1 } });
  });

  it("transcribe(): uses the adapter's speech-to-text and logs audio seconds", async () => {
    const groq = fake([""]);
    const u = memoryUsage();
    const r = await new Router({ config, env, adapters: { groq }, usage: u }).transcribe("stt", { audio: new Blob([new Uint8Array(4)]), filename: "v.ogg" });
    expect(r).toMatchObject({ text: "labas", language: "lithuanian", model: "whisper-large-v3" });
    expect(u.entries[0]!.audioSeconds).toBe(3);
  });

  it("unknown task → LlmError", async () => {
    await expect(new Router({ config, env }).chat("nope", { messages: [] })).rejects.toThrow(/unknown LLM task/);
  });
});

describe("adapters (with a fake fetch)", () => {
  it("openai-compatible: sends bearer auth + json mode, honours base URL; errors are retryable on 5xx", async () => {
    const seen: { url: string; init: RequestInit }[] = [];
    const f = (async (url: string, init: RequestInit) => {
      seen.push({ url, init });
      if (seen.length === 2) return new Response("overloaded", { status: 503 });
      return Response.json({ choices: [{ message: { content: "{}" } }], usage: { prompt_tokens: 7, completion_tokens: 3 } });
    }) as unknown as typeof fetch;
    const a = openaiAdapter({ baseUrl: "http://fake/openai/v1/", apiKey: "k", fetch: f, extraBody: { reasoning_effort: "low" } });
    const r = await a.chat("m", { messages: [{ role: "user", content: "x" }], json: true });
    expect(r.usage).toEqual({ inputTokens: 7, outputTokens: 3 });
    expect(seen[0]!.url).toBe("http://fake/openai/v1/chat/completions");
    expect((seen[0]!.init.headers as Record<string, string>).authorization).toBe("Bearer k");
    expect(JSON.parse(seen[0]!.init.body as string)).toMatchObject({ model: "m", response_format: { type: "json_object" }, reasoning_effort: "low" });
    const e = await a.chat("m", { messages: [] }).catch((x) => x);
    expect(e).toBeInstanceOf(ProviderError);
    expect(e).toMatchObject({ status: 503, retryable: true });
    expect(e.message).not.toContain("k"); // never the key
  });

  it("gemini: maps system/assistant roles and reads usage", async () => {
    let body: any;
    const f = (async (_url: string, init: RequestInit) => {
      body = JSON.parse(init.body as string);
      return Response.json({ candidates: [{ content: { parts: [{ text: "ats" }] } }], usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 2 } });
    }) as unknown as typeof fetch;
    const r = await geminiAdapter({ baseUrl: "http://fake/v1beta", apiKey: "k", fetch: f }).chat("g", {
      messages: [{ role: "system", content: "S" }, { role: "user", content: "u" }, { role: "assistant", content: "a" }],
      json: true,
    });
    expect(r).toEqual({ text: "ats", usage: { inputTokens: 5, outputTokens: 2 } });
    expect(body.systemInstruction.parts[0].text).toBe("S");
    expect(body.contents.map((c: any) => c.role)).toEqual(["user", "model"]);
    expect(body.generationConfig.responseMimeType).toBe("application/json");
  });
});

describe("helpers", () => {
  it("extractJson tolerates fences and surrounding text", () => {
    expect(extractJson('Sure! {"a":1} hope it helps')).toEqual({ a: 1 });
    expect(() => extractJson("nothing")).toThrow();
  });

  it("detectLang tells Lithuanian and Spanish from Russian and English", () => {
    expect(detectLang("Aš vakar ėjau į parduotuvę ir nupirkau duonos")).toBe("lt");
    expect(detectLang("Labas, kaip tu gyveni?")).toBe("lt");
    expect(detectLang("Yo soy de Bielorrusia y hablo un poco de español")).toBe("es");
    expect(detectLang("¿Dónde está la estación?")).toBe("es");
    expect(detectLang("Привет, как дела?")).toBeNull();
    expect(detectLang("What is the plan for today?")).toBeNull();
    expect(detectLang("ok")).toBeNull();
  });
});
