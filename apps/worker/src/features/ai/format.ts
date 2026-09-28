// Telegram HTML for tutor replies and writing feedback. Everything from the model is escaped.
import type { LearnerProfile, Mistake, TutorReply, WritingFeedback } from "@el/llm";

export const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Telegram's limit is 4096 characters; cut the raw parts (never the HTML, which would break the tags).
const cut = (s: string, n: number) => (s.length > n ? s.slice(0, n) + "…" : s);
const MAX_ITEMS = 10;

function corrections(list: Mistake[]): string[] {
  return list.slice(0, MAX_ITEMS).flatMap((m) => [
    `• <s>${esc(cut(m.original, 200))}</s> → <b>${esc(cut(m.corrected, 200))}</b>`,
    ...(m.explanation ? [`  <i>${esc(cut(m.explanation, 200))}</i>`] : []),
  ]);
}

export function formatTutor(r: TutorReply): string {
  const lines = [esc(cut(r.reply, 1200))];
  if (r.corrections.length) lines.push("", "✏️ <b>Исправления</b>", ...corrections(r.corrections));
  return lines.join("\n");
}

export function formatFeedback(p: LearnerProfile, f: WritingFeedback): string {
  if (!f.is_target_language) return `🤔 Не похоже на текст на языке ${p.flag}. Для чата с тьютором: /tutor`;
  const lines = [`📝 <b>Проверка ${p.flag}</b>`];
  if (f.mistakes.length) {
    lines.push(`<b>${esc(cut(f.corrected, 1200))}</b>`, "", "✏️ <b>Исправления</b>", ...corrections(f.mistakes));
  } else {
    lines.push("✅ Ошибок не нашёл.");
  }
  if (f.comment) lines.push("", `💬 ${esc(cut(f.comment, 300))}`);
  return lines.join("\n");
}
