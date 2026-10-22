import { useEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode, type RefObject } from "react";
import "./design.css";
import { useReducedMotion } from "./motion";

/** The failsafe: if the observer has not fired by now but the element is on screen, show it. */
const FAILSAFE_MS = 1600;

function onScreen(el: Element): boolean {
  const r = el.getBoundingClientRect();
  return r.bottom > 0 && r.top < window.innerHeight;
}

/**
 * True once the element has entered the viewport (and stays true). Always true under reduced
 * motion and where IntersectionObserver is missing, so content is never left hidden. A timer
 * is the settle-net for a throttled tab where the observer callback is delayed.
 */
export function useInView<T extends Element>(threshold = 0.15): [RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const reduced = useReducedMotion();
  const supported = typeof window !== "undefined" && typeof window.IntersectionObserver === "function";
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (reduced || !supported || !el || seen) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setSeen(true);
      },
      { threshold, rootMargin: "0px 0px -6% 0px" },
    );
    observer.observe(el);
    const net = window.setTimeout(() => {
      if (onScreen(el)) setSeen(true);
    }, FAILSAFE_MS);
    return () => {
      observer.disconnect();
      window.clearTimeout(net);
    };
  }, [reduced, supported, seen, threshold]);
  return [ref, reduced || !supported || seen];
}

export interface RevealProps {
  children: ReactNode;
  /** Seconds before the reveal starts, for staggering siblings. */
  delay?: number;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
}

/** Fades and rises its children (opacity and translate only) the first time they scroll into view. */
export function Reveal({ children, delay = 0, as: Tag = "div", className, style }: RevealProps) {
  const [ref, shown] = useInView<HTMLElement>();
  return (
    <Tag ref={ref} className={["ds-reveal", className ?? ""].filter(Boolean).join(" ")} data-in={shown} style={{ "--ds-delay": `${delay}s`, ...style } as CSSProperties}>
      {children}
    </Tag>
  );
}
