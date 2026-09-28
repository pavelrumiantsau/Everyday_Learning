// Lists frequent words with short real Tatoeba sentences (and translations) that contain them.
// The output is the raw material for writing content/<lang>/**/*.yaml (PLAN §6.3).
// Usage: pnpm content:candidates lt 800 400    (language, first frequency rank, how many words)
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const [lang = "lt", fromArg = "1", countArg = "300"] = process.argv.slice(2);
const cfg = {
  lt: { freq: "lt_50k.txt", src: "lit_sentences.tsv", tr: "rus_sentences.tsv", links: "lit-rus_links.tsv" },
  es: { freq: "es_50k.txt", src: "spa_sentences.tsv", tr: "eng_sentences.tsv", links: "spa-eng_links.tsv" },
}[lang];
if (!cfg) throw new Error(`Unsupported language: ${lang}`);

const root = fileURLToPath(new URL("..", import.meta.url));
const dir = join(root, ".cache/sources");
const read = (f: string) => readFileSync(join(dir, f), "utf8").split("\n").filter(Boolean);
const sentences = (f: string) => new Map(read(f).map((l) => l.split("\t")).map(([id, , text]) => [id!, text!]));

const src = sentences(cfg.src);
const tr = sentences(cfg.tr);
const translation = new Map<string, string>();
for (const [a, b] of read(cfg.links).map((l) => l.split("\t"))) {
  const t = tr.get(b!);
  if (src.has(a!) && t && (!translation.has(a!) || t.length < translation.get(a!)!.length)) translation.set(a!, t);
}

// Index: lower-cased word form → sentence ids (only sentences that have a translation, 3–12 words).
const tokenize = (s: string) => s.toLowerCase().match(/\p{L}+/gu) ?? [];
const index = new Map<string, string[]>();
for (const id of translation.keys()) {
  const words = tokenize(src.get(id)!);
  if (words.length < 3 || words.length > 12) continue;
  for (const w of new Set(words)) (index.get(w) ?? index.set(w, []).get(w)!).push(id);
}

// Words already used in content/<lang> (by exact text) are skipped.
const existing = new Set<string>();
const walk = (d: string): string[] => {
  try {
    return readdirSync(d, { withFileTypes: true, recursive: true })
      .filter((e) => e.isFile() && e.name.endsWith(".yaml"))
      .map((e) => join(e.parentPath, e.name));
  } catch {
    return []; // no content for this language yet
  }
};
for (const f of walk(join(root, "content", lang))) {
  for (const m of readFileSync(f, "utf8").matchAll(/^\s*-?\s*text:\s*"?([^"\n]+)"?\s*$/gm)) existing.add(m[1]!.toLowerCase());
}

const from = Number(fromArg), count = Number(countArg);
const out = read(cfg.freq)
  .map((l, i) => ({ rank: i + 1, word: l.split(" ")[0]! }))
  .slice(from - 1, from - 1 + count)
  .filter(({ word }) => !existing.has(word) && /^\p{L}{2,}$/u.test(word))
  .map(({ rank, word }) => ({
    rank,
    word,
    examples: (index.get(word) ?? [])
      .map((id) => ({ id, text: src.get(id)!, tr: translation.get(id)! }))
      .sort((a, b) => a.text.length - b.text.length)
      .slice(0, 3),
  }));

const file = join(root, `.cache/candidates-${lang}-${from}.json`);
writeFileSync(file, JSON.stringify(out, null, 1));
const withEx = out.filter((c) => c.examples.length).length;
console.log(`✓ ${out.length} candidates (${withEx} with Tatoeba examples), ${translation.size} translated sentences → ${file}`);
