// ⚠️ on a card: report wrong content (meaning, forms, example). The coordinator lists reports with `pnpm content:reports`.
import { useState } from "react";
import { reportItem } from "./api";
import { haptic } from "./telegram";

export function ReportButton({ itemId, cardId }: { itemId: string; cardId: string }) {
  const [state, setState] = useState<"idle" | "asking" | "sent">("idle");
  const [text, setText] = useState("");
  if (state === "sent") return <span className="hint small report">Спасибо, исправлю 🙏</span>;
  if (state === "idle") {
    return (
      <button className="report link" onClick={() => setState("asking")} aria-label="Сообщить об ошибке">
        ⚠️ ошибка?
      </button>
    );
  }
  const send = async () => {
    haptic("tap");
    await reportItem({ itemId, cardId, text: text.trim() || undefined }).catch(() => undefined);
    setState("sent");
  };
  return (
    <span className="report-form">
      <input className="text-input" autoFocus placeholder="Что не так? (необязательно)" value={text} maxLength={500} onChange={(e) => setText(e.target.value)} />
      <button className="button" onClick={() => void send()}>Отправить</button>
    </span>
  );
}
