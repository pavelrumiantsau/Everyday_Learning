import type { Smoke } from "./context.ts";
import { FAKE_TRANSCRIPT } from "./fake-llm.ts";

// AI: /tutor session, voice → Whisper → tutor, /stop, writing feedback, fallback Groq → Gemini on 503, usage log.
// AI replies are sent from waitUntil after the webhook answered, so the checks wait for them.
export default async function (t: Smoke) {
  const { post, msg, calls, check, llm, OWNER } = t;
  const sent = () => calls.filter((c) => c.method === "sendMessage").map((c) => String(c.body.text));
  const waitFor = async (pred: () => boolean, ms = 10_000) => {
    for (const end = Date.now() + ms; Date.now() < end; await new Promise((r) => setTimeout(r, 100))) if (pred()) return true;
    return false;
  };
  const chatBodies = () => llm.requests.filter((r) => r.path.endsWith("/chat/completions")).map((r) => JSON.parse(r.body));

  // --- /tutor starts a session; the tutor opens the conversation ---
  calls.length = 0;
  llm.requests.length = 0;
  const res = await post(msg("/tutor lt kelionės"));
  check(res.ok && sent().some((s) => s.includes("Тьютор: литовский") && s.includes("kelionės")), "/tutor lt <topic> starts a Lithuanian session");
  check(await waitFor(() => sent().some((s) => s.includes("FAKE-LLM Labas"))), "the tutor opens the conversation (fake LLM answer arrives via waitUntil)");
  const opening = chatBodies()[0];
  check(!!opening?.messages[0]?.content.includes("Lithuanian") && opening.messages[0].content.includes("kelionės") && opening.response_format?.type === "json_object",
    "the tutor prompt names the language and topic and asks for JSON");

  // --- a text in the session gets a reply + corrections ---
  calls.length = 0;
  llm.requests.length = 0;
  await post(msg("Aš eina į parduotuvę"));
  check(await waitFor(() => sent().some((s) => s.includes("FAKE-LLM Labas") && s.includes("✏️ <b>Исправления</b>") && s.includes("einu"))),
    "a message in the session gets the tutor's reply with corrections");
  check(calls.some((c) => c.method === "sendChatAction" && c.body.action === "typing"), "shows typing… while waiting");
  const turn = chatBodies()[0];
  check(turn?.messages.length === 4 && turn.messages.at(-1).content === "Aš eina į parduotuvę" && turn.messages[2].role === "assistant",
    "previous turns are sent as context");

  // --- a voice message: getFile → download → transcription → tutor reply ---
  calls.length = 0;
  llm.requests.length = 0;
  t.fakeResults.getFile = { file_id: "voice-1", file_path: "voice/file_1.oga" };
  await post({ update_id: Date.now(), message: { message_id: 2, from: { id: Number(OWNER) }, chat: { id: Number(OWNER) }, voice: { file_id: "voice-1", duration: 3, mime_type: "audio/ogg" } } });
  check(await waitFor(() => sent().some((s) => s.includes("FAKE-LLM Labas"))), "a voice message gets a tutor reply");
  const texts = sent();
  const heard = texts.findIndex((s) => s.includes(`🎙 Я услышал: <i>${FAKE_TRANSCRIPT}</i>`));
  check(heard === 0, "the transcript is shown first");
  check(calls.some((c) => c.method === "getFile") && calls.some((c) => c.method === "downloadFile" && c.body.path.endsWith("/voice/file_1.oga")), "the voice file is fetched via getFile + download");
  const stt = llm.requests.find((r) => r.path.endsWith("/audio/transcriptions"));
  check(!!stt && stt.body.includes("whisper-large-v3") && /name="language"\r\n\r\nlt/.test(stt.body), "audio goes to Whisper (whisper-large-v3) with the session language");
  check(chatBodies()[0]?.messages.at(-1)?.content === FAKE_TRANSCRIPT, "the transcript is what the tutor answers");
  delete t.fakeResults.getFile;

  // --- /stop ends the session ---
  calls.length = 0;
  await post(msg("/stop"));
  check(sent().some((s) => s.includes("Чат закончен (2 сообщ.)")), "/stop ends the session");
  calls.length = 0;
  await post(msg("/stop"));
  check(sent().some((s) => s.includes("не запущен")), "/stop without a session says so");

  // --- outside a session: Lithuanian text gets writing feedback ---
  calls.length = 0;
  llm.requests.length = 0;
  await post(msg("Vakar aš eina į darbą ir labai pavargau"));
  check(await waitFor(() => sent().some((s) => s.includes("📝 <b>Проверка 🇱🇹</b>") && s.includes("FAKE-LLM Aš einu namo."))), "Lithuanian text outside a session gets writing feedback");
  check(chatBodies()[0]?.messages[0]?.content.includes("Russian"), "Lithuanian mistakes are explained in Russian");

  // --- Groq overloaded (503 twice) → Gemini answers ---
  calls.length = 0;
  llm.requests.length = 0;
  llm.fail.groq = 2;
  await post(msg("¿Dónde está la estación? Yo soy turista"));
  check(await waitFor(() => sent().some((s) => s.includes("Проверка 🇪🇸") && s.includes("FAKE-GEMINI"))), "fallback: Groq returns 503 → the answer comes from Gemini");
  check(llm.requests.filter((r) => r.provider === "groq").length === 2 && llm.requests.some((r) => r.provider === "google"), "Groq was retried once before falling back");
  const gem = llm.requests.find((r) => r.provider === "google");
  check(!!gem && JSON.parse(gem.body).systemInstruction.parts[0].text.includes("English"), "Spanish mistakes are explained in English");

  // --- not a target language: left to other handlers ---
  calls.length = 0;
  llm.requests.length = 0;
  await post(msg("Привет, как дела?"));
  await new Promise((r) => setTimeout(r, 300));
  check(llm.requests.length === 0 && sent().some((s) => s.includes("Не понял")), "Russian text isn't sent to the AI");

  // --- usage log ---
  calls.length = 0;
  await post(msg("/ai"));
  const usage = sent()[0] ?? "";
  check(usage.includes("groq openai/gpt-oss-120b") && usage.includes("google gemini") && usage.includes("whisper-large-v3") && usage.includes("Ошибок сохранено: 4"),
    "/ai shows this month's usage per provider/model and saved mistakes");
}
