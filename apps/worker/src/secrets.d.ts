// Secrets set with `pnpm secrets:push` (see .dev.vars.example). Bindings (DB) come from worker-configuration.d.ts.
interface Env {
  TELEGRAM_BOT_TOKEN: string;
  /** The owner's deployment only. A colleague's copy has none: its owner is bound by CLAIM_CODE (src/owner.ts). */
  TELEGRAM_USER_ID?: string;
  /** Copies only: one-time code from the Setup workflow; `/start <code>` binds the bot to its owner. */
  CLAIM_CODE?: string;
  TELEGRAM_WEBHOOK_SECRET: string;
  GEMINI_API_KEY?: string;
  GROQ_API_KEY?: string;
  ANTHROPIC_API_KEY?: string; // optional, paid Claude API (config/llm.yaml)
  OPENROUTER_API_KEY?: string; // optional
  LLM_BASE_URL_GROQ?: string; // local smoke test only (fake LLM server)
  LLM_BASE_URL_GOOGLE?: string; // local smoke test only
  TELEGRAM_API_BASE?: string; // local smoke test only
  WEBAPP_URL: string; // [vars] in wrangler.toml
}
