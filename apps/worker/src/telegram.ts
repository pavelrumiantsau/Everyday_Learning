// Minimal Telegram Bot API client — only the calls we use.

export interface TgUser { id: number }
export interface TgMessage { message_id: number; from?: TgUser; chat: { id: number }; text?: string }
export interface TgPollAnswer { poll_id: string; user?: TgUser; option_ids: number[] }
export interface TgUpdate { update_id: number; message?: TgMessage; poll_answer?: TgPollAnswer }

export class Telegram {
  constructor(
    private readonly token: string,
    private readonly apiBase = "https://api.telegram.org", // overridden only by the local smoke test
  ) {}

  async call<T = unknown>(method: string, body: Record<string, unknown>): Promise<T> {
    const res = await fetch(`${this.apiBase}/bot${this.token}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { ok: boolean; result: T; description?: string };
    if (!data.ok) throw new Error(`Telegram ${method} failed: ${data.description ?? res.status}`);
    return data.result;
  }

  /** `webApp` adds a button under the message that opens the Mini App. */
  sendMessage(chatId: number | string, html: string, webApp?: { text: string; url: string }) {
    return this.call("sendMessage", {
      chat_id: chatId,
      text: html,
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
      ...(webApp && { reply_markup: { inline_keyboard: [[{ text: webApp.text, web_app: { url: webApp.url } }]] } }),
    });
  }

  /** Regular (non-quiz) poll, e.g. a multiple-choice checklist; non-anonymous so answers reach the bot. */
  sendPoll(chatId: number | string, question: string, options: string[], multiple = false) {
    return this.call<{ poll: { id: string } }>("sendPoll", {
      chat_id: chatId,
      question: question.slice(0, 300),
      options: options.map((text) => ({ text: text.slice(0, 100) })),
      is_anonymous: false,
      allows_multiple_answers: multiple,
    });
  }

  /** Quiz poll; must be non-anonymous so the answer reaches us as a poll_answer update. */
  sendQuiz(chatId: number | string, q: { question: string; options: string[]; correctIndex: number; explanation?: string }) {
    return this.call<{ poll: { id: string } }>("sendPoll", {
      chat_id: chatId,
      question: q.question.slice(0, 300),
      options: q.options.map((text) => ({ text: text.slice(0, 100) })),
      type: "quiz",
      is_anonymous: false,
      correct_option_id: q.correctIndex,
      explanation: q.explanation?.slice(0, 200),
      disable_notification: true,
    });
  }
}
