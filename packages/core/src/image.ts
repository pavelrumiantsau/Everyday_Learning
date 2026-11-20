// Pictures for vocabulary items: where the files live. scripts/images.py builds the manifest from hand-drawn SVG files
// and from pictures it generates; the Mini App uses the manifest (items without a picture are simply not listed).

/** /img/manifest.json: item id → file inside /img with its version, e.g. "es/es-w-1264.svg?v=1a2b3c4d5e". */
export type ImageManifest = Record<string, string>;

/** URL of a picture inside the Mini App (served from apps/miniapp/public/img). */
export function imagePath(file: string): string {
  return `/img/${file}`;
}
