// Anthropic Messages API (paid API key only — a Claude subscription can't be used here).
import { ProviderError, type Adapter, type AdapterOptions } from "../types";
import { postJson, trimSlash } from "./http";

interface MessagesResponse {
  content?: { type: string; text?: string }[];
  stop_reason?: string;
  usage?: { input_tokens?: number; output_tokens?: number };
}

export function anthropicAdapter(o: AdapterOptions): Adapter {
  const base = trimSlash(o.baseUrl);
  return {
    async chat(model, req) {
      let system = req.messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
      // No JSON mode flag on the Messages API: ask for it in the system prompt; the router validates the result.
      if (req.json) system += "\n\nAnswer with a single JSON object only, no other text.";
      const body = {
        model,
        max_tokens: req.maxTokens ?? 2048,
        ...(system && { system }),
        messages: req.messages.filter((m) => m.role !== "system").map((m) => ({ role: m.role, content: m.content })),
        ...(req.temperature !== undefined && { temperature: req.temperature }),
        ...o.extraBody,
      };
      const data = await postJson<MessagesResponse>(
        `${base}/messages`,
        {
          headers: { "x-api-key": o.apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
          body: JSON.stringify(body),
        },
        { fetch: o.fetch, timeoutMs: o.timeoutMs, label: "chat" },
      );
      if (data.stop_reason === "refusal") throw new ProviderError("chat: refused", 200, false);
      const text = (data.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("");
      if (!text.trim()) throw new ProviderError(`chat: empty answer (${data.stop_reason ?? "?"})`, 200, true);
      return { text, usage: { inputTokens: data.usage?.input_tokens ?? 0, outputTokens: data.usage?.output_tokens ?? 0 } };
    },
  };
}
