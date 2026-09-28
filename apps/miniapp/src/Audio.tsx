// 🔊 pronunciation button. Files come from `pnpm content:audio` (apps/miniapp/public/audio); the button only shows when
// /audio/manifest.json lists the file. It sits inside the card (a <button>), so it is a span and stops the tap there.
import { audioPath, type AudioKind, type AudioManifest } from "@el/core/audio";
import { useEffect, useState, type KeyboardEvent, type MouseEvent } from "react";

let manifest: AudioManifest | null = null;
let loading: Promise<AudioManifest> | null = null;
function loadManifest(): Promise<AudioManifest> {
  loading ??= fetch("/audio/manifest.json")
    .then((r) => (r.ok ? (r.json() as Promise<AudioManifest>) : {}))
    .catch(() => ({}))
    .then((m) => (manifest = m));
  return loading;
}

let current: HTMLAudioElement | null = null;
function play(src: string) {
  // Created and started inside the tap handler: iOS (and Telegram's in-app browser) only allow sound after a user gesture.
  current?.pause();
  current = new Audio(src);
  current.play().catch(() => {});
}

export function Play({ id, kind }: { id: string; kind: AudioKind }) {
  const [ready, setReady] = useState(() => !!manifest?.[id]?.[kind]);
  useEffect(() => {
    let live = true;
    void loadManifest().then((m) => live && setReady(!!m[id]?.[kind]));
    return () => {
      live = false;
    };
  }, [id, kind]);
  if (!ready) return null;

  const onTap = (e: MouseEvent | KeyboardEvent) => {
    if ("key" in e && e.key !== "Enter" && e.key !== " ") return;
    e.stopPropagation();
    e.preventDefault();
    play(audioPath(id, kind));
  };
  return (
    <span className={`play ${kind}`} role="button" tabIndex={0} aria-label="Произношение" onClick={onTap} onKeyDown={onTap}>
      🔊
    </span>
  );
}
