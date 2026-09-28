import { ProviderError } from "../types";

const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * POST and parse JSON. Non-2xx → ProviderError (retryable on 408/429/5xx); network errors and timeouts are retryable.
 * Error messages carry only the status and a short excerpt of the provider's error — never the request (keys, user text).
 */
export async function postJson<T>(
  url: string,
  init: { headers: Record<string, string>; body: BodyInit },
  opts: { fetch?: typeof fetch; timeoutMs?: number; label: string },
): Promise<T> {
  const f = opts.fetch ?? fetch;
  let res: Response;
  try {
    res = await f(url, { method: "POST", headers: init.headers, body: init.body, signal: AbortSignal.timeout(opts.timeoutMs ?? DEFAULT_TIMEOUT_MS) });
  } catch (err) {
    const name = err instanceof Error ? err.name : "error";
    throw new ProviderError(`${opts.label}: network ${name}`, undefined, true);
  }
  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 200);
    const retryable = res.status === 408 || res.status === 429 || res.status >= 500;
    throw new ProviderError(`${opts.label}: HTTP ${res.status} ${detail}`, res.status, retryable);
  }
  try {
    return (await res.json()) as T;
  } catch {
    throw new ProviderError(`${opts.label}: response is not JSON`, res.status, true);
  }
}

export const trimSlash = (url: string) => url.replace(/\/+$/, "");
