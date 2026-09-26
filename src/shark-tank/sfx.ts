export type SfxName = 'blip' | 'select' | 'confirm' | 'good' | 'bad' | 'out' | 'offer' | 'deal' | 'door' | 'type';

let ctx: AudioContext | null = null;
let muted = false;

export const setMuted = (m: boolean) => {
  muted = m;
};

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'square', vol = 0.05) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol, ctx.currentTime + start);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
  o.connect(g).connect(ctx.destination);
  o.start(ctx.currentTime + start);
  o.stop(ctx.currentTime + start + dur + 0.02);
}

const SEQ: Record<SfxName, [number, number, number, OscillatorType?, number?][]> = {
  blip: [[660, 0, 0.06]],
  type: [[520, 0, 0.025, 'square', 0.02]],
  select: [[440, 0, 0.05], [660, 0.05, 0.06]],
  confirm: [[523, 0, 0.07], [784, 0.07, 0.1]],
  good: [[523, 0, 0.08], [659, 0.08, 0.08], [784, 0.16, 0.12]],
  bad: [[311, 0, 0.12, 'sawtooth', 0.04], [233, 0.12, 0.18, 'sawtooth', 0.04]],
  out: [[392, 0, 0.1, 'triangle', 0.08], [262, 0.1, 0.12, 'triangle', 0.08], [196, 0.22, 0.25, 'triangle', 0.08]],
  offer: [[880, 0, 0.05], [1175, 0.06, 0.08]],
  deal: [[523, 0, 0.1], [659, 0.1, 0.1], [784, 0.2, 0.1], [1047, 0.3, 0.3]],
  door: [[110, 0, 0.5, 'triangle', 0.1], [165, 0.2, 0.5, 'triangle', 0.08]],
};

/** Plays a short chiptune cue. Audio only starts after the first user gesture. */
export function sfx(name: SfxName) {
  if (muted) return;
  try {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    SEQ[name].forEach(([f, s, d, t, v]) => tone(f, s, d, t, v));
  } catch {
    /* audio is optional */
  }
}
