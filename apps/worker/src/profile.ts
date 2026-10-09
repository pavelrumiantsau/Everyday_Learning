// The learner's profile (docs/EXTENSION-PLAN.md §5), loaded once at the start of every webhook, API request and cron run.
// One deployment = one learner, so keeping it in module state is safe: every request of this Worker sees the same learner.
// No stored profile (the owner's deployment) = null = today's plan, with the time zone from config/schedule.yaml.
import { courseItemOrder, courseLessonOrder, newPerDayFor, Profile, visibleTo, type SetupAnswers } from "@el/core";
import { learnerProfileFor, type LearnerProfile, type TargetLang } from "@el/llm";
import { COURSE, ITEMS, LESSONS, SCHEDULE } from "./content";
import type { Db } from "./db";
import { isCopy } from "./owner";
import { updatePrefs } from "./prefs";

const KEY = "profile";
let current: Profile | null = null;
let tz = SCHEDULE.timezone;

/** The learner's time zone (IANA name). */
export const timezone = () => tz;
/** The learner's profile, or null for the original plan. */
export const currentProfile = () => current;

export async function loadProfile(db: Db): Promise<Profile | null> {
  const saved = Profile.safeParse(await db.getSetting<unknown>(KEY));
  current = saved.success ? saved.data : null;
  tz = current?.timezone ?? SCHEDULE.timezone;
  return current;
}

/** On the Lithuanian foundation course (the course map exists). */
export const onFoundation = () => !!COURSE && current?.languages.lt?.course === "foundation";

/** Vocabulary this learner can get, in the order new words come: course units first on the foundation course. */
export const learnerItems = () => (onFoundation() ? courseItemOrder(visibleTo(ITEMS, current), COURSE!) : visibleTo(ITEMS, current));

/** Grammar lessons this learner can get; on the foundation course Lithuanian lessons follow the units. */
export const learnerLessons = () => (onFoundation() ? courseLessonOrder(visibleTo(LESSONS, current), COURSE!) : visibleTo(LESSONS, current));

/** The AI tutor's picture of the learner for a language: the original one without a profile, else by the chosen level. */
export const aiProfile = (lang: TargetLang): LearnerProfile => learnerProfileFor(lang, current?.languages[lang]?.level ?? (current ? "A1" : null));

/** A copy whose owner hasn't answered the setup wizard yet: no lessons until then. */
export const needsSetup = (env: Env) => isCopy(env) && current === null;

/** Saves the wizard's answers: the profile, plus the daily rhythm and new words per day in the existing prefs. */
export async function saveSetup(db: Db, answers: SetupAnswers): Promise<{ ok: true } | { ok: false; error: string }> {
  const prefs = await updatePrefs(db, {
    morning: answers.morning,
    evening: answers.evening,
    min_day_answers: answers.min_day_answers,
    new_per_day: newPerDayFor(answers.profile),
  });
  if (!prefs.ok) return prefs;
  await db.setSetting(KEY, answers.profile).run();
  await loadProfile(db);
  return { ok: true };
}
