// Optional stage sound, generated in the browser (no audio files, works offline):
// a soft relay click per unlock and a chime when the plan turns viable.

const KEY = "deadlock.sound";
let enabled = false;
try {
  enabled = localStorage.getItem(KEY) === "on";
} catch {
  // storage blocked: sound starts off
}
let ctx: AudioContext | null = null;
const listeners = new Set<() => void>();

function audio(): AudioContext | null {
  if (!enabled) return null;
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function soundOn() {
  return enabled;
}

export function toggleSound() {
  enabled = !enabled;
  try {
    localStorage.setItem(KEY, enabled ? "on" : "off");
  } catch {
    // not remembered; fine
  }
  if (enabled) relayClick();
  listeners.forEach((l) => l());
}

export function onSoundChange(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** A relay closing: a short filtered tick over a low thump. */
export function relayClick() {
  const a = audio();
  if (!a) return;
  const t = a.currentTime;

  const noise = a.createBuffer(1, Math.floor(a.sampleRate * 0.03), a.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 3;
  const tick = a.createBufferSource();
  tick.buffer = noise;
  const band = a.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 2400;
  band.Q.value = 1.2;
  const tickGain = a.createGain();
  tickGain.gain.value = 0.35;
  tick.connect(band).connect(tickGain).connect(a.destination);
  tick.start(t);

  const thump = a.createOscillator();
  thump.frequency.setValueAtTime(110, t);
  thump.frequency.exponentialRampToValueAtTime(55, t + 0.08);
  const thumpGain = a.createGain();
  thumpGain.gain.setValueAtTime(0.3, t);
  thumpGain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
  thump.connect(thumpGain).connect(a.destination);
  thump.start(t);
  thump.stop(t + 0.1);
}

/** Two clean tones, like a station announcement chime. */
export function chime() {
  const a = audio();
  if (!a) return;
  const t = a.currentTime;
  [659.25, 987.77].forEach((freq, i) => {
    const o = a.createOscillator();
    o.type = "sine";
    o.frequency.value = freq;
    const g = a.createGain();
    const start = t + i * 0.18;
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(0.18, start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, start + 1.4);
    o.connect(g).connect(a.destination);
    o.start(start);
    o.stop(start + 1.5);
  });
}
