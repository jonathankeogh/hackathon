import { useEffect, useRef, useState } from "react";

export default function PhoneCall({ script, onClose }: { script: string; onClose: () => void }) {
  const [accepted, setAccepted] = useState(false);
  const [reading, setReading] = useState(false);
  const [word, setWord] = useState(-1);
  const [ended, setEnded] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const active = useRef(true);
  const close = useRef(onClose);
  close.current = onClose;
  const words = script.split(/\s+/);
  function stop() {
    active.current = false;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    window.speechSynthesis?.cancel();
  }
  function later(fn: () => void, ms: number) {
    timers.current.push(setTimeout(() => { if (active.current) fn(); }, ms));
  }
  function finish() {
    if (!active.current) return;
    setEnded(true); setWord(words.length - 1);
    later(() => close.current(), 1600);
  }
  useEffect(() => { active.current = true; return stop; }, []);
  function accept() {
    setAccepted(true);
    let started = false;
    let boundaries = false;
    let fallback = false;
    function readAlong() {
      if (!active.current || fallback) return;
      fallback = true; setReading(true); window.speechSynthesis?.cancel();
      words.forEach((_, i) => later(() => setWord(i), i * 320));
      later(finish, words.length * 320 + 600);
    }
    const synth = window.speechSynthesis;
    if (!synth || typeof SpeechSynthesisUtterance === "undefined") { readAlong(); return; }
    try {
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(script);
      utterance.lang = "en-GB"; utterance.rate = 0.95;
      utterance.onstart = () => {
        started = true; setWord(0);
        // Some mobile voices speak without word-boundary callbacks. Keep the
        // transcript moving, yielding immediately if real boundaries arrive.
        later(() => {
          if (!boundaries && !fallback) words.forEach((_, i) => later(() => {
            if (!boundaries && !fallback) setWord(i);
          }, i * 320));
        }, 650);
      };
      utterance.onboundary = (event) => {
        if (!active.current || fallback) return;
        boundaries = true;
        setWord(Math.max(0, script.slice(0, event.charIndex + 1).trim().split(/\s+/).length - 1));
      };
      utterance.onend = () => { if (!fallback) finish(); };
      utterance.onerror = readAlong;
      synth.speak(utterance);
      later(() => { if (!started) readAlong(); }, 2500);
      later(() => { if (!fallback) readAlong(); }, Math.max(20_000, words.length * 650));
    } catch { readAlong(); }
  }
  return <main className={`phone-page call-page${accepted ? " call-connected" : ""}`}>
    <header className="phone-masthead"><span>DEADLOCK</span><span>Community line</span></header>
    <div className="call-identity">
      <div className="call-speaker" aria-hidden="true">{Array.from({ length: 16 }, (_, i) => <i key={i} />)}</div>
      <p className="phone-eyebrow" aria-live="polite">{ended ? "Call complete" : accepted ? reading ? "Read along" : "Connected" : "Incoming call"}</p>
      <h1>DEADLOCK</h1><p className="phone-muted">Your community. Ready to go.</p>
    </div>
    {accepted ? <p className="call-transcript" data-testid="call-transcript" aria-label={script}>
      {words.map((text, i) => <span key={i} className={i === word ? "word-current" : i < word ? "word-spoken" : ""} aria-hidden="true">{text}{" "}</span>)}
    </p> : <div className="call-instrument" aria-hidden="true"><span className="call-line-label">Community line / 01</span><div className="caller-signal"><span /><span /><span /></div><span className="call-line-state">Connection waiting</span></div>}
    <div className="call-actions">{accepted ? <button className="phone-action call-decline" onClick={() => { stop(); close.current(); }}>Hang up</button> : <>
      <button className="phone-action call-decline" onClick={() => { stop(); close.current(); }}><Handset /><span>Decline</span></button>
      <button className="phone-action call-accept" onClick={accept}><Handset /><span>Accept</span></button>
    </>}</div>
  </main>;
}
function Handset() {
  return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="m5 3 4 4-2 3c2 3 4 5 7 7l3-2 4 4-2 2c-1 1-4 0-7-2C7 16 3 11 2 7c0-2 1-3 3-4Z" /></svg>;
}
