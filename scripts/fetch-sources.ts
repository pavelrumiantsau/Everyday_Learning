// Downloads the open data used to build lessons into .cache/sources (git-ignored).
//   - Word frequency lists: Hermit Dave, FrequencyWords (OpenSubtitles 2018), CC-BY-SA 4.0
//   - Sentences + translations: Tatoeba (tatoeba.org), CC-BY 2.0 FR
// Usage: pnpm content:sources
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = fileURLToPath(new URL("../.cache/sources/", import.meta.url));
mkdirSync(dir, { recursive: true });

const FREQ = "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018";
const TATOEBA = "https://downloads.tatoeba.org/exports/per_language";
const files: Record<string, string> = {
  "lt_50k.txt": `${FREQ}/lt/lt_50k.txt`,
  "es_50k.txt": `${FREQ}/es/es_50k.txt`,
  "fr_50k.txt": `${FREQ}/fr/fr_50k.txt`,
  "lit_sentences.tsv.bz2": `${TATOEBA}/lit/lit_sentences.tsv.bz2`,
  "rus_sentences.tsv.bz2": `${TATOEBA}/rus/rus_sentences.tsv.bz2`,
  "spa_sentences.tsv.bz2": `${TATOEBA}/spa/spa_sentences.tsv.bz2`,
  "eng_sentences.tsv.bz2": `${TATOEBA}/eng/eng_sentences.tsv.bz2`,
  "lit-rus_links.tsv.bz2": `${TATOEBA}/lit/lit-rus_links.tsv.bz2`,
  "spa-eng_links.tsv.bz2": `${TATOEBA}/spa/spa-eng_links.tsv.bz2`,
};

for (const [name, url] of Object.entries(files)) {
  const target = join(dir, name.replace(/\.bz2$/, ""));
  if (existsSync(target)) {
    console.log(`= ${name} (cached)`);
    continue;
  }
  console.log(`↓ ${name}`);
  execFileSync("curl", ["-sSfL", "-o", join(dir, name), url], { stdio: "inherit" });
  if (name.endsWith(".bz2")) execFileSync("bunzip2", ["-f", join(dir, name)]);
}
console.log(`✓ Sources in ${dir}`);
