// Smoke check files, run in this order against one Worker + database.
import bot from "./01-bot.ts";
import review from "./02-review.ts";
import placement from "./03-placement.ts";
import type { Smoke } from "./context.ts";

export const CHECKS: { name: string; run: (t: Smoke) => Promise<void> }[] = [
  { name: "bot", run: bot },
  { name: "review", run: review },
  { name: "placement", run: placement },
];
