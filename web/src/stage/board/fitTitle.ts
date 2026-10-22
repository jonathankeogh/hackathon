/** Longest plan title the header board shows, in flap cells. */
export const TITLE_CELLS = 30;

/**
 * Uppercases a plan title and trims it to `max` cells. Prefers cutting at a word boundary
 * so the board never ends on half a word; falls back to a hard cut for one long word.
 */
export function fitTitle(title: string, max: number = TITLE_CELLS): string {
  const upper = title.trim().replace(/\s+/g, " ").toUpperCase();
  if (upper.length <= max) return upper;
  const cut = upper.slice(0, max + 1);
  const space = cut.lastIndexOf(" ");
  return (space > 0 ? cut.slice(0, space) : upper.slice(0, max)).trimEnd();
}
