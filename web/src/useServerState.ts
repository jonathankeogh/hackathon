import { useSyncExternalStore } from "react";
import { getSnapshot, subscribe } from "./socket";

export function useServerState() {
  const snap = useSyncExternalStore(subscribe, getSnapshot);
  // The final explanation once it lands, the streamed words until then.
  return { ...snap, explanation: snap.state?.explanation || snap.streamed };
}
