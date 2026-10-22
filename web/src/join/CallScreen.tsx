import { splitWords } from "./karaoke";
import { CallView } from "./CallView";
import { useCallSpeech } from "./useCallSpeech";

/** The incoming call. `preview` freezes the connected view for the dev mock (no speech, no timer). */
export function CallScreen({ script, onDone, preview }: { script: string; onDone: () => void; preview?: { word: number; seconds: number } }) {
  if (preview) {
    return <CallView connected seconds={preview.seconds} words={splitWords(script)} word={preview.word} onAccept={onDone} onHangUp={onDone} />;
  }
  return <LiveCall script={script} onDone={onDone} />;
}

function LiveCall({ script, onDone }: { script: string; onDone: () => void }) {
  const call = useCallSpeech(script, onDone);
  return <CallView connected={call.connected} seconds={call.seconds} words={call.words} word={call.word} onAccept={call.accept} onHangUp={call.hangUp} />;
}
