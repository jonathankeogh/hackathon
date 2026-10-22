import type { CSSProperties } from "react";
import type { Person } from "@deadlock/shared/types";
import { useStageScale } from "../layout/StageScale";
import { colors, fonts } from "../tokens";

export const SWATCH = 10;

interface Props {
  person: Person | undefined;
  /** Text to show instead of the full name (for example the first name). */
  label?: string;
  /** Shown when the person is unknown. */
  fallback?: string;
  size?: number | string;
  style?: CSSProperties;
}

/**
 * A person's name in the foreground colour, preceded by a 10px square filled with their
 * colour. The colour is a fill, never a text colour.
 */
export function PersonName({ person, label, fallback = "UNKNOWN", size, style }: Props) {
  const scale = useStageScale();
  return (
    <span
      data-testid="person-name"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        minWidth: 0,
        fontFamily: fonts.mono,
        fontSize: size ?? scale.label,
        fontWeight: 600,
        textTransform: "uppercase",
        color: colors.text,
        ...style,
      }}
    >
      <span data-testid="person-swatch" style={{ width: SWATCH, height: SWATCH, flex: "none", background: person?.color ?? colors.text }} />
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label ?? person?.name ?? fallback}</span>
    </span>
  );
}
