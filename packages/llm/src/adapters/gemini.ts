// Google Gemini generateContent (https://generativelanguage.googleapis.com/v1beta).
import { ProviderError, type Adapter, type AdapterOptions } from "../types";
import { postJson, trimSlash } from "./http";

interface GenerateResponse {
  candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number };
}

export function geminiAdapter(o: AdapterOptions): Adapter {
  const base = trimSlash(o.baseUrl);
  return {
    async chat(model, req) {
      const system = req.messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
      const body = {
        ...(system && { systemInstruction: { parts: [{ text: system }] } }),
        contents: req.messages
          .filter((m) => m.role !== "system")
          .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
        generationConfig: {
          ...(req.temperature !== undefined && { temperature: req.temperature }),
          ...(req.maxTokens !== undefined && { maxOutputTokens: req.maxTokens }),
          ...(req.json && { responseMimeType: "application/json" }),
        },
        ...o.extraBody,
      };
      const data = await postJson<GenerateResponse>(
        `${base}/models/${encodeURIComponent(model)}:generateContent`,
        { headers: { "x-goog-api-key": o.apiKey, "content-type": "application/json" }, body: JSON.stringify(body) },
        { fetch: o.fetch, timeoutMs: o.timeoutMs, label: "chat" },
      );
      const cand = data.candidates?.[0];
      const text = (cand?.content?.parts ?? []).filter((p) => !p.thought).map((p) => p.text ?? "").join("");
      if (!text.trim()) throw new ProviderError(`chat: empty answer (${cand?.finishReason ?? "?"})`, 200, true);
      const u = data.usageMetadata;
      return { text, usage: { inputTokens: u?.promptTokenCount ?? 0, outputTokens: (u?.candidatesTokenCount ?? 0) + (u?.thoughtsTokenCount ?? 0) } };
    },
  };
}
