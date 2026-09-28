// Secrets set with `pnpm secrets:push` (see .dev.vars.example). Bindings (DB) come from worker-configuration.d.ts.
interface Env {
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_USER_ID: string;
  TELEGRAM_WEBHOOK_SECRET: string;
  GEMINI_API_KEY?: string;
  GROQ_API_KEY?: string;
  TELEGRAM_API_BASE?: string; // local smoke test only
}
