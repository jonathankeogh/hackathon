import { useEffect, useState } from "react";
import type { EventDetails } from "@deadlock/shared/types";
import { socket } from "../socket";
import type { StateV2 } from "../stage/data/v2types";
import { useServerState } from "../useServerState";
import type { Emit } from "./useAdminActions";

export interface AdminConnection {
  state: StateV2 | null;
  connected: boolean;
  /** The server refused an admin event: the ADMIN_KEY is missing or wrong. */
  denied: boolean;
  /** The server has an ADMIN_KEY set. */
  locked: boolean;
  /** Person id the call goes to, or null for "most recent phone". */
  callTarget: string | null;
  /** A server announcement worth a toast (cascade ran, event booked), or null. */
  announced: { id: number; text: string } | null;
}

export const liveEmit: Emit = (event, payload) => {
  socket.emit(event, payload);
};

/** The live socket: server state plus the admin-only events (admin:info, admin:denied, cascade, booked). */
export function useAdminConnection(): AdminConnection {
  const { state, connected } = useServerState();
  const [info, setInfo] = useState<{ callTarget: string | null; locked: boolean }>({ callTarget: null, locked: false });
  const [denied, setDenied] = useState(false);
  const [announced, setAnnounced] = useState<AdminConnection["announced"]>(null);

  useEffect(() => {
    let seq = 0;
    const say = (text: string) => setAnnounced({ id: ++seq, text });
    const onInfo = (i: { callTarget: string | null; locked: boolean }) => setInfo({ callTarget: i.callTarget || null, locked: i.locked });
    const onDenied = () => setDenied(true);
    const onCascade = ({ order }: { order: string[] }) => say(`Cascade ran, ${order.length} unlocked`);
    const onBooked = (e: EventDetails) => say(`Booked: ${e.title}`);
    socket.on("admin:info", onInfo);
    socket.on("admin:denied", onDenied);
    socket.on("cascade", onCascade);
    socket.on("booked", onBooked);
    return () => {
      socket.off("admin:info", onInfo);
      socket.off("admin:denied", onDenied);
      socket.off("cascade", onCascade);
      socket.off("booked", onBooked);
    };
  }, []);

  return { state, connected, denied, locked: info.locked, callTarget: info.callTarget, announced };
}
