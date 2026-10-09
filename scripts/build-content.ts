// Validates content/**/*.yaml and config/{schedule,milestones,sources}.yaml, then writes the JSON the Worker bundles.
// Usage: pnpm build:content        (validate + write)
//        pnpm content:validate     (validate only; used in CI)
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { Course, ItemFile, Lesson, Milestones, ReadingText, Schedule, Sources, type Item } from "../packages/core/src/index.ts";

const root = fileURLToPath(new URL("..", import.meta.url));
const checkOnly = process.argv.includes("--check");

function yamlFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? yamlFiles(join(dir, e.name)) : e.name.endsWith(".yaml") ? [join(dir, e.name)] : [],
  );
}

const errors: string[] = [];
const items: Item[] = [];
const seen = new Map<string, string>();

// A word that mixes Latin and Cyrillic letters is always a typo (e.g. "dėmесio" typed with Russian "е", "с").
const MIXED_SCRIPT = /[\p{Script=Latin}][\p{Script=Cyrillic}]|[\p{Script=Cyrillic}][\p{Script=Latin}]/u;
for (const file of yamlFiles(join(root, "content"))) {
  const rel = relative(root, file);
  readFileSync(file, "utf8")
    .split("\n")
    .forEach((line, i) => {
      for (const word of line.match(/[\p{L}\p{M}]+/gu) ?? []) {
        if (MIXED_SCRIPT.test(word)) errors.push(`${rel}:${i + 1}: "${word}" mixes Latin and Cyrillic letters`);
      }
    });
}

const isGrammar = (rel: string) => /^content\/[a-z]{2}\/grammar\//.test(rel);
const isReading = (rel: string) => /^content\/[a-z]{2}\/reading\//.test(rel);
const isCourse = (rel: string) => /^content\/[a-z]{2}\/course\//.test(rel);
const STRESS_FILE = "content/lt/stress.yaml";

for (const file of yamlFiles(join(root, "content")).sort()) {
  const rel = relative(root, file);
  if (isGrammar(rel) || isReading(rel) || isCourse(rel) || rel === STRESS_FILE) continue; // lessons, texts, course, stress: see below
  const result = ItemFile.safeParse(parse(readFileSync(file, "utf8")));
  if (!result.success) {
    for (const issue of result.error.issues) errors.push(`${rel}: [${issue.path.join(".")}] ${issue.message}`);
    continue;
  }
  for (const item of result.data) {
    if (!rel.startsWith(`content/${item.id.slice(0, 2)}/`)) errors.push(`${rel}: ${item.id} is in the wrong language folder`);
    const dup = seen.get(item.id);
    if (dup) errors.push(`${rel}: duplicate id ${item.id} (also in ${dup})`);
    seen.set(item.id, rel);
    items.push(item);
  }
}

// Stress marks for Lithuanian words (content/lt/stress.yaml, word → stressed form; see scripts/stress.py).
// Kept apart from the batch files so regenerating a batch doesn't lose them; an item's own `stress` wins.
{
  const stripAccents = (s: string) => s.normalize("NFD").replace(/[̀́̃]/g, "").normalize("NFC");
  let stress: Record<string, unknown> = {};
  try {
    stress = (parse(readFileSync(join(root, STRESS_FILE), "utf8")) ?? {}) as Record<string, unknown>;
  } catch {
    stress = {}; // no file yet
  }
  const ltByText = new Map(items.filter((i) => i.id.startsWith("lt-")).map((i) => [i.text, i]));
  for (const [word, stressed] of Object.entries(stress)) {
    if (typeof stressed !== "string" || !stressed.trim()) errors.push(`${STRESS_FILE}: "${word}" needs a stressed form`);
    else if (stripAccents(stressed.normalize("NFC")) !== word.normalize("NFC")) errors.push(`${STRESS_FILE}: "${stressed}" is not "${word}" with stress marks`);
    else {
      const item = ltByText.get(word);
      if (!item) errors.push(`${STRESS_FILE}: "${word}" is not a Lithuanian course word`);
      else item.stress ??= stressed.normalize("NFC");
    }
  }
}

// Grammar lessons: one lesson per file in content/<lang>/grammar/.
const lessons: Lesson[] = [];
const lessonOrder = new Map<string, string>();
for (const file of yamlFiles(join(root, "content")).sort()) {
  const rel = relative(root, file);
  if (!isGrammar(rel)) continue;
  const result = Lesson.safeParse(parse(readFileSync(file, "utf8")));
  if (!result.success) {
    for (const issue of result.error.issues) errors.push(`${rel}: [${issue.path.join(".")}] ${issue.message}`);
    continue;
  }
  const lesson = result.data;
  if (!rel.startsWith(`content/${lesson.id.slice(0, 2)}/`)) errors.push(`${rel}: ${lesson.id} is in the wrong language folder`);
  const dup = seen.get(lesson.id);
  if (dup) errors.push(`${rel}: duplicate id ${lesson.id} (also in ${dup})`);
  seen.set(lesson.id, rel);
  const orderKey = `${lesson.id.slice(0, 2)}:${lesson.order}`;
  const sameOrder = lessonOrder.get(orderKey);
  if (sameOrder) errors.push(`${rel}: order ${lesson.order} is already used by ${sameOrder}`);
  lessonOrder.set(orderKey, lesson.id);
  lessons.push(lesson);
}

// Reading texts: one text per file in content/<lang>/reading/ (PLAN §6.6).
const texts: ReadingText[] = [];
for (const file of yamlFiles(join(root, "content")).sort()) {
  const rel = relative(root, file);
  if (!isReading(rel)) continue;
  const result = ReadingText.safeParse(parse(readFileSync(file, "utf8")));
  if (!result.success) {
    for (const issue of result.error.issues) errors.push(`${rel}: [${issue.path.join(".")}] ${issue.message}`);
    continue;
  }
  const text = result.data;
  if (!rel.startsWith(`content/${text.id.slice(0, 2)}/`)) errors.push(`${rel}: ${text.id} is in the wrong language folder`);
  const dup = seen.get(text.id);
  if (dup) errors.push(`${rel}: duplicate id ${text.id} (also in ${dup})`);
  seen.set(text.id, rel);
  const byId = new Map(items.map((i) => [i.id, i]));
  for (const g of text.glossary) {
    if (!g.item) continue;
    const it = byId.get(g.item);
    if (!it) errors.push(`${rel}: glossary "${g.word}" points to unknown item ${g.item}`);
    else if (it.text !== g.lemma) errors.push(`${rel}: glossary "${g.word}" (lemma ${g.lemma}) points to ${g.item}, which is "${it.text}"`);
  }
  texts.push(text);
}

// Foundation course (docs/EXTENSION-PLAN.md §6.8): explained in Russian only — colleagues may not know Ukrainian or Belarusian.
const NOT_FOR_FOUNDATION = /украин|белорус|ukrain|belarus/i;
for (const x of [...items, ...lessons, ...texts] as { id: string; track?: string }[]) {
  if (x.track === "foundation" && NOT_FOR_FOUNDATION.test(JSON.stringify(x))) {
    errors.push(`${x.id}: foundation content mentions Ukrainian/Belarusian (Russian-only comparisons, EXTENSION-PLAN §6.8)`);
  }
}

// The same word must not be taught twice (e.g. two batches picking different forms of one lemma).
const byText = new Map<string, string>();
for (const item of items) {
  const key = `${item.id.slice(0, 2)}:${item.text.normalize("NFC").toLowerCase()}`;
  const other = byText.get(key);
  if (other) errors.push(`duplicate word "${item.text}": ${other} and ${item.id}`);
  else byText.set(key, item.id);
}

// Lithuanian foundation course map (docs/EXTENSION-PLAN.md §6.7): every id must exist and be of the right kind.
const COURSE_FILE = "content/lt/course/foundation.yaml";
let course: Course | null = null;
let courseNote = "";
try {
  const raw = readFileSync(join(root, COURSE_FILE), "utf8");
  const result = Course.safeParse(parse(raw));
  if (!result.success) {
    for (const issue of result.error.issues) errors.push(`${COURSE_FILE}: [${issue.path.join(".")}] ${issue.message}`);
  } else {
    course = result.data;
    const itemById = new Map(items.map((i) => [i.id, i]));
    const lessonIds = new Set(lessons.map((l) => l.id));
    const textIds = new Set(texts.map((t) => t.id));
    let noStress = 0;
    for (const u of course.units) {
      for (const id of u.words) {
        const it = itemById.get(id);
        if (!it) errors.push(`${COURSE_FILE}: ${u.id}: unknown word ${id}`);
        else if (it.type !== "word") errors.push(`${COURSE_FILE}: ${u.id}: ${id} is not a word`);
        else if (!it.stress) noStress++;
      }
      for (const id of u.phrases) if (itemById.get(id)?.type !== "phrase") errors.push(`${COURSE_FILE}: ${u.id}: unknown phrase ${id}`);
      for (const id of u.lessons) if (!lessonIds.has(id)) errors.push(`${COURSE_FILE}: ${u.id}: unknown lesson ${id}`);
      for (const id of u.texts) if (!textIds.has(id)) errors.push(`${COURSE_FILE}: ${u.id}: unknown text ${id}`);
    }
    const words = course.units.reduce((n, u) => n + u.words.length, 0);
    // Stress marks are required for every course word once phase E is done (EXTENSION-PLAN §6.6); until then: a count.
    courseNote = `, course: ${course.units.length} units, ${words} words${noStress ? ` (${noStress} without stress marks)` : ""}`;
  }
} catch (e) {
  if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
}

const schedule = Schedule.safeParse(parse(readFileSync(join(root, "config/schedule.yaml"), "utf8")));
if (!schedule.success) {
  for (const issue of schedule.error.issues) errors.push(`config/schedule.yaml: [${issue.path.join(".")}] ${issue.message}`);
} else {
  try {
    new Intl.DateTimeFormat("en", { timeZone: schedule.data.timezone });
  } catch {
    errors.push(`config/schedule.yaml: unknown timezone "${schedule.data.timezone}"`);
  }
}

const milestones = Milestones.safeParse(parse(readFileSync(join(root, "config/milestones.yaml"), "utf8")));
if (!milestones.success) {
  for (const issue of milestones.error.issues) errors.push(`config/milestones.yaml: [${issue.path.join(".")}] ${issue.message}`);
}

const sources = Sources.safeParse(parse(readFileSync(join(root, "config/sources.yaml"), "utf8")));
if (!sources.success) {
  for (const issue of sources.error.issues) errors.push(`config/sources.yaml: [${issue.path.join(".")}] ${issue.message}`);
}

if (errors.length) {
  console.error(`✗ ${errors.length} problem(s):\n  ${errors.join("\n  ")}`);
  process.exit(1);
}

const counts = Object.entries(
  items.reduce<Record<string, number>>((acc, i) => ((acc[i.id.slice(0, 2)] = (acc[i.id.slice(0, 2)] ?? 0) + 1), acc), {}),
)
  .map(([l, n]) => `${l}: ${n}`)
  .join(", ");
console.log(`✓ ${items.length} items (${counts}), ${lessons.length} grammar lessons, ${texts.length} reading texts${courseNote}, schedule OK`);

if (!checkOnly) {
  const out = join(root, "apps/worker/src/generated");
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "content.json"), JSON.stringify(items));
  writeFileSync(join(out, "schedule.json"), JSON.stringify(schedule.data));
  writeFileSync(join(out, "milestones.json"), JSON.stringify(milestones.data));
  writeFileSync(join(out, "grammar.json"), JSON.stringify(lessons));
  writeFileSync(join(out, "reading.json"), JSON.stringify(texts));
  writeFileSync(join(out, "sources.json"), JSON.stringify(sources.data));
  writeFileSync(join(out, "course.json"), JSON.stringify(course));
  console.log(`→ ${relative(root, out)}/{content,schedule,milestones,grammar,reading,sources,course}.json`);
}
