// Lists open "report a mistake" entries from the live database, with the reported content, for the next content session.
// Usage: pnpm content:reports                 (list open reports)
//        pnpm content:reports --resolve <id>  (mark one as fixed)
// Needs `pnpm wrangler login` (your Cloudflare login on this Mac).
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const d1 = (sql: string) => {
  const out = execFileSync("pnpm", ["wrangler", "d1", "execute", "everyday-learning", "--remote", "--json", "--command", sql], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, CI: "1" },
  });
  return JSON.parse(out.slice(out.indexOf("["))) as { results: Record<string, unknown>[] }[];
};

const resolveIdx = process.argv.indexOf("--resolve");
if (resolveIdx > 0) {
  const id = process.argv[resolveIdx + 1];
  if (!id || !/^[0-9a-f-]{36}$/.test(id)) throw new Error("usage: pnpm content:reports --resolve <report id>");
  d1(`UPDATE report SET resolved_at = ${Date.now()} WHERE id = '${id}'`);
  console.log(`✓ resolved ${id}`);
  process.exit(0);
}

const items = new Map(
  (JSON.parse(readFileSync(`${root}/apps/worker/src/generated/content.json`, "utf8")) as { id: string; text: string; meaning: Record<string, string> }[]).map(
    (i) => [i.id, i],
  ),
);
const rows = d1("SELECT id, item_id, card_id, text, created_at FROM report WHERE resolved_at IS NULL ORDER BY created_at")[0]!.results;
if (!rows.length) console.log("No open reports 🎉");
for (const r of rows) {
  const item = r.item_id ? items.get(String(r.item_id)) : undefined;
  console.log(
    `• ${new Date(Number(r.created_at)).toISOString().slice(0, 16)}  ${r.id}\n` +
      (item ? `  ${item.id} ${item.text} — ${Object.values(item.meaning).join(" / ")} (card ${r.card_id})\n` : "") +
      (r.text ? `  "${r.text}"\n` : ""),
  );
}
