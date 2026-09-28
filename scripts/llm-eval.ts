// Compares AI models on the same learner mistakes (LT + ES), using the bot's real writing-feedback prompt.
// Reads keys from apps/worker/.dev.vars (never printed). Calls real APIs — run it by hand, not in CI.
// Usage: pnpm llm:eval               every chat model named in config/llm.yaml whose provider is enabled and has a key
//        pnpm llm:eval --all         also providers with enabled: false (if their key is in .dev.vars)
//        pnpm llm:eval --verbose     print each model's corrected text per case
//        pnpm llm:eval groq:openai/gpt-oss-20b   only these provider:model pairs
import { feedbackMessages, LlmConfig, PROFILES, Router, WritingFeedback, type TargetLang } from "../packages/llm/src/index.ts";
import { loadLlmConfig, loadPrompts } from "./build-llm.ts";
import { readDevVars } from "./secrets-push.ts";

interface Case {
  lang: TargetLang;
  text: string;
  /** Substrings the corrected text must contain (the fix); empty = the text is correct, no mistakes expected. */
  fix: string[];
}

const CASES: Case[] = [
  { lang: "lt", text: "Aš eina į parduotuvę.", fix: ["einu"] },
  { lang: "lt", text: "Vakar aš buvau namuose ir žiūrėjau filmas.", fix: ["filmą"] },
  { lang: "lt", text: "Aš neturiu laikas.", fix: ["laiko"] },
  { lang: "lt", text: "Aš nemėgstu kavą.", fix: ["kavos"] },
  { lang: "lt", text: "Rytoj aš eisiu į darbą su autobusas.", fix: ["autobusu"] },
  { lang: "lt", text: "Aš laukiu tavęs prie stotis.", fix: ["stoties"] },
  { lang: "lt", text: "Aš važiuoju į Kaunas rytoj.", fix: ["Kauną"] },
  { lang: "lt", text: "Ji padovanojo gėles mama.", fix: ["mamai"] },
  { lang: "lt", text: "Aš norėčiau gyventi prie jūra.", fix: ["jūros"] },
  { lang: "lt", text: "Mes kalbėjome apie tavo naujas darbas.", fix: ["naują darbą"] },
  { lang: "lt", text: "Mes gyvename Vilniuje jau trys metai.", fix: ["metus"] },
  { lang: "lt", text: "Mano brolis dirba gydytoju ligoninėje.", fix: [] },
  { lang: "lt", text: "Man patinka ši knyga, bet aš jos dar neperskaičiau.", fix: [] },
  { lang: "lt", text: "Labas rytas! Šiandien labai graži diena.", fix: [] },
  { lang: "es", text: "Yo es de Bielorrusia.", fix: ["soy"] },
  { lang: "es", text: "Me gusta los gatos.", fix: ["gustan"] },
  { lang: "es", text: "Ella tiene veinte años y es muy cansada.", fix: ["está"] },
  { lang: "es", text: "Quiero comer un manzana.", fix: ["una manzana"] },
  { lang: "es", text: "Mi hermana es más alto que yo.", fix: ["alta"] },
  { lang: "es", text: "Ayer yo voy al cine.", fix: ["fui"] },
  { lang: "es", text: "Mañana vamos a la playa.", fix: [] },
];

const args = process.argv.slice(2);
const verbose = args.includes("--verbose");
const all = args.includes("--all");
const only = args.filter((a) => !a.startsWith("--"));

const env = readDevVars();
const base = loadLlmConfig();
const prompts = loadPrompts();

// Chat models from every task chain (speech-to-text models are skipped).
const entries = [...new Set(Object.entries(base.tasks).filter(([t]) => t !== "transcribe").flatMap(([, chain]) => chain))].filter((e) => {
  if (only.length) return only.includes(e);
  const p = base.providers[e.slice(0, e.indexOf(":"))]!;
  return (p.enabled || all) && !!env[p.key_env];
});
if (!entries.length) {
  console.error("✗ No provider to test: add GROQ_API_KEY (and optionally GEMINI_API_KEY) to apps/worker/.dev.vars.");
  process.exit(1);
}

interface Row { entry: string; valid: number; fixed: number; toFix: number; falseAlarms: number; controls: number; ms: number[]; tokens: number; errors: number }
const rows: Row[] = [];

for (const entry of entries) {
  const provider = entry.slice(0, entry.indexOf(":"));
  const config = LlmConfig.parse({ ...base, retries: 1, providers: { [provider]: { ...base.providers[provider], enabled: true } }, tasks: { eval: [entry] } });
  const router = new Router({ config, env });
  const row: Row = { entry, valid: 0, fixed: 0, toFix: 0, falseAlarms: 0, controls: 0, ms: [], tokens: 0, errors: 0 };
  process.stdout.write(`${entry} `);
  for (const c of CASES) {
    const t0 = Date.now();
    if (c.fix.length) row.toFix++;
    else row.controls++;
    try {
      const r = await router.json("eval", { messages: feedbackMessages(prompts, PROFILES[c.lang], c.text), temperature: 0.2, maxTokens: 2500 }, WritingFeedback);
      row.ms.push(Date.now() - t0);
      row.valid++;
      row.tokens += r.usage.inputTokens + r.usage.outputTokens;
      const corrected = r.output.corrected.toLowerCase();
      const ok = c.fix.length ? c.fix.every((f) => corrected.includes(f.toLowerCase())) : r.output.mistakes.length === 0;
      if (c.fix.length && ok) row.fixed++;
      if (!c.fix.length && !ok) row.falseAlarms++;
      process.stdout.write(ok ? "." : "x");
      if (verbose) {
        console.log(`\n  ${ok ? "✓" : "✗"} [${c.lang}] ${c.text}\n    → ${r.output.corrected || "(unchanged)"}`);
        for (const m of r.output.mistakes) console.log(`      • ${m.original} → ${m.corrected}: ${m.explanation}`);
      }
    } catch (err) {
      row.errors++;
      process.stdout.write("E");
      if (verbose) console.log(`\n  ! [${c.lang}] ${c.text}: ${err instanceof Error ? err.message.slice(0, 200) : "error"}`);
    }
  }
  console.log();
  rows.push(row);
}

const median = (xs: number[]) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]! : 0);
console.log(`\n${CASES.length} cases (${CASES.filter((c) => c.lang === "lt").length} LT, ${CASES.filter((c) => c.lang === "es").length} ES)\n`);
console.table(
  rows.map((r) => ({
    model: r.entry,
    "mistakes fixed": `${r.fixed}/${r.toFix}`,
    "false alarms": `${r.falseAlarms}/${r.controls}`,
    "valid JSON": `${r.valid}/${CASES.length}`,
    errors: r.errors,
    "median ms": median(r.ms),
    tokens: r.tokens,
  })),
);
console.log("Put the best model first in the task chains of config/llm.yaml.");
