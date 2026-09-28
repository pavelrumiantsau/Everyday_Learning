import type { CardJson } from "@el/core";

export interface CardRow { card_id: string; item_id: string; fsrs: string }

export class Db {
  constructor(private readonly d1: D1Database) {}

  async introducedItemIds(): Promise<Set<string>> {
    const { results } = await this.d1.prepare("SELECT DISTINCT item_id FROM card_state").all<{ item_id: string }>();
    return new Set(results.map((r) => r.item_id));
  }

  /** Due cards, oldest first; `kind` limits to one card type (e.g. "recog" for quiz polls). */
  async dueCards(now: number, limit: number, kind?: string): Promise<CardRow[]> {
    const { results } = await this.d1
      .prepare("SELECT card_id, item_id, fsrs FROM card_state WHERE due <= ? AND card_id LIKE ? ORDER BY due LIMIT ?")
      .bind(now, kind ? `%:${kind}` : "%", limit)
      .all<CardRow>();
    return results;
  }

  async cardIds(): Promise<Set<string>> {
    const { results } = await this.d1.prepare("SELECT card_id FROM card_state").all<{ card_id: string }>();
    return new Set(results.map((r) => r.card_id));
  }

  async countDue(now: number): Promise<number> {
    return (await this.d1.prepare("SELECT COUNT(*) AS n FROM card_state WHERE due <= ?").bind(now).first<number>("n")) ?? 0;
  }

  async countCards(): Promise<Record<string, number>> {
    const { results } = await this.d1
      .prepare("SELECT lang, COUNT(DISTINCT item_id) AS n FROM card_state GROUP BY lang")
      .all<{ lang: string; n: number }>();
    return Object.fromEntries(results.map((r) => [r.lang, r.n]));
  }

  insertCard(cardId: string, itemId: string, lang: string, card: CardJson & { due: Date }, now: number) {
    return this.d1
      .prepare("INSERT OR IGNORE INTO card_state (card_id, item_id, lang, due, fsrs, introduced_at) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(cardId, itemId, lang, card.due.getTime(), JSON.stringify(card), now);
  }

  async getCard(cardId: string): Promise<CardRow | null> {
    return this.d1.prepare("SELECT card_id, item_id, fsrs FROM card_state WHERE card_id = ?").bind(cardId).first<CardRow>();
  }

  updateCard(cardId: string, card: CardJson & { due: Date }) {
    return this.d1
      .prepare("UPDATE card_state SET due = ?, fsrs = ? WHERE card_id = ?")
      .bind(card.due.getTime(), JSON.stringify(card), cardId);
  }

  logReview(cardId: string, rating: number, at: number, source: string, id: string = crypto.randomUUID()) {
    return this.d1
      .prepare("INSERT INTO review_event (id, card_id, rating, reviewed_at, source) VALUES (?, ?, ?, ?, ?)")
      .bind(id, cardId, rating, at, source);
  }

  async reviewExists(id: string): Promise<boolean> {
    return (await this.d1.prepare("SELECT 1 AS x FROM review_event WHERE id = ?").bind(id).first()) !== null;
  }

  mapPoll(pollId: string, cardId: string, correct: number, at: number) {
    return this.d1
      .prepare("INSERT INTO poll_map (poll_id, card_id, correct_option, sent_at) VALUES (?, ?, ?, ?)")
      .bind(pollId, cardId, correct, at);
  }

  /** Marks the poll answered and returns it, or null if unknown / already answered. */
  async claimPoll(pollId: string, at: number): Promise<{ card_id: string; correct_option: number } | null> {
    return this.d1
      .prepare("UPDATE poll_map SET answered_at = ? WHERE poll_id = ? AND answered_at IS NULL RETURNING card_id, correct_option")
      .bind(at, pollId)
      .first();
  }

  async getDay(day: string) {
    return (
      (await this.d1.prepare("SELECT * FROM activity_day WHERE day = ?").bind(day).first<{
        reviews: number;
        new_cards: number;
        morning_sent: number;
        evening_sent: number;
        paused: number;
      }>()) ?? { reviews: 0, new_cards: 0, morning_sent: 0, evening_sent: 0, paused: 0 }
    );
  }

  /** Atomically sets a flag once; returns true only for the caller that set it (guards against double sends). */
  async claimDayFlag(day: string, flag: "morning_sent" | "evening_sent"): Promise<boolean> {
    await this.d1.prepare("INSERT OR IGNORE INTO activity_day (day) VALUES (?)").bind(day).run();
    const r = await this.d1.prepare(`UPDATE activity_day SET ${flag} = 1 WHERE day = ? AND ${flag} = 0`).bind(day).run();
    return r.meta.changes === 1;
  }

  bumpDay(day: string, field: "reviews" | "new_cards", by = 1) {
    return this.d1
      .prepare(`INSERT INTO activity_day (day, ${field}) VALUES (?, ?) ON CONFLICT(day) DO UPDATE SET ${field} = ${field} + ?`)
      .bind(day, by, by);
  }

  async placedItemIds(): Promise<Set<string>> {
    const { results } = await this.d1.prepare("SELECT item_id FROM placement").all<{ item_id: string }>();
    return new Set(results.map((r) => r.item_id));
  }

  savePlacement(itemId: string, known: boolean, at: number) {
    return this.d1
      .prepare("INSERT OR IGNORE INTO placement (item_id, known, placed_at) VALUES (?, ?, ?)")
      .bind(itemId, known ? 1 : 0, at);
  }

  async placementStats(): Promise<{ known: number; unknown: number }> {
    const r = await this.d1
      .prepare("SELECT COALESCE(SUM(known), 0) AS known, COUNT(*) - COALESCE(SUM(known), 0) AS unknown FROM placement")
      .first<{ known: number; unknown: number }>();
    return r ?? { known: 0, unknown: 0 };
  }

  async getSetting<T>(key: string): Promise<T | null> {
    const v = await this.d1.prepare("SELECT value FROM settings WHERE key = ?").bind(key).first<string>("value");
    return v === null ? null : (JSON.parse(v) as T);
  }

  setSetting(key: string, value: unknown) {
    return this.d1
      .prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
      .bind(key, JSON.stringify(value));
  }

  async activityHistory(fromDay: string): Promise<{ day: string; reviews: number; new_cards: number; paused: number }[]> {
    const { results } = await this.d1
      .prepare("SELECT day, reviews, new_cards, paused FROM activity_day WHERE day >= ? ORDER BY day")
      .bind(fromDay)
      .all<{ day: string; reviews: number; new_cards: number; paused: number }>();
    return results;
  }

  setPaused(day: string, paused: boolean) {
    return this.d1
      .prepare("INSERT INTO activity_day (day, paused) VALUES (?, ?) ON CONFLICT(day) DO UPDATE SET paused = excluded.paused")
      .bind(day, paused ? 1 : 0);
  }

  clearPausedFrom(day: string) {
    return this.d1.prepare("UPDATE activity_day SET paused = 0 WHERE day >= ?").bind(day);
  }

  /** Meaning-card states, to decide when reverse cards are added. */
  async recogStates(): Promise<{ item_id: string; fsrs: string }[]> {
    const { results } = await this.d1
      .prepare("SELECT item_id, fsrs FROM card_state WHERE card_id LIKE '%:recog'")
      .all<{ item_id: string; fsrs: string }>();
    return results;
  }

  /** Share of correct answers (Good/Easy) in the period, excluding placement answers. */
  async retention(sinceMs: number): Promise<{ total: number; correct: number }> {
    const r = await this.d1
      .prepare("SELECT COUNT(*) AS total, COALESCE(SUM(rating >= 3), 0) AS correct FROM review_event WHERE reviewed_at >= ? AND source != 'placement'")
      .bind(sinceMs)
      .first<{ total: number; correct: number }>();
    return r ?? { total: 0, correct: 0 };
  }

  batch(stmts: D1PreparedStatement[]) {
    return this.d1.batch(stmts);
  }
}
