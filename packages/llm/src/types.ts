// Provider-neutral request/response shapes. Adapters translate them to each API with plain fetch.

export type Role = "system" | "user" | "assistant";
export interface ChatMessage {
  role: Role;
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  /** Ask the provider for a JSON object (response_format / responseMimeType). */
  json?: boolean;
  temperature?: number;
  maxTokens?: number;
}

export interface Usage {
  inputTokens: number;
  outputTokens: number;
  /** Speech-to-text only. */
  audioSeconds?: number;
}

export interface AdapterResult {
  text: string;
  usage: Usage;
  /** Speech-to-text: the language the model detected (e.g. "lithuanian"). */
  language?: string;
}

export interface TranscribeRequest {
  audio: Blob;
  filename: string;
  /** ISO-639-1 hint, e.g. "lt". Omit to let the model detect it. */
  language?: string;
}

export interface Adapter {
  chat(model: string, req: ChatRequest): Promise<AdapterResult>;
  transcribe?(model: string, req: TranscribeRequest): Promise<AdapterResult>;
}

export interface AdapterOptions {
  baseUrl: string;
  apiKey: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
  /** Extra fields merged into the request body (e.g. Groq's reasoning_effort). */
  extraBody?: Record<string, unknown>;
}

/** A failed provider call. `retryable` = worth trying again (429, 5xx, network, invalid output). */
export class ProviderError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly retryable = false,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

/** Thrown by the router when every provider in a task's chain failed or was skipped. */
export class LlmError extends Error {
  constructor(
    message: string,
    readonly attempts: string[],
  ) {
    super(message);
    this.name = "LlmError";
  }
}
