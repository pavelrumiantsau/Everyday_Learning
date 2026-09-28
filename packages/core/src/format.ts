import { grammarLabel } from "./labels";
import { langOf, meaningOf, principalForms, type Item, type Lang } from "./schema";

const FLAG: Record<Lang, string> = { lt: "🇱🇹", es: "🇪🇸", fr: "🇫🇷" };

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Telegram HTML card for a newly introduced item. */
export function formatNewItem(item: Item): string {
  const lang = langOf(item);
  const head = `${FLAG[lang]} <b>${escapeHtml(principalForms(item))}</b>`;
  const grammar = grammarLabel(item);
  const lines = [`${head}${grammar ? ` <i>(${grammar})</i>` : ""} — ${escapeHtml(meaningOf(item))}`];
  for (const ex of item.examples.slice(0, 1)) {
    lines.push(`   <i>${escapeHtml(ex.text)}</i> — ${escapeHtml(ex.translation)}`);
  }
  const note = item.note?.ru ?? item.note?.en;
  if (note) lines.push(`   💡 ${escapeHtml(note)}`);
  return lines.join("\n");
}
