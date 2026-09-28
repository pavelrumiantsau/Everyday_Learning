// Effective settings = config/schedule.yaml defaults + preferences saved from the Mini App / bot commands.
import { Prefs, type Schedule } from "@el/core";
import { SCHEDULE } from "./content";
import type { Db } from "./db";

const KEY = "prefs";

export async function getPrefs(db: Db): Promise<Schedule> {
  const saved = Prefs.safeParse((await db.getSetting<unknown>(KEY)) ?? {});
  const p = saved.success ? saved.data : {};
  return {
    ...SCHEDULE,
    ...p,
    new_per_day: { ...SCHEDULE.new_per_day, ...p.new_per_day },
    reverse: { ...SCHEDULE.reverse, ...p.reverse },
  };
}

/** Merges a partial update into the saved preferences; returns the new effective settings, or an error text. */
export async function updatePrefs(db: Db, patch: unknown): Promise<{ ok: true; prefs: Schedule } | { ok: false; error: string }> {
  const parsed = Prefs.safeParse(patch);
  if (!parsed.success) return { ok: false, error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  const current = Prefs.safeParse((await db.getSetting<unknown>(KEY)) ?? {});
  const base = current.success ? current.data : {};
  const next: Prefs = {
    ...base,
    ...parsed.data,
    new_per_day: { ...base.new_per_day, ...parsed.data.new_per_day } as Prefs["new_per_day"],
    reverse: { ...base.reverse, ...parsed.data.reverse } as Prefs["reverse"],
  };
  await db.setSetting(KEY, next).run();
  return { ok: true, prefs: await getPrefs(db) };
}
