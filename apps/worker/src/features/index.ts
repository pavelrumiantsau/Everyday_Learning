// The list of features. To add one: create features/<name>.ts exporting a `Feature`, then add it here.
import type { Command, Feature } from "../feature";
import { assessment } from "./assessment";
import { core } from "./core";
import { grammar } from "./grammar";
import { mistakes } from "./mistakes";
import { more } from "./more";
import { placement } from "./placement";
import { reading } from "./reading";
import { progress } from "./progress";
import { report } from "./report";
import { review } from "./review";
import { settings } from "./settings";
import { setup } from "./setup";
import { tutor } from "./tutor";

// tutor stays last: it takes plain text/voice messages, so features before it get the first chance.
export const FEATURES: Feature[] = [core, setup, review, more, placement, grammar, settings, progress, report, assessment, mistakes, reading, tutor];

export const COMMANDS: Command[] = FEATURES.flatMap((f) => f.commands ?? []);

/** Commands listed for this deployment: copy-only ones (e.g. /setup) only in personal copies. */
export const listedCommands = (copy: boolean) => COMMANDS.filter((c) => copy || !c.copyOnly);

export function helpText(copy = false): string {
  return ["Команды:", ...listedCommands(copy).filter((c) => c.name !== "start").map((c) => `/${c.name} — ${c.description}`)].join("\n");
}
