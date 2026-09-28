// The Worker's LLM router: config + prompts bundled at build time (scripts/build-llm.ts), usage logged to D1.
import { Router, type LlmConfig, type Prompts } from "@el/llm";
import llmJson from "../../generated/llm.json";
import { AiStore } from "./store";

const bundle = llmJson as unknown as { config: LlmConfig; prompts: Prompts };
export const PROMPTS = bundle.prompts;

export function llmRouter(env: Env, store: AiStore): Router {
  return new Router({ config: bundle.config, env: env as unknown as Record<string, string | undefined>, usage: store });
}
