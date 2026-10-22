import { useEffect, useRef, useState } from "react";

/** True for `ms` after `value` changes. Not on first mount. */
export function useFlashOnChange(value: unknown, ms = 300): boolean {
  const previous = useRef(value);
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (previous.current === value) return;
    previous.current = value;
    setFlash(true);
    const id = window.setTimeout(() => setFlash(false), ms);
    return () => window.clearTimeout(id);
  }, [value, ms]);
  return flash;
}
