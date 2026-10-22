/**
 * Word-wraps `text` into at most `maxLines` rows of at most `width` characters, uppercased
 * for the flap board. A word longer than `width` is hard-split. Text that still does not
 * fit in `maxLines` rows is cut at the last row.
 */
export function wrapLines(text: string, width: number, maxLines: number): string[] {
  const words = text.trim().toUpperCase().split(/\s+/).filter((w) => w.length > 0);
  const lines: string[] = [];
  let current = "";
  const push = () => {
    if (current.length > 0) lines.push(current);
    current = "";
  };
  for (const word of words) {
    let rest = word;
    while (rest.length > width) {
      if (current.length > 0) push();
      lines.push(rest.slice(0, width));
      rest = rest.slice(width);
    }
    if (current.length === 0) current = rest;
    else if (current.length + 1 + rest.length <= width) current += ` ${rest}`;
    else {
      push();
      current = rest;
    }
  }
  push();
  return lines.slice(0, maxLines);
}
