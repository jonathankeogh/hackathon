import { borders, colors } from "./tokens";

export interface DividerProps {
  /** Vertical divider for use inside a row. Default horizontal. */
  vertical?: boolean;
}

/** A hairline in the divider colour. */
export function Divider({ vertical = false }: DividerProps) {
  return (
    <div
      role="separator"
      aria-orientation={vertical ? "vertical" : "horizontal"}
      style={{
        flex: "none",
        alignSelf: "stretch",
        background: colors.divider,
        ...(vertical ? { width: borders.hairline } : { height: borders.hairline, width: "100%" }),
      }}
    />
  );
}
