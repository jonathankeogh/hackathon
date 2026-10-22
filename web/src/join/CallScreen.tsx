import { useEffect, useMemo, useRef, useState } from "react";

// Full-screen call, styled like a real one: ringing with round answer/decline,
// then connected with a timer and the script read aloud, word by word.

const WORD_MS = 330; // fallback pace when the browser gives no word boundaries

function Handset({ down = false }: { down?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-8 w-8 ${down ? "rotate-[135deg]" : ""}`} aria-hidden>
      <path
        fill="currentColor"
        d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"
      />
    </svg>
  );
}

function RoundButton({ tone, label, onClick, down }: { tone: "red" | "green"; label: string; onClick: () => void; down?: boolean }) {
  return (
    <button className="flex flex-col items-center gap-3" onClick={onClick} aria-label={label}>
      <span className={`flex h-[76px] w-[76px] items-center justify-center rounded-full text-bg active:opacity-70 ${tone === "red" ? "bg-signal-red" : "bg-signal-green"}`}>
        <Handset down={down} />
      </span>
      <span className="font-mono text-[13px] uppercase tracking-[0.2em] text-fg/70">{label}</span>
    </button>
  );
}

export function CallScreen({ script, onDone }: { script: string; onDone: () => void }) {
  const [connected, setConnected] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [word, setWord] = useState(-1);
  const fallback = useRef<ReturnType<typeof setInterval> | null>(null);

  const words = useMemo(() => {
    let at = 0;
    return script.split(/\s+/).filter(Boolean).map((w) => {
      const start = script.indexOf(w, at);
      at = start + w.length;
      return { w, start };
    });
  }, [script]);

  const stop = () => {
    window.speechSynthesis?.cancel();
    if (fallback.current) clearInterval(fallback.current);
    fallback.current = null;
  };
  useEffect(() => stop, []);

  useEffect(() => {
    if (!connected) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [connected]);

  const hangUp = () => {
    stop();
    onDone();
  };

  // Highlight by timer; real word boundaries take over when the browser sends them.
  const startFallback = () => {
    if (fallback.current) return;
    fallback.current = setInterval(() => {
      setWord((i) => {
        if (i + 1 >= words.length) {
          if (fallback.current) clearInterval(fallback.current);
          fallback.current = null;
          if (!window.speechSynthesis) setTimeout(hangUp, 1200);
          return i;
        }
        return i + 1;
      });
    }, WORD_MS);
  };

  const accept = () => {
    setConnected(true);
    setWord(0);
    const synth = window.speechSynthesis;
    if (!synth) return startFallback();
    synth.cancel();
    const u = new SpeechSynthesisUtterance(script);
    let sawBoundary = false;
    u.onboundary = (e) => {
      if (e.name && e.name !== "word") return;
      sawBoundary = true;
      if (fallback.current) {
        clearInterval(fallback.current);
        fallback.current = null;
      }
      let idx = 0;
      while (idx + 1 < words.length && words[idx + 1].start <= e.charIndex) idx++;
      setWord(idx);
    };
    u.onend = () => {
      setWord(words.length - 1);
      setTimeout(hangUp, 1200);
    };
    synth.speak(u);
    setTimeout(() => {
      if (!sawBoundary) startFallback();
    }, 700);
  };

  const clock = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <main className="flex h-full flex-col bg-bg px-7 pt-16 pb-12 text-center">
      <div>
        <p className="flex items-center justify-center gap-3 font-mono text-[13px] uppercase tracking-[0.28em] text-fg/60">
          <span className={`h-2.5 w-2.5 rounded-full ${connected ? "bg-signal-green" : "blink bg-signal-amber"}`} />
          {connected ? `Connected · ${clock}` : "Incoming call"}
        </p>
        <p className={`mt-5 font-mono font-medium tracking-[0.06em] ${connected ? "text-[30px]" : "text-[46px]"}`}>DEADLOCK</p>
        <p className="mt-2 font-mono text-[12px] uppercase tracking-[0.22em] text-fg/40">Signal box · London</p>
      </div>

      <div className="flex flex-1 items-center">
        {connected && (
          <p className="text-left text-[26px] leading-[1.35]" data-testid="karaoke">
            {words.map((x, i) => (
              <span key={i} className={i < word ? "text-fg" : i === word ? "text-signal-green" : "text-fg/25"}>
                {x.w}{" "}
              </span>
            ))}
          </p>
        )}
      </div>

      {connected ? (
        <div className="flex justify-center">
          <RoundButton tone="red" label="Hang up" onClick={hangUp} down />
        </div>
      ) : (
        <div className="flex justify-between px-6">
          <RoundButton tone="red" label="Decline" onClick={hangUp} down />
          <RoundButton tone="green" label="Accept" onClick={accept} />
        </div>
      )}
    </main>
  );
}
