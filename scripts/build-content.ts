// Validates content/**/*.yaml and config/schedule.yaml, then writes the JSON the Worker bundles.
// Usage: pnpm build:content        (validate + write)
//        pnpm content:validate     (validate only; used in CI)
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { ItemFile, Lesson, Milestones, ReadingText, Schedule, type Item } from "../packages/core/src/index.ts";

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

const isGrammar = (rel: string) => /^content\/[a-z]{2}\/grammar\//.test(rel);
const isReading = (rel: string) => /^content\/[a-z]{2}\/reading\//.test(rel);

for (const file of yamlFiles(join(root, "content")).sort()) {
  const rel = relative(root, file);
  if (isGrammar(rel) || isReading(rel)) continue; // grammar lessons and reading texts: see below
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
  const itemIds = new Set(items.map((i) => i.id));
  for (const g of text.glossary) if (g.item && !itemIds.has(g.item)) errors.push(`${rel}: glossary "${g.word}" points to unknown item ${g.item}`);
  texts.push(text);
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

if (errors.length) {
  console.error(`✗ ${errors.length} problem(s):\n  ${errors.join("\n  ")}`);
  process.exit(1);
}

const counts = Object.entries(
  items.reduce<Record<string, number>>((acc, i) => ((acc[i.id.slice(0, 2)] = (acc[i.id.slice(0, 2)] ?? 0) + 1), acc), {}),
)
  .map(([l, n]) => `${l}: ${n}`)
  .join(", ");
console.log(`✓ ${items.length} items (${counts}), ${lessons.length} grammar lessons, ${texts.length} reading texts, schedule OK`);

if (!checkOnly) {
  const out = join(root, "apps/worker/src/generated");
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "content.json"), JSON.stringify(items));
  writeFileSync(join(out, "schedule.json"), JSON.stringify(schedule.data));
  writeFileSync(join(out, "milestones.json"), JSON.stringify(milestones.data));
  writeFileSync(join(out, "grammar.json"), JSON.stringify(lessons));
  writeFileSync(join(out, "reading.json"), JSON.stringify(texts));
  console.log(`→ ${relative(root, out)}/{content,schedule,milestones,grammar,reading}.json`);
}
