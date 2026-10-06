// Fake AI providers for the smoke test, served by the fake Telegram server on the same port:
//   /openai/v1/chat/completions, /openai/v1/audio/transcriptions  (Groq, OpenAI-compatible)
//   /gemini/v1beta/models/<model>:generateContent                  (Gemini)
//   /file/bot<token>/<path>                                        (Telegram file download)
// The Worker is pointed here with LLM_BASE_URL_<PROVIDER> vars. No real API is ever called.
import type { ServerResponse } from "node:http";
import type { FakeLlmState, TgCall } from "./context.ts";

/** One canned JSON answer that fits both the tutor and the writing-feedback schema. */
const answer = (tag: string) =>
  JSON.stringify({
    reply: `${tag} Labas! Kaip sekasi?`,
    corrections: [{ original: "Aš eina", corrected: "Aš einu", explanation: "1-е лицо ед. ч.: einu" }],
    is_target_language: true,
    corrected: `${tag} Aš einu namo.`,
    mistakes: [{ original: "Aš eina", corrected: "Aš einu", explanation: "1-е лицо ед. ч.: einu" }],
    comment: "Хорошо!",
    // word_lookup (reading mode)
    lemma: "euras",
    pos: "noun",
    gender: "m",
    gen: "euro",
    meaning: "евро",
    // reading_questions (own texts)
    questions: [0, 1, 2].map((i) => ({ q: `Klausimas ${i + 1}?`, options: ["Taip", "Ne", "Nežinau"], answer: i })),
  });

export const FAKE_TRANSCRIPT = "Aš eina namo";

export const fakeLlmVars = (port: number) => ({
  GROQ_API_KEY: "test-groq",
  GEMINI_API_KEY: "test-gemini",
  LLM_BASE_URL_GROQ: `http://127.0.0.1:${port}/openai/v1`,
  LLM_BASE_URL_GOOGLE: `http://127.0.0.1:${port}/gemini/v1beta`,
});

export function createFakeLlm(calls: TgCall[]) {
  const state: FakeLlmState = { requests: [], fail: {} };
  const json = (res: ServerResponse, status: number, body: unknown) => {
    res.statusCode = status;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify(body));
  };

  /** Returns true when the request was for a fake LLM or a file download. */
  function handle(url: string, raw: string, res: ServerResponse): boolean {
    if (url.startsWith("/file/")) {
      calls.push({ method: "downloadFile", body: { path: url } });
      res.setHeader("content-type", "application/octet-stream");
      res.end(Buffer.from("OggS fake voice bytes"));
      return true;
    }
    const provider = url.startsWith("/openai/") ? "groq" : url.startsWith("/gemini/") ? "google" : null;
    if (!provider) return false;
    state.requests.push({ provider, path: url, body: raw });
    if ((state.fail[provider] ?? 0) > 0) {
      state.fail[provider]!--;
      json(res, 503, { error: { message: "fake overload" } });
      return true;
    }
    if (url.endsWith("/audio/transcriptions")) json(res, 200, { text: FAKE_TRANSCRIPT, duration: 2.5, language: "lithuanian" });
    else if (provider === "groq") json(res, 200, { choices: [{ message: { content: answer("FAKE-LLM") } }], usage: { prompt_tokens: 120, completion_tokens: 40 } });
    else json(res, 200, { candidates: [{ content: { parts: [{ text: answer("FAKE-GEMINI") }] } }], usageMetadata: { promptTokenCount: 110, candidatesTokenCount: 45 } });
    return true;
  }

  return { handle, state };
}
