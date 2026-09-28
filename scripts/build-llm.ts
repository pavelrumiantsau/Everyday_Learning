// Validates config/llm.yaml and bundles it with the prompt templates (prompts/{feedback,tutor}/*.md) into the JSON
// the Worker imports — a Worker can't read files at runtime.
// Usage: tsx scripts/build-llm.ts          (validate + write; part of `pnpm build:content`)
//        tsx scripts/build-llm.ts --check  (validate only)
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { LlmConfig } from "../packages/llm/src/index.ts";

const root = fileURLToPath(new URL("..", import.meta.url));
const checkOnly = process.argv.includes("--check");
/** Only for pasting into the Claude app, not used by the bot. */
const NOT_BUNDLED = new Set(["tutor/claude-project"]);
const REQUIRED_PROMPTS = ["tutor/chat", "feedback/writing", "feedback/lookup", "feedback/reading-questions"];

export function loadLlmConfig(): LlmConfig {
  const result = LlmConfig.safeParse(parse(readFileSync(join(root, "config/llm.yaml"), "utf8")));
  if (!result.success) {
    console.error(`✗ config/llm.yaml:\n  ${result.error.issues.map((i) => `[${i.path.join(".")}] ${i.message}`).join("\n  ")}`);
    process.exit(1);
  }
  return result.data;
}

export function loadPrompts(): Record<string, string> {
  const prompts: Record<string, string> = {};
  for (const dir of ["feedback", "tutor"]) {
    const abs = join(root, "prompts", dir);
    if (!existsSync(abs)) continue;
    for (const f of readdirSync(abs).filter((f) => f.endsWith(".md")).sort()) {
      const name = `${dir}/${f.slice(0, -3)}`;
      if (!NOT_BUNDLED.has(name)) prompts[name] = readFileSync(join(abs, f), "utf8").trim();
    }
  }
  const missing = REQUIRED_PROMPTS.filter((p) => !prompts[p]);
  if (missing.length) {
    console.error(`✗ missing prompts: ${missing.map((p) => `prompts/${p}.md`).join(", ")}`);
    process.exit(1);
  }
  return prompts;
}

if (process.argv[1]?.endsWith("build-llm.ts")) {
  const config = loadLlmConfig();
  const prompts = loadPrompts();
  console.log(`✓ llm config OK (${Object.keys(config.tasks).length} tasks, ${Object.keys(config.providers).length} providers), ${Object.keys(prompts).length} prompts`);
  if (!checkOnly) {
    const out = join(root, "apps/worker/src/generated");
    mkdirSync(out, { recursive: true });
    writeFileSync(join(out, "llm.json"), JSON.stringify({ config, prompts }));
    console.log(`→ ${relative(root, out)}/llm.json`);
  }
}
