// The list of features. To add one: create features/<name>.ts exporting a `Feature`, then add it here.
import type { Command, Feature } from "../feature";
import { assessment } from "./assessment";
import { core } from "./core";
import { grammar } from "./grammar";
import { mistakes } from "./mistakes";
import { placement } from "./placement";
import { progress } from "./progress";
import { report } from "./report";
import { review } from "./review";
import { settings } from "./settings";
import { tutor } from "./tutor";

// tutor stays last: it takes plain text/voice messages, so features before it get the first chance.
export const FEATURES: Feature[] = [core, review, placement, grammar, settings, progress, report, assessment, mistakes, tutor];

export const COMMANDS: Command[] = FEATURES.flatMap((f) => f.commands ?? []);

export function helpText(): string {
  return ["Команды:", ...COMMANDS.filter((c) => c.name !== "start").map((c) => `/${c.name} — ${c.description}`)].join("\n");
}
