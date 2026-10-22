export interface Point {
  x: number;
  y: number;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A detour closer than this to the source or target row would read as a kink, not a track. */
const MIN_JOG = 24;

const fmt = (n: number): string => String(Number(n.toFixed(2)));

/** Drop consecutive duplicate points so zero-length segments never reach the path. */
export function dedupe(points: readonly Point[]): Point[] {
  return points.filter((p, i) => i === 0 || p.x !== points[i - 1]!.x || p.y !== points[i - 1]!.y);
}

/**
 * Orthogonal polyline with every corner cut at 45 degrees, like points on a railway.
 * The cut never exceeds half of either adjoining segment.
 */
export function chamferPath(points: readonly Point[], cut: number): string {
  const pts = dedupe(points);
  const first = pts[0];
  if (!first) return "";
  const parts = [`M ${fmt(first.x)} ${fmt(first.y)}`];
  for (let i = 1; i < pts.length; i++) {
    const cur = pts[i]!;
    const next = pts[i + 1];
    if (!next) {
      parts.push(`L ${fmt(cur.x)} ${fmt(cur.y)}`);
      continue;
    }
    const prev = pts[i - 1]!;
    const lenIn = Math.abs(cur.x - prev.x) + Math.abs(cur.y - prev.y);
    const lenOut = Math.abs(next.x - cur.x) + Math.abs(next.y - cur.y);
    const d = Math.min(cut, lenIn / 2, lenOut / 2);
    const ux = Math.sign(cur.x - prev.x);
    const uy = Math.sign(cur.y - prev.y);
    const vx = Math.sign(next.x - cur.x);
    const vy = Math.sign(next.y - cur.y);
    parts.push(`L ${fmt(cur.x - ux * d)} ${fmt(cur.y - uy * d)}`);
    parts.push(`L ${fmt(cur.x + vx * d)} ${fmt(cur.y + vy * d)}`);
  }
  return parts.join(" ");
}

/** True when a horizontal run at `y` between the given columns' boxes would touch any of them. */
export function runBlocked(y: number, boxes: readonly Box[], margin = 8): boolean {
  return boxes.some((b) => y > b.y - margin && y < b.y + b.h + margin);
}

export interface RunChoice {
  y: number;
  bypass: boolean;
}

/**
 * Pick the y of the long horizontal run: the source row, else the target row, else the
 * cheapest free lane. `lanes` are candidate bypass rows (gaps between nodes, top and bottom).
 */
export function chooseRun(y1: number, y2: number, boxes: readonly Box[], lanes: readonly number[]): RunChoice {
  if (!runBlocked(y1, boxes)) return { y: y1, bypass: false };
  if (!runBlocked(y2, boxes)) return { y: y2, bypass: false };
  const usable = lanes.filter((y) => Math.abs(y - y1) >= MIN_JOG && Math.abs(y - y2) >= MIN_JOG);
  const ranked = usable.sort((a, b) => Math.abs(a - y1) + Math.abs(a - y2) - (Math.abs(b - y1) + Math.abs(b - y2)));
  const free = ranked.find((y) => !runBlocked(y, boxes, 0));
  return { y: free ?? y1, bypass: free !== undefined };
}
