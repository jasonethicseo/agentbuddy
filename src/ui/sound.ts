// The "ding": two short triangle-wave notes synthesized with Web Audio; no sound files
// (messenger-app Requirements 8.6, 8.7). The app starts Chromium with no user-gesture
// autoplay rule, so the context runs while the window is hidden (O4 run A).

export const DING = {
  notes: [
    { hz: 1047, ms: 90 },
    { hz: 1568, ms: 360 },
  ],
  peak: 0.25,
  attackMs: 10,
} as const;

let ctx: AudioContext | null = null;

export function ding(): void {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    let t = ctx.currentTime + 0.02;
    for (const note of DING.notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const dur = note.ms / 1000;
      osc.type = 'triangle';
      osc.frequency.value = note.hz;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(DING.peak, t + DING.attackMs / 1000);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.02);
      t += dur;
    }
  } catch {
    // no audio device: the pop-up and the inbox still happen
  }
}
