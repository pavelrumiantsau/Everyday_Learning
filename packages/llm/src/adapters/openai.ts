// OpenAI-compatible APIs: Groq, OpenRouter, Ollama, OpenAI itself.
import { ProviderError, type Adapter, type AdapterOptions } from "../types";
import { postJson, trimSlash } from "./http";

interface ChatResponse {
  choices?: { message?: { content?: string | null }; finish_reason?: string }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

export function openaiAdapter(o: AdapterOptions): Adapter {
  const base = trimSlash(o.baseUrl);
  const auth = { authorization: `Bearer ${o.apiKey}` };
  return {
    async chat(model, req) {
      const body = {
        model,
        messages: req.messages,
        ...(req.temperature !== undefined && { temperature: req.temperature }),
        ...(req.maxTokens !== undefined && { max_tokens: req.maxTokens }),
        ...(req.json && { response_format: { type: "json_object" } }),
        ...o.extraBody,
      };
      const data = await postJson<ChatResponse>(
        `${base}/chat/completions`,
        { headers: { ...auth, "content-type": "application/json" }, body: JSON.stringify(body) },
        { fetch: o.fetch, timeoutMs: o.timeoutMs, label: "chat" },
      );
      const text = data.choices?.[0]?.message?.content ?? "";
      if (!text.trim()) throw new ProviderError(`chat: empty answer (${data.choices?.[0]?.finish_reason ?? "?"})`, 200, true);
      return { text, usage: { inputTokens: data.usage?.prompt_tokens ?? 0, outputTokens: data.usage?.completion_tokens ?? 0 } };
    },

    async transcribe(model, req) {
      const form = new FormData();
      form.append("file", req.audio, req.filename);
      form.append("model", model);
      form.append("response_format", "verbose_json"); // includes the duration, for the usage log
      form.append("temperature", "0");
      if (req.language) form.append("language", req.language);
      const data = await postJson<{ text?: string; duration?: number; language?: string }>(
        `${base}/audio/transcriptions`,
        { headers: auth, body: form },
        { fetch: o.fetch, timeoutMs: o.timeoutMs, label: "transcribe" },
      );
      return { text: (data.text ?? "").trim(), usage: { inputTokens: 0, outputTokens: 0, audioSeconds: data.duration ?? 0 }, language: data.language };
    },
  };
}
