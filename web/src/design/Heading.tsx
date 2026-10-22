import type { CSSProperties, ReactNode } from "react";
import { colors, fonts, textStyle } from "./tokens";

export interface HeadingProps {
  children?: ReactNode;
  /** Semantic level; also the default size (1 is display, 2 and 3 are title). */
  level?: 1 | 2 | 3;
  /** Override the size independently of the level. */
  size?: "display" | "title";
  /** Plex Mono capitals, like a departures board header. Default Plex Sans. */
  mono?: boolean;
  className?: string;
  style?: CSSProperties;
}

/** Display and title headings. One display heading per screen. */
export function Heading({ children, level = 1, size, mono = false, className, style }: HeadingProps) {
  const Tag = `h${level}` as "h1" | "h2" | "h3";
  const role = size ?? (level === 1 ? "display" : "title");
  return (
    <Tag
      className={className}
      style={{
        margin: 0,
        ...textStyle(role),
        color: colors.text,
        ...(mono ? { fontFamily: fonts.mono, textTransform: "uppercase" as const } : null),
        overflowWrap: "break-word",
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}
