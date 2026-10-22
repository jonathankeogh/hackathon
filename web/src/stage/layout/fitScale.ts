export const CANVAS_W = 1920;
export const CANVAS_H = 1080;

/** Scale that fits the fixed canvas inside a viewport, letterboxed (never crops). */
export function fitScale(viewportW: number, viewportH: number): number {
  if (viewportW <= 0 || viewportH <= 0) return 1;
  return Math.min(viewportW / CANVAS_W, viewportH / CANVAS_H);
}
