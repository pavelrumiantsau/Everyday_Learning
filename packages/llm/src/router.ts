// The router: task name → provider chain from config; retries briefly on 429/5xx, falls back to the next provider,
// validates JSON output, guards monthly budgets of paid providers and logs usage.
import type { z } from "zod";
import { anthropicAdapter } from "./adapters/anthropic";
import { geminiAdapter } from "./adapters/gemini";
import { openaiAdapter } from "./adapters/openai";
import { parseChainEntry, type LlmConfig, type ProviderConfig } from "./config";
import { LlmError, ProviderError, type Adapter, type AdapterResult, type ChatRequest, type TranscribeRequest, type Usage } from "./types";

export interface UsageEntry {
  at: number;
  task: string;
  provider: string;
  model: string;
  ok: boolean;
  inputTokens: number;
  outputTokens: number;
  audioSeconds: number;
  costUsd: number;
  latencyMs: number;
  /** Short error summary (status + code), never request content. */
  error?: string;
}

export interface UsageStore {
  /** Estimated spend of a provider since the start of the current UTC month. */
  monthlySpend(provider: string, monthStart: number): Promise<number>;
  log(entry: UsageEntry): Promise<void>;
}

export interface RouterOptions {
  config: LlmConfig;
  /** Secrets (by `key_env`) and optional base-URL overrides `LLM_BASE_URL_<PROVIDER>` (used by the local smoke test). */
  env: Record<string, string | undefined>;
  usage?: UsageStore;
  fetch?: typeof fetch;
  /** Tests: replace a provider's adapter. */
  adapters?: Record<string, Adapter>;
  sleep?: (ms: number) => Promise<void>;
  now?: () => Date;
}

export interface RouteResult {
  text: string;
  provider: string;
  model: string;
  usage: Usage;
  costUsd: number;
  /** Speech-to-text: detected language. */
  language?: string;
}

export class InvalidOutputError extends ProviderError {
  constructor(message: string) {
    super(message, 200, true);
    this.name = "InvalidOutputError";
  }
}

export function estimateCost(p: ProviderConfig, model: string, u: Usage): number {
  const price = p.prices?.[model];
  if (!price) return 0;
  return (
    (u.inputTokens * (price.input_per_mtok ?? 0)) / 1e6 +
    (u.outputTokens * (price.output_per_mtok ?? 0)) / 1e6 +
    ((u.audioSeconds ?? 0) / 3600) * (price.per_audio_hour ?? 0)
  );
}

/** Pulls a JSON object out of a model answer (tolerates ```json fences and text around it). */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const s = fenced ? fenced[1]! : text;
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start < 0 || end <= start) throw new InvalidOutputError("no JSON object in the answer");
  try {
    return JSON.parse(s.slice(start, end + 1));
  } catch {
    throw new InvalidOutputError("answer is not valid JSON");
  }
}

export class Router {
  private readonly adapters = new Map<string, Adapter>();
  constructor(private readonly o: RouterOptions) {}

  /** Tasks and chains, for status output. */
  chain(task: string): string[] {
    return this.o.config.tasks[task] ?? [];
  }

  async chat(task: string, req: ChatRequest): Promise<RouteResult> {
    return this.run(task, (a, model) => a.chat(model, req), (r) => r);
  }

  /** Chat with a JSON answer validated against `schema`; an invalid answer counts as a retryable failure. */
  async json<S extends z.ZodType>(task: string, req: ChatRequest, schema: S): Promise<RouteResult & { output: z.infer<S> }> {
    return this.run(
      task,
      (a, model) => a.chat(model, { ...req, json: true }),
      (r) => {
        const parsed = schema.safeParse(extractJson(r.text));
        if (!parsed.success) throw new InvalidOutputError(`answer doesn't match the schema: ${parsed.error.issues[0]?.path.join(".")} ${parsed.error.issues[0]?.message}`);
        return { ...r, output: parsed.data as z.infer<S> };
      },
    );
  }

  async transcribe(task: string, req: TranscribeRequest): Promise<RouteResult> {
    return this.run(
      task,
      (a, model) => {
        if (!a.transcribe) throw new ProviderError("provider has no speech-to-text", undefined, false);
        return a.transcribe(model, req);
      },
      (r) => r,
    );
  }

  private adapter(name: string, p: ProviderConfig, key: string): Adapter {
    const custom = this.o.adapters?.[name];
    if (custom) return custom;
    let a = this.adapters.get(name);
    if (!a) {
      const opts = {
        baseUrl: this.o.env[`LLM_BASE_URL_${name.toUpperCase()}`] || p.base_url,
        apiKey: key,
        fetch: this.o.fetch,
        timeoutMs: p.timeout_ms,
        extraBody: p.extra_body,
      };
      a = p.type === "gemini" ? geminiAdapter(opts) : p.type === "anthropic" ? anthropicAdapter(opts) : openaiAdapter(opts);
      this.adapters.set(name, a);
    }
    return a;
  }

  private async run<T extends { text: string; usage: Usage }>(
    task: string,
    call: (a: Adapter, model: string) => Promise<AdapterResult>,
    accept: (r: RouteResult) => T,
  ): Promise<T> {
    const { config, env, usage } = this.o;
    const chain = config.tasks[task];
    if (!chain) throw new LlmError(`unknown LLM task "${task}"`, []);
    const now = this.o.now ?? (() => new Date());
    const sleep = this.o.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
    const attempts: string[] = [];

    for (const entry of chain) {
      const { provider, model } = parseChainEntry(entry);
      const p = config.providers[provider];
      if (!p || !p.enabled) {
        attempts.push(`${entry}: disabled`);
        continue;
      }
      const key = env[p.key_env];
      if (!key) {
        attempts.push(`${entry}: no ${p.key_env}`);
        continue;
      }
      if (p.monthly_budget_usd !== undefined && usage) {
        const d = now();
        const spent = await usage.monthlySpend(provider, Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).catch(() => 0);
        if (spent >= p.monthly_budget_usd) {
          attempts.push(`${entry}: monthly budget $${p.monthly_budget_usd} used up`);
          continue;
        }
      }
      const adapter = this.adapter(provider, p, key);

      for (let attempt = 0; attempt <= config.retries; attempt++) {
        const t0 = Date.now();
        let raw: AdapterResult | undefined;
        try {
          raw = await call(adapter, model);
          const costUsd = estimateCost(p, model, raw.usage);
          const result = accept({ text: raw.text, provider, model, usage: raw.usage, costUsd, language: raw.language });
          await this.log({ task, provider, model, ok: true, usage: raw.usage, costUsd, latencyMs: Date.now() - t0 });
          return result;
        } catch (err) {
          const e = err instanceof ProviderError ? err : new ProviderError(err instanceof Error ? err.message : String(err), undefined, false);
          // Tokens were spent even when the answer was unusable.
          const spentUsage = raw?.usage ?? { inputTokens: 0, outputTokens: 0 };
          const summary = e.message.slice(0, 120);
          await this.log({ task, provider, model, ok: false, usage: spentUsage, costUsd: estimateCost(p, model, spentUsage), latencyMs: Date.now() - t0, error: summary });
          attempts.push(`${entry}#${attempt + 1}: ${summary}`);
          if (!e.retryable) break;
          if (attempt < config.retries) await sleep(config.retry_delay_ms * (attempt + 1));
        }
      }
    }
    throw new LlmError(`all providers failed for "${task}": ${attempts.join(" | ")}`, attempts);
  }

  private async log(e: { task: string; provider: string; model: string; ok: boolean; usage: Usage; costUsd: number; latencyMs: number; error?: string }) {
    if (!this.o.usage) return;
    try {
      await this.o.usage.log({
        at: (this.o.now ?? (() => new Date()))().getTime(),
        task: e.task,
        provider: e.provider,
        model: e.model,
        ok: e.ok,
        inputTokens: e.usage.inputTokens,
        outputTokens: e.usage.outputTokens,
        audioSeconds: e.usage.audioSeconds ?? 0,
        costUsd: e.costUsd,
        latencyMs: e.latencyMs,
        error: e.error,
      });
    } catch {
      // the usage log must never break a reply
    }
  }
}
