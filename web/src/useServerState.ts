import { useSyncExternalStore } from "react";
import { getSnapshot, subscribe } from "./socket";

export function useServerState() {
  return useSyncExternalStore(subscribe, getSnapshot);
}
