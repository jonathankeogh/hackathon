import { useCallback, useEffect, useRef, useState } from "react";
import type { NoticeTone } from "../design";

export type Emit = (event: string, payload?: unknown) => void;

/** What every section needs to press a button: run it, know if it is in flight, know if the socket is down. */
export interface Act {
  run: (key: string, event: string, payload: unknown, label: string) => boolean;
  isPending: (key: string) => boolean;
  offline: boolean;
}

export interface Toast {
  id: number;
  tone: NoticeTone;
  text: string;
}

/** How long a pressed button shows its loading lamp. The server sends no ack, so this is the beat. */
export const PENDING_MS = 900;
const TOAST_MS = 2600;
const ERROR_TOAST_MS = 5000;

interface Options {
  emit: Emit;
  connected: boolean;
  /** Dev preview: nothing is sent, and the toast says so. */
  preview: boolean;
}

/**
 * Every admin button goes through `run`. It emits once, lights the button's loading lamp for a
 * beat, and raises a short toast. It never blocks the page. While the socket is down nothing is
 * emitted: socket.io would buffer the event and fire it on reconnect, which on stage could be a
 * reset arriving a minute late.
 */
export function useAdminActions({ emit, connected, preview }: Options) {
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
  const [toast, setToast] = useState<Toast | null>(null);
  const timers = useRef(new Set<number>());
  const nextId = useRef(1);
  // The ref guards a double tap inside one frame; the state re-renders the loading lamp.
  const inFlight = useRef(new Set<string>());

  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
  }, []);

  useEffect(() => {
    const live = timers.current;
    return () => live.forEach((id) => window.clearTimeout(id));
  }, []);

  const pushToast = useCallback((tone: NoticeTone, text: string) => {
    setToast({ id: nextId.current++, tone, text });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast((t) => (t?.id === toast.id ? null : t)), toast.tone === "error" ? ERROR_TOAST_MS : TOAST_MS);
    return () => window.clearTimeout(id);
  }, [toast]);

  const run = useCallback(
    (key: string, event: string, payload: unknown, label: string): boolean => {
      if (inFlight.current.has(key)) return false;
      if (!connected && !preview) {
        pushToast("error", `Offline, ${label} not sent`);
        return false;
      }
      emit(event, payload);
      inFlight.current.add(key);
      setPending((p) => new Set(p).add(key));
      later(
        () => {
          inFlight.current.delete(key);
          setPending((p) => {
            const next = new Set(p);
            next.delete(key);
            return next;
          });
        },
        PENDING_MS,
      );
      pushToast("ok", preview ? `Preview, not sent: ${label}` : `Sent: ${label}`);
      return true;
    },
    [connected, emit, later, preview, pushToast],
  );

  return { run, pushToast, toast, isPending: (key: string) => pending.has(key) };
}
