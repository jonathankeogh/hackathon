// One way to call a public API: JSON out, hard timeout, null on any failure.
// The demo never waits on the network for longer than `timeoutMs`.

export type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

export async function getJSON<T = unknown>(url: string, timeoutMs = 5000, fetcher: Fetcher = fetch): Promise<T | null> {
  try {
    const res = await fetcher(url, { signal: AbortSignal.timeout(timeoutMs), headers: { accept: "application/json" } });
    if (!res.ok) {
      log(url, `HTTP ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    log(url, (err as Error).message);
    return null;
  }
}

function log(url: string, outcome: string) {
  if (process.env.NODE_ENV !== "test" && !process.env.VITEST) {
    // Never print query strings: they can carry API keys.
    console.warn(`[http] ${url.split("?")[0]} ${outcome}`);
  }
}
