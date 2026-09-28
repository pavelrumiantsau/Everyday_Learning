import { readFileSync } from "node:fs";
import { audioPath, type AudioManifest } from "../../packages/core/src/audio.ts";
import type { Smoke } from "./context.ts";

// Pronunciation audio: the manifest and mp3 files are served as static assets with the Mini App.
export default async function (t: Smoke) {
  const { check, base } = t;
  const res = await fetch(`${base}/audio/manifest.json`);
  const manifest = (res.ok ? await res.json() : {}) as AudioManifest;
  check(res.ok && Object.keys(manifest).length > 0, `/audio/manifest.json is served (${Object.keys(manifest).length} items)`);

  const id = "lt-w-0017"; // priimti: verb forms + an example
  for (const kind of ["word", "ex"] as const) {
    const mp3 = await fetch(`${base}${audioPath(id, kind)}`);
    const type = mp3.headers.get("content-type") ?? "";
    const size = (await mp3.arrayBuffer()).byteLength;
    check(!!manifest[id]?.[kind] && mp3.ok && type.startsWith("audio/") && size > 1000, `${audioPath(id, kind)} is served as ${type}, ${size} bytes`);
  }
  const missing = await fetch(`${base}/audio/lt/lt-w-9999.mp3`);
  await missing.arrayBuffer();
  check(!(missing.ok && (missing.headers.get("content-type") ?? "").startsWith("audio/")), "a missing audio file is not served as audio");

  // Not a failure (content can land before its audio), just a reminder.
  const items = JSON.parse(readFileSync(new URL("../../apps/worker/src/generated/content.json", import.meta.url), "utf8")) as { id: string }[];
  const without = items.filter((i) => !manifest[i.id]?.word).length;
  if (without) console.log(`  note: ${without} item(s) have no audio yet — run \`pnpm content:audio\``);
}
