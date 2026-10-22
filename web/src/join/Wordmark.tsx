import { useEffect, useState } from "react";
import { SplitFlap } from "../design";

const NAME = "DEADLOCK";

/** The DEADLOCK wordmark: eight split-flap cells that flip in from blank on mount. */
export function Wordmark({ size = 40 }: { size?: number }) {
  const [text, setText] = useState("");
  useEffect(() => {
    const id = window.setTimeout(() => setText(NAME), 250);
    return () => window.clearTimeout(id);
  }, []);
  return (
    <span role="img" aria-label="Deadlock" style={{ display: "inline-flex" }}>
      <SplitFlap text={text} length={NAME.length} size={size} />
    </span>
  );
}
