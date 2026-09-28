import type { Item, Milestones, Schedule } from "@el/core";
import contentJson from "./generated/content.json";
import scheduleJson from "./generated/schedule.json";

// Validated at build time by scripts/build-content.ts.
export const ITEMS = contentJson as unknown as Item[];
export const ITEM_BY_ID = new Map(ITEMS.map((i) => [i.id, i]));
export const SCHEDULE = scheduleJson as unknown as Schedule;
import milestonesJson from "./generated/milestones.json";
export const MILESTONES = milestonesJson as unknown as Milestones;
