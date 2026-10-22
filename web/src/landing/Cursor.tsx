import { useEffect, useRef, useState, type RefObject } from "react";
import { SignalLamp, useReducedMotion } from "../design";
import { cursorEnabled, cursorTone, cursorVisible, follow } from "./cursorRules";
import { useMatch } from "./hooks";

/**
 * A small signal lamp that follows the pointer: amber, green over anything pressable. Only
 * on a mouse or trackpad and only when motion is allowed. It sets data-cursor="on" on its
 * root so the page can hide the native arrow, and removes it again on unmount.
 */
export function Cursor({ rootRef }: { rootRef: RefObject<HTMLElement | null> }) {
  const reduced = useReducedMotion();
  const fine = useMatch("(hover: hover) and (pointer: fine)");
  const enabled = cursorEnabled({ reducedMotion: reduced, finePointer: fine });
  const [tone, setTone] = useState<"amber" | "green">("amber");
  const [shown, setShown] = useState(false);
  const el = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!enabled || !root) return;
    root.setAttribute("data-cursor", "on");
    const target = { x: 0, y: 0 };
    const pos = { x: 0, y: 0 };
    let moved = false;
    let inside = true;
    let frame = 0;
    const apply = () => setShown(cursorVisible({ reducedMotion: reduced, finePointer: fine, hasMoved: moved, inside }));
    const tick = () => {
      pos.x = follow(pos.x, target.x);
      pos.y = follow(pos.y, target.y);
      if (el.current) el.current.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
      frame = pos.x === target.x && pos.y === target.y ? 0 : window.requestAnimationFrame(tick);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      target.x = e.clientX;
      target.y = e.clientY;
      if (!moved) {
        moved = true;
        pos.x = target.x;
        pos.y = target.y;
        apply();
      }
      setTone(cursorTone(e.target as Element | null));
      if (!frame) frame = window.requestAnimationFrame(tick);
    };
    const onLeave = () => {
      inside = false;
      apply();
    };
    const onEnter = () => {
      inside = true;
      apply();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    document.documentElement.addEventListener("pointerenter", onEnter);
    return () => {
      root.removeAttribute("data-cursor");
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      document.documentElement.removeEventListener("pointerenter", onEnter);
      if (frame) window.cancelAnimationFrame(frame);
      setShown(false);
    };
  }, [enabled, fine, reduced, rootRef]);

  if (!enabled) return null;
  return (
    <div ref={el} className="lp-cursor" data-shown={shown} data-tone={tone} aria-hidden>
      <div className="lp-cursor-lamp">
        <SignalLamp size="md" state={tone} />
      </div>
    </div>
  );
}
