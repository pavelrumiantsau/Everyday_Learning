// Smoke check files, run in this order against one Worker + database.
import bot from "./01-bot.ts";
import review from "./02-review.ts";
import placement from "./03-placement.ts";
import settings from "./04-settings.ts";
import grammar from "./05-grammar.ts";
import audio from "./06-audio.ts";
import progress from "./08-progress.ts";
import assessment from "./09-assessment.ts";
import ai from "./07-ai.ts";
import mistakes from "./11-mistakes.ts";
import reading from "./10-reading.ts";
import french from "./12-french.ts";
import more from "./13-more.ts";
import copyOwner from "./14-copy-owner.ts";
import setupWizard, { ownerSide as setupOwnerSide } from "./15-setup.ts";
import courseChecks, { ownerSide as courseOwnerSide } from "./16-course.ts";
import taskChecks, { ownerSide as taskOwnerSide } from "./17-tasks.ts";
import listeningChecks, { ownerSide as listeningOwnerSide } from "./18-listening.ts";
import examChecks, { ownerSide as examOwnerSide } from "./19-exams.ts";
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
  { name: "ai", run: ai },
  { name: "mistakes", run: mistakes },
  { name: "reading", run: reading },
  { name: "french", run: french },
  { name: "more", run: more },
  { name: "setup wizard: original bot unchanged", run: setupOwnerSide },
  { name: "course: original bot unchanged", run: courseOwnerSide },
  { name: "tasks: original bot unchanged", run: taskOwnerSide },
  { name: "listening: original bot unchanged", run: listeningOwnerSide },
  { name: "exams: original bot unchanged", run: examOwnerSide },
];

/** Run against a second Worker + database configured as a colleague's personal copy (no TELEGRAM_USER_ID). */
export const COPY_CHECKS: { name: string; run: (t: Smoke) => Promise<void> }[] = [
  { name: "personal copy: owner binding", run: copyOwner },
  { name: "personal copy: setup wizard", run: setupWizard },
  { name: "personal copy: foundation course", run: courseChecks },
  { name: "personal copy: writing and speaking tasks", run: taskChecks },
  { name: "personal copy: listening", run: listeningChecks },
  { name: "personal copy: mock exams", run: examChecks },
];
