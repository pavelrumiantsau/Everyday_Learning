// Picture of a word. Files and /img/manifest.json come from `pnpm content:images` (apps/miniapp/public/img); nothing is
// shown unless the manifest lists the item. The version in the file name makes a redrawn picture replace the cached one.
import { imagePath, type ImageManifest } from "@el/core/image";
import { useEffect, useState } from "react";

let manifest: ImageManifest | null = null;
let loading: Promise<ImageManifest> | null = null;
function loadManifest(): Promise<ImageManifest> {
  loading ??= fetch("/img/manifest.json")
    .then((r) => (r.ok ? (r.json() as Promise<ImageManifest>) : {}))
    .catch(() => ({}))
    .then((m) => (manifest = m));
  return loading;
}

export function Picture({ id }: { id: string }) {
  const [, setLoaded] = useState(!!manifest);
  useEffect(() => {
    let live = true;
    void loadManifest().then(() => live && setLoaded(true));
    return () => {
      live = false;
    };
  }, []);
  const file = manifest?.[id];
  if (!file) return null;
  return <img className="picture" src={imagePath(file)} alt="" width={384} height={384} />;
}
