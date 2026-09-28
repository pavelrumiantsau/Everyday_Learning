// Validates content/**/*.yaml and config/schedule.yaml, then writes the JSON the Worker bundles.
// Usage: pnpm build:content        (validate + write)
//        pnpm content:validate     (validate only; used in CI)
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { ItemFile, Schedule, type Item } from "../packages/core/src/index.ts";

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

for (const file of yamlFiles(join(root, "content")).sort()) {
  const rel = relative(root, file);
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

if (errors.length) {
  console.error(`✗ ${errors.length} problem(s):\n  ${errors.join("\n  ")}`);
  process.exit(1);
}

const counts = Object.entries(
  items.reduce<Record<string, number>>((acc, i) => ((acc[i.id.slice(0, 2)] = (acc[i.id.slice(0, 2)] ?? 0) + 1), acc), {}),
)
  .map(([l, n]) => `${l}: ${n}`)
  .join(", ");
console.log(`✓ ${items.length} items (${counts}), schedule OK`);

if (!checkOnly) {
  const out = join(root, "apps/worker/src/generated");
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "content.json"), JSON.stringify(items));
  writeFileSync(join(out, "schedule.json"), JSON.stringify(schedule.data));
  console.log(`→ ${relative(root, out)}/{content,schedule}.json`);
}
