import { useEffect, useState } from "react";

/** The short audience join URL from GET /api/config, or null while loading or if it fails. */
export function useJoinUrl(): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/config")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`config ${res.status}`))))
      .then((cfg: { joinUrl?: unknown }) => {
        if (alive && typeof cfg.joinUrl === "string") setUrl(cfg.joinUrl);
      })
      .catch(() => {
        // no join QR without a URL: the rest of the page still works
      });
    return () => {
      alive = false;
    };
  }, []);
  return url;
}
