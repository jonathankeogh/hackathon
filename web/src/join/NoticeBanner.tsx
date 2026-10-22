import { useEffect, useState } from "react";
import type { Notice } from "@deadlock/shared/types";
import { Label, SignalLamp, Text } from "../design";
import { socket } from "../socket";
import { buzz } from "./model";
import "./join.css";

const sentence = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/**
 * The latest weather/travel change, on top of whatever screen the phone is on. Comes from
 * state so a refresh keeps it; the live "notice" event buzzes. Tap to dismiss.
 */
export function NoticeBanner({ notices }: { notices?: Notice[] }) {
  const [dismissed, setDismissed] = useState<string | null>(null);
  useEffect(() => {
    const onNotice = () => buzz([150, 80, 150]);
    socket.on("notice", onNotice);
    return () => {
      socket.off("notice", onNotice);
    };
  }, []);

  const latest = notices?.at(-1);
  if (!latest || latest.id === dismissed) return null;
  return (
    <button type="button" data-testid="notice" className="jn-notice ds-focusable" onClick={() => setDismissed(latest.id)}>
      <SignalLamp state="amber" size="sm" />
      <span className="jn-notice-text">
        <Label strong>{latest.kind === "weather" ? "Weather changed" : "Travel changed"}</Label>
        <Text>{sentence(latest.text.replace(/^(Weather|Travel) update: /, ""))}</Text>
      </span>
    </button>
  );
}
