import type { CSSProperties, ElementType, ReactNode } from "react";
import type { Space } from "./tokens";

export interface StackProps {
  children?: ReactNode;
  /** Gap in px from the spacing scale. Default 16. */
  gap?: Space | 0;
  /** "column" (default) or "row". */
  direction?: "column" | "row";
  align?: CSSProperties["alignItems"];
  justify?: CSSProperties["justifyContent"];
  wrap?: boolean;
  /** Element to render. Default div. */
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
}

/** Flex layout with a gap from the spacing scale. The only layout primitive pages need. */
export function Stack({ children, gap = 16, direction = "column", align, justify, wrap = false, as: Tag = "div", className, style }: StackProps) {
  return (
    <Tag
      className={className}
      style={{ display: "flex", flexDirection: direction, gap, alignItems: align, justifyContent: justify, flexWrap: wrap ? "wrap" : undefined, minWidth: 0, ...style }}
    >
      {children}
    </Tag>
  );
}
