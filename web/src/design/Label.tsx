import type { CSSProperties, ElementType, ReactNode } from "react";
import { alphas, colors, textStyle, withAlpha } from "./tokens";

export interface LabelProps {
  children?: ReactNode;
  /** Full-strength text instead of the default 60% read step. */
  strong?: boolean;
  /** Element to render. Default span; use "label" with htmlFor for a form label. */
  as?: ElementType;
  htmlFor?: string;
  id?: string;
  className?: string;
  style?: CSSProperties;
}

/** Plex Mono capitals for labels and data. Capitals only, no letter-spacing. */
export function Label({ children, strong = false, as: Tag = "span", htmlFor, id, className, style }: LabelProps) {
  return (
    <Tag
      id={id}
      htmlFor={htmlFor}
      className={className}
      style={{ ...textStyle("label"), textTransform: "uppercase", color: strong ? colors.text : withAlpha("text", alphas.read), ...style }}
    >
      {children}
    </Tag>
  );
}
