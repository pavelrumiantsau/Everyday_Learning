// The list of features. To add one: create features/<name>.ts exporting a `Feature`, then add it here.
import type { Command, Feature } from "../feature";
import { core } from "./core";
import { placement } from "./placement";
import { review } from "./review";
import { settings } from "./settings";

export const FEATURES: Feature[] = [core, review, placement, settings];

export const COMMANDS: Command[] = FEATURES.flatMap((f) => f.commands ?? []);

export function helpText(): string {
  return ["Команды:", ...COMMANDS.filter((c) => c.name !== "start").map((c) => `/${c.name} — ${c.description}`)].join("\n");
}
