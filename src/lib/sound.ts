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
}

/** Lid-burst fanfare that grows with the reward rarity (0 = common … 5 = mythic). */
export function playChestBurst(rank: number): void {
  const a = getAudio();
  if (!a) return;
  const { ctx, out } = a;
  const t = ctx.currentTime;
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
    // Epic+: sweeping whoosh and a held power chord.
    playNoise(ctx, out, t, 0.02, 0.5, 0.1, "bandpass", 500, 6000);
    const hold = 0.05 + notes * 0.07;
    for (const f of [523.25, 659.25, 783.99]) playTone(ctx, out, t, { freq: f, start: hold, dur: 0.7, type: "triangle", vol: 0.1 });
  }
  if (rank >= 4) {
    // Legendary+: deep impact and sparkling bells.
    playTone(ctx, out, t, { freq: 110, slideTo: 40, dur: 0.5, type: "sine", vol: 0.42, attack: 0.004 });
    [1760, 2093, 2637].forEach((f, i) => playTone(ctx, out, t, { freq: f, start: 0.5 + i * 0.09, dur: 0.3, type: "sine", vol: 0.08 }));
  }
  if (rank === 4) {
    // Legendary: the lid blasts off — a bright bell strike and a glittering cascade of gold.
    const wet = getVerb(ctx, out);
    metal(ctx, wet, t, 392, 0, 1.6, 0.07, [1, 2.76, 5.4]);
    for (let i = 0; i < 9; i++) playTone(ctx, wet, t, { freq: 3135.96 / Math.pow(2, (i * 2) / 12), start: 0.05 + i * 0.045, dur: 0.35, type: "sine", vol: 0.035 });
  }
  if (rank >= 5) {
    // Mythic: second shockwave and a rising shimmer.
    playTone(ctx, out, t, { freq: 90, slideTo: 32, start: 0.55, dur: 0.6, type: "sine", vol: 0.4, attack: 0.004 });
    playTone(ctx, out, t, { freq: 880, slideTo: 3520, start: 0.6, dur: 0.9, type: "sine", vol: 0.07 });
    playNoise(ctx, out, t, 0.55, 0.9, 0.08, "highpass", 3000, 9000);
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
  const t = a.ctx.currentTime;
  const beats = 2 + Math.min(3, Math.floor(rank / 2));
  for (let i = 0; i < beats; i++) {
    const s = i * Math.max(0.16, 0.34 - rank * 0.03);
    playTone(a.ctx, a.out, t, { freq: 70, slideTo: 48, start: s, dur: 0.12, type: "sine", vol: 0.32 });
    playNoise(a.ctx, a.out, t, s + 0.02, 0.05, 0.05, "highpass", 2600, 0);
  }
  playNoise(a.ctx, a.out, t, 0, 0.6 + rank * 0.1, 0.04, "bandpass", 300, 4200);
  if (rank === 4) {
    // The vault: a warm low hum while a harp climbs as gold light pours out of the seams.
    drone(a.ctx, a.out, t, 0, 1.6, [73.42, 110], 0.04, 520);
    harp(a.ctx, a.out, t, 0.1, [293.66, 369.99, 440, 587.33, 739.99, 880, 1174.66], 0.18, 0.07);
  }
  if (rank >= 5) {
    // Reality tearing: sub swell, glitch zaps and a reverse riser into the burst.
    drone(a.ctx, a.out, t, 0, 1.9, [36.71, 55, 73.42], 0.06, 300);
    for (let i = 0; i < 10; i++) zap(a.ctx, a.out, t, 0.1 + i * 0.16, 0.06, 1 + (i % 3) * 0.5);
    playNoise(a.ctx, a.out, t, 0.2, 1.6, 0.09, "bandpass", 200, 8000);
    playTone(a.ctx, a.out, t, { freq: 110, slideTo: 880, start: 0.3, dur: 1.5, type: "sawtooth", vol: 0.04, filterHz: 2400, attack: 1.2 });
  }
}

/** The recruit's silhouette floats out of the chest. Legendary and Mythic get a full build-up. */
export function playChestRise(rank: number): void {
  const r = arena();
  if (!r) return;
  const { ctx, out, wet, t } = r;
  const dur = 0.9 + rank * 0.15;
  playTone(ctx, out, t, { freq: 220, slideTo: 880 + rank * 120, dur, type: "triangle", vol: 0.08 });
  playTone(ctx, out, t, { freq: 330, slideTo: 1320 + rank * 160, dur, type: "sine", vol: 0.05 });
  if (rank === 4) {
    // Legendary: a warm royal hum, two timpani heartbeats, a harp glissando, a soft choir and a
    // swelling riser into the reveal.
    drone(ctx, out, t, 0, 2.1, [73.42, 110, 146.83], 0.05, 600, 0.6);
    taiko(ctx, out, t, 0.05, 0.42, 0.9); taiko(ctx, wet, t, 0.05, 0.2, 0.9);
    taiko(ctx, out, t, 0.85, 0.46, 0.9); taiko(ctx, wet, t, 0.85, 0.22, 0.9);
    taiko(ctx, out, t, 1.45, 0.36); taiko(ctx, out, t, 1.65, 0.4); taiko(ctx, out, t, 1.82, 0.44);
    harp(ctx, wet, t, 0.3, [293.66, 369.99, 440, 587.33, 739.99, 880, 1174.66, 1479.98, 1760], 0.11, 0.06);
    choir(ctx, out, wet, t, [293.66, 369.99, 440], 0.4, 1.7, 0.022, 1.1);
    playNoise(ctx, out, t, 0.6, 1.45, 0.08, "bandpass", 300, 7000); // riser
    playNoise(ctx, wet, t, 1.2, 0.85, 0.08, "highpass", 2000, 9000); // reverse-cymbal swell
  }
  if (rank >= 5) {
    // Mythic: an angelic choir swells over a sub drone while a timpani roll accelerates and
    // a glissando climbs through the roof.
    drone(ctx, out, t, 0, 2.4, [36.71, 55], 0.08, 260, 0.8);
    choir(ctx, out, wet, t, [146.83, 220, 293.66, 369.99], 0.1, 2.3, 0.03, 1.4);
    let at = 0.1;
    for (let i = 0; i < 16; i++) { taiko(ctx, out, t, at, 0.18 + i * 0.018, 0.75 + i * 0.02); at += Math.max(0.05, 0.26 - i * 0.014); }
    for (const f of [220, 330, 440]) playTone(ctx, out, t, { freq: f, slideTo: f * 4, start: 0.2, dur: 2.1, type: "sine", vol: 0.035, attack: 0.6 });
    playNoise(ctx, out, t, 0.4, 1.9, 0.11, "bandpass", 200, 9000);
    playNoise(ctx, wet, t, 1.4, 0.9, 0.12, "highpass", 1800, 10000);
  }
}

/** Final reveal sting: a short chord, a royal fanfare for Legendary, an epic finale for Mythic. */
export function playChestReveal(rank: number): void {
  const r = arena();
  if (!r) return;
  const { ctx, out, wet, t } = r;
  if (rank < 4) {
    const chord = [523.25, 659.25, 783.99];
    chord.forEach((f, i) => playTone(ctx, out, t, { freq: f, start: i * 0.03, dur: 0.6 + rank * 0.1, type: "triangle", vol: 0.1 }));
    return;
  }
  if (rank === 4) {
    // Legendary: a royal impact, a gong, timpani and a three-step brass fanfare (D – E – G major)
    // that lands on a held golden chord with a harp sweep and bells on top.
    impact(ctx, out, wet, t, 1.15);
    metal(ctx, wet, t, 98, 0.02, 2.6, 0.12, [1, 2.4, 3.9, 5.6]);
    crash(ctx, out, wet, t, 0.02, 0.13, 1.8);
    taiko(ctx, out, t, 0, 0.5); taiko(ctx, out, t, 0.2, 0.42); taiko(ctx, out, t, 0.4, 0.5);
    brass(ctx, out, t, [293.66, 369.99, 440], 0.0, 0.2, 0.045, 2600, 0.01);
    brass(ctx, out, t, [329.63, 415.3, 493.88], 0.2, 0.2, 0.045, 2800, 0.01);
    brass(ctx, out, t, [196, 392, 493.88, 587.33], 0.4, 1.6, 0.05, 3200, 0.02);
    brass(ctx, wet, t, [392, 587.33], 0.4, 1.4, 0.03, 2400, 0.05);
    [1567.98, 1975.53, 2349.32, 3135.96].forEach((f, i) => playTone(ctx, wet, t, { freq: f, start: 0.5 + i * 0.07, dur: 0.6, type: "sine", vol: 0.06 }));
    harp(ctx, wet, t, 0.45, [392, 493.88, 587.33, 783.99, 987.77, 1174.66, 1567.98], 0.05, 0.05);
    choir(ctx, out, wet, t, [196, 293.66, 392, 493.88], 0.4, 1.8, 0.022, 0.2);
    return;
  }
  // Mythic: a double cosmic impact with a sub drop and thunder, then a heroic brass rise
  // (Bb – C – D major) that explodes into a choir-backed final chord, a celestial arpeggio
  // climbing three octaves and a cascade of sparkles ringing out in the hall.
  impact(ctx, out, wet, t, 1.6);
  impact(ctx, out, wet, t, 1.3, 0.16);
  playTone(ctx, out, t, { freq: 48, slideTo: 24, dur: 1.6, type: "sine", vol: 0.5, attack: 0.003 });
  playNoise(ctx, out, t, 0.05, 1.8, 0.14, "lowpass", 2200, 90);
  whoosh(ctx, out, t, 0, 0.5, 0.16, false);
  crash(ctx, out, wet, t, 0.02, 0.15, 2.4);
  crash(ctx, out, wet, t, 0.62, 0.12, 2.6);
  metal(ctx, wet, t, 73.42, 0.6, 3.4, 0.14, [1, 2.4, 3.9, 5.6, 7.3]);
  taiko(ctx, out, t, 0, 0.55, 0.85); taiko(ctx, out, t, 0.2, 0.48, 0.9); taiko(ctx, out, t, 0.4, 0.55, 0.85); taiko(ctx, out, t, 0.6, 0.62, 0.8);
  brass(ctx, out, t, [233.08, 293.66, 349.23, 466.16], 0.0, 0.2, 0.045, 2600, 0.01);
  brass(ctx, out, t, [261.63, 329.63, 392, 523.25], 0.2, 0.2, 0.045, 2800, 0.01);
  brass(ctx, out, t, [146.83, 293.66, 369.99, 440, 587.33], 0.4, 2.4, 0.05, 3600, 0.02);
  brass(ctx, wet, t, [587.33, 739.99, 880], 0.42, 2.0, 0.025, 3000, 0.08);
  choir(ctx, out, wet, t, [293.66, 369.99, 440, 587.33], 0.4, 2.6, 0.035, 0.25);
  const arp = [587.33, 739.99, 880, 1174.66, 1479.98, 1760, 2349.32, 2959.96, 3520];
  arp.forEach((f, i) => playTone(ctx, wet, t, { freq: f, start: 0.5 + i * 0.065, dur: 0.7, type: "sine", vol: 0.06 }));
  for (let i = 0; i < 10; i++) playTone(ctx, wet, t, { freq: 2093 * Math.pow(2, ((i * 5) % 12) / 12), start: 1.2 + i * 0.09, dur: 0.5, type: "sine", vol: 0.035 });
  playTone(ctx, out, t, { freq: 880, slideTo: 3520, start: 0.45, dur: 1.4, type: "sine", vol: 0.04 });
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

/** Ranked victory: timpani roll into a soaring brass fanfare. */
export function playVictory(): void {
  const a = arena();
  if (!a) return;
  const { ctx, out, wet, t } = a;
  for (let i = 0; i < 8; i++) taiko(ctx, out, t, i * 0.045, 0.12 + i * 0.02, 0.9);
  impact(ctx, out, wet, t, 0.8, 0.38);
  crash(ctx, out, wet, t, 0.38, 0.1, 2);
  const line: [number, number, number][] = [[246.94, 0.38, 0.16], [329.63, 0.54, 0.16], [415.3, 0.7, 0.16], [493.88, 0.86, 0.9]];
  for (const [f, at, d] of line) {
    brass(ctx, out, t, [f, f / 2], at, d, 0.05, 2600, 0.015);
    playTone(ctx, wet, t, { freq: f * 2, start: at, dur: d, type: "triangle", vol: 0.05 });
  }
  brass(ctx, out, t, [164.81, 246.94, 329.63, 415.3], 0.86, 1.1, 0.03, 2200, 0.05); // E major bed
  playTone(ctx, wet, t, { freq: 987.77, start: 0.86, dur: 1.2, type: "sine", vol: 0.05 });
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
