// The small part of window.Telegram.WebApp that we use (https://core.telegram.org/bots/webapps).
interface WebApp {
  initData: string;
  colorScheme: "light" | "dark";
  ready(): void;
  expand(): void;
  BackButton: { show(): void; hide(): void; onClick(cb: () => void): void; offClick(cb: () => void): void };
  HapticFeedback?: { impactOccurred(style: "light" | "medium"): void; notificationOccurred(type: "success" | "warning" | "error"): void };
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
