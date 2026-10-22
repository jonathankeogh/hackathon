import { describe, expect, it } from "vitest";
import { hasSeenPreloader, lampStep, markPreloaderSeen, PRELOADER, PRELOADER_KEY, shouldShowPreloader } from "./preloaderLogic";

function memory(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
}

describe("preloader once per session", () => {
  it("shows on the first load, then never again in the same session", () => {
    const store = memory();
    expect(shouldShowPreloader(false, store)).toBe(true);
    markPreloaderSeen(store);
    expect(store.getItem(PRELOADER_KEY)).toBe("1");
    expect(hasSeenPreloader(store)).toBe(true);
    expect(shouldShowPreloader(false, store)).toBe(false);
  });

  it("is skipped under reduced motion without touching storage", () => {
    expect(shouldShowPreloader(true, memory())).toBe(false);
  });

  it("survives blocked storage: shows, and does not throw", () => {
    const blocked = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(shouldShowPreloader(false, blocked)).toBe(true);
    expect(() => markPreloaderSeen(blocked)).not.toThrow();
    expect(shouldShowPreloader(false, null)).toBe(true);
  });
});

describe("preloader timeline", () => {
  it("lights red, amber, green in order and finishes under 1.5 seconds", () => {
    expect(PRELOADER.red).toBeLessThan(PRELOADER.amber);
    expect(PRELOADER.amber).toBeLessThan(PRELOADER.green);
    expect(PRELOADER.green).toBeLessThan(PRELOADER.lift);
    expect(PRELOADER.lift).toBeLessThan(PRELOADER.done);
    expect(PRELOADER.done).toBeLessThan(1500);
    expect([0, PRELOADER.red, PRELOADER.amber, PRELOADER.green].map(lampStep)).toEqual([0, 1, 2, 3]);
  });
});
