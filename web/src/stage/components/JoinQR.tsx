import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { alphas, colors, fonts, type, withAlpha } from "../tokens";

/** Build-time or same-origin fallback, used while `/api/config` loads and when it fails. */
export function joinUrl(): string {
  const env = import.meta.env.VITE_JOIN_URL as string | undefined;
  return env && env.length > 0 ? env : `${window.location.origin}/join`;
}

/**
 * Fetches the phone-reachable join URL (tunnel or LAN IP) from `GET /api/config`, once on mount.
 * Returns the fallback until the fetch succeeds, so a failed or slow config never breaks the QR.
 */
export function useJoinUrl(): string {
  const [fetched, setFetched] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/config")
      .then((r) => r.json())
      .then((c: { joinUrl?: unknown }) => {
        if (!cancelled && typeof c.joinUrl === "string" && c.joinUrl.length > 0) setFetched(c.joinUrl);
      })
      .catch(() => {
        // Keep the fallback. The stage must not throw or spam the console when the server is down.
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return fetched ?? joinUrl();
}

export function shortUrl(url: string): string {
  return url.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "");
}

/** Edge of the QR plate in px, quiet zone included. At least 220 so it scans from the back of a room. */
export const QR_SIZE = 232;
/** Quiet zone in modules (the QR spec asks for 4). It is part of the plate, so it is never cropped. */
export const QUIET_ZONE_MODULES = 4;

export interface JoinQRProps {
  size?: number;
  url?: string;
}

/**
 * Dark modules on a light plate (the most reliable polarity for phone cameras) with the full
 * quiet zone inside the plate, and the short URL in small mono underneath.
 */
export function JoinQR({ size = QR_SIZE, url }: JoinQRProps) {
  const fromServer = useJoinUrl();
  const target = url ?? fromServer;
  return (
    <div data-testid="join-qr" style={{ display: "flex", flexDirection: "column", gap: 10, width: size, flex: "none", fontFamily: fonts.mono }}>
      <QRCodeSVG value={target} size={size} fgColor={colors.bg} bgColor={colors.text} marginSize={QUIET_ZONE_MODULES} level="M" style={{ display: "block" }} />
      <div style={{ fontSize: type.small, fontWeight: 500, color: withAlpha("text", alphas.read), overflowWrap: "anywhere" }}>{shortUrl(target)}</div>
    </div>
  );
}
