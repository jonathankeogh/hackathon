/**
 * Breaks a plan title into departures-board rows of at most `width` characters, on word
 * boundaries. A word longer than a row is cut, and rows past `maxRows` are dropped.
 */
export function titleRows(title: string, width = 16, maxRows = 3): string[] {
  const words = title.trim().split(/\s+/).filter(Boolean);
  const rows: string[] = [];
  let row = "";
  for (const raw of words) {
    const word = raw.length > width ? raw.slice(0, width) : raw;
    if (!row) row = word;
    else if (row.length + 1 + word.length <= width) row = `${row} ${word}`;
    else {
      rows.push(row);
      row = word;
    }
  }
  if (row) rows.push(row);
  return rows.slice(0, maxRows);
}
