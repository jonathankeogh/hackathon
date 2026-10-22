import { useEffect, useState } from "react";
import type { Notice } from "@deadlock/shared/types";
import { socket } from "../socket";

// The latest weather/travel change, on top of whatever screen the phone is
// on. Comes from state so a refresh keeps it; the live "notice" event buzzes.
// Tap to dismiss.

export function NoticeBanner({ notices }: { notices?: Notice[] }) {
  const [dismissed, setDismissed] = useState<string | null>(null);
  useEffect(() => {
    const buzz = () => {
      if (navigator.userActivation?.hasBeenActive ?? true) navigator.vibrate?.([150, 80, 150]);
    };
    socket.on("notice", buzz);
    return () => {
      socket.off("notice", buzz);
    };
  }, []);

  const latest = notices?.at(-1);
  if (!latest || latest.id === dismissed) return null;
  return (
    <button
      data-testid="notice"
      onClick={() => setDismissed(latest.id)}
      className="mb-6 w-full border border-signal-amber p-4 text-left active:bg-fg/10"
    >
      <span className="flex items-center gap-2.5 font-mono text-[12px] uppercase tracking-[0.22em] text-signal-amber">
        <span className="h-2.5 w-2.5 rounded-full bg-signal-amber" />
        {latest.kind === "weather" ? "Weather changed" : "Travel changed"}
      </span>
      <span className="mt-2 block text-[17px] leading-snug">{latest.text.replace(/^(Weather|Travel) update: /, "")}</span>
    </button>
  );
}
