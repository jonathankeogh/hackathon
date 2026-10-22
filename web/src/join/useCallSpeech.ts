import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { splitWords, WORD_MS, wordIndexAt, type KaraokeWord } from "./karaoke";

const HANGUP_DELAY_MS = 1200;
const BOUNDARY_WAIT_MS = 700;

export interface CallSpeech {
  connected: boolean;
  seconds: number;
  /** Index of the word being spoken, -1 before the call is answered. */
  word: number;
  words: KaraokeWord[];
  accept: () => void;
  hangUp: () => void;
}

/**
 * The call's behaviour: nothing is spoken until Accept (iOS only allows audio after a tap, and
 * this tap is that tap), then the script is read with speechSynthesis while the highlight
 * follows real word boundaries. Browsers that send no boundaries get a timer-paced highlight.
 * The call ends itself a moment after the last word.
 */
export function useCallSpeech(script: string, onDone: () => void): CallSpeech {
  const [connected, setConnected] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [word, setWord] = useState(-1);
  const words = useMemo(() => splitWords(script), [script]);
  const index = useRef(-1);
  const pace = useRef<ReturnType<typeof setInterval> | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const done = useRef(onDone);
  done.current = onDone;

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    if (pace.current) clearInterval(pace.current);
    pace.current = null;
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);
  useEffect(() => stop, [stop]);

  useEffect(() => {
    if (!connected) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [connected]);

  const hangUp = useCallback(() => {
    stop();
    done.current();
  }, [stop]);

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);

  const startPace = useCallback(() => {
    if (pace.current) return;
    pace.current = setInterval(() => {
      if (index.current + 1 >= words.length) {
        if (pace.current) clearInterval(pace.current);
        pace.current = null;
        if (!window.speechSynthesis) later(hangUp, HANGUP_DELAY_MS);
        return;
      }
      index.current += 1;
      setWord(index.current);
    }, WORD_MS);
  }, [words, hangUp, later]);

  const accept = useCallback(() => {
    setConnected(true);
    index.current = 0;
    setWord(0);
    const synth = window.speechSynthesis;
    if (!synth) return startPace();
    synth.cancel();
    const u = new SpeechSynthesisUtterance(script);
    let sawBoundary = false;
    u.onboundary = (e) => {
      if (e.name && e.name !== "word") return;
      sawBoundary = true;
      if (pace.current) {
        clearInterval(pace.current);
        pace.current = null;
      }
      index.current = wordIndexAt(words, e.charIndex);
      setWord(index.current);
    };
    u.onend = () => {
      index.current = words.length - 1;
      setWord(index.current);
      later(hangUp, HANGUP_DELAY_MS);
    };
    synth.speak(u);
    later(() => {
      if (!sawBoundary) startPace();
    }, BOUNDARY_WAIT_MS);
  }, [script, words, startPace, hangUp, later]);

  return { connected, seconds, word, words, accept, hangUp };
}
