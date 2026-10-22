import type { ReactNode } from "react";
import { Button, Label, SignalLamp, type LampState } from "../design";
import type { Beat, BeatStatus, StepKey } from "./adminModel";
import type { Act } from "./useAdminActions";

const LAMP: Record<BeatStatus, LampState> = { done: "green", current: "amber", upcoming: "off" };
const STATUS_WORD: Record<BeatStatus, string> = { done: "done", current: "current", upcoming: "upcoming" };
const JOIN_COUNTS = [1, 3, 20] as const;

export interface RunSheetProps {
  beats: Beat[];
  act: Act;
  /** The ask card is on screen, so the answer row points at it instead of repeating the buttons. */
  askOpen: boolean;
  /** Called after the ring is sent, so the sheet can mark it done. */
  onCalled: () => void;
}

function RowText({ beat }: { beat: Beat }) {
  return (
    <span className="ad-row">
      <span className="ad-row-title">{beat.title}</span>
      <span className="ad-row-hint">{beat.hint}</span>
    </span>
  );
}

function PlainRow({ beat, children }: { beat: Beat; children?: ReactNode }) {
  return (
    <div className="ad-plain" data-status={beat.status}>
      <Label strong>{beat.title}</Label>
      <span className="ad-row-hint">{beat.hint}</span>
      {children}
    </div>
  );
}

/**
 * The whole show as a vertical track: one signal lamp per beat (green done, amber current, off
 * upcoming) and a big pressable row that forces that beat. Top to bottom, one thumb.
 */
export function RunSheet({ beats, act, askOpen, onCalled }: RunSheetProps) {
  const stepEvent = (beat: Beat, step: string) => {
    const sent = act.run(beat.key, "admin:step", { step }, beat.title);
    if (sent && beat.key === "call") onCalled();
  };

  const body = (beat: Beat) => {
    const variant = beat.status === "current" ? "primary" : "secondary";
    if (beat.key === "join") {
      return (
        <PlainRow beat={beat}>
          <div className="ad-join">
            {JOIN_COUNTS.map((n) => (
              <Button
                key={n}
                block
                variant={variant}
                className="ad-join-btn"
                loading={act.isPending(`join-${n}`)}
                disabled={act.offline}
                onClick={() => act.run(`join-${n}`, "admin:simulateJoins", { count: n }, `${n} simulated join${n > 1 ? "s" : ""}`)}
              >
                {`+${n}`}
              </Button>
            ))}
          </div>
        </PlainRow>
      );
    }
    if (beat.key === "answer" && askOpen) return <PlainRow beat={{ ...beat, hint: "Answer in the panel above" }} />;
    if (beat.key === "answer") return <PlainRow beat={beat} />;
    const step: StepKey = beat.key;
    return (
      <Button block variant={variant} className="ad-row-btn" loading={act.isPending(beat.key)} disabled={act.offline} onClick={() => stepEvent(beat, step)}>
        <RowText beat={beat} />
      </Button>
    );
  };

  return (
    <ol className="ad-sheet" aria-label="Run sheet">
      {beats.map((beat) => (
        <li key={beat.key} className="ad-beat" data-status={beat.status} data-testid={`beat-${beat.key}`} aria-current={beat.status === "current" ? "step" : undefined}>
          <div className="ad-beat-rail">
            <SignalLamp state={LAMP[beat.status]} flash label={`${beat.title}: ${STATUS_WORD[beat.status]}`} />
            <span className="ad-beat-line" />
          </div>
          <div className="ad-beat-body">{body(beat)}</div>
        </li>
      ))}
    </ol>
  );
}
