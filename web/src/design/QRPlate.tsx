import { QRCodeSVG } from "qrcode.react";
import { Label } from "./Label";
import { colors } from "./tokens";

export interface QRPlateProps {
  /** The URL or text to encode. */
  value: string;
  /** Edge of the plate in px, quiet zone included. Shrinks to fit narrow screens. Default 224. */
  size?: number;
  /** Show the short URL under the plate. Default true. */
  showUrl?: boolean;
}

/** QR spec quiet zone, in modules. It is part of the plate so it is never cropped. */
export const QUIET_ZONE_MODULES = 4;

export function shortUrl(url: string): string {
  return url.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "").replace(/\/$/, "");
}

/**
 * Dark modules on a light plate (the polarity phone cameras read most reliably) with the full
 * quiet zone inside the plate, and the short URL under it in mono.
 */
export function QRPlate({ value, size = 224, showUrl = true }: QRPlateProps) {
  return (
    <figure data-testid="qr-plate" style={{ margin: 0, display: "flex", flexDirection: "column", gap: 12, width: size, maxWidth: "100%" }}>
      <QRCodeSVG value={value} size={size} fgColor={colors.bg} bgColor={colors.text} marginSize={QUIET_ZONE_MODULES} level="M" style={{ display: "block", width: "100%", height: "auto" }} />
      {showUrl ? (
        <figcaption>
          <Label strong style={{ textTransform: "none", overflowWrap: "anywhere" }}>
            {shortUrl(value)}
          </Label>
        </figcaption>
      ) : null}
    </figure>
  );
}
