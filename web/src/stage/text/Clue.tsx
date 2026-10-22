import type { CSSProperties } from "react";
import { plainCopy } from "./plainCopy";

/**
 * Text with its clue words marked: amber, underlined, and one amber pulse after
 * `delayS`. The first case-insensitive match is marked; no match shows plain text.
 */
export function ClueText({ text, keyword, delayS = 0 }: { text: string; keyword?: string; delayS?: number }) {
  const clean = plainCopy(text);
  const at = keyword ? clean.toLowerCase().indexOf(keyword.toLowerCase()) : -1;
  if (!keyword || at < 0) return <>{clean}</>;
  return (
    <>
      {clean.slice(0, at)}
      <span className="dl-clue" style={{ "--dl-delay": `${delayS}s` } as CSSProperties}>
        {clean.slice(at, at + keyword.length)}
      </span>
      {clean.slice(at + keyword.length)}
    </>
  );
}
