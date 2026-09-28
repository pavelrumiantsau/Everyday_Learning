// D1 queries for the AI layer (tables from migrations/0005_ai.sql).
import type { ChatMessage, Mistake, TargetLang, UsageEntry, UsageStore } from "@el/llm";

export interface TutorSession { id: number; lang: TargetLang; topic: string | null; last_at: number }

/** An open tutor session ends by itself after this much silence, so stray texts days later get writing feedback instead. */
export const SESSION_IDLE_MS = 3 * 60 * 60 * 1000;
/** Turns sent as context: the last ~10 exchanges. */
const CONTEXT_TURNS = 20;

export class AiStore implements UsageStore {
  constructor(private readonly d1: D1Database) {}

  // --- usage log + budget guard ---
  async log(e: UsageEntry): Promise<void> {
    await this.d1
      .prepare(
        "INSERT INTO llm_usage (at, task, provider, model, ok, input_tokens, output_tokens, audio_seconds, cost_usd, latency_ms, error) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(e.at, e.task, e.provider, e.model, e.ok ? 1 : 0, e.inputTokens, e.outputTokens, e.audioSeconds, e.costUsd, e.latencyMs, e.error ?? null)
      .run();
  }

  async monthlySpend(provider: string, monthStart: number): Promise<number> {
    return (await this.d1.prepare("SELECT COALESCE(SUM(cost_usd), 0) AS s FROM llm_usage WHERE provider = ? AND at >= ?").bind(provider, monthStart).first<number>("s")) ?? 0;
  }

  async usageSince(since: number) {
    const { results } = await this.d1
      .prepare(
        "SELECT provider, model, COUNT(*) AS calls, SUM(ok) AS ok, SUM(input_tokens) AS input_tokens, SUM(output_tokens) AS output_tokens, SUM(audio_seconds) AS audio_seconds, SUM(cost_usd) AS cost_usd FROM llm_usage WHERE at >= ? GROUP BY provider, model ORDER BY calls DESC",
      )
      .bind(since)
      .all<{ provider: string; model: string; calls: number; ok: number; input_tokens: number; output_tokens: number; audio_seconds: number; cost_usd: number }>();
    return results;
  }

  // --- tutor sessions ---
  /** The open session, or null. A session idle for too long is closed on the way. */
  async activeSession(now: number): Promise<TutorSession | null> {
    const s = await this.d1.prepare("SELECT id, lang, topic, last_at FROM tutor_session WHERE ended_at IS NULL ORDER BY id DESC LIMIT 1").first<TutorSession>();
    if (!s) return null;
    if (now - s.last_at > SESSION_IDLE_MS) {
      await this.endSessions(now);
      return null;
    }
    return s;
  }

  /** Ends any open session and starts a new one. */
  async startSession(lang: TargetLang, topic: string | null, now: number): Promise<TutorSession> {
    await this.endSessions(now);
    const r = await this.d1
      .prepare("INSERT INTO tutor_session (lang, topic, started_at, last_at) VALUES (?, ?, ?, ?) RETURNING id")
      .bind(lang, topic, now, now)
      .first<{ id: number }>();
    return { id: r!.id, lang, topic, last_at: now };
  }

  /** Returns how many sessions were open. */
  async endSessions(now: number): Promise<number> {
    const r = await this.d1.prepare("UPDATE tutor_session SET ended_at = ? WHERE ended_at IS NULL").bind(now).run();
    return r.meta.changes;
  }

  async sessionTurnCount(sessionId: number): Promise<number> {
    return (await this.d1.prepare("SELECT COUNT(*) AS n FROM tutor_turn WHERE session_id = ? AND role = 'user'").bind(sessionId).first<number>("n")) ?? 0;
  }

  async recentTurns(sessionId: number): Promise<ChatMessage[]> {
    const { results } = await this.d1
      .prepare("SELECT role, content FROM tutor_turn WHERE session_id = ? ORDER BY id DESC LIMIT ?")
      .bind(sessionId, CONTEXT_TURNS)
      .all<{ role: "user" | "assistant"; content: string }>();
    return results.reverse().map((r) => ({ role: r.role, content: r.content }));
  }

  addTurn(sessionId: number, role: "user" | "assistant", content: string, at: number) {
    return this.d1.prepare("INSERT INTO tutor_turn (session_id, role, content, at) VALUES (?, ?, ?, ?)").bind(sessionId, role, content, at);
  }

  touchSession(sessionId: number, at: number) {
    return this.d1.prepare("UPDATE tutor_session SET last_at = ? WHERE id = ?").bind(at, sessionId);
  }

  // --- mistakes ---
  addMistake(lang: TargetLang, m: Mistake, source: "tutor" | "writing" | "voice", day: string, at: number) {
    return this.d1
      .prepare("INSERT INTO mistakes (lang, original, corrected, explanation, source, day, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(lang, m.original.slice(0, 500), m.corrected.slice(0, 500), m.explanation.slice(0, 500), source, day, at);
  }

  async mistakeCount(since: number): Promise<number> {
    return (await this.d1.prepare("SELECT COUNT(*) AS n FROM mistakes WHERE created_at >= ?").bind(since).first<number>("n")) ?? 0;
  }

  batch(stmts: D1PreparedStatement[]) {
    return stmts.length ? this.d1.batch(stmts) : Promise.resolve([]);
  }
}
