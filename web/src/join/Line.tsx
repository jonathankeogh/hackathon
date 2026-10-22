import type { State } from "@deadlock/shared/types";
import { Label, SignalLamp } from "../design";
import { lampFor } from "./model";
import "./join.css";

/** What the stage is showing, in one lamp and one word at the top of the phone. */
export function LineStatus({ state, connected = true }: { state: State | null; connected?: boolean }) {
  const { lamp, label, blink } = lampFor(state, connected);
  return (
    <div className="jn-status" data-testid="line-status" data-lamp={lamp}>
      <SignalLamp state={lamp} size="md" flash blink={blink} />
      <Label strong>{label}</Label>
    </div>
  );
}
