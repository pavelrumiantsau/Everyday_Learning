// Smoke check files, run in this order against one Worker + database.
import bot from "./01-bot.ts";
import review from "./02-review.ts";
import placement from "./03-placement.ts";
import settings from "./04-settings.ts";
import grammar from "./05-grammar.ts";
import audio from "./06-audio.ts";
import progress from "./08-progress.ts";
import assessment from "./09-assessment.ts";
import type { Smoke } from "./context.ts";

export const CHECKS: { name: string; run: (t: Smoke) => Promise<void> }[] = [
  { name: "bot", run: bot },
  { name: "review", run: review },
  { name: "placement", run: placement },
  { name: "settings", run: settings },
  { name: "grammar", run: grammar },
  { name: "progress", run: progress },
  { name: "audio", run: audio },
  { name: "assessment", run: assessment },
];
