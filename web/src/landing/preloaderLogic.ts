/** The preloader plays once per browser session, and never under reduced motion. */

export const PRELOADER_KEY = "deadlock.preloader";

/** Timeline in ms: the board flips in, the lamps go red, amber, green, then it lifts. */
export const PRELOADER = {
  flipStart: 60,
  red: 120,
  amber: 520,
  green: 920,
  lift: 1080,
  done: 1440,
} as const;

type StorageLike = Pick<Storage, "getItem" | "setItem">;

function sessionStore(): StorageLike | null {
  try {
    return typeof sessionStorage === "undefined" ? null : sessionStorage;
  } catch {
    return null;
  }
}

export function hasSeenPreloader(store: StorageLike | null = sessionStore()): boolean {
  try {
    return store?.getItem(PRELOADER_KEY) === "1";
  } catch {
    return false;
  }
}

export function markPreloaderSeen(store: StorageLike | null = sessionStore()): void {
  try {
    store?.setItem(PRELOADER_KEY, "1");
  } catch {
    // storage blocked: the preloader may play again next load, which is harmless
  }
}

/** Show it on the first load of a session, and never when the visitor asks for less motion. */
export function shouldShowPreloader(reducedMotion: boolean, store: StorageLike | null = sessionStore()): boolean {
  return !reducedMotion && !hasSeenPreloader(store);
}

/** 0 no lamp lit, 1 red, 2 amber, 3 green, for a time t ms into the preloader. */
export function lampStep(t: number): 0 | 1 | 2 | 3 {
  if (t >= PRELOADER.green) return 3;
  if (t >= PRELOADER.amber) return 2;
  if (t >= PRELOADER.red) return 1;
  return 0;
}
