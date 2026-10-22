import { useCallback, useEffect, useReducer } from "react";
import { socket } from "../socket";
import { initialWaState, reduceWa, type WaState, type WaStatus } from "./flow";

export interface WaSocket {
  wa: WaStatus | null;
  /** The server said this page needs the admin link. */
  denied: boolean;
  /** Unlink and ask the bridge for a fresh QR ("wa:new"). */
  startNew: () => void;
}

/**
 * The WhatsApp link state from the server. Watches on connect, follows "wa:status", reports
 * "admin:denied". With `preset` (dev mock) the socket is left alone and the preset is shown.
 */
export function useWaSocket(preset: WaStatus | null = null): WaSocket {
  const [state, dispatch] = useReducer(reduceWa, preset ? { wa: preset, awaitingFresh: false } : initialWaState);
  const [denied, markDenied] = useReducer(() => true, false);

  useEffect(() => {
    if (preset) return;
    const watch = () => socket.emit("wa:watch");
    const onStatus = (status: WaStatus) => dispatch({ type: "status", status });
    if (socket.connected) watch();
    socket.on("connect", watch);
    socket.on("wa:status", onStatus);
    socket.on("admin:denied", markDenied);
    return () => {
      socket.off("connect", watch);
      socket.off("wa:status", onStatus);
      socket.off("admin:denied", markDenied);
    };
  }, [preset]);

  const startNew = useCallback(() => {
    dispatch({ type: "started" });
    if (!preset) socket.emit("wa:new");
  }, [preset]);

  return { wa: (state as WaState).wa, denied, startNew };
}
