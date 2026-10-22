import { useEffect } from "react";

/**
 * Keeps the presenter's phone awake while the panel is open, so the socket is not dropped by
 * the screen sleeping mid-show. Best effort: browsers without the API, or that refuse, are fine.
 */
export function useWakeLock() {
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    let stopped = false;
    const acquire = async () => {
      try {
        if (!stopped && document.visibilityState === "visible" && navigator.wakeLock) lock = await navigator.wakeLock.request("screen");
      } catch {
        // unsupported or refused: the panel works without it
      }
    };
    void acquire();
    document.addEventListener("visibilitychange", acquire);
    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", acquire);
      void lock?.release().catch(() => undefined);
    };
  }, []);
}
