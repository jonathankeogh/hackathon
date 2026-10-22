import { io } from "socket.io-client";
import type { State } from "@deadlock/shared/types";

// Same origin: Vite proxies /socket.io to the server in dev; Express serves both in prod.
export const socket = io();

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
socket.on("state", (state: State) => update(state.explanation ? { state } : { state, streamed: "" }));
socket.on("explain:chunk", ({ text }: { text: string }) => update({ streamed: snapshot.streamed + text }));

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot() {
  return snapshot;
}
