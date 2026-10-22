import { soundFromSearch } from "../data/urlParams";

let ctx: AudioContext | null = null;
let enabled = false;

function getContext(): AudioContext | null {
  try {
    if (ctx === null) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);
    return ctx;
  } catch {
    return null;
  }
}

export function isEnabled(): boolean {
  return enabled;
}

export function setEnabled(on: boolean): void {
  enabled = on;
  if (on) getContext();
}

function noiseBuffer(c: AudioContext, seconds: number): AudioBuffer {
  const buf = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * seconds)), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  return buf;
}

function clickBurst(c: AudioContext, t: number): void {
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, 0.04);
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 2400;
  filter.Q.value = 1.2;
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.18, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
  src.connect(filter).connect(gain).connect(c.destination);
  src.start(t);
  src.stop(t + 0.04);
}

function thump(c: AudioContext, t: number): void {
  const osc = c.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(120, t);
  osc.frequency.exponentialRampToValueAtTime(60, t + 0.04);
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.22, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + 0.05);
}

/** Short relay click: filtered noise plus a low thump, about 40ms. */
export function relayClick(): void {
  if (!enabled) return;
  try {
    const c = getContext();
    if (!c) return;
    clickBurst(c, c.currentTime);
    thump(c, c.currentTime);
  } catch {
    /* audio unavailable: stay silent */
  }
}

/** Two soft sine partials with a long decay (about 1.2s). */
export function chime(): void {
  if (!enabled) return;
  try {
    const c = getContext();
    if (!c) return;
    const t = c.currentTime;
    for (const [freq, peak] of [[880, 0.1], [1320, 0.05]] as const) {
      const osc = c.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      const gain = c.createGain();
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(peak, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
      osc.connect(gain).connect(c.destination);
      osc.start(t);
      osc.stop(t + 1.25);
    }
  } catch {
    /* audio unavailable: stay silent */
  }
}

/**
 * Turns stage sound on when the URL has `?sound=1`. There is no key and no on-screen marker.
 * Browsers keep an AudioContext suspended until a gesture, so the first click or key press on
 * the page resumes it.
 */
export function initSoundFromUrl(search: string): void {
  if (!soundFromSearch(search)) return;
  setEnabled(true);
  const resume = () => {
    getContext();
    window.removeEventListener("pointerdown", resume);
    window.removeEventListener("keydown", resume);
  };
  window.addEventListener("pointerdown", resume);
  window.addEventListener("keydown", resume);
}
