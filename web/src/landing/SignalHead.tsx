import { useEffect, useState } from "react";
import { SignalLamp, useReducedMotion, type LampState } from "../design";

const ORDER: readonly LampState[] = ["red", "amber", "green"];

/**
 * A signal head on its post: three lamps in an outlined housing. One lamp is lit at a time and
 * it steps red, amber, green on a slow clock. Under reduced motion it holds on red.
 */
export function SignalHead() {
  const reduced = useReducedMotion();
  const [lit, setLit] = useState(0);
  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => setLit((n) => (n + 1) % ORDER.length), 1800);
    return () => window.clearInterval(id);
  }, [reduced]);
  return (
    <div className="lp-head" aria-hidden>
      <div className="lp-head-housing">
        {ORDER.map((colour, i) => (
          <SignalLamp key={colour} size="lg" state={i === lit ? colour : "off"} flash />
        ))}
      </div>
      <div className="lp-head-post" />
    </div>
  );
}
