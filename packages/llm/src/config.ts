// Schema of config/llm.yaml (validated at build time by scripts/build-llm.ts).
import { z } from "zod";

const Price = z.object({
  /** USD per million input / output tokens. */
  input_per_mtok: z.number().min(0).optional(),
  output_per_mtok: z.number().min(0).optional(),
  /** USD per hour of audio (speech-to-text). */
  per_audio_hour: z.number().min(0).optional(),
});

export const ProviderConfig = z.object({
  type: z.enum(["openai", "gemini", "anthropic"]),
  base_url: z.url(),
  /** Name of the Worker secret / .dev.vars entry holding the key. The key itself never goes in the config. */
  key_env: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
  enabled: z.boolean().default(true),
  /** Paid providers: skip this provider once the month's estimated spend reaches this. */
  monthly_budget_usd: z.number().positive().optional(),
  /** List prices for the cost estimate in the usage log (and the budget guard). */
  prices: z.record(z.string(), Price).optional(),
  /** Extra request-body fields for every chat call, e.g. { reasoning_effort: low }. */
  extra_body: z.record(z.string(), z.unknown()).optional(),
  timeout_ms: z.number().int().positive().optional(),
});
export type ProviderConfig = z.infer<typeof ProviderConfig>;

export const LlmConfig = z
  .object({
    /** Extra attempts on the same provider after a 429/5xx/invalid answer, before moving to the next one. */
    retries: z.number().int().min(0).max(3).default(1),
    retry_delay_ms: z.number().int().min(0).max(10_000).default(500),
    providers: z.record(z.string().regex(/^[a-z][a-z0-9_]*$/, "provider names: lowercase letters, digits, _"), ProviderConfig),
    /** task → ordered chain of "provider:model"; the first working one answers. */
    tasks: z.record(z.string().regex(/^[a-z][a-z0-9_]*$/), z.array(z.string().regex(/^[a-z][a-z0-9_]*:.+$/, 'use "provider:model"')).min(1)),
  })
  .superRefine((c, ctx) => {
    for (const [task, chain] of Object.entries(c.tasks)) {
      chain.forEach((entry, i) => {
        const provider = entry.slice(0, entry.indexOf(":"));
        if (!c.providers[provider]) ctx.addIssue({ code: "custom", path: ["tasks", task, i], message: `unknown provider "${provider}"` });
      });
    }
  });
export type LlmConfig = z.infer<typeof LlmConfig>;

export function parseChainEntry(entry: string): { provider: string; model: string } {
  const i = entry.indexOf(":");
  return { provider: entry.slice(0, i), model: entry.slice(i + 1) };
}
