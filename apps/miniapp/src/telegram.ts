// The small part of window.Telegram.WebApp that we use (https://core.telegram.org/bots/webapps).
interface WebApp {
  initData: string;
  colorScheme: "light" | "dark";
  ready(): void;
  expand(): void;
  BackButton: { show(): void; hide(): void; onClick(cb: () => void): void; offClick(cb: () => void): void };
  openLink?(url: string): void;
  close?(): void;
  HapticFeedback?: { impactOccurred(style: "light" | "medium"): void; notificationOccurred(type: "success" | "warning" | "error"): void };
  platform?: string; // "android", "ios", "tdesktop", "weba", …
  isVersionAtLeast?(version: string): boolean;
  /** Bot API 8.0+: a home screen shortcut that opens the Mini App directly (Android; "unsupported" elsewhere). */
  addToHomeScreen?(): void;
  checkHomeScreenStatus?(cb: (status: "unsupported" | "unknown" | "added" | "missed") => void): void;
}

declare global {
  interface Window {
    Telegram?: { WebApp?: WebApp };
  }
}

export const tg: WebApp | undefined = window.Telegram?.WebApp?.initData ? window.Telegram.WebApp : undefined;

export function haptic(kind: "tap" | "done") {
  try {
    if (kind === "tap") tg?.HapticFeedback?.impactOccurred("light");
    else tg?.HapticFeedback?.notificationOccurred("success");
  } catch {
    // older Telegram clients
  }
}

/** External links: Telegram's in-app browser when available, else a new tab. */
export function openLink(url: string) {
  if (tg?.openLink) tg.openLink(url);
  else window.open(url, "_blank", "noopener");
}
