import { Label, SignalLamp } from "../design";
import { clockText, wordState, type KaraokeWord } from "./karaoke";
import { Wordmark } from "./Wordmark";
import "./join.css";

function Handset({ down = false }: { down?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="36" height="36" style={down ? { transform: "rotate(135deg)" } : undefined} aria-hidden>
      <path
        fill="currentColor"
        d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"
      />
    </svg>
  );
}

function RoundButton({ tone, label, onClick }: { tone: "red" | "green"; label: string; onClick: () => void }) {
  return (
    <button type="button" className="jn-round" onClick={onClick} aria-label={label}>
      <span className="jn-disc" data-tone={tone}>
        <Handset down={tone === "red"} />
      </span>
      <Label strong>{label}</Label>
    </button>
  );
}

export interface CallViewProps {
  connected: boolean;
  seconds: number;
  words: KaraokeWord[];
  word: number;
  onAccept: () => void;
  onHangUp: () => void;
}

/**
 * Full-screen call, styled like a real one. Ringing: the caller on a split-flap with a blinking
 * signal lamp, round Decline and Accept. Connected: the timer at the top and the script,
 * word by word, the spoken word on a green fill.
 */
export function CallView({ connected, seconds, words, word, onAccept, onHangUp }: CallViewProps) {
  return (
    <main className="jn-call" data-testid="call">
      <div className="jn-call-top">
        <Label strong>{connected ? "Connected" : "Incoming call"}</Label>
        {connected ? <Label strong>{clockText(seconds)}</Label> : null}
      </div>

      <div className="jn-call-who" data-connected={connected}>
        <SignalLamp state={connected ? "green" : "amber"} size="lg" blink={!connected} label={connected ? "Connected" : "Ringing"} />
        <Wordmark size={connected ? 28 : 40} />
      </div>

      {connected ? (
        <p className="jn-call-words" data-testid="karaoke">
          {words.map((x, i) => (
            <span key={i} className="jn-word" data-state={wordState(i, word)}>
              {x.w}{" "}
            </span>
          ))}
        </p>
      ) : null}

      {connected ? (
        <div className="jn-call-actions" data-single="true">
          <RoundButton tone="red" label="Hang up" onClick={onHangUp} />
        </div>
      ) : (
        <div className="jn-call-actions">
          <RoundButton tone="red" label="Decline" onClick={onHangUp} />
          <RoundButton tone="green" label="Accept" onClick={onAccept} />
        </div>
      )}
    </main>
  );
}
