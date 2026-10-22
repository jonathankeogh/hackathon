import { useEffect, useState } from "react";

const GLYPHS = "—0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function SplitFlap({ text, compact = false }: { text: string; compact?: boolean }) {
  return <span className={`stage-flap-board ${compact ? "stage-flap-compact" : ""}`} aria-label={text}>
    <span className="stage-sr-only">{text}</span>
    <span className="stage-flap-characters" aria-hidden="true">{Array.from(text).map((character, index) => <FlapCharacter key={index} character={character} index={index} />)}</span>
  </span>;
}

function FlapCharacter({ character, index }: { character: string; index: number }) {
  const [frame, setFrame] = useState({ glyph: character, turn: 0, moving: false });
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || character === " ") {
      setFrame((previous) => ({ glyph: character, turn: previous.turn + 1, moving: false }));
      return;
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let step = 0; step < 4; step++) {
      timers.push(setTimeout(() => {
        const final = step === 3;
        setFrame((previous) => ({ glyph: final ? character : GLYPHS[(character.charCodeAt(0) + index + step * 7) % GLYPHS.length], turn: previous.turn + 1, moving: !final }));
      }, Math.min(index, 10) * 14 + step * 65));
    }
    return () => timers.forEach(clearTimeout);
  }, [character, index]);
  return <span className={`stage-flap ${character === " " ? "stage-flap-space" : ""}`}>
    <span className="stage-flap-top"><span>{frame.glyph}</span></span>
    <span className="stage-flap-bottom"><span>{frame.glyph}</span></span>
    {frame.moving && <span key={frame.turn} className="stage-flap-leaf"><span>{frame.glyph}</span></span>}
  </span>;
}
