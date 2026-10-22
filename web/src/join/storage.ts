import type { Saved } from "./model";

const KEY = "deadlock.phone";

export function load(): Saved | null {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "null");
  } catch {
    return null;
  }
}

export function save(v: Saved | null): void {
  try {
    if (v) localStorage.setItem(KEY, JSON.stringify(v));
    else localStorage.removeItem(KEY);
  } catch {
    // storage blocked (private mode): the phone just won't survive a refresh
  }
}
