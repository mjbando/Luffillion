"use client";

import type { Tier } from "@/data/tiers";

const MUTE_KEY = "luffillion:muted";

let audioCtx: AudioContext | null = null;
let masterOut: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;
let mutedState = false;
let muteLoaded = false;

function loadMute(): boolean {
  if (muteLoaded) return mutedState;
  muteLoaded = true;
  if (typeof window !== "undefined") {
    try {
      mutedState = localStorage.getItem(MUTE_KEY) === "1";
    } catch {
      mutedState = false;
    }
  }
  return mutedState;
}

export function isMuted(): boolean {
  return loadMute();
}

export function setMuted(muted: boolean): void {
  mutedState = muted;
  muteLoaded = true;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
    } catch {
      // ignore storage errors
    }
  }
  if (masterOut && audioCtx) {
    masterOut.gain.setTargetAtTime(muted ? 0 : 0.48, audioCtx.currentTime, 0.015);
  }
}

function getAudio(): { ctx: AudioContext; out: GainNode } | null {
  if (typeof window === "undefined" || loadMute()) return null;
  if (!audioCtx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    try {
      audioCtx = new Ctor();
      const compressor = audioCtx.createDynamicsCompressor();
      compressor.threshold.value = -14;
      compressor.knee.value = 18;
      compressor.ratio.value = 6;
      compressor.attack.value = 0.005;
      compressor.release.value = 0.15;

      masterOut = audioCtx.createGain();
      masterOut.gain.value = 0.48;
      masterOut.connect(compressor);
      compressor.connect(audioCtx.destination);
    } catch {
      return null;
    }
  }
  if (audioCtx.state === "suspended") {
    void audioCtx.resume().catch(() => undefined);
  }
  if (!masterOut) return null;
  return { ctx: audioCtx, out: masterOut };
}

function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) return noiseBuffer;
  const length = ctx.sampleRate * 1.5;
  const buf = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  noiseBuffer = buf;
  return buf;
}

interface ToneOpts {
  freq: number;
  start?: number;
  dur: number;
  type?: OscillatorType;
  vol?: number;
  slideTo?: number;
  detune?: number;
  attack?: number;
  filterHz?: number;
}

function playTone(ctx: AudioContext, out: AudioNode, t0: number, opts: ToneOpts) {
  const start = t0 + (opts.start ?? 0);
  const attack = opts.attack ?? 0.008;
  const vol = opts.vol ?? 0.2;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = opts.type ?? "triangle";
  osc.frequency.setValueAtTime(opts.freq, start);
  if (opts.slideTo) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.slideTo), start + opts.dur);
  }
  if (opts.detune) osc.detune.setValueAtTime(opts.detune, start);

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(vol, start + Math.min(attack, opts.dur * 0.4));
  gain.gain.exponentialRampToValueAtTime(0.0001, start + opts.dur);

  if (opts.filterHz) {
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(opts.filterHz, start);
    osc.connect(filter);
    filter.connect(gain);
  } else {
    osc.connect(gain);
  }
  gain.connect(out);

  osc.start(start);
  osc.stop(start + opts.dur + 0.02);
}

function playNoise(
  ctx: AudioContext,
  out: AudioNode,
  t0: number,
  startOffset: number,
  dur: number,
  vol: number,
  filterType: BiquadFilterType,
  freqStart: number,
  freqEnd?: number,
) {
  const start = t0 + startOffset;
  const src = ctx.createBufferSource();
  src.buffer = getNoiseBuffer(ctx);

  const filter = ctx.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.setValueAtTime(freqStart, start);
  if (freqEnd) {
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), start + dur);
  }

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(vol, start + Math.min(0.02, dur * 0.3));
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);

  src.connect(filter);
  filter.connect(gain);
  gain.connect(out);

  src.start(start);
  src.stop(start + dur + 0.02);
}

// =========================================================================
// UI Button & Game Event Sounds
// =========================================================================

/** Crisp retro pixel click for any standard button press */
export function playClick(): void {
  const a = getAudio();
  if (!a) return;
  const t = a.ctx.currentTime;
  playTone(a.ctx, a.out, t, { freq: 540, slideTo: 780, dur: 0.045, type: "triangle", vol: 0.16, attack: 0.003 });
  playTone(a.ctx, a.out, t, { freq: 1180, dur: 0.02, type: "square", vol: 0.05, attack: 0.002 });
}

/**
 * An old treasure map unrolling: a smooth papery swish as the sheet slides open, a couple of soft
 * rustles, then a gentle flap as it lays flat. Used when opening the WANTED challenger poster.
 */
export function playMapUnroll(): void {
  const a = getAudio();
  if (!a) return;
  const { ctx, out } = a;
  const t = ctx.currentTime;
  // The sheet sliding open: a warm swish that rises and fades, with a quieter airy layer on top.
  playNoise(ctx, out, t, 0, 0.55, 0.09, "bandpass", 500, 1700);
  playNoise(ctx, out, t, 0.06, 0.42, 0.025, "highpass", 2400, 3800);
  // Just a few soft, low rustles (no sharp crinkling).
  for (const [at, f] of [[0.1, 1300], [0.24, 1100], [0.38, 1500]] as const) {
    playNoise(ctx, out, t, at, 0.05, 0.03, "bandpass", f, f * 0.8);
  }
  // It lays flat: a gentle papery flap with a little body.
  playNoise(ctx, out, t, 0.54, 0.12, 0.12, "lowpass", 1100, 250);
  playTone(ctx, out, t, { freq: 140, slideTo: 75, start: 0.54, dur: 0.1, type: "sine", vol: 0.11, attack: 0.003 });
}

/** Heroic anchor-lift jingle when clicking SET SAIL */
export function playSetSail(): void {
  const a = getAudio();
  if (!a) return;
  const t = a.ctx.currentTime;
  // Bright rising adventure triad: G4 -> C5 -> E5 -> G5 + C6 shimmer
  const notes = [
    { f: 392.0, s: 0.0, d: 0.13 },
    { f: 523.25, s: 0.08, d: 0.13 },
    { f: 659.25, s: 0.16, d: 0.15 },
    { f: 783.99, s: 0.24, d: 0.38 },
  ];
  for (const n of notes) {
    playTone(a.ctx, a.out, t, { freq: n.f, start: n.s, dur: n.d, type: "triangle", vol: 0.22 });
    playTone(a.ctx, a.out, t, { freq: n.f * 0.5, start: n.s, dur: n.d, type: "sawtooth", vol: 0.07, filterHz: 1400 });
  }
  playTone(a.ctx, a.out, t, { freq: 1046.5, start: 0.26, dur: 0.42, type: "sine", vol: 0.14 });
  playNoise(a.ctx, a.out, t, 0.22, 0.25, 0.05, "bandpass", 1600, 3400);
}

/** Forward chime when clicking NEXT or SEE RESULTS */
export function playNext(): void {
  const a = getAudio();
  if (!a) return;
  const t = a.ctx.currentTime;
  playTone(a.ctx, a.out, t, { freq: 587.33, start: 0, dur: 0.07, type: "triangle", vol: 0.18, attack: 0.004 });
  playTone(a.ctx, a.out, t, { freq: 880.0, start: 0.055, dur: 0.12, type: "triangle", vol: 0.2, attack: 0.004 });
}

/** Friendly double-chirp when accepting an auto-correct suggestion */
export function playSuggest(): void {
  const a = getAudio();
  if (!a) return;
  const t = a.ctx.currentTime;
  playTone(a.ctx, a.out, t, { freq: 698.46, start: 0, dur: 0.055, type: "square", vol: 0.09, filterHz: 2400 });
  playTone(a.ctx, a.out, t, { freq: 987.77, start: 0.05, dur: 0.09, type: "triangle", vol: 0.16 });
}

/** Short soft buzz on an incorrect guess */
export function playWrong(): void {
  const a = getAudio();
  if (!a) return;
  const t = a.ctx.currentTime;
  playTone(a.ctx, a.out, t, { freq: 200, slideTo: 135, dur: 0.16, type: "sawtooth", vol: 0.15, filterHz: 680 });
  playTone(a.ctx, a.out, t, { freq: 145, slideTo: 105, dur: 0.16, start: 0.02, type: "square", vol: 0.09, filterHz: 520 });
}

/** Subtle countdown tick during the final 5 seconds */
export function playTick(urgent: boolean): void {
  const a = getAudio();
  if (!a) return;
  const t = a.ctx.currentTime;
  playTone(a.ctx, a.out, t, {
    freq: urgent ? 1080 : 820,
    dur: 0.03,
    type: "triangle",
    vol: urgent ? 0.11 : 0.07,
    attack: 0.002,
  });
}

/** Descending horn when the 25s timer expires */
export function playTimeout(): void {
  const a = getAudio();
  if (!a) return;
  const t = a.ctx.currentTime;
  const notes = [
    { f: 349.23, s: 0.0, d: 0.16 },
    { f: 311.13, s: 0.15, d: 0.16 },
    { f: 261.63, s: 0.3, d: 0.38 },
  ];
  for (const n of notes) {
    playTone(a.ctx, a.out, t, { freq: n.f, start: n.s, dur: n.d, type: "sawtooth", vol: 0.13, filterHz: 900 });
    playTone(a.ctx, a.out, t, { freq: n.f, start: n.s, dur: n.d, type: "triangle", vol: 0.12 });
  }
}

/** Brief triumphant horn when crossing into a new Saga */
export function playSaga(): void {
  const a = getAudio();
  if (!a) return;
  const t = a.ctx.currentTime;
  playTone(a.ctx, a.out, t, { freq: 587.33, start: 0, dur: 0.12, type: "triangle", vol: 0.16 });
  playTone(a.ctx, a.out, t, { freq: 880.0, start: 0.1, dur: 0.28, type: "triangle", vol: 0.2 });
  playTone(a.ctx, a.out, t, { freq: 440.0, start: 0.1, dur: 0.28, type: "sawtooth", vol: 0.06, filterHz: 1400 });
}

// =========================================================================
// Escalating Rarity Pull Fanfares (Common -> One in a Luffillion)
// =========================================================================

export function playPull(tier: Tier): void {
  const a = getAudio();
  if (!a) return;
  const { ctx, out } = a;
  const t = ctx.currentTime;

  if (tier === "common") {
    // 10 pts — simple, clean retro two-note chime (C5 -> E5)
    playTone(ctx, out, t, { freq: 523.25, start: 0.0, dur: 0.12, type: "triangle", vol: 0.2 });
    playTone(ctx, out, t, { freq: 659.25, start: 0.09, dur: 0.24, type: "triangle", vol: 0.22 });
    playTone(ctx, out, t, { freq: 659.25, start: 0.09, dur: 0.2, type: "sine", vol: 0.1 });
    return;
  }

  if (tier === "uncommon") {
    // 25 pts — bright upbeat 4-note emerald arpeggio (C5 -> E5 -> G5 -> C6)
    const arp = [523.25, 659.25, 783.99, 1046.5];
    arp.forEach((f, i) => {
      const start = i * 0.065;
      const dur = i === arp.length - 1 ? 0.36 : 0.14;
      playTone(ctx, out, t, { freq: f, start, dur, type: "triangle", vol: 0.22 });
      playTone(ctx, out, t, { freq: f, start, dur: dur * 0.7, type: "square", vol: 0.055, filterHz: 2600 });
    });
    // Light high sparkle
    playTone(ctx, out, t, { freq: 1567.98, start: 0.24, dur: 0.22, type: "sine", vol: 0.09 });
    return;
  }

  if (tier === "rare") {
    // 45 pts — energetic heroic sapphire riff + bass punch + shimmer whoosh
    playTone(ctx, out, t, { freq: 130.81, slideTo: 65.41, dur: 0.22, type: "sine", vol: 0.32, attack: 0.004 });
    playNoise(ctx, out, t, 0.0, 0.26, 0.08, "bandpass", 900, 3800);

    const lead = [
      { f: 523.25, s: 0.02, d: 0.1 },
      { f: 587.33, s: 0.09, d: 0.1 },
      { f: 659.25, s: 0.16, d: 0.11 },
      { f: 783.99, s: 0.24, d: 0.14 },
      { f: 1046.5, s: 0.34, d: 0.52 },
    ];
    for (const n of lead) {
      playTone(ctx, out, t, { freq: n.f, start: n.s, dur: n.d, type: "triangle", vol: 0.24 });
      playTone(ctx, out, t, { freq: n.f, start: n.s, dur: n.d, type: "sawtooth", vol: 0.08, filterHz: 2400, detune: 5 });
    }
    // Harmony chord on the peak
    playTone(ctx, out, t, { freq: 659.25, start: 0.34, dur: 0.5, type: "triangle", vol: 0.14 });
    playTone(ctx, out, t, { freq: 783.99, start: 0.34, dur: 0.5, type: "triangle", vol: 0.14 });
    // Sparkling high bells
    playTone(ctx, out, t, { freq: 1318.51, start: 0.44, dur: 0.25, type: "sine", vol: 0.11 });
    playTone(ctx, out, t, { freq: 1567.98, start: 0.52, dur: 0.32, type: "sine", vol: 0.12 });
    return;
  }

  if (tier === "epic") {
    // 75 pts — grand amethyst power fanfare: impact + sweeping arpeggio + brass chords + crystal bells
    playTone(ctx, out, t, { freq: 140, slideTo: 48, dur: 0.36, type: "sine", vol: 0.4, attack: 0.004 });
    playNoise(ctx, out, t, 0.0, 0.34, 0.12, "bandpass", 600, 5200);

    // Rapid soaring run
    const run = [392.0, 493.88, 587.33, 783.99, 987.77, 1174.66];
    run.forEach((f, i) => {
      playTone(ctx, out, t, { freq: f, start: 0.04 + i * 0.045, dur: 0.16, type: "square", vol: 0.075, filterHz: 3200 });
    });

    // Triumphant brass chord progression: F -> G -> C
    const chords = [
      { s: 0.28, d: 0.22, freqs: [349.23, 440.0, 523.25, 698.46] },
      { s: 0.48, d: 0.22, freqs: [392.0, 493.88, 587.33, 783.99] },
      { s: 0.68, d: 0.85, freqs: [523.25, 659.25, 783.99, 1046.5] },
    ];
    for (const ch of chords) {
      playTone(ctx, out, t, { freq: ch.freqs[0] * 0.5, start: ch.s, dur: ch.d, type: "triangle", vol: 0.24 });
      for (const f of ch.freqs) {
        playTone(ctx, out, t, { freq: f, start: ch.s, dur: ch.d, type: "sawtooth", vol: 0.09, filterHz: 2600, detune: -6 });
        playTone(ctx, out, t, { freq: f, start: ch.s, dur: ch.d, type: "sawtooth", vol: 0.09, filterHz: 2600, detune: 6 });
        playTone(ctx, out, t, { freq: f, start: ch.s, dur: ch.d, type: "triangle", vol: 0.12 });
      }
    }
    // Cascading crystal chimes over the finale
    [1318.51, 1567.98, 1975.53, 2093.0].forEach((f, i) => {
      playTone(ctx, out, t, { freq: f, start: 0.78 + i * 0.09, dur: 0.45, type: "sine", vol: 0.12 });
    });
    return;
  }

  // 100 pts — ONE IN A LUFFILLION! Legendary Pirate King multi-stage mega fanfare!
  // 1. Massive impact boom + golden riser
  playTone(ctx, out, t, { freq: 155, slideTo: 38, dur: 0.55, type: "sine", vol: 0.48, attack: 0.004 });
  playNoise(ctx, out, t, 0.0, 0.45, 0.15, "bandpass", 400, 6500);

  // 2. Two-octave rainbow glissando
  const gliss = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51, 1567.98, 2093.0];
  gliss.forEach((f, i) => {
    playTone(ctx, out, t, { freq: f, start: 0.03 + i * 0.032, dur: 0.18, type: "triangle", vol: 0.16 });
    playTone(ctx, out, t, { freq: f, start: 0.03 + i * 0.032, dur: 0.12, type: "square", vol: 0.06, filterHz: 4200 });
  });

  // 3. Heroic triumphant pirate anthem melody (G4 -> C5 -> E5 -> G5 -> A5 -> G5 -> C6!)
  const anthem = [
    { f: 392.0, s: 0.34, d: 0.14 },
    { f: 523.25, s: 0.46, d: 0.14 },
    { f: 659.25, s: 0.58, d: 0.16 },
    { f: 783.99, s: 0.72, d: 0.22 },
    { f: 880.0, s: 0.92, d: 0.16 },
    { f: 783.99, s: 1.06, d: 0.16 },
    { f: 1046.5, s: 1.2, d: 1.35 },
  ];
  for (const n of anthem) {
    playTone(ctx, out, t, { freq: n.f, start: n.s, dur: n.d, type: "sawtooth", vol: 0.13, filterHz: 3200, detune: -7 });
    playTone(ctx, out, t, { freq: n.f, start: n.s, dur: n.d, type: "sawtooth", vol: 0.13, filterHz: 3200, detune: 7 });
    playTone(ctx, out, t, { freq: n.f, start: n.s, dur: n.d, type: "triangle", vol: 0.18 });
  }

  // 4. Driving brass bass punches under the anthem
  playTone(ctx, out, t, { freq: 130.81, start: 0.34, dur: 0.36, type: "sawtooth", vol: 0.2, filterHz: 600 });
  playTone(ctx, out, t, { freq: 174.61, start: 0.72, dur: 0.42, type: "sawtooth", vol: 0.2, filterHz: 600 });
  playTone(ctx, out, t, { freq: 196.0, start: 1.06, dur: 0.18, type: "sawtooth", vol: 0.22, filterHz: 700 });

  // 5. Huge Cmaj9 victory finale chord + second sub-boom + cymbal crash
  playTone(ctx, out, t, { freq: 130.81, slideTo: 65.41, start: 1.2, dur: 1.25, type: "sine", vol: 0.42 });
  playNoise(ctx, out, t, 1.2, 0.85, 0.13, "highpass", 3200, 1200);
  const finaleChord = [261.63, 392.0, 523.25, 659.25, 783.99, 987.77, 1174.66];
  for (const f of finaleChord) {
    playTone(ctx, out, t, { freq: f, start: 1.2, dur: 1.45, type: "sawtooth", vol: 0.065, filterHz: 2800, detune: -8 });
    playTone(ctx, out, t, { freq: f, start: 1.2, dur: 1.45, type: "sawtooth", vol: 0.065, filterHz: 2800, detune: 8 });
    playTone(ctx, out, t, { freq: f, start: 1.2, dur: 1.45, type: "triangle", vol: 0.08 });
  }

  // 6. Celebratory firework crackles & glittering golden star bells
  const sparkles = [1567.98, 2093.0, 1975.53, 2349.32, 2637.02, 2093.0, 3135.96];
  sparkles.forEach((f, i) => {
    const st = 1.32 + i * 0.14;
    playTone(ctx, out, t, { freq: f, start: st, dur: 0.42, type: "sine", vol: 0.11 });
    if (i % 2 === 0) {
      playNoise(ctx, out, t, st, 0.09, 0.07, "bandpass", 4500, 1800);
    }
  });
}

/**
 * Loop soft pixel footsteps while Luffy is travelling. Each rarity gets a
 * shorter step interval so better pulls audibly make him run faster.
 * The returned cleanup stops the loop when the travel animation ends.
 */
export function startRunSound(tier: Tier | null): () => void {
  const a = getAudio();
  if (!a) return () => undefined;

  const { ctx, out } = a;
  const runBus = ctx.createGain();
  runBus.gain.value = 0.68;
  runBus.connect(out);

  const stepSeconds: Record<Tier, number> = {
    common: 0.34,
    uncommon: 0.275,
    rare: 0.215,
    epic: 0.16,
    luffillion: 0.115,
  };
  const interval = tier ? stepSeconds[tier] : 0.23;
  let nextStep = ctx.currentTime + 0.025;
  let count = 0;
  let stopped = false;

  const timer = window.setInterval(() => {
    if (stopped || ctx.state === "closed") return;
    const now = ctx.currentTime;
    const horizon = now + 0.1;
    if (nextStep < now) nextStep = now + 0.008;

    while (nextStep < horizon) {
      const alternate = count % 2;
      const when = nextStep;
      const thumpFreq = alternate === 0 ? 102 : 88;

      // Cushioned landing plus a light shoe scuff: a low thud and filtered pixel grit.
      playTone(ctx, runBus, when, {
        freq: thumpFreq,
        slideTo: alternate === 0 ? 54 : 48,
        dur: 0.085,
        type: "sine",
        vol: 0.12,
        attack: 0.003,
      });
      playNoise(ctx, runBus, when, 0, 0.052, 0.032, "bandpass", alternate === 0 ? 760 : 620, 360);
      playTone(ctx, runBus, when, {
        freq: alternate === 0 ? 248 : 205,
        dur: 0.03,
        type: "triangle",
        vol: 0.035,
        attack: 0.002,
      });

      count++;
      nextStep += interval;
    }
  }, 24);

  return () => {
    if (stopped) return;
    stopped = true;
    window.clearInterval(timer);
    const now = ctx.currentTime;
    runBus.gain.cancelScheduledValues(now);
    runBus.gain.setTargetAtTime(0, now, 0.018);
    window.setTimeout(() => runBus.disconnect(), 150);
  };
}

/** Short fanfare for an achievement unlocking. */
export function playAchievement(): void {
  const a = getAudio();
  if (!a) return;
  const t = a.ctx.currentTime;
  [523.25, 659.25, 783.99, 1046.5, 1567.98].forEach((f, i) => {
    playTone(a.ctx, a.out, t, { freq: f, start: i * 0.07, dur: i === 4 ? 0.55 : 0.18, type: "triangle", vol: 0.2 });
    playTone(a.ctx, a.out, t, { freq: f * 2, start: i * 0.07, dur: 0.12, type: "sine", vol: 0.07 });
  });
  playNoise(a.ctx, a.out, t, 0.28, 0.5, 0.04, "bandpass", 2400, 5200);
}

// =========================================================================
// Treasure chest sounds
// =========================================================================

/** Rattle + rising note as the chest's glow climbs one rarity step (0 = common … 5 = mythic). */
export function playChestCharge(step: number): void {
  const a = getAudio();
  if (!a) return;
  const t = a.ctx.currentTime;
  const scale = [392.0, 440.0, 523.25, 659.25, 783.99, 987.77];
  const f = scale[Math.max(0, Math.min(scale.length - 1, step))];
  playNoise(a.ctx, a.out, t, 0, 0.09, 0.07 + step * 0.012, "bandpass", 700 + step * 160, 300);
  playTone(a.ctx, a.out, t, { freq: f, start: 0.02, dur: 0.2, type: "triangle", vol: 0.16 + step * 0.01 });
  playTone(a.ctx, a.out, t, { freq: f * 2, start: 0.02, dur: 0.12, type: "sine", vol: 0.05 });
  if (step === 4) {
    // The glow turns gold: a deep thump and a bright royal bell.
    const wet = getVerb(a.ctx, a.out);
    playTone(a.ctx, a.out, t, { freq: 98, slideTo: 49, dur: 0.35, type: "sine", vol: 0.34, attack: 0.002 });
    metal(a.ctx, wet, t, 1174.66, 0.02, 0.9, 0.06, [1, 2.76, 5.4]);
    coins(a.ctx, wet, t, 0.04, 6, 0.3, 0.03, 4);
  }
  if (step >= 5) {
    // The glow tears into the cosmos: a dark boom, a crackle and a reversed shimmer.
    const wet = getVerb(a.ctx, a.out);
    playTone(a.ctx, a.out, t, { freq: 72, slideTo: 30, dur: 0.6, type: "sine", vol: 0.42, attack: 0.002 });
    zap(a.ctx, pan(a.ctx, a.out, -0.6), t, 0.03, 0.08, 1.4);
    zap(a.ctx, pan(a.ctx, a.out, 0.6), t, 0.11, 0.08, 1.1);
    metal(a.ctx, wet, t, 1479.98, 0.02, 1.1, 0.05, [1, 2.4, 3.9]);
  }
}

/** Lid-burst fanfare that grows with the reward rarity (0 = common … 5 = mythic). */
export function playChestBurst(rank: number): void {
  const a = getAudio();
  if (!a) return;
  const { ctx, out } = a;
  const t = ctx.currentTime;
  if (rank === 4) return legendaryBurst(ctx, out, getVerb(ctx, out), t);
  if (rank >= 5) return mythicBurst(ctx, out, getVerb(ctx, out), t);
  // Lid pop for every chest.
  playNoise(ctx, out, t, 0, 0.18, 0.12, "lowpass", 2400, 300);
  playTone(ctx, out, t, { freq: 180, slideTo: 70, dur: 0.18, type: "sine", vol: 0.3 });

  const arp = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98, 2093.0];
  const notes = Math.min(arp.length, 2 + rank);
  for (let i = 0; i < notes; i++) {
    const last = i === notes - 1;
    playTone(ctx, out, t, { freq: arp[i], start: 0.05 + i * 0.07, dur: last ? 0.5 + rank * 0.08 : 0.14, type: "triangle", vol: 0.2 });
    if (rank >= 2) playTone(ctx, out, t, { freq: arp[i] / 2, start: 0.05 + i * 0.07, dur: 0.14, type: "sawtooth", vol: 0.06, filterHz: 1800 });
  }
  if (rank >= 3) {
    // Epic: sweeping whoosh and a held power chord.
    playNoise(ctx, out, t, 0.02, 0.5, 0.1, "bandpass", 500, 6000);
    const hold = 0.05 + notes * 0.07;
    for (const f of [523.25, 659.25, 783.99]) playTone(ctx, out, t, { freq: f, start: hold, dur: 0.7, type: "triangle", vol: 0.1 });
  }
}

/** Heavy chest landing on the deck. */
export function playChestThud(): void {
  const a = getAudio();
  if (!a) return;
  const t = a.ctx.currentTime;
  playTone(a.ctx, a.out, t, { freq: 120, slideTo: 45, dur: 0.22, type: "sine", vol: 0.38, attack: 0.003 });
  playNoise(a.ctx, a.out, t, 0, 0.14, 0.1, "lowpass", 900, 200);
}

/** Wood straining as light leaks from the seams: a heartbeat that quickens with rarity. */
export function playChestCrack(rank: number): void {
  const a = getAudio();
  if (!a) return;
  const { ctx, out } = a;
  const t = ctx.currentTime;
  if (rank === 4) return legendaryCrack(ctx, out, getVerb(ctx, out), t);
  if (rank >= 5) return mythicCrack(ctx, out, getVerb(ctx, out), t);
  const beats = 2 + Math.min(3, Math.floor(rank / 2));
  for (let i = 0; i < beats; i++) {
    const s = i * Math.max(0.16, 0.34 - rank * 0.03);
    playTone(ctx, out, t, { freq: 70, slideTo: 48, start: s, dur: 0.12, type: "sine", vol: 0.32 });
    playNoise(ctx, out, t, s + 0.02, 0.05, 0.05, "highpass", 2600, 0);
  }
  playNoise(ctx, out, t, 0, 0.6 + rank * 0.1, 0.04, "bandpass", 300, 4200);
}

/** The recruit's silhouette floats out of the chest. Legendary and Mythic get a full build-up. */
export function playChestRise(rank: number): void {
  const r = arena();
  if (!r) return;
  const { ctx, out, wet, t } = r;
  if (rank === 4) return legendaryRise(ctx, out, wet, t);
  if (rank >= 5) return mythicRise(ctx, out, wet, t);
  const dur = 0.9 + rank * 0.15;
  playTone(ctx, out, t, { freq: 220, slideTo: 880 + rank * 120, dur, type: "triangle", vol: 0.08 });
  playTone(ctx, out, t, { freq: 330, slideTo: 1320 + rank * 160, dur, type: "sine", vol: 0.05 });
}

/** Final reveal sting: a short chord, a royal fanfare for Legendary, an epic finale for Mythic. */
export function playChestReveal(rank: number): void {
  const r = arena();
  if (!r) return;
  const { ctx, out, wet, t } = r;
  if (rank === 4) return legendaryReveal(ctx, out, wet, t);
  if (rank >= 5) return mythicReveal(ctx, out, wet, t);
  const chord = [523.25, 659.25, 783.99];
  chord.forEach((f, i) => playTone(ctx, out, t, { freq: f, start: i * 0.03, dur: 0.6 + rank * 0.1, type: "triangle", vol: 0.1 }));
}

/* ---------- Legendary: the royal treasure vault (D major) ----------
   Phase lengths come from ChestOpening: crack 1.61s, burst 1.89s, rise 2.07s. */

function legendaryCrack(ctx: AudioContext, out: AudioNode, wet: AudioNode, t: number) {
  // Gold light leaks out: a warm hum, the wood creaking, coins starting to trickle and a harp climbing,
  // all pulled into a reversed swell that lands on the lid blast.
  drone(ctx, out, t, 0, 1.65, [73.42, 110, 146.83], 0.035, 560, 0.5);
  for (const [at, p] of [[0, -0.5], [0.45, 0.5], [0.85, -0.3], [1.15, 0.3], [1.38, 0]] as const) {
    playTone(ctx, out, t, { freq: 66, slideTo: 44, start: at, dur: 0.16, type: "sine", vol: 0.34, attack: 0.002 });
    playNoise(ctx, pan(ctx, out, p), t, at + 0.01, 0.14, 0.05, "bandpass", 420, 180); // creak
  }
  harp(ctx, wet, t, 0.1, [293.66, 369.99, 440, 587.33, 739.99, 880, 1174.66, 1479.98], 0.16, 0.06);
  coins(ctx, wet, t, 0.2, 14, 1.3, 0.028, 11);
  riseTone(ctx, out, t, 0.2, 1.4, 587.33, 1174.66, 0.035, "triangle");
  swell(ctx, wet, t, 0.75, 0.86, 0.16, 600, 9000);
  swell(ctx, out, t, 1.0, 0.61, 0.09, 2000, 10000);
}

function legendaryBurst(ctx: AudioContext, out: AudioNode, wet: AudioNode, t: number) {
  // The lid blasts off: an impact under a golden BRAAAM, a bell strike, a cymbal and an avalanche of
  // gold coins pouring left and right, then a warm glow that hangs in the air.
  impact(ctx, out, wet, t, 1.25);
  braam(ctx, out, wet, t, 0, [36.71, 73.42, 110, 146.83, 185], 1.5, 0.05, 2400);
  metal(ctx, wet, t, 587.33, 0.01, 1.8, 0.08, [1, 2.76, 5.4, 8.93]);
  metal(ctx, wet, t, 880, 0.04, 1.4, 0.05, [1, 2.76, 5.4]);
  crash(ctx, out, wet, t, 0, 0.14, 1.9);
  whoosh(ctx, out, t, 0, 0.45, 0.14, true);
  coins(ctx, out, t, 0.03, 26, 1.1, 0.034, 3);
  coins(ctx, wet, t, 0.1, 16, 1.5, 0.026, 9);
  for (let i = 0; i < 8; i++) playTone(ctx, pan(ctx, wet, i % 2 ? 0.6 : -0.6), t, { freq: 2349.32 / Math.pow(2, (i * 2) / 12), start: 0.08 + i * 0.05, dur: 0.4, type: "sine", vol: 0.04 });
  choir(ctx, out, wet, t, [293.66, 369.99, 440, 587.33], 0.2, 1.7, 0.018, 0.5);
}

function legendaryRise(ctx: AudioContext, out: AudioNode, wet: AudioNode, t: number) {
  // A royal horn call over timpani heartbeats and a swelling choir, a snare roll that builds, and a
  // reversed cymbal that ends exactly on the reveal.
  drone(ctx, out, t, 0, 2.1, [73.42, 110, 146.83], 0.045, 650, 0.6);
  taiko(ctx, out, t, 0.02, 0.44, 0.9); taiko(ctx, wet, t, 0.02, 0.2, 0.9);
  taiko(ctx, out, t, 0.7, 0.46, 0.9); taiko(ctx, wet, t, 0.7, 0.22, 0.9);
  // Horn call: A3 – D4 – F#4 – A4 … D5
  ([[220, 0.2, 0.22], [293.66, 0.44, 0.22], [369.99, 0.68, 0.22], [440, 0.92, 0.5], [587.33, 1.44, 0.55]] as const)
    .forEach(([f, at, d]) => lead(ctx, out, wet, t, at, d, f, 0.05, 2600));
  brass(ctx, out, t, [146.83, 220, 293.66], 0.92, 1.1, 0.03, 1800, 0.25);
  choir(ctx, out, wet, t, [293.66, 369.99, 440, 587.33], 0.3, 1.8, 0.026, 1.1);
  harp(ctx, wet, t, 1.0, [587.33, 739.99, 880, 1174.66, 1479.98, 1760, 2349.32], 0.08, 0.045);
  for (let i = 0; i < 14; i++) playNoise(ctx, out, t, 1.3 + i * 0.054, 0.06, 0.03 + i * 0.006, "bandpass", 2400, 1400); // snare roll
  swell(ctx, wet, t, 1.05, 1.0, 0.18, 400, 10000);
  riseTone(ctx, out, t, 0.9, 1.15, 220, 880, 0.04, "sawtooth", 3000);
}

function legendaryReveal(ctx: AudioContext, out: AudioNode, wet: AudioNode, t: number) {
  // The royal finale: a huge impact and golden BRAAAM, a gong, then a soaring brass fanfare
  // (D5 – F#5 – A5 … B5 – A5 – D6) over a full choir, timpani and a shower of gold and bells.
  impact(ctx, out, wet, t, 1.35);
  braam(ctx, out, wet, t, 0, [36.71, 73.42, 110, 146.83, 185, 220], 2.2, 0.05, 2800);
  metal(ctx, wet, t, 98, 0.02, 3, 0.12, [1, 2.4, 3.9, 5.6]);
  crash(ctx, out, wet, t, 0, 0.15, 2.2);
  whoosh(ctx, out, t, 0, 0.4, 0.12, false);
  taiko(ctx, out, t, 0, 0.55); taiko(ctx, out, t, 0.15, 0.4); taiko(ctx, out, t, 0.3, 0.45);
  for (let i = 0; i < 6; i++) taiko(ctx, out, t, 0.62 + i * 0.07, 0.22 + i * 0.05, 1.1);
  taiko(ctx, out, t, 1.14, 0.6); crash(ctx, out, wet, t, 1.14, 0.13, 2.4);
  ([[587.33, 0.15, 0.12], [739.99, 0.27, 0.12], [880, 0.39, 0.5], [987.77, 0.9, 0.12], [880, 1.02, 0.12], [1174.66, 1.14, 1.5]] as const)
    .forEach(([f, at, d]) => { lead(ctx, out, wet, t, at, d, f, 0.06, 3400); lead(ctx, out, wet, t, at, d, f / 2, 0.035, 2200); });
  brass(ctx, out, t, [293.66, 369.99, 440], 0.15, 0.7, 0.04, 2600, 0.02);
  brass(ctx, out, t, [196, 293.66, 392, 493.88], 0.9, 0.24, 0.04, 2800, 0.02);
  brass(ctx, out, t, [146.83, 293.66, 369.99, 440, 587.33], 1.14, 1.9, 0.05, 3400, 0.03);
  brass(ctx, wet, t, [587.33, 739.99, 880], 1.16, 1.7, 0.025, 3000, 0.08);
  choir(ctx, out, wet, t, [146.83, 293.66, 369.99, 440, 587.33], 0.1, 3.2, 0.03, 0.35);
  coins(ctx, out, t, 0.05, 22, 1.4, 0.03, 5);
  coins(ctx, wet, t, 1.14, 26, 1.8, 0.028, 13);
  harp(ctx, wet, t, 1.14, [587.33, 739.99, 880, 1174.66, 1479.98, 1760, 2349.32, 2959.96], 0.045, 0.05);
  [2349.32, 2959.96, 3520, 4698.63].forEach((f, i) => playTone(ctx, pan(ctx, wet, i % 2 ? 0.7 : -0.7), t, { freq: f, start: 1.2 + i * 0.09, dur: 0.9, type: "sine", vol: 0.04 }));
  playTone(ctx, out, t, { freq: 36.71, slideTo: 30, start: 1.14, dur: 2.4, type: "sine", vol: 0.3, attack: 0.01 });
}

/* ---------- Mythic: reality tearing open (D minor → D major) ----------
   Phase lengths come from ChestOpening: crack 1.8s, burst 2.1s, rise 2.3s. */

function mythicCrack(ctx: AudioContext, out: AudioNode, wet: AudioNode, t: number) {
  // Something ancient wakes up: a sub drone and a growling bass, a heartbeat that races, glitches
  // crackling left and right, a ringing whine and a reversed swell that rips into the burst.
  drone(ctx, out, t, 0, 1.85, [36.71, 55, 73.42], 0.06, 280, 0.5);
  growl(ctx, out, t, 0, 1.8, 55, 0.07);
  let at = 0;
  for (let i = 0; i < 7; i++) { heartbeat(ctx, out, t, at, 0.38 + i * 0.02); at += Math.max(0.17, 0.42 - i * 0.05); }
  for (let i = 0; i < 14; i++) zap(ctx, pan(ctx, out, i % 2 ? 0.7 : -0.7), t, 0.12 + i * 0.115, 0.05 + i * 0.004, 0.8 + (i % 4) * 0.4);
  riseTone(ctx, out, t, 0, 1.78, 2637, 5274, 0.018, "sine");
  shepard(ctx, out, t, 0.2, 1.58, 55, 0.045);
  swell(ctx, wet, t, 0.8, 0.99, 0.2, 200, 10000);
  swell(ctx, out, t, 1.3, 0.49, 0.12, 1500, 12000);
}

function mythicBurst(ctx: AudioContext, out: AudioNode, wet: AudioNode, t: number) {
  // The seal shatters: thunder, breaking glass and a colossal minor BRAAAM; a second shockwave hits in
  // major, then a cosmic shimmer climbs while glitches stutter into the rise.
  impact(ctx, out, wet, t, 1.6);
  thunder(ctx, out, wet, t, 0, 0.2);
  shatter(ctx, out, wet, t, 0.02, 0.14);
  braam(ctx, out, wet, t, 0, [29.14, 36.71, 73.42, 87.31, 110, 146.83], 1.4, 0.055, 2000);
  playTone(ctx, out, t, { freq: 52, slideTo: 22, dur: 1.6, type: "sine", vol: 0.45, attack: 0.002 });
  crash(ctx, out, wet, t, 0, 0.15, 2);
  impact(ctx, out, wet, t, 1.3, 0.62);
  braam(ctx, out, wet, t, 0.62, [29.14, 58.27, 116.54, 146.83, 174.61, 233.08], 1.3, 0.05, 2600);
  crash(ctx, out, wet, t, 0.62, 0.12, 1.8);
  choir(ctx, out, wet, t, [146.83, 174.61, 220, 293.66], 0.05, 1.9, 0.03, 0.15);
  for (const f of [440, 660, 880]) riseTone(ctx, pan(ctx, wet, f === 660 ? 0 : f === 440 ? -0.6 : 0.6), t, 0.7, 1.35, f, f * 4, 0.03, "sine");
  for (let i = 0; i < 10; i++) zap(ctx, pan(ctx, out, i % 2 ? -0.8 : 0.8), t, 1.45 + i * 0.06, 0.05 + i * 0.005, 1 + (i % 3) * 0.5);
  swell(ctx, wet, t, 1.3, 0.78, 0.15, 400, 10000);
}

function mythicRise(ctx: AudioContext, out: AudioNode, wet: AudioNode, t: number) {
  // The silhouette ascends: an angelic choir climbing Dm – Bb – C, an accelerating taiko roll, a
  // brass ostinato, an endless Shepard rise and a reversed swell that cuts off a breath before the drop.
  drone(ctx, out, t, 0, 2.3, [36.71, 55], 0.08, 280, 0.7);
  choir(ctx, out, wet, t, [146.83, 220, 293.66, 349.23], 0.0, 0.9, 0.032, 0.35);
  choir(ctx, out, wet, t, [116.54, 233.08, 293.66, 349.23], 0.8, 0.8, 0.034, 0.2);
  choir(ctx, out, wet, t, [130.81, 261.63, 329.63, 392], 1.5, 0.75, 0.04, 0.2);
  let at = 0.05;
  for (let i = 0; i < 20; i++) { taiko(ctx, i % 2 ? pan(ctx, out, 0.35) : pan(ctx, out, -0.35), t, at, 0.18 + i * 0.016, 0.75 + i * 0.018); at += Math.max(0.045, 0.22 - i * 0.01); }
  for (let i = 0; i < 12; i++) brass(ctx, out, t, [i < 4 ? 73.42 : i < 8 ? 58.27 : 65.41], 0.05 + i * 0.18, 0.12, 0.05, 1200, 0.005);
  shepard(ctx, out, t, 0, 2.2, 110, 0.05);
  riseTone(ctx, out, t, 0.6, 1.62, 1760, 7040, 0.02, "sine");
  swell(ctx, wet, t, 1.2, 1.0, 0.22, 200, 11000);
  swell(ctx, out, t, 1.7, 0.5, 0.13, 2000, 12000);
}

function mythicReveal(ctx: AudioContext, out: AudioNode, wet: AudioNode, t: number) {
  // The finale: a triple cosmic impact, thunder and a world-ending BRAAAM, an epic Bb – C – D rise that
  // explodes into a D major choir chord, a soaring lead over it, celestial arpeggios spiralling through
  // the stereo field, a waterfall of sparkles and a gong that rings out for seconds.
  impact(ctx, out, wet, t, 1.7);
  impact(ctx, out, wet, t, 1.4, 0.09);
  thunder(ctx, out, wet, t, 0, 0.22);
  shatter(ctx, out, wet, t, 0.01, 0.12);
  braam(ctx, out, wet, t, 0, [29.14, 36.71, 73.42, 87.31, 110, 146.83], 0.8, 0.055, 2200);
  playTone(ctx, out, t, { freq: 46, slideTo: 21, dur: 1.8, type: "sine", vol: 0.5, attack: 0.002 });
  crash(ctx, out, wet, t, 0, 0.16, 2.2);
  // Bb – C stabs, then D major lands.
  for (const [at, notes] of [[0.25, [116.54, 233.08, 293.66, 349.23, 466.16]], [0.5, [130.81, 261.63, 329.63, 392, 523.25]]] as const) {
    brass(ctx, out, t, [...notes], at, 0.2, 0.045, 3000, 0.008);
    taiko(ctx, out, t, at, 0.55, 0.85);
  }
  const land = 0.75;
  impact(ctx, out, wet, t, 1.5, land);
  braam(ctx, out, wet, t, land, [36.71, 73.42, 110, 146.83, 185, 220, 293.66], 3, 0.055, 3200);
  metal(ctx, wet, t, 73.42, land, 4, 0.14, [1, 2.4, 3.9, 5.6, 7.3]);
  crash(ctx, out, wet, t, land, 0.16, 2.6);
  crash(ctx, out, wet, t, land + 0.02, 0.1, 2.8);
  taiko(ctx, out, t, land, 0.66, 0.8); taiko(ctx, out, t, land + 0.18, 0.5); taiko(ctx, out, t, land + 0.36, 0.55);
  brass(ctx, out, t, [146.83, 293.66, 369.99, 440, 587.33], land, 2.8, 0.05, 3800, 0.02);
  brass(ctx, wet, t, [587.33, 739.99, 880], land + 0.02, 2.4, 0.028, 3200, 0.08);
  choir(ctx, out, wet, t, [146.83, 293.66, 369.99, 440, 587.33, 739.99], land - 0.05, 3.4, 0.04, 0.2);
  // Soaring lead: A5 slides up to D6, then F#6 – E6 – D6.
  lead(ctx, out, wet, t, land, 0.9, 1174.66, 0.06, 4200, 880);
  ([[1479.98, land + 0.9, 0.28], [1318.51, land + 1.18, 0.28], [1174.66, land + 1.46, 1.4]] as const)
    .forEach(([f, at, d]) => lead(ctx, out, wet, t, at, d, f, 0.055, 4200));
  const arp = [587.33, 739.99, 880, 1174.66, 1479.98, 1760, 2349.32, 2959.96, 3520, 4698.63];
  arp.forEach((f, i) => playTone(ctx, pan(ctx, wet, Math.sin(i * 1.3) * 0.85), t, { freq: f, start: land + 0.1 + i * 0.06, dur: 0.8, type: "sine", vol: 0.055 }));
  arp.slice().reverse().forEach((f, i) => playTone(ctx, pan(ctx, wet, Math.cos(i * 1.3) * 0.85), t, { freq: f, start: land + 0.9 + i * 0.06, dur: 0.7, type: "sine", vol: 0.04 }));
  coins(ctx, wet, t, land + 0.3, 34, 2.2, 0.03, 21);
  playTone(ctx, out, t, { freq: 880, slideTo: 3520, start: land - 0.3, dur: 1.4, type: "sine", vol: 0.04 });
  playTone(ctx, out, t, { freq: 36.71, slideTo: 32, start: land, dur: 3.2, type: "sine", vol: 0.32, attack: 0.01 });
}

/* ---------- Chest sound building blocks ---------- */

const panCache = new WeakMap<AudioNode, Map<number, AudioNode>>();
/** A cached stereo position feeding `out` (falls back to `out` where panning is unsupported). */
function pan(ctx: AudioContext, out: AudioNode, p: number): AudioNode {
  if (typeof ctx.createStereoPanner !== "function") return out;
  const key = Math.round(Math.max(-1, Math.min(1, p)) * 5) / 5;
  let byPos = panCache.get(out);
  if (!byPos) { byPos = new Map(); panCache.set(out, byPos); }
  let node = byPos.get(key);
  if (!node) { const sp = ctx.createStereoPanner(); sp.pan.value = key; sp.connect(out); node = sp; byPos.set(key, node); }
  return node;
}

/** Filtered noise whose volume swells up to a hard stop: a reversed cymbal leading into a hit. */
function swell(ctx: AudioContext, out: AudioNode, t: number, at: number, dur: number, vol: number, f0: number, f1: number) {
  const start = t + at, end = start + dur;
  const src = ctx.createBufferSource(); src.buffer = getNoiseBuffer(ctx); src.loop = true;
  const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.Q.value = 0.8;
  f.frequency.setValueAtTime(f0, start); f.frequency.exponentialRampToValueAtTime(f1, end);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, start); g.gain.exponentialRampToValueAtTime(vol, end); g.gain.linearRampToValueAtTime(0.0001, end + 0.03);
  src.connect(f); f.connect(g); g.connect(out); src.start(start); src.stop(end + 0.05);
}

/** A tone that keeps getting louder while it glides (risers and whines). */
function riseTone(ctx: AudioContext, out: AudioNode, t: number, at: number, dur: number, f0: number, f1: number, vol: number, type: OscillatorType, filterHz?: number) {
  const start = t + at, end = start + dur;
  const o = ctx.createOscillator(); o.type = type;
  o.frequency.setValueAtTime(f0, start); o.frequency.exponentialRampToValueAtTime(f1, end);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, start); g.gain.exponentialRampToValueAtTime(vol, end); g.gain.linearRampToValueAtTime(0.0001, end + 0.04);
  if (filterHz) { const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = filterHz; o.connect(f); f.connect(g); } else o.connect(g);
  g.connect(out); o.start(start); o.stop(end + 0.06);
}

/** An "endless" rise: three octave-stacked glides, loudest in the middle, so it feels like it never tops out. */
function shepard(ctx: AudioContext, out: AudioNode, t: number, at: number, dur: number, base: number, vol: number) {
  for (let k = 0; k < 3; k++) riseTone(ctx, out, t, at, dur, base * 2 ** k, base * 2 ** (k + 1.5), vol * (k === 1 ? 1 : 0.6), "sawtooth", 2600);
}

/** The cinematic "BRAAAM": a stack of detuned saws whose filter rips open and slowly closes again. */
function braam(ctx: AudioContext, out: AudioNode, wet: AudioNode, t: number, at: number, notes: number[], dur: number, vol: number, peakHz = 2600) {
  const start = t + at;
  const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.Q.value = 3;
  f.frequency.setValueAtTime(160, start); f.frequency.exponentialRampToValueAtTime(peakHz, start + 0.1); f.frequency.exponentialRampToValueAtTime(420, start + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, start); g.gain.linearRampToValueAtTime(vol, start + 0.025);
  g.gain.setValueAtTime(vol, start + dur * 0.3); g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  const send = ctx.createGain(); send.gain.value = 0.7;
  f.connect(g); g.connect(out); g.connect(send); send.connect(wet);
  for (const n of notes) for (const d of [-14, 0, 13]) {
    const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = n; o.detune.value = d;
    o.connect(f); o.start(start); o.stop(start + dur + 0.05);
  }
}

/** A brassy lead line with a little vibrato; `from` glides up into the note. */
function lead(ctx: AudioContext, out: AudioNode, wet: AudioNode, t: number, at: number, dur: number, freq: number, vol: number, filterHz: number, from?: number) {
  const start = t + at;
  const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.setValueAtTime(filterHz * 0.5, start); f.frequency.linearRampToValueAtTime(filterHz, start + 0.06);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, start); g.gain.linearRampToValueAtTime(vol, start + 0.02);
  g.gain.setValueAtTime(vol, start + Math.max(0.03, dur - 0.08)); g.gain.exponentialRampToValueAtTime(0.0001, start + dur + 0.12);
  const send = ctx.createGain(); send.gain.value = 0.5;
  f.connect(g); g.connect(out); g.connect(send); send.connect(wet);
  const vib = ctx.createOscillator(), vg = ctx.createGain(); vib.frequency.value = 5.6;
  vg.gain.setValueAtTime(0, start); vg.gain.linearRampToValueAtTime(dur > 0.3 ? 14 : 4, start + Math.min(0.3, dur));
  vib.connect(vg);
  for (const [type, d] of [["sawtooth", -6], ["square", 6]] as const) {
    const o = ctx.createOscillator(); o.type = type; o.detune.value = d;
    o.frequency.setValueAtTime(from ?? freq, start); if (from) o.frequency.exponentialRampToValueAtTime(freq, start + Math.min(0.25, dur * 0.4));
    vg.connect(o.detune); o.connect(f); o.start(start); o.stop(start + dur + 0.15);
  }
  vib.start(start); vib.stop(start + dur + 0.15);
}

/** Gold coins and glitter: short metallic pings scattered across the stereo field (seeded, so repeatable). */
function coins(ctx: AudioContext, out: AudioNode, t: number, at: number, count: number, span: number, vol: number, seed = 1) {
  let s = seed * 9301 + 49297;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < count; i++) {
    const when = at + span * Math.pow(i / count, 0.85) + rnd() * 0.03;
    const f = 2000 + rnd() * 4200, node = pan(ctx, out, rnd() * 1.8 - 0.9);
    playTone(ctx, node, t, { freq: f, start: when, dur: 0.16 + rnd() * 0.12, type: "sine", vol, attack: 0.001 });
    playTone(ctx, node, t, { freq: f * 2.76, start: when, dur: 0.07, type: "sine", vol: vol * 0.4, attack: 0.001 });
  }
}

/** Breaking glass: a bright noise burst with a spray of high shards. */
function shatter(ctx: AudioContext, out: AudioNode, wet: AudioNode, t: number, at: number, vol: number) {
  playNoise(ctx, out, t, at, 0.3, vol, "highpass", 4500, 9000);
  playNoise(ctx, wet, t, at + 0.02, 0.5, vol * 0.6, "bandpass", 6000, 3000);
  coins(ctx, wet, t, at, 20, 0.45, vol * 0.3, 7);
}

/** A thunder crack with a long rolling rumble. */
function thunder(ctx: AudioContext, out: AudioNode, wet: AudioNode, t: number, at: number, vol: number) {
  playNoise(ctx, out, t, at, 0.09, vol * 1.3, "highpass", 1800, 700);
  playNoise(ctx, out, t, at + 0.02, 1.45, vol, "lowpass", 1400, 70);
  for (let i = 0; i < 4; i++) playNoise(ctx, wet, t, at + 0.15 + i * 0.27, 0.6, vol * (0.7 - i * 0.12), "lowpass", 500, 90);
}

/** A two-beat heartbeat ("lub-dub"). */
function heartbeat(ctx: AudioContext, out: AudioNode, t: number, at: number, vol: number) {
  playTone(ctx, out, t, { freq: 62, slideTo: 40, start: at, dur: 0.14, type: "sine", vol, attack: 0.002 });
  playTone(ctx, out, t, { freq: 56, slideTo: 38, start: at + 0.12, dur: 0.12, type: "sine", vol: vol * 0.75, attack: 0.002 });
}

/** A menacing low growl: detuned saws with a wobbling filter. */
function growl(ctx: AudioContext, out: AudioNode, t: number, at: number, dur: number, freq: number, vol: number) {
  const start = t + at;
  const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.Q.value = 6; f.frequency.value = 260;
  const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.setValueAtTime(3, start); lfo.frequency.linearRampToValueAtTime(11, start + dur); lg.gain.value = 180;
  lfo.connect(lg); lg.connect(f.frequency);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, start); g.gain.exponentialRampToValueAtTime(vol, start + dur * 0.8); g.gain.linearRampToValueAtTime(0.0001, start + dur);
  f.connect(g); g.connect(out);
  for (const d of [-20, 0, 17]) { const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = freq; o.detune.value = d; o.connect(f); o.start(start); o.stop(start + dur + 0.05); }
  lfo.start(start); lfo.stop(start + dur + 0.05);
}

/** A held low drone of detuned saws through a lowpass, swelling in. */
function drone(ctx: AudioContext, out: AudioNode, t: number, at: number, dur: number, notes: number[], vol: number, filterHz: number, attack = 0.4) {
  for (const f of notes) {
    playTone(ctx, out, t, { freq: f, start: at, dur, type: "sawtooth", vol, attack, filterHz, detune: -7 });
    playTone(ctx, out, t, { freq: f, start: at, dur, type: "sawtooth", vol: vol * 0.8, attack, filterHz, detune: 7 });
  }
}

/** A harp glissando: plucked triangle notes with a quick decay, one after another. */
function harp(ctx: AudioContext, out: AudioNode, t: number, at: number, notes: number[], step: number, vol: number) {
  notes.forEach((f, i) => {
    playTone(ctx, out, t, { freq: f, start: at + i * step, dur: 0.7, type: "triangle", vol, attack: 0.003 });
    playTone(ctx, out, t, { freq: f * 2, start: at + i * step, dur: 0.35, type: "sine", vol: vol * 0.3, attack: 0.003 });
  });
}

/** An electric crackle: a short bright noise snap with a falling squelch. */
function zap(ctx: AudioContext, out: AudioNode, t: number, at: number, vol: number, pitch = 1) {
  playNoise(ctx, out, t, at, 0.06, vol, "bandpass", 3200 * pitch, 900);
  playTone(ctx, out, t, { freq: 1400 * pitch, slideTo: 160, start: at, dur: 0.07, type: "square", vol: vol * 0.5, attack: 0.001, filterHz: 4200 });
}

/** A synthetic "aah" choir: stacked detuned saws through two vowel formants, with a slow swell. */
function choir(ctx: AudioContext, out: AudioNode, wet: AudioNode, t: number, notes: number[], at: number, dur: number, vol: number, attack: number) {
  const start = t + at;
  const bus = ctx.createGain();
  bus.gain.setValueAtTime(0.0001, start);
  bus.gain.linearRampToValueAtTime(vol, start + attack);
  bus.gain.setValueAtTime(vol, start + Math.max(attack, dur - 0.6));
  bus.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  for (const [hz, q, g] of [[800, 5, 1], [1150, 6, 0.6], [2900, 8, 0.25]] as const) {
    const f = ctx.createBiquadFilter();
    f.type = "bandpass"; f.frequency.value = hz; f.Q.value = q;
    const fg = ctx.createGain(); fg.gain.value = g;
    bus.connect(f); f.connect(fg); fg.connect(out); fg.connect(wet);
  }
  for (const n of notes) for (const d of [-12, 0, 11]) {
    const o = ctx.createOscillator();
    o.type = "sawtooth"; o.frequency.value = n; o.detune.value = d;
    const vib = ctx.createOscillator(), vg = ctx.createGain();
    vib.frequency.value = 5 + (d % 3); vg.gain.value = 6;
    vib.connect(vg); vg.connect(o.detune);
    o.connect(bus);
    o.start(start); vib.start(start); o.stop(start + dur + 0.05); vib.stop(start + dur + 0.05);
  }
}

/* ---------- Ranked battle ---------- */

let verbCtx: AudioContext | null = null;
let verbSend: GainNode | null = null;

/** A shared hall reverb (generated impulse) so ranked hits ring out like an arena. */
function getVerb(ctx: AudioContext, out: AudioNode): AudioNode {
  if (verbSend && verbCtx === ctx) return verbSend;
  const seconds = 1.8;
  const length = Math.floor(ctx.sampleRate * seconds);
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3.2);
  }
  const conv = ctx.createConvolver();
  conv.buffer = impulse;
  const wet = ctx.createGain();
  wet.gain.value = 0.5;
  const tone = ctx.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.value = 4200;
  verbSend = ctx.createGain();
  verbSend.connect(conv);
  conv.connect(tone);
  tone.connect(wet);
  wet.connect(out);
  verbCtx = ctx;
  return verbSend;
}

/** Audio plus a reverb send: `dry` for the punch, `wet` for the arena tail. */
function arena() {
  const a = getAudio();
  if (!a) return null;
  return { ctx: a.ctx, out: a.out, wet: getVerb(a.ctx, a.out), t: a.ctx.currentTime };
}

/** A big cinematic impact: sub drop, body thump, transient click and a crunchy noise burst. */
function impact(ctx: AudioContext, out: AudioNode, wet: AudioNode, t: number, size = 1, at = 0) {
  playTone(ctx, out, t, { freq: 62 * (1.15 - size * 0.15), slideTo: 28, start: at, dur: 0.45 + size * 0.45, type: "sine", vol: 0.5, attack: 0.002 });
  playTone(ctx, out, t, { freq: 190, slideTo: 52, start: at, dur: 0.16 + size * 0.08, type: "sine", vol: 0.42, attack: 0.001 });
  playTone(ctx, out, t, { freq: 1600, slideTo: 220, start: at, dur: 0.035, type: "square", vol: 0.1, attack: 0.001, filterHz: 5000 });
  playNoise(ctx, out, t, at, 0.12 + size * 0.18, 0.22, "lowpass", 5200, 260);
  playNoise(ctx, wet, t, at, 0.3 + size * 0.3, 0.12 * size, "bandpass", 1400, 300);
}

/** Air ripping past: a band-passed noise sweep. */
function whoosh(ctx: AudioContext, out: AudioNode, t: number, at = 0, dur = 0.22, vol = 0.14, up = true) {
  playNoise(ctx, out, t, at, dur, vol, "bandpass", up ? 400 : 3600, up ? 3600 : 400);
  playNoise(ctx, out, t, at + dur * 0.3, dur * 0.7, vol * 0.5, "highpass", 2200, 6000);
}

/** A cymbal crash: long bright noise with a shimmering tail. */
function crash(ctx: AudioContext, out: AudioNode, wet: AudioNode, t: number, at = 0, vol = 0.12, dur = 1.4) {
  playNoise(ctx, out, t, at, dur, vol, "highpass", 5200, 3200);
  playNoise(ctx, wet, t, at, dur * 0.8, vol * 0.6, "bandpass", 7000, 2600);
}

/** Thick detuned brass: two saws per note through a lowpass, swelling in. */
function brass(ctx: AudioContext, out: AudioNode, t: number, notes: number[], at: number, dur: number, vol = 0.05, filterHz = 2200, attack = 0.03) {
  for (const f of notes) {
    playTone(ctx, out, t, { freq: f, start: at, dur, type: "sawtooth", vol, attack, filterHz, detune: -9 });
    playTone(ctx, out, t, { freq: f, start: at, dur, type: "sawtooth", vol: vol * 0.8, attack, filterHz, detune: 9 });
  }
}

/** Taiko drum: deep pitched body with a skin slap. */
function taiko(ctx: AudioContext, out: AudioNode, t: number, at: number, vol = 0.4, pitch = 1) {
  playTone(ctx, out, t, { freq: 105 * pitch, slideTo: 52 * pitch, start: at, dur: 0.38, type: "sine", vol, attack: 0.002 });
  playTone(ctx, out, t, { freq: 210 * pitch, slideTo: 120 * pitch, start: at, dur: 0.08, type: "triangle", vol: vol * 0.35, attack: 0.001 });
  playNoise(ctx, out, t, at, 0.07, vol * 0.3, "bandpass", 900, 400);
}

/** Inharmonic bell/metal partials (gongs, blades, the KO bell). */
function metal(ctx: AudioContext, out: AudioNode, t: number, base: number, at: number, dur: number, vol: number, ratios = [1, 2.76, 5.4, 8.93]) {
  ratios.forEach((r, i) => playTone(ctx, out, t, { freq: base * r, start: at, dur: dur / (1 + i * 0.4), type: i ? "sine" : "triangle", vol: vol / (1 + i * 0.6), attack: 0.001 }));
}

/** "VS" splash: both name plates whoosh in, then the VS slams down with a metal crash and thunder. */
export function playVersus(): void {
  const a = arena();
  if (!a) return;
  const { ctx, out, wet, t } = a;
  whoosh(ctx, out, t, 0, 0.28, 0.13);
  whoosh(ctx, out, t, 0.1, 0.28, 0.13, false);
  playTone(ctx, out, t, { freq: 300, slideTo: 2400, start: 0.2, dur: 0.28, type: "sawtooth", vol: 0.035, attack: 0.2, filterHz: 3000 }); // rising shing
  const slam = 0.48;
  impact(ctx, out, wet, t, 1.1, slam);
  metal(ctx, out, t, 440, slam, 0.8, 0.06, [1, 2.4, 3.9, 5.6]);
  metal(ctx, wet, t, 220, slam, 1.6, 0.08, [1, 1.48, 2.02, 2.74]);
  playNoise(ctx, out, t, slam, 0.12, 0.22, "highpass", 1800, 700); // thunder crack
  playNoise(ctx, out, t, slam + 0.05, 0.9, 0.14, "lowpass", 1800, 90); // rumble
  brass(ctx, out, t, [73.42, 110, 146.83], slam, 0.7, 0.05, 1200, 0.01);
}

/** "ROUND N" callout: a double boxing-bell ding, a drum hit and a rising brass call. Round 1 gets the full version. */
export function playRoundCall(first = true): void {
  const a = arena();
  if (!a) return;
  const { ctx, out, wet, t } = a;
  metal(ctx, out, t, 1568, 0, 0.7, 0.06, [1, 2.76, 5.4]);
  metal(ctx, wet, t, 1568, 0.16, 0.9, 0.05, [1, 2.76, 5.4]);
  taiko(ctx, out, t, 0, 0.36, 1);
  brass(ctx, out, t, [196, 293.66], 0.06, 0.18, 0.04, 2200, 0.01);
  brass(ctx, out, t, [261.63, 392], 0.24, first ? 0.5 : 0.32, 0.045, 2600, 0.015);
  if (first) {
    taiko(ctx, out, t, 0.24, 0.4, 0.8);
    crash(ctx, out, wet, t, 0.24, 0.07, 1);
  }
}

/** "FIGHT!" — a reverse swell slams into a sub boom, crash, gong and a brass power chord. */
export function playFight(): void {
  const a = arena();
  if (!a) return;
  const { ctx, out, wet, t } = a;
  playNoise(ctx, out, t, 0, 0.42, 0.12, "bandpass", 300, 5200); // rising swell
  playTone(ctx, out, t, { freq: 110, slideTo: 440, dur: 0.42, type: "sawtooth", vol: 0.04, attack: 0.3, filterHz: 1400 });
  const hit = 0.42;
  impact(ctx, out, wet, t, 1.3, hit);
  crash(ctx, out, wet, t, hit, 0.14, 1.8);
  metal(ctx, wet, t, 98, hit, 2.2, 0.14, [1, 1.48, 2.02, 2.74, 3.76]); // gong bloom
  brass(ctx, out, t, [82.41, 123.47, 164.81, 196], hit, 0.9, 0.05, 1800, 0.01);
  brass(ctx, wet, t, [329.63, 493.88], hit + 0.02, 1.0, 0.03, 2600, 0.02);
}

/** Lunge: the fighters dash at each other. */
export function playLunge(): void {
  const a = arena();
  if (!a) return;
  whoosh(a.ctx, a.out, a.t, 0, 0.3, 0.16);
}

/** A punch landing: whoosh into a layered impact. Heavy = the opponent got hit (more boom, longer tail). */
export function playHit(heavy = false): void {
  const a = arena();
  if (!a) return;
  const { ctx, out, wet, t } = a;
  impact(ctx, out, wet, t, heavy ? 1 : 0.65);
  playTone(ctx, out, t, { freq: heavy ? 520 : 440, slideTo: 120, dur: 0.1, type: "square", vol: 0.06, filterHz: 1800 });
  if (heavy) {
    // Rubbery Gomu "boing" snap-back and a shockwave tail.
    playTone(ctx, out, t, { freq: 180, slideTo: 620, start: 0.06, dur: 0.16, type: "triangle", vol: 0.07 });
    playNoise(ctx, wet, t, 0.04, 0.5, 0.1, "lowpass", 1800, 120);
  }
}

/** Two blades meeting: a ringing metallic clang with flying sparks. */
export function playClash(): void {
  const a = arena();
  if (!a) return;
  const { ctx, out, wet, t } = a;
  playNoise(ctx, out, t, 0, 0.05, 0.22, "highpass", 2400, 6000);
  metal(ctx, out, t, 1046.5, 0, 0.7, 0.08);
  metal(ctx, wet, t, 1174.7, 0.004, 1.1, 0.05);
  playTone(ctx, out, t, { freq: 2600, slideTo: 4200, start: 0.02, dur: 0.24, type: "sine", vol: 0.03 }); // "shing"
  for (let i = 0; i < 5; i++) playNoise(ctx, out, t, 0.05 + i * 0.045, 0.03, 0.05 / (1 + i * 0.4), "highpass", 6000 + i * 600, 9000);
  playTone(ctx, out, t, { freq: 140, slideTo: 60, dur: 0.18, type: "sine", vol: 0.24, attack: 0.002 });
}

/** Knockout: a colossal slam, slow-motion sub drop, power-down and the triple KO bell. */
export function playKO(): void {
  const a = arena();
  if (!a) return;
  const { ctx, out, wet, t } = a;
  impact(ctx, out, wet, t, 1.6);
  crash(ctx, out, wet, t, 0, 0.16, 2.2);
  playTone(ctx, out, t, { freq: 90, slideTo: 22, dur: 1.6, type: "sine", vol: 0.38, attack: 0.01 });
  playTone(ctx, out, t, { freq: 620, slideTo: 55, start: 0.12, dur: 1.1, type: "sawtooth", vol: 0.05, filterHz: 1600 });
  [0.7, 0.92, 1.14].forEach((at) => metal(ctx, wet, t, 1320, at, 0.9, 0.07));
  [0.7, 0.92, 1.14].forEach((at) => metal(ctx, out, t, 1320, at, 0.5, 0.05));
}

/** Showdown announced: thunder rolls, war drums accelerate, a minor brass swell erupts. */
export function playShowdown(): void {
  const a = arena();
  if (!a) return;
  const { ctx, out, wet, t } = a;
  // Thunder: crack, then a long rolling rumble.
  playNoise(ctx, out, t, 0, 0.18, 0.24, "highpass", 1800, 600);
  playNoise(ctx, out, t, 0.04, 1.4, 0.2, "lowpass", 2400, 90);
  playNoise(ctx, wet, t, 0.1, 1.2, 0.12, "lowpass", 900, 80);
  // War drums speeding up.
  [0.2, 0.48, 0.7, 0.86, 0.98, 1.08, 1.16, 1.24].forEach((at, i) => taiko(ctx, out, t, at, 0.3 + i * 0.03, i % 2 ? 0.86 : 1));
  // Eruption.
  const hit = 1.34;
  impact(ctx, out, wet, t, 1.2, hit);
  crash(ctx, out, wet, t, hit, 0.12, 1.6);
  brass(ctx, out, t, [110, 164.81, 220, 261.63, 329.63], hit, 1.3, 0.04, 2000, 0.04);
  brass(ctx, wet, t, [440, 523.25, 659.25], hit + 0.04, 1.2, 0.022, 3000, 0.08);
}

/** Showdown decided: a crackling Haki charge-up, then the beam detonates. */
export function playBeam(): void {
  const a = arena();
  if (!a) return;
  const { ctx, out, wet, t } = a;
  playTone(ctx, out, t, { freq: 140, slideTo: 1400, dur: 0.38, type: "sawtooth", vol: 0.07, attack: 0.2, filterHz: 3200 });
  playTone(ctx, out, t, { freq: 147, slideTo: 1480, dur: 0.38, type: "square", vol: 0.03, attack: 0.2, filterHz: 2400 });
  playNoise(ctx, out, t, 0, 0.4, 0.1, "bandpass", 500, 6000);
  for (let i = 0; i < 6; i++) playNoise(ctx, out, t, 0.04 + i * 0.055, 0.02, 0.09, "highpass", 3000, 7000); // electric crackle
  impact(ctx, out, wet, t, 1.3, 0.38);
  crash(ctx, out, wet, t, 0.38, 0.1, 1.2);
  playNoise(ctx, out, t, 0.38, 0.7, 0.14, "bandpass", 3000, 200); // blast roar
}

/**
 * Ranked victory: a timpani roll, a cymbal-crashing brass fanfare (da-da-da-DAAA, then a
 * triumphant answer phrase), a roaring crowd cheer and a sparkle of treasure bells.
 */
export function playVictory(): void {
  const a = arena();
  if (!a) return;
  const { ctx, out, wet, t } = a;
  // Timpani roll building into the first hit.
  for (let i = 0; i < 10; i++) taiko(ctx, out, t, i * 0.04, 0.12 + i * 0.025, 0.9);
  impact(ctx, out, wet, t, 0.9, 0.4);
  crash(ctx, out, wet, t, 0.4, 0.13, 2.2);
  // Call: B3 – E4 – G#4 – B4 (held).
  const call: [number, number, number][] = [[246.94, 0.4, 0.15], [329.63, 0.56, 0.15], [415.3, 0.72, 0.15], [493.88, 0.88, 0.62]];
  // Answer: C#5 – B4 – E5 (big final note).
  const answer: [number, number, number][] = [[554.37, 1.52, 0.14], [493.88, 1.68, 0.14], [659.25, 1.84, 1.5]];
  for (const [f, at, d] of [...call, ...answer]) {
    brass(ctx, out, t, [f, f / 2], at, d, 0.06, 2800, 0.015);
    playTone(ctx, wet, t, { freq: f * 2, start: at, dur: d, type: "triangle", vol: 0.05 });
  }
  brass(ctx, out, t, [164.81, 246.94, 329.63, 415.3], 0.88, 0.62, 0.032, 2200, 0.04); // E major
  brass(ctx, out, t, [220, 277.18, 329.63, 440], 1.52, 0.3, 0.03, 2200, 0.03); // A major lift
  // Final chord: E major, full and wide, with a second cymbal and timpani hits.
  taiko(ctx, out, t, 1.48, 0.38, 1);
  taiko(ctx, out, t, 1.66, 0.38, 1);
  impact(ctx, out, wet, t, 1, 1.84);
  crash(ctx, out, wet, t, 1.84, 0.14, 2.6);
  brass(ctx, out, t, [82.41, 164.81, 246.94, 329.63, 415.3, 493.88], 1.84, 1.6, 0.036, 2600, 0.04);
  brass(ctx, wet, t, [659.25, 830.61, 987.77], 1.88, 1.5, 0.02, 3400, 0.08);
  playTone(ctx, wet, t, { freq: 1318.51, start: 1.9, dur: 1.6, type: "sine", vol: 0.05 });
  // Crowd cheer: a swelling, filtered roar under the fanfare.
  playNoise(ctx, out, t, 0.42, 2.6, 0.07, "bandpass", 900, 1500);
  playNoise(ctx, wet, t, 0.5, 2.8, 0.06, "bandpass", 1600, 2400);
  // Treasure sparkle: rising bells over the last chord.
  [1318.51, 1661.22, 1975.53, 2637.02].forEach((f, i) => {
    playTone(ctx, wet, t, { freq: f, start: 2.0 + i * 0.07, dur: 0.6, type: "sine", vol: 0.045, attack: 0.003 });
    playTone(ctx, out, t, { freq: f * 2, start: 2.0 + i * 0.07, dur: 0.18, type: "triangle", vol: 0.015, attack: 0.002 });
  });
}

/** Ranked defeat: a heavy toll and a sinking minor brass line. */
export function playDefeat(): void {
  const a = arena();
  if (!a) return;
  const { ctx, out, wet, t } = a;
  metal(ctx, wet, t, 196, 0, 2.2, 0.1, [1, 1.48, 2.02, 2.74]);
  taiko(ctx, out, t, 0, 0.42, 0.8);
  const line: [number, number][] = [[329.63, 0.3], [311.13, 0.62], [293.66, 0.94], [246.94, 1.26]];
  for (const [f, at] of line) brass(ctx, out, t, [f, f / 2], at, 0.5, 0.04, 1500, 0.04);
  brass(ctx, out, t, [82.41, 123.47, 164.81, 196], 1.26, 1.4, 0.03, 900, 0.1);
}

/* ---------- Ranked battle music ---------- */

interface BattleMusic { ctx: AudioContext; bus: GainNode; tone: BiquadFilterNode; intensity: number; step: number; next: number; rig?: ShowdownRig }
let battleMusic: BattleMusic | null = null;
const MUSIC_LEVEL = 0.24;

// E minor, four bars: Em – C – D – B (the B major turn makes it feel like a duel).
const MUSIC_ROOTS = [82.41, 65.41, 73.42, 61.74];
const MUSIC_CHORDS = [
  [329.63, 392, 493.88],
  [261.63, 329.63, 392],
  [293.66, 369.99, 440],
  [246.94, 311.13, 369.99],
];
// The lead hook (semitones from E5, null = rest) over the second half of each 8-bar phrase.
const E5 = 659.25;
const HOOK: (number | null)[][] = [
  [0, null, -5, null, 0, 2, 3, null, 2, null, 0, null, -2, null, -5, null],
  [-4, null, -4, -2, 0, null, -2, null, -4, null, -5, null, -4, null, null, null],
  [-2, null, -2, 0, 2, null, 3, null, 5, null, 3, 2, 0, null, -2, null],
  [-1, null, null, -1, 0, null, 2, null, 3, null, 2, null, -1, null, null, null],
];
const semis = (n: number) => E5 * Math.pow(2, n / 12);

// ---------- Showdown theme ----------
// A slow, heavy standoff theme at 96 BPM in D minor: i – VI – iv – V (Dm – Bb – Gm – A).
// Half-time drums with a huge backbeat, ringing distorted power chords, a choir and a ticking
// hi-hat. Bars 1–4 build the tension with chugs and taiko; bars 5–8 add a slow, wailing lead
// over brass swells. Every phrase lands on a crash + orchestra hit.
const SD_BPM = 96, FIGHT_BPM = 144;
const SD_ROOTS = [73.42, 58.27, 49, 55]; // D2 Bb1 G1 A1
const SD_TRIADS = [
  [293.66, 349.23, 440], // Dm
  [233.08, 293.66, 349.23], // Bb
  [196, 233.08, 293.66], // Gm
  [220, 277.18, 329.63], // A
];
const D5 = 587.33;
// Lead melody for bars 5–8 as [step, semitones from D5, length in 16ths].
const SD_LEAD: [number, number, number][][] = [
  [[0, 7, 8], [8, 5, 4], [12, 3, 4]], // A5 … G5 F5
  [[0, 2, 8], [8, 3, 4], [12, 5, 4]], // D5 … F5 G5
  [[0, 8, 8], [8, 12, 4], [12, 10, 4]], // Bb5 … D6 Bb5  (Gm)
  [[0, 11, 10], [10, 7, 6]], // C#6 … A5  (A — the turnaround)
];

interface ShowdownRig { guitar: GainNode; lead: GainNode }

/** Distorted "guitar" bus and an echoing lead bus, built once per music instance. */
function showdownRig(m: BattleMusic): ShowdownRig {
  if (m.rig) return m.rig;
  const { ctx, bus } = m;
  const guitar = ctx.createGain();
  guitar.gain.value = 0.55;
  const drive = ctx.createWaveShaper();
  const curve = new Float32Array(1024);
  for (let i = 0; i < curve.length; i++) {
    const x = (i / (curve.length - 1)) * 2 - 1;
    curve[i] = ((3 + 40) * x * 20 * (Math.PI / 180)) / (Math.PI + 40 * Math.abs(x));
  }
  drive.curve = curve;
  drive.oversample = "2x";
  const cab = ctx.createBiquadFilter();
  cab.type = "lowpass";
  cab.frequency.value = 3400;
  cab.Q.value = 0.8;
  const level = ctx.createGain();
  level.gain.value = 0.32;
  guitar.connect(drive); drive.connect(cab); cab.connect(level); level.connect(bus);
  // Lead: dry plus a dotted-eighth echo.
  const lead = ctx.createGain();
  lead.gain.value = 1;
  const delay = ctx.createDelay(1);
  delay.delayTime.value = (60 / SD_BPM) * 0.75; // dotted eighth
  const feedback = ctx.createGain();
  feedback.gain.value = 0.32;
  const echo = ctx.createGain();
  echo.gain.value = 0.35;
  lead.connect(bus);
  lead.connect(delay); delay.connect(feedback); feedback.connect(delay); delay.connect(echo); echo.connect(bus);
  m.rig = { guitar, lead };
  return m.rig;
}

/** A singing lead note: detuned saw + square with delayed vibrato. */
function leadNote(ctx: AudioContext, out: AudioNode, t: number, freq: number, dur: number, vol: number) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.015);
  g.gain.setValueAtTime(vol * 0.8, t + dur * 0.7);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const f = ctx.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.setValueAtTime(4200, t);
  const lfo = ctx.createOscillator();
  const depth = ctx.createGain();
  lfo.frequency.value = 6;
  depth.gain.setValueAtTime(0, t);
  depth.gain.linearRampToValueAtTime(freq * 0.012, t + Math.min(0.25, dur * 0.6));
  lfo.connect(depth);
  for (const [type, det, v] of [["sawtooth", -7, 1], ["square", 7, 0.5]] as const) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.detune.value = det;
    depth.connect(o.frequency);
    const og = ctx.createGain();
    og.gain.value = v;
    o.connect(og); og.connect(f);
    o.start(t); o.stop(t + dur + 0.02);
  }
  f.connect(g); g.connect(out);
  lfo.start(t); lfo.stop(t + dur + 0.02);
}

/** Power chord (root, fifth, octave) into the distortion. */
function powerChord(ctx: AudioContext, rig: ShowdownRig, t: number, root: number, dur: number, vol: number) {
  for (const [mult, det] of [[1, -6], [1.5, 6], [2, 0]] as const)
    playTone(ctx, rig.guitar, t, { freq: root * 2 * mult, dur, type: "sawtooth", vol, attack: 0.003, detune: det });
}

function showdownStep(m: BattleMusic, step: number, t: number, len: number) {
  const { ctx, bus } = m;
  const rig = showdownRig(m);
  const s = step % 16, bar = Math.floor(step / 16) % 8, chordIx = bar % 4, lifted = bar >= 4;
  const root = SD_ROOTS[chordIx], triad = SD_TRIADS[chordIx];
  const fillBar = bar === 3 || bar === 7;

  // --- Drums: half-time. Kick on 1 (and a syncopated push), a massive snare on 3, ticking hats.
  const kick = s === 0 || s === 10 || (lifted && s === 6) || (fillBar && s === 14);
  if (kick) {
    playTone(ctx, bus, t, { freq: 120, slideTo: 36, dur: 0.38, type: "sine", vol: 0.62, attack: 0.002 });
    playTone(ctx, bus, t, { freq: 900, slideTo: 120, dur: 0.02, type: "square", vol: 0.035, attack: 0.001 });
  }
  if (s === 8) { // big room snare
    playNoise(ctx, bus, t, 0, 0.55, 0.26, "bandpass", 1800, 700);
    playTone(ctx, bus, t, { freq: 200, slideTo: 150, dur: 0.16, type: "triangle", vol: 0.22, attack: 0.001 });
  }
  if (s % 2 === 0 && s !== 8) playNoise(ctx, bus, t, 0, 0.04, s % 4 === 0 ? 0.03 : 0.018, "highpass", 8500); // tick
  if (fillBar && s >= 12) { // descending taiko fill into the next bar
    const f = [150, 125, 105, 88][s - 12];
    playTone(ctx, bus, t, { freq: f, slideTo: f * 0.7, dur: 0.3, type: "sine", vol: 0.34, attack: 0.002 });
    playNoise(ctx, bus, t, 0, 0.12, 0.08, "lowpass", 900);
  } else if (!lifted && (s === 4 || s === 14)) {
    playTone(ctx, bus, t, { freq: 82, slideTo: 60, dur: 0.45, type: "sine", vol: 0.26, attack: 0.002 }); // low taiko
  }
  if (s === 0 && (bar === 0 || bar === 4)) {
    playNoise(ctx, bus, t, 0, 2.6, 0.12, "highpass", 5000, 2500); // crash
    brass(ctx, bus, t, [triad[0] / 2, triad[0], triad[1], triad[2]], 0, len * 5, 0.032, 2800, 0.004); // orchestra hit
    playTone(ctx, bus, t, { freq: root * 2, slideTo: root * 1.5, dur: 0.9, type: "sine", vol: 0.34, attack: 0.002 }); // timpani
  }

  // --- Guitar: a ringing power chord each bar; muted chugs push the tension in bars 1–4.
  if (s === 0) powerChord(ctx, rig, t, root, len * 15, lifted ? 0.1 : 0.12);
  if (lifted && s === 8) powerChord(ctx, rig, t, root, len * 7.5, 0.07);
  if (!lifted && [3, 6, 7, 11, 12].includes(s)) playTone(ctx, rig.guitar, t, { freq: root * 2, dur: len * 0.55, type: "sawtooth", vol: 0.12, attack: 0.002 });

  // --- Bass: a sustained low root + sub.
  if (s === 0) {
    playTone(ctx, bus, t, { freq: root, dur: len * 15.5, type: "sawtooth", vol: 0.11, attack: 0.01, filterHz: 420 });
    playTone(ctx, bus, t, { freq: root / 2, dur: len * 15.5, type: "sine", vol: 0.2, attack: 0.02 });
  }

  // --- Choir pad on every bar; brass swells into the turnaround.
  if (s === 0) for (const f of triad) {
    playTone(ctx, bus, t, { freq: f, dur: len * 16, type: "sine", vol: 0.034, attack: len * 4, detune: -9 });
    playTone(ctx, bus, t, { freq: f * 2, dur: len * 16, type: "triangle", vol: lifted ? 0.012 : 0.008, attack: len * 6, detune: 8 });
  }
  if (fillBar && s === 0) brass(ctx, bus, t, [triad[0] / 2, triad[0], triad[2]], 0, len * 16, 0.02, 1600, len * 12); // swell

  // --- Lead: a slow wailing melody in bars 5–8; a lonely bell motif in bars 1–4.
  if (lifted) {
    const note = SD_LEAD[chordIx].find(([at]) => at === s);
    if (note) leadNote(ctx, rig.lead, t, D5 * Math.pow(2, note[1] / 12), len * note[2] * 0.97, 0.055);
  } else if (s === 0 || s === 6 || s === 12) {
    const bell = [triad[2] * 2, triad[1] * 2, triad[0] * 2][s / 6];
    playTone(ctx, bus, t, { freq: bell, dur: len * 5, type: "triangle", vol: 0.022, attack: 0.003 });
    playTone(ctx, bus, t, { freq: bell * 2.01, dur: len * 2, type: "sine", vol: 0.008, attack: 0.003 });
  }
  if (bar === 7 && s === 0) playNoise(ctx, bus, t, 0, len * 16, 0.06, "bandpass", 250, 6000); // riser
}

function musicStep(m: BattleMusic, step: number, t: number, len: number) {
  const { ctx, bus } = m;
  const s = step % 16, bar = Math.floor(step / 16) % 4, phrase = Math.floor(step / 64) % 2;
  const root = MUSIC_ROOTS[bar], chord = MUSIC_CHORDS[bar];
  // Drums: taiko-style kick pattern, snare backbeat, driving hats.
  const kicks = [0, 6, 8, 10];
  if (kicks.includes(s)) {
    playTone(ctx, bus, t, { freq: 150, slideTo: 44, dur: 0.2, type: "sine", vol: 0.55, attack: 0.002 });
    playTone(ctx, bus, t, { freq: 900, slideTo: 120, dur: 0.02, type: "square", vol: 0.05, attack: 0.001 });
  }
  if (s === 4 || s === 12) {
    playNoise(ctx, bus, t, 0, 0.16, 0.22, "bandpass", 2000, 900);
    playTone(ctx, bus, t, { freq: 220, slideTo: 150, dur: 0.09, type: "triangle", vol: 0.16, attack: 0.001 });
  }
  if (s % 2 === 0) playNoise(ctx, bus, t, 0, s % 4 === 2 ? 0.06 : 0.025, s % 4 === 2 ? 0.05 : 0.03, "highpass", 7600);
  // Tom fill to close every loop.
  if (bar === 3 && s >= 12) playTone(ctx, bus, t, { freq: 180 - (s - 12) * 26, slideTo: 70, dur: 0.16, type: "sine", vol: 0.3, attack: 0.002 });
  if (step % 64 === 0) playNoise(ctx, bus, t, 0, 1.1, 0.05, "highpass", 5600, 3400);
  // Galloping bass ostinato: root-root-root-octave.
  const bassHits = [0, 2, 3, 4, 6, 8, 10, 11, 12, 14];
  if (bassHits.includes(s)) {
    const octave = s === 4 || s === 12;
    playTone(ctx, bus, t, { freq: root * (octave ? 2 : 1), dur: len * 1.7, type: "sawtooth", vol: 0.13, attack: 0.004, filterHz: 700 });
    if (s === 0 || s === 8) playTone(ctx, bus, t, { freq: root / 2, dur: len * 6, type: "sine", vol: 0.2, attack: 0.01 });
  }
  // Syncopated brass stabs.
  const stabs: Record<number, number> = { 0: 3, 3: 1.2, 6: 1.2, 10: 2, 13: 1.2 };
  if (stabs[s]) brass(ctx, bus, t, chord, 0, len * stabs[s], 0.022, 2000, 0.006);
  // 16th-note arpeggio sparkle up top.
  const arp = [0, 1, 2, 1, 0, 2, 1, 2];
  if (phrase === 0 || s % 2 === 0) playTone(ctx, bus, t, { freq: chord[arp[s % 8]] * 2, dur: len * 0.8, type: "square", vol: 0.014, attack: 0.002, filterHz: 3400 });
  // Lead hook on the second phrase.
  if (phrase === 1) {
    const note = HOOK[bar][s];
    if (note !== null) {
      playTone(ctx, bus, t, { freq: semis(note), dur: len * 1.9, type: "sawtooth", vol: 0.04, attack: 0.01, filterHz: 3000, detune: -6 });
      playTone(ctx, bus, t, { freq: semis(note), dur: len * 1.9, type: "square", vol: 0.02, attack: 0.01, filterHz: 2400, detune: 6 });
    }
  }
}

/**
 * Starts the looping ranked fight theme (procedural, 144 BPM). Returns a stop function that fades it out.
 * The theme runs on its own bus under the master volume, so muting silences it too.
 */
export function startBattleMusic(): () => void {
  const a = getAudio();
  if (!a) return () => undefined;
  const { ctx, out } = a;
  battleMusic?.bus.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.1);
  const bus = ctx.createGain();
  bus.gain.setValueAtTime(0.0001, ctx.currentTime);
  bus.gain.exponentialRampToValueAtTime(MUSIC_LEVEL, ctx.currentTime + 1.4);
  const tone = ctx.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.value = 5200;
  bus.connect(tone);
  tone.connect(out);
  const music: BattleMusic = { ctx, bus, tone, intensity: 0, step: 0, next: ctx.currentTime + 0.08 };
  battleMusic = music;

  let stopped = false;
  const timer = window.setInterval(() => {
    if (stopped || ctx.state === "closed") return;
    if (music.next < ctx.currentTime) music.next = ctx.currentTime + 0.02;
    while (music.next < ctx.currentTime + 0.16) {
      const len = 60 / (music.intensity ? SD_BPM : FIGHT_BPM) / 4;
      if (music.intensity) showdownStep(music, music.step, music.next, len);
      else musicStep(music, music.step, music.next, len);
      music.next += len;
      music.step++;
    }
  }, 25);

  return () => {
    if (stopped) return;
    stopped = true;
    window.clearInterval(timer);
    const now = ctx.currentTime;
    bus.gain.cancelScheduledValues(now);
    bus.gain.setTargetAtTime(0.0001, now, 0.35);
    window.setTimeout(() => { bus.disconnect(); music.rig?.guitar.disconnect(); music.rig?.lead.disconnect(); }, 2500);
    if (battleMusic === music) battleMusic = null;
  };
}

/** 0 = the fight theme, 1 = the Showdown theme (faster, heavier, its own key). Switching restarts the phrase. */
export function setBattleMusicIntensity(level: 0 | 1): void {
  const m = battleMusic;
  if (!m || m.intensity === level) return;
  m.intensity = level;
  m.step = 0;
  m.tone.frequency.setTargetAtTime(level ? 9000 : 5200, m.ctx.currentTime, 0.2);
  if (level) {
    // Slam into the Showdown theme.
    const t = Math.max(m.next, m.ctx.currentTime);
    playTone(m.ctx, m.bus, t, { freq: 70, slideTo: 30, dur: 0.9, type: "sine", vol: 0.5, attack: 0.002 });
    playNoise(m.ctx, m.bus, t, 0, 1.4, 0.12, "highpass", 5000, 2600);
  }
}

/** Briefly dips the music so a big moment (KO, Showdown stinger) cuts through. */
export function duckBattleMusic(seconds = 1.4): void {
  const m = battleMusic;
  if (!m) return;
  const now = m.ctx.currentTime;
  m.bus.gain.cancelScheduledValues(now);
  m.bus.gain.setTargetAtTime(MUSIC_LEVEL * 0.3, now, 0.05);
  m.bus.gain.setTargetAtTime(MUSIC_LEVEL, now + seconds, 0.3);
}

/** Matchmaking search: a soft sonar ping with a faint echo. */
export function playSonar(): void {
  const a = getAudio();
  if (!a) return;
  const t = a.ctx.currentTime;
  playTone(a.ctx, a.out, t, { freq: 1180, slideTo: 1040, dur: 0.5, type: "sine", vol: 0.05, attack: 0.004 });
  playTone(a.ctx, a.out, t, { freq: 1180, slideTo: 1040, start: 0.32, dur: 0.45, type: "sine", vol: 0.018 });
}

/** Opening the lobby search: anchor chain rattle and a horn blast. */
export function playQueueHorn(): void {
  const a = getAudio();
  if (!a) return;
  const t = a.ctx.currentTime;
  playNoise(a.ctx, a.out, t, 0, 0.35, 0.05, "bandpass", 2400, 900);
  playTone(a.ctx, a.out, t, { freq: 146.8, start: 0.12, dur: 0.7, type: "sawtooth", vol: 0.09, attack: 0.05, filterHz: 900 });
  playTone(a.ctx, a.out, t, { freq: 220, start: 0.12, dur: 0.7, type: "sawtooth", vol: 0.05, attack: 0.05, filterHz: 900 });
}
