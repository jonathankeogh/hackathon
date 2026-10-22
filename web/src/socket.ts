import { io } from "socket.io-client";
import type { State } from "@deadlock/shared/types";

// /admin?key=… once on the presenter's phone; remembered after that. Only
// needed when the server sets ADMIN_KEY.
const ADMIN_KEY = "deadlock.adminKey";
try {
  const key = new URLSearchParams(location.search).get("key");
  if (key) localStorage.setItem(ADMIN_KEY, key);
} catch {
  // storage blocked: the key just isn't remembered
}

function adminKey() {
  try {
    return localStorage.getItem(ADMIN_KEY) ?? "";
  } catch {
    return "";
  }
}

// Same origin: Vite proxies /socket.io to the server in dev; Express serves both in prod.
export const socket = io({ auth: (cb) => cb({ adminKey: adminKey() }) });

// Keep the latest snapshot at module level so a component that mounts after
// the first `state` / `connect` event still sees it.
type Snapshot = { state: State | null; connected: boolean; streamed: string };
let snapshot: Snapshot = { state: null, connected: socket.connected, streamed: "" };
const listeners = new Set<() => void>();

function update(next: Partial<Snapshot>) {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((l) => l());
}

socket.on("connect", () => update({ connected: true }));
socket.on("disconnect", () => update({ connected: false }));
socket.on("state", (state: State) => {
  const previous = snapshot.state;
  const clear = !state.plan || state.plan.id !== previous?.plan?.id || state.plan.status !== "blocked"
    || Boolean(state.explanation) || Boolean(previous?.explanation && !state.explanation);
  update({ state, ...(clear ? { streamed: "" } : {}) });
});
socket.on("explain:chunk", ({ text, reset }: { text: string; reset?: boolean }) => update({ streamed: reset ? text : snapshot.streamed + text }));

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot() {
  return snapshot;
}
