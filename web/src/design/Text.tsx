import type { CSSProperties, ElementType, ReactNode } from "react";
import { alphas, colors, textStyle, withAlpha } from "./tokens";

export interface TextProps {
  children?: ReactNode;
  /** "body" (default) or "small". */
  size?: "body" | "small";
  /** Secondary text at the 60% read step. */
  muted?: boolean;
  /** Element to render. Default p. */
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
}

/** Plex Sans body copy. Never coloured: the text colour or its 60% variant. */
export function Text({ children, size = "body", muted = false, as: Tag = "p", className, style }: TextProps) {
  return (
    <Tag className={className} style={{ margin: 0, ...textStyle(size), color: muted ? withAlpha("text", alphas.read) : colors.text, ...style }}>
      {children}
    </Tag>
  );
}
