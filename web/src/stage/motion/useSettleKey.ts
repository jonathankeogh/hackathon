/** How long after its last change a fade or glide is allowed to run before it is forced to its end state. */
export const SETTLE_FADE_MS = 900;
/** Same for the track, whose nodes stagger in and whose connectors draw after them. */
export const SETTLE_TRACK_MS = 1800;

// The hook itself is shared with the design system: see design/motion.ts.
export { useSettleKey } from "../../design/motion";
