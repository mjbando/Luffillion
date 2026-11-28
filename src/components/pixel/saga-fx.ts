// Atmosphere layers that make every saga of the Daily Voyage map feel alive: big animated sky
// set pieces, mid-distance life, textured ground, foreground parallax (things that pass in front
// of the camera), weather particles and a per-saga colour grade with lighting.
//
// Draw order inside each saga's clipped strip (see PixelWorld):
//   sky → fx.sky → fx.back → far → fx.mid → near → fx.ground → details → [runner] → fx.front → fx.air → fx.grade
//
// Everything is stateless: positions come from time, camera and seeded noise, so nothing has to be
// stored between frames and every saga looks the same each time you return to it.

import { R, circle, line, poly, puff, rnd, tiles, type Ctx, type Env } from "./sagas";

export interface SagaFx {
  /** Replaces/extends the saga's sky (screen space). */
  sky?: (e: Env) => void;
  /** Big sky set pieces, behind the saga's backdrop. */
  back?: (e: Env) => void;
  /** Mid-distance life, in front of the backdrop and behind the ground props. */
  mid?: (e: Env) => void;
  /** Texture for the ground strip (world space). */
  ground?: (e: Env, x0: number, x1: number) => void;
  /** Foreground parallax that passes in front of the runner. */
  front?: (e: Env) => void;
  /** Weather / particles over everything. */
  air?: (e: Env) => void;
  /** Colour grade, light and flashes (screen space, last). */
  grade?: (e: Env) => void;
}

// =====================================================================
// helpers
// =====================================================================
const TAU = Math.PI * 2;
const mod = (a: number, n: number) => ((a % n) + n) % n;

/** Soft additive light. */
function glow(c: Ctx, x: number, y: number, r: number, rgb: string, a: number) {
  if (r <= 0 || a <= 0) return;
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${a})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  c.save();
  c.globalCompositeOperation = "lighter";
  c.fillStyle = g;
  c.fillRect(x - r, y - r, r * 2, r * 2);
  c.restore();
}

/** Flat colour wash with a blend mode. */
function wash(e: Env, col: string, mode: GlobalCompositeOperation = "source-over", y0 = 0, y1 = e.H) {
  const { c } = e;
  c.save();
  c.globalCompositeOperation = mode;
  c.fillStyle = col;
  c.fillRect(0, y0, e.W, y1 - y0);
  c.restore();
}

/** Vertical gradient wash. */
function vwash(e: Env, y0: number, y1: number, stops: [number, string][], mode: GlobalCompositeOperation = "source-over") {
  const { c } = e;
  const g = c.createLinearGradient(0, y0, 0, y1);
  for (const [at, col] of stops) g.addColorStop(at, col);
  c.save();
  c.globalCompositeOperation = mode;
  c.fillStyle = g;
  c.fillRect(0, y0, e.W, y1 - y0);
  c.restore();
}

/** Darkened edges. */
function vignette(e: Env, a: number, rgb = "0,0,0") {
  const { c, W, H } = e;
  const g = c.createRadialGradient(W / 2, H * 0.55, Math.min(W, H) * 0.35, W / 2, H * 0.55, Math.max(W, H) * 0.75);
  g.addColorStop(0, `rgba(${rgb},0)`);
  g.addColorStop(1, `rgba(${rgb},${a})`);
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
}

/** Slowly turning god rays fanning out of a point. */
function rays(e: Env, x: number, y: number, n: number, len: number, rgb: string, a: number, spin = 0.00004, width = 0.09) {
  const { c, t } = e;
  c.save();
  c.globalCompositeOperation = "lighter";
  for (let k = 0; k < n; k++) {
    const ang = (k / n) * TAU + t * spin;
    const pulse = 0.6 + 0.4 * Math.sin(t / 1800 + k * 1.7);
    const g = c.createRadialGradient(x, y, 0, x, y, len);
    g.addColorStop(0, `rgba(${rgb},${a * pulse})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + Math.cos(ang - width) * len, y + Math.sin(ang - width) * len);
    c.lineTo(x + Math.cos(ang + width) * len, y + Math.sin(ang + width) * len);
    c.closePath();
    c.fill();
  }
  c.restore();
}

/**
 * Seeded particle field in screen space that wraps around the view. `par` ties the field to the
 * camera so particles drift past as you run.
 */
function field(
  e: Env,
  n: number,
  seed: number,
  o: { vx: number; vy: number; par?: number; y0?: number; y1?: number; wob?: number; wobT?: number },
  draw: (x: number, y: number, i: number, life: number) => void,
) {
  const { W, H, t, cam } = e;
  const y0 = o.y0 ?? -4, y1 = o.y1 ?? H + 4;
  const span = y1 - y0;
  for (let i = 0; i < n; i++) {
    const s = seed * 31 + i;
    const sp = 0.6 + rnd(s + 5) * 0.8;
    const x = mod(rnd(s) * (W + 20) + t * o.vx * sp - cam * (o.par ?? 0), W + 20) - 10;
    const y = y0 + mod(rnd(s + 1) * span + t * o.vy * sp, span);
    const w = o.wob ? Math.sin(t / (o.wobT ?? 600) + i * 1.3) * o.wob : 0;
    draw(Math.round(x + w), Math.round(y), i, (y - y0) / span);
  }
}

/** A jagged lightning bolt from (x, y0) down to y1. */
function bolt(c: Ctx, x: number, y0: number, y1: number, seed: number, core = "#ffffff", halo = "rgba(190,210,255,0.55)") {
  const pts: [number, number][] = [[x, y0]];
  let cx = x;
  const steps = 9;
  for (let k = 1; k <= steps; k++) {
    cx += (rnd(seed + k) - 0.5) * 14;
    pts.push([cx, y0 + ((y1 - y0) * k) / steps]);
  }
  for (const [w, col] of [[3, halo], [1, core]] as const) {
    c.strokeStyle = col;
    c.lineWidth = w;
    c.beginPath();
    pts.forEach(([px, py], k) => (k ? c.lineTo(Math.round(px) + 0.5, Math.round(py) + 0.5) : c.moveTo(Math.round(px) + 0.5, Math.round(py) + 0.5)));
    c.stroke();
  }
  // a fork
  const [fx, fy] = pts[4];
  c.strokeStyle = core;
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(fx, fy);
  c.lineTo(fx + 8 + rnd(seed + 40) * 6, fy + 10);
  c.lineTo(fx + 6 + rnd(seed + 41) * 10, fy + 20);
  c.stroke();
}

/** Strength (0–1) of a recurring flash: every `period` ms, lasting `len` ms, with a double flicker. */
function flashAt(t: number, period: number, len = 260, offset = 0) {
  const p = mod(t + offset, period);
  if (p > len) return 0;
  const k = p / len;
  return (k < 0.25 ? 1 : k < 0.4 ? 0.25 : k < 0.55 ? 0.9 : 1 - k) * 1;
}

/** Foreground parallax: items spaced `sp` apart in a layer that moves `par`× faster than the world. */
function fg(e: Env, par: number, sp: number, f: (sx: number, i: number) => void) {
  tiles(e.cam * par, sp, e.W, f);
}

/** A soft drifting band of fog/haze. */
function fogBand(e: Env, y: number, h: number, rgb: string, a: number, speed: number, seed: number, par = 0.3) {
  const { c, W, t, cam } = e;
  for (let x = 0; x < W; x += 2) {
    const wx = x + cam * par + t * speed;
    const k = 0.55 + 0.45 * Math.sin(wx * 0.021 + seed) * Math.sin(wx * 0.0067 + seed * 3);
    const hh = Math.max(1, Math.round(h * k));
    c.fillStyle = `rgba(${rgb},${(a * (0.5 + k * 0.5)).toFixed(3)})`;
    c.fillRect(x, Math.round(y - hh / 2), 2, hh);
  }
}

/** Ground strata: darker horizontal streaks and buried stones, world-locked. */
function strata(e: Env, x0: number, x1: number, dark: string, light: string, stone: string, seed: number) {
  const { c, gy, H, cam } = e;
  const a = Math.max(x0, cam - 20), b = Math.min(x1, cam + e.W + 20);
  for (let i = Math.floor(a / 11); i * 11 <= b; i++) {
    const sx = Math.round(i * 11 - cam);
    const r = rnd(i * 7 + seed);
    const y = gy + 6 + Math.floor(r * (H - gy - 8));
    if (r > 0.35) R(c, sx, y, 4 + Math.floor(rnd(i + seed) * 9), 1, dark);
    if (r > 0.82) {
      R(c, sx + 2, y + 3, 3, 2, stone);
      R(c, sx + 2, y + 3, 2, 1, light);
    }
  }
}

// =====================================================================
// 1. EAST BLUE — sun rays, towering summer clouds, meadow grass, dandelion seeds
// =====================================================================
const eastBlue: SagaFx = {
  back: (e) => {
    const { c, W, gy } = e;
    rays(e, W * 0.84, gy * 0.2, 12, W * 0.9, "255,244,200", 0.07);
    // towering summer cumulus on the horizon, behind the sea
    tiles(e.cam * 0.03, 230, W, (sx, i) => {
      const s = 1.5 + rnd(i + 3) * 0.7;
      puff(c, sx, gy - 50 - rnd(i) * 6, s, "#ffffff", "#d5e6f7");
      puff(c, sx + 18 * s, gy - 62 - rnd(i + 1) * 8, s * 0.9, "#ffffff", "#e1eefb");
      puff(c, sx + 8, gy - 44, s * 1.1, "#f4f9ff", "#cfe0f2");
    });
  },
  ground: (e, x0, x1) => {
    const { c, gy } = e;
    // a worn dirt road under the grass edge, with wheel ruts
    R(c, Math.round(x0 - e.cam), gy + 3, Math.round(x1 - x0), 6, "#a46c38");
    R(c, Math.round(x0 - e.cam), gy + 5, Math.round(x1 - x0), 1, "#8a5a2c");
    R(c, Math.round(x0 - e.cam), gy + 8, Math.round(x1 - x0), 1, "#7a4d24");
    strata(e, x0, x1, "#7a4d24", "#c2a27a", "#9a8a78", 1);
  },
  front: (e) => {
    const { c, H, gy, t } = e;
    fg(e, 1.6, 23, (sx, i) => {
      const r = rnd(i + 11);
      const base = H + 1;
      const top = Math.max(gy + 7, base - 8 - Math.floor(r * 10));
      const sway = Math.round(Math.sin(t / 700 + i) * 1);
      for (let k = 0; k < 5; k++) {
        const bx = sx + k * 2 - 4;
        const h = base - top - (k % 2) * 3;
        line(c, bx, base, bx + sway + (k - 2), base - h, k % 2 ? "#2f7d32" : "#3e9b3f");
      }
      if (r > 0.55) {
        R(c, sx + sway, top - 1, 2, 2, r > 0.8 ? "#ffd43b" : "#ffffff");
        R(c, sx + sway, top, 1, 1, "#f08c00");
      }
      if (r < 0.12) {
        // mossy boulder
        circle(c, sx + 8, base - 3, 6, "#6c757d");
        circle(c, sx + 6, base - 5, 3, "#868e96");
        R(c, sx + 3, base - 8, 6, 2, "#51cf66");
      }
    });
  },
  air: (e) => {
    const { c } = e;
    // dandelion seeds and sun motes on the breeze
    field(e, 18, 1, { vx: 0.012, vy: -0.004, par: 0.4, y0: 10, y1: e.gy + 10, wob: 3, wobT: 500 }, (x, y, i) => {
      R(c, x, y, 1, 1, "#ffffff");
      if (i % 3 === 0) { R(c, x - 1, y - 1, 1, 1, "rgba(255,255,255,0.6)"); R(c, x + 1, y - 1, 1, 1, "rgba(255,255,255,0.6)"); }
    });
  },
  grade: (e) => {
    glow(e.c, e.W * 0.84, e.gy * 0.2, e.W * 0.6, "255,236,170", 0.16);
    vignette(e, 0.22, "20,40,80");
  },
};

// =====================================================================
// 2. ALABASTA — distant mesas, heat shimmer, a rolling sandstorm, blowing sand
// =====================================================================
const alabasta: SagaFx = {
  back: (e) => {
    const { c, W, gy, t } = e;
    glow(c, W * 0.72, gy * 0.24, 60, "255,200,120", 0.3);
    // flat-topped mesas far away
    tiles(e.cam * 0.06, 260, W, (sx, i) => {
      const w = 40 + rnd(i) * 40, h = 22 + rnd(i + 1) * 18;
      poly(c, [sx, gy - 12, sx + 8, gy - 12 - h, sx + w - 8, gy - 12 - h, sx + w, gy - 12], "#e9a862");
      R(c, sx + 8, gy - 12 - h, w - 16, 2, "#f6c789");
      for (let k = 0; k < 3; k++) R(c, sx + 10 + k * (w / 3), gy - 10 - h + 6 + k * 3, w / 5, 1, "#d8914b");
    });
    // circling vulture silhouettes against the sun
    for (let k = 0; k < 2; k++) {
      const a = t / (2400 + k * 500) + k * 2;
      const vx = W * 0.72 + Math.cos(a) * (22 + k * 10), vy = gy * 0.24 + Math.sin(a) * 7;
      const f = Math.sin(t / 160 + k) > 0 ? 1 : 0;
      R(c, vx - 4, vy, 9, 1, "#5a3214"); R(c, vx - 5, vy - f, 2, 1, "#5a3214"); R(c, vx + 4, vy - f, 2, 1, "#5a3214");
    }
  },
  mid: (e) => {
    const { c, W, gy, t } = e;
    // the sandstorm wall rolling along the horizon
    fogBand(e, gy - 22, 26, "214,150,80", 0.32, 0.02, 1.7, 0.2);
    fogBand(e, gy - 14, 14, "240,190,120", 0.25, 0.035, 4.1, 0.35);
    // heat shimmer streaks
    for (let k = 0; k < 7; k++) {
      const y = gy - 10 + k * 2;
      const off = Math.sin(t / 300 + k) * 6;
      for (let x = mod(off + k * 17, 24) - 24; x < W; x += 24) R(c, x, y, 10, 1, "rgba(255,240,200,0.16)");
    }
  },
  ground: (e, x0, x1) => {
    const { c, gy, H, cam, t } = e;
    // wind-carved sand ripples
    const a = Math.max(x0, cam - 20), b = Math.min(x1, cam + e.W + 20);
    for (let row = 0; row < 7; row++) {
      const y = gy + 6 + row * Math.max(3, Math.floor((H - gy - 8) / 7));
      for (let wx = Math.floor(a / 3) * 3; wx < b; wx += 3) {
        const dy = Math.round(Math.sin(wx * 0.09 + row * 1.9) * 1.5);
        R(c, Math.round(wx - cam), y + dy, 3, 1, row % 2 ? "#d9a14f" : "#efc473");
      }
    }
    void t;
  },
  front: (e) => {
    const { c, H, gy } = e;
    fg(e, 1.5, 140, (sx, i) => {
      const r = rnd(i + 21);
      // foreground dune crest
      poly(c, [sx - 70, H + 2, sx - 20, H - 9 - r * 4, sx + 30, H - 12 - r * 5, sx + 90, H + 2], "#c98a45");
      poly(c, [sx - 20, H - 9 - r * 4, sx + 30, H - 12 - r * 5, sx + 60, H - 6], "#dba05a");
      if (r > 0.5) {
        // a bleached sea-king skull half buried
        const x = sx + 10, y = H - 12;
        R(c, x, y, 12, 5, "#f1e3c4");
        R(c, x + 2, y + 1, 3, 2, "#5a3214");
        R(c, x + 7, y + 1, 3, 2, "#5a3214");
        for (let k = 0; k < 4; k++) R(c, x + 1 + k * 3, y + 5, 1, 2, "#f1e3c4");
      } else if (r < 0.25) {
        // dead branch
        line(c, sx + 40, H - 4, sx + 50, Math.max(gy + 8, H - 18), "#6b4423");
        line(c, sx + 46, H - 11, sx + 54, H - 15, "#6b4423");
      }
    });
  },
  air: (e) => {
    const { c } = e;
    // blowing sand
    field(e, 40, 2, { vx: -0.09, vy: 0.004, par: 1.2, y0: e.gy - 30, y1: e.H, wob: 2, wobT: 200 }, (x, y, i) => {
      R(c, x, y, i % 4 === 0 ? 4 : 2, 1, i % 3 ? "rgba(246,206,140,0.75)" : "rgba(214,160,90,0.7)");
    });
  },
  grade: (e) => {
    wash(e, "rgba(255,150,60,0.10)", "multiply");
    vwash(e, e.gy - 30, e.gy + 6, [[0, "rgba(255,230,180,0)"], [0.7, "rgba(255,230,180,0.18)"], [1, "rgba(255,230,180,0)"]], "lighter");
    vignette(e, 0.3, "90,40,0");
  },
};

// =====================================================================
// 3. SKYPIEA — a rainbow, Enel's thunderclouds and lightning, the Ark Maxim, golden sparkles
// =====================================================================
const SKY_PERIOD = 5200;
const skyIsland: SagaFx = {
  back: (e) => {
    const { c, W, gy, t } = e;
    // rainbow
    const rx = W * 0.32 - e.cam * 0.02, ry = gy + 10;
    const bands = ["255,90,90", "255,160,60", "255,230,90", "110,220,110", "90,170,255", "160,110,240"];
    c.save();
    bands.forEach((rgb, k) => {
      c.strokeStyle = `rgba(${rgb},0.28)`;
      c.lineWidth = 3;
      c.beginPath();
      c.arc(rx, ry, 110 - k * 3, Math.PI, TAU);
      c.stroke();
    });
    c.restore();
    // Enel's storm clouds on the right, lit from inside when lightning strikes
    const f = flashAt(t, SKY_PERIOD, 300);
    const sx = W * 0.78;
    for (let k = 0; k < 5; k++) {
      const x = sx - 40 + k * 22, y = 18 + (k % 2) * 6;
      circle(c, x, y, 16 - (k % 2) * 3, f > 0.3 ? "#9aa3c7" : "#5f6688");
      circle(c, x + 8, y + 6, 12, f > 0.3 ? "#7e88b0" : "#4a5070");
    }
    if (f > 0) {
      const seed = Math.floor(t / SKY_PERIOD) * 13;
      bolt(c, sx - 20 + rnd(seed) * 60, 26, gy - 10, seed, "#fff9db", "rgba(255,240,150,0.6)");
      glow(c, sx, 24, 60, "255,250,200", 0.5 * f);
    }
    // the golden Ark Maxim crossing the sky
    const ax = mod(t * 0.008 - e.cam * 0.05, W + 160) - 80, ay = 40 + Math.sin(t / 900) * 2;
    poly(c, [ax, ay, ax + 34, ay, ax + 28, ay + 6, ax + 6, ay + 6], "#e0a800");
    R(c, ax + 4, ay - 1, 26, 1, "#ffe066");
    for (let k = 0; k < 4; k++) {
      const flap = Math.round(Math.sin(t / 120 + k) * 1.5);
      R(c, ax + 6 + k * 7, ay - 9 + flap, 5, 8, "#fff3bf");
      R(c, ax + 6 + k * 7, ay - 9 + flap, 5, 1, "#e0a800");
    }
    R(c, ax + 16, ay - 14, 1, 14, "#8a6a00");
    circle(c, ax + 36, ay + 2, 2, "#ffe066");
  },
  mid: (e) => {
    const { c, W, gy, t } = e;
    // floating cloud islets at different depths
    tiles(e.cam * 0.3, 170, W, (sx, i) => {
      const y = gy - 52 - rnd(i) * 22 + Math.sin(t / 1100 + i) * 2;
      puff(c, sx, y, 0.9, "#ffffff", "#dbe9ff");
      if (i % 2) {
        R(c, sx + 9, y - 10, 1, 8, "#8b5a2b");
        poly(c, [sx + 9, y - 10, sx + 3, y - 8, sx + 15, y - 8], "#2f9e44");
      }
    });
  },
  ground: (e, x0, x1) => {
    const { c, gy, H, cam, t } = e;
    const a = Math.max(x0, cam - 20), b = Math.min(x1, cam + e.W + 20);
    for (let i = Math.floor(a / 9); i * 9 <= b; i++) {
      const sx = Math.round(i * 9 - cam), r = rnd(i + 77);
      const y = gy + 8 + Math.floor(r * (H - gy - 10));
      circle(c, sx, y, 3 + r * 3, "rgba(200,220,255,0.45)");
      if (r > 0.8 && Math.sin(t / 300 + i) > 0.6) R(c, sx, y - 2, 1, 1, "#fff3bf");
    }
  },
  front: (e) => {
    const { c, H } = e;
    fg(e, 1.5, 90, (sx, i) => {
      const s = 1.4 + rnd(i + 31) * 0.8;
      puff(c, sx, H - 4, s, "#ffffff", "#c7dbf7");
    });
  },
  air: (e) => {
    const { c, t } = e;
    field(e, 16, 3, { vx: 0.004, vy: 0.008, par: 0.5, wob: 4, wobT: 700 }, (x, y, i) => {
      if (i % 4 === 0) {
        // a drifting feather
        R(c, x, y, 3, 1, "#ffffff");
        R(c, x + 1, y + 1, 1, 1, "#e7f0ff");
      } else if (Math.sin(t / 200 + i) > 0) {
        R(c, x, y, 1, 1, "#ffe066");
      }
    });
  },
  grade: (e) => {
    vwash(e, 0, e.gy, [[0, "rgba(255,255,255,0.10)"], [1, "rgba(255,255,255,0)"]], "lighter");
    const f = flashAt(e.t, SKY_PERIOD, 300);
    if (f) wash(e, `rgba(255,250,215,${(0.35 * f).toFixed(3)})`, "lighter");
    vignette(e, 0.16, "40,60,120");
  },
};

// =====================================================================
// 4. ENIES LOBBY — the burning World Government flag, Buster Call warships, ash and embers
// =====================================================================
const eniesLobby: SagaFx = {
  back: (e) => {
    const { c, W, gy, t } = e;
    // a smoke-stained sky over the Buster Call
    vwash(e, 0, gy, [[0, "rgba(60,40,40,0.25)"], [0.6, "rgba(255,120,60,0.10)"], [1, "rgba(255,120,60,0)"]]);
    // the World Government flag, shot through and burning
    tiles(e.cam * 0.07, 380, W, (sx) => {
      const x = sx + 250, top = 14;
      R(c, x, top, 2, gy - 50 - top, "#495057");
      const wv = (k: number) => Math.round(Math.sin(t / 260 + k * 0.6) * 1.5);
      for (let k = 0; k < 26; k++) R(c, x + 2 + k, top + 2 + wv(k), 1, 16, "#f8f9fa");
      // WG emblem
      circle(c, x + 15, top + 10 + wv(13), 4, "#1c7ed6");
      R(c, x + 11, top + 10 + wv(13), 9, 1, "#f8f9fa");
      R(c, x + 15, top + 6 + wv(13), 1, 9, "#f8f9fa");
      // the hole and the fire
      for (let k = 0; k < 7; k++) {
        const fy = top + 14 + wv(10 + k) - Math.abs(Math.sin(t / 90 + k)) * 6;
        R(c, x + 8 + k * 2, fy, 2, 4, k % 2 ? "#ff922b" : "#ffd43b");
      }
      circle(c, x + 15, top + 12 + wv(13), 3, "#e8590c");
      for (let k = 0; k < 6; k++) {
        const p = mod(t / 1400 + k / 6, 1);
        circle(c, x + 15 + Math.sin(k * 2 + t / 900) * 4 + p * 10, top + 8 - p * 30, 2 + p * 5, `rgba(70,60,60,${(0.5 * (1 - p)).toFixed(2)})`);
      }
    });
  },
  mid: (e) => {
    const { c, W, gy, t } = e;
    // Buster Call battleships on the horizon, firing
    const hy = gy - 46;
    tiles(e.cam * 0.12, 150, W, (sx, i) => {
      const y = hy + Math.round(Math.sin(t / 800 + i) * 0.6);
      poly(c, [sx, y, sx + 30, y, sx + 26, y + 4, sx + 3, y + 4], "#343a40");
      R(c, sx + 8, y - 10, 2, 10, "#343a40");
      R(c, sx + 18, y - 8, 2, 8, "#343a40");
      R(c, sx + 4, y - 9, 10, 6, "#dee2e6");
      R(c, sx + 15, y - 7, 8, 5, "#dee2e6");
      R(c, sx + 7, y - 7, 4, 2, "#1c7ed6");
      const f = flashAt(t, 2300, 180, i * 700);
      if (f) {
        glow(c, sx + 30, y + 1, 10, "255,190,90", 0.8 * f);
        R(c, sx + 30, y, 3, 2, "#fff3bf");
      }
      // the shell landing: a white splash column later on
      const sp = mod(t + i * 700, 2300);
      if (sp > 700 && sp < 1300) {
        const k = (sp - 700) / 600;
        const h = Math.round(Math.sin(k * Math.PI) * 14);
        R(c, sx - 40, hy + 4 - h, 3, h, "rgba(255,255,255,0.85)");
        R(c, sx - 42, hy + 4 - h / 2, 7, h / 2, "rgba(255,255,255,0.5)");
      }
    });
  },
  ground: (e, x0, x1) => {
    const { c, gy, H, cam, t } = e;
    const a = Math.max(x0, cam - 20), b = Math.min(x1, cam + e.W + 20);
    for (let i = Math.floor(a / 13); i * 13 <= b; i++) {
      const sx = Math.round(i * 13 - cam), r = rnd(i + 91);
      const y = gy + 10 + Math.floor(r * (H - gy - 12));
      if ((Math.floor(t / 300) + i) % 4 === 0) R(c, sx, y, 3, 1, "rgba(255,255,255,0.7)");
      else if (r > 0.5) R(c, sx, y, 5, 1, "rgba(120,190,255,0.5)");
    }
  },
  front: (e) => {
    const { c, H, t } = e;
    fg(e, 1.6, 34, (sx, i) => {
      const ph = Math.sin(t / 400 + i * 0.8);
      const y = H - 3 + Math.round(ph * 1.5);
      R(c, sx - 12, y, 30, 6, "#0b4f8a");
      R(c, sx - 8, y - 1, 14, 1, "#e7f5ff");
      if (ph > 0.6) { R(c, sx - 4, y - 3, 2, 2, "#ffffff"); R(c, sx + 2, y - 4, 1, 1, "#ffffff"); }
    });
  },
  air: (e) => {
    const { c, t } = e;
    field(e, 26, 4, { vx: 0.006, vy: -0.012, par: 0.6, wob: 3 }, (x, y, i, life) => {
      if (i % 3 === 0) R(c, x, y, 1, 1, Math.sin(t / 120 + i) > 0 ? "#ffa94d" : "#ffd43b");
      else R(c, x, y, 1, 1, `rgba(90,80,80,${(0.6 * life).toFixed(2)})`);
    });
  },
  grade: (e) => {
    vwash(e, e.gy - 60, e.gy - 30, [[0, "rgba(255,120,60,0)"], [0.6, "rgba(255,120,60,0.16)"], [1, "rgba(255,120,60,0)"]], "lighter");
    wash(e, "rgba(120,130,160,0.08)", "multiply");
    vignette(e, 0.32, "20,10,10");
  },
};

// =====================================================================
// 5. THRILLER BARK — lightning, bats across the moon, creeping fog, will-o'-wisps
// =====================================================================
const TB_PERIOD = 6100;
const thrillerBark: SagaFx = {
  back: (e) => {
    const { c, W, gy, t } = e;
    const f = flashAt(t, TB_PERIOD, 340, 900);
    if (f) {
      const seed = Math.floor((t + 900) / TB_PERIOD) * 7;
      bolt(c, W * 0.15 + rnd(seed) * W * 0.5, 0, gy - 40, seed, "#f3f0ff", "rgba(190,160,255,0.55)");
    }
    // the spires of Thriller Bark far behind
    tiles(e.cam * 0.05, 300, W, (sx, i) => {
      const col = f > 0.3 ? "#5b4b80" : "#2b1f45";
      for (let k = 0; k < 5; k++) {
        const h = 26 + rnd(i * 5 + k) * 30, x = sx + k * 14;
        R(c, x, gy - 28 - h, 6, h, col);
        poly(c, [x - 1, gy - 28 - h, x + 7, gy - 28 - h, x + 3, gy - 38 - h], col);
        if (rnd(i + k) > 0.5) R(c, x + 2, gy - 20 - h, 2, 2, "#ffd43b");
      }
    });
    // bat swarm crossing the moon
    const bx = mod(t * 0.03, W + 200) - 100;
    for (let k = 0; k < 9; k++) {
      const x = bx + rnd(k) * 50 - k * 6, y = 24 + rnd(k + 5) * 26 + Math.sin(t / 200 + k) * 2;
      const fl = Math.sin(t / 70 + k) > 0 ? 1 : -1;
      R(c, x, y, 2, 1, "#120b1f");
      R(c, x - 2, y - fl, 2, 1, "#120b1f");
      R(c, x + 2, y - fl, 2, 1, "#120b1f");
    }
  },
  mid: (e) => {
    fogBand(e, e.gy - 6, 18, "170,150,220", 0.22, 0.01, 2.3, 0.3);
    fogBand(e, e.gy - 2, 10, "200,190,240", 0.16, -0.008, 5.1, 0.45);
  },
  ground: (e, x0, x1) => {
    const { c, gy, H, cam } = e;
    strata(e, x0, x1, "#1d1628", "#6c5c8a", "#3c3350", 5);
    const a = Math.max(x0, cam - 20), b = Math.min(x1, cam + e.W + 20);
    for (let i = Math.floor(a / 37); i * 37 <= b; i++) {
      const sx = Math.round(i * 37 - cam), r = rnd(i + 55);
      const y = gy + 10 + Math.floor(r * (H - gy - 16));
      if (r > 0.6) {
        // a buried bone
        R(c, sx, y, 7, 1, "#d6cfc0");
        R(c, sx - 1, y - 1, 2, 3, "#d6cfc0");
        R(c, sx + 6, y - 1, 2, 3, "#d6cfc0");
      } else if (r < 0.2) {
        // gnarled root
        line(c, sx, y, sx + 8, y + 2, "#3b2a1f");
        line(c, sx + 8, y + 2, sx + 12, y + 1, "#3b2a1f");
      }
    }
  },
  front: (e) => {
    const { c, H, gy } = e;
    fg(e, 1.6, 120, (sx, i) => {
      const r = rnd(i + 41);
      // spiked iron fence
      for (let k = 0; k < 6; k++) {
        R(c, sx + k * 5, H - 14, 1, 14, "#0d0816");
        R(c, sx + k * 5 - 1, H - 15, 3, 1, "#0d0816");
        R(c, sx + k * 5, H - 16, 1, 1, "#0d0816");
      }
      R(c, sx - 1, H - 11, 28, 1, "#0d0816");
      R(c, sx - 1, H - 5, 28, 1, "#0d0816");
      if (r > 0.4) {
        // a twisted dead tree reaching in
        const x = sx + 60, top = Math.max(gy + 4, H - 34);
        for (let y = H; y > top; y--) R(c, x + Math.round(Math.sin(y / 5) * 2), y, 3, 1, "#0d0816");
        line(c, x + 1, top + 6, x + 12, top - 2, "#0d0816");
        line(c, x + 8, top + 1, x + 14, top + 4, "#0d0816");
        line(c, x + 1, top + 12, x - 9, top + 4, "#0d0816");
        line(c, x - 6, top + 6, x - 10, top + 9, "#0d0816");
      }
    });
    fogBand(e, H - 4, 10, "190,175,235", 0.22, 0.02, 7.3, 1.3);
  },
  air: (e) => {
    const { c, t } = e;
    field(e, 9, 5, { vx: 0.003, vy: -0.002, par: 0.7, y0: e.gy - 40, y1: e.gy + 20, wob: 5, wobT: 900 }, (x, y, i) => {
      const a = 0.5 + 0.5 * Math.sin(t / 300 + i * 2);
      glow(c, x, y, 6, "120,255,160", 0.35 * a);
      R(c, x, y, 1, 1, `rgba(200,255,210,${(0.6 + 0.4 * a).toFixed(2)})`);
    });
  },
  grade: (e) => {
    const f = flashAt(e.t, TB_PERIOD, 340, 900);
    if (f) wash(e, `rgba(210,200,255,${(0.38 * f).toFixed(3)})`, "lighter");
    vignette(e, 0.55, "20,0,40");
  },
};

// =====================================================================
// 6. MARINEFORD — the war: smoke columns, sky-cracking quakes, magma meteors, frozen tsunamis
// =====================================================================
const QUAKE = 7000;
const marineford: SagaFx = {
  back: (e) => {
    const { c, W, gy, t } = e;
    // war smoke rising on the horizon
    tiles(e.cam * 0.05, 120, W, (sx, i) => {
      for (let k = 0; k < 7; k++) {
        const p = mod(t / 5000 + k / 7 + rnd(i), 1);
        const x = sx + Math.sin(p * 4 + i) * 4 + p * 16, y = gy - 40 - p * 70;
        circle(c, x, y, 3 + p * 9, `rgba(70,74,84,${(0.45 * (1 - p)).toFixed(2)})`);
      }
    });
    // Whitebeard's quake: the sky cracks like glass
    const q = mod(t, QUAKE);
    if (q < 1600) {
      const k = q / 1600, a = (1 - k) * 0.9;
      const cx = W * 0.55, cy = 30;
      const seed = Math.floor(t / QUAKE) * 5;
      c.save();
      c.strokeStyle = `rgba(255,255,255,${a.toFixed(2)})`;
      c.lineWidth = 1;
      for (let n = 0; n < 7; n++) {
        const ang = (n / 7) * TAU + rnd(seed + n);
        let x = cx, y = cy;
        c.beginPath();
        c.moveTo(x, y);
        for (let s = 0; s < 4; s++) {
          x += Math.cos(ang + (rnd(seed + n * 9 + s) - 0.5)) * 10;
          y += Math.sin(ang + (rnd(seed + n * 7 + s) - 0.5)) * 7;
          c.lineTo(Math.round(x) + 0.5, Math.round(y) + 0.5);
        }
        c.stroke();
      }
      c.strokeStyle = `rgba(255,255,255,${(a * 0.6).toFixed(2)})`;
      c.beginPath();
      c.ellipse(cx, cy, 8 + k * 90, 4 + k * 40, 0, 0, TAU);
      c.stroke();
      c.restore();
      glow(c, cx, cy, 40, "220,235,255", 0.4 * (1 - k));
    }
    // Aokiji's frozen tsunami walls
    tiles(e.cam * 0.08, 210, W, (sx, i) => {
      const base = gy - 28;
      for (let k = 0; k < 6; k++) {
        const x = sx + k * 12, h = 18 + rnd(i * 6 + k) * 22;
        poly(c, [x, base, x + 6, base - h, x + 14, base - h * 0.7, x + 16, base], k % 2 ? "#d0ebff" : "#a5d8ff");
        line(c, x + 6, base - h, x + 9, base - h * 0.4, "#ffffff");
      }
    });
    // magma meteors (Meteor Volcano)
    for (let m = 0; m < 3; m++) {
      const p = mod(t / 2600 + m / 3, 1);
      if (p > 0.55) continue;
      const k = p / 0.55;
      const x0 = W * (0.2 + 0.3 * m) + 30, x = x0 - k * 40, y = -10 + k * (gy - 30);
      line(c, x + 10, y - 14, x, y, "rgba(255,140,40,0.55)", 3);
      line(c, x + 5, y - 7, x, y, "#ffd43b", 1);
      circle(c, x, y, 3, "#c92a2a");
      circle(c, x, y, 2, "#ff922b");
      glow(c, x, y, 10, "255,120,40", 0.5);
    }
  },
  mid: (e) => {
    const { c, W, gy, t } = e;
    // explosions along the bay
    tiles(e.cam * 0.2, 97, W, (sx, i) => {
      const f = flashAt(t, 1900 + (i % 3) * 400, 420, i * 530);
      if (!f) return;
      const y = gy - 34, rr = 2 + (1 - f) * 7;
      glow(c, sx, y, 9, "255,170,60", 0.7 * f);
      for (let s = 0; s < 10; s++) {
        const ang = (s / 10) * TAU + i;
        R(c, sx + Math.cos(ang) * rr, y + Math.sin(ang) * rr * 0.7, 1, 1, s % 2 ? "#ffd43b" : "#ff6b00");
      }
      R(c, sx - 1, y - 1, 3, 3, f > 0.5 ? "#fff3bf" : "#ff922b");
    });
  },
  ground: (e, x0, x1) => {
    const { c, gy, H, cam } = e;
    // Marineford plaza paving, cracked and scorched
    const a = Math.max(x0, cam - 30), b = Math.min(x1, cam + e.W + 30);
    for (let row = 0; row * 7 < H - gy; row++) {
      const y = gy + 4 + row * 7;
      R(c, Math.round(a - cam), y, Math.round(b - a), 1, "#b3ab9b");
      for (let wx = Math.floor(a / 16) * 16 + (row % 2) * 8; wx < b; wx += 16) R(c, Math.round(wx - cam), y, 1, 7, "#b3ab9b");
    }
    for (let i = Math.floor(a / 53); i * 53 <= b; i++) {
      const sx = Math.round(i * 53 - cam), r = rnd(i + 17);
      const y = gy + 8 + Math.floor(r * (H - gy - 14));
      if (r > 0.45) {
        circle(c, sx, y, 6, "rgba(40,30,30,0.25)");
        line(c, sx - 6, y - 2, sx + 7, y + 3, "#6d665a");
        line(c, sx, y, sx + 3, y - 5, "#6d665a");
      }
    }
  },
  front: (e) => {
    const { c, H, gy, t } = e;
    fg(e, 1.6, 75, (sx, i) => {
      const r = rnd(i + 61);
      if (r > 0.66) {
        // a sword stuck in the ground
        const x = sx + 10, y = H - 6;
        R(c, x, Math.max(gy + 6, y - 18), 2, 18, "#ced4da");
        R(c, x - 3, Math.max(gy + 6, y - 18) + 3, 8, 2, "#5c3d1e");
        R(c, x, Math.max(gy + 6, y - 18), 1, 18, "#ffffff");
      } else if (r > 0.33) {
        // ice shards
        poly(c, [sx, H + 1, sx + 4, H - 16, sx + 9, H + 1], "#a5d8ff");
        poly(c, [sx + 6, H + 1, sx + 12, H - 22, sx + 16, H + 1], "#d0ebff");
        line(c, sx + 12, H - 22, sx + 13, H - 6, "#ffffff");
      } else {
        // rubble and a broken cannon
        circle(c, sx + 6, H - 2, 6, "#5c5f66");
        circle(c, sx + 14, H - 1, 4, "#6d7078");
        R(c, sx + 18, H - 8, 16, 4, "#25262b");
        circle(c, sx + 18, H - 4, 4, "#3a2a1a");
        if (Math.sin(t / 500 + i) > 0.3) circle(c, sx + 36, H - 10, 2, "rgba(120,120,130,0.5)");
      }
    });
  },
  air: (e) => {
    const { c } = e;
    field(e, 30, 6, { vx: -0.004, vy: 0.01, par: 0.6, wob: 3 }, (x, y, i) => {
      R(c, x, y, 1, 1, i % 4 === 0 ? "#ffa94d" : i % 2 ? "rgba(230,235,245,0.85)" : "rgba(120,120,130,0.6)");
    });
  },
  grade: (e) => {
    const q = mod(e.t, QUAKE);
    if (q < 300) wash(e, `rgba(230,240,255,${((1 - q / 300) * 0.35).toFixed(3)})`, "lighter");
    vwash(e, e.gy - 50, e.gy - 20, [[0, "rgba(255,130,50,0)"], [0.6, "rgba(255,130,50,0.12)"], [1, "rgba(255,130,50,0)"]], "lighter");
    wash(e, "rgba(110,130,170,0.10)", "multiply");
    vignette(e, 0.34, "10,15,30");
  },
};

// =====================================================================
// 7. FISH-MAN ISLAND — light shafts, a passing Sea King, kelp forests, rising bubbles, caustics
// =====================================================================
const fishManIsland: SagaFx = {
  back: (e) => {
    const { c, W, gy, t } = e;
    // Sun Tree Eve light shafts from above
    c.save();
    c.globalCompositeOperation = "lighter";
    for (let k = 0; k < 6; k++) {
      const x = mod(k * 70 - e.cam * 0.1, W + 80) - 40 + Math.sin(t / 2000 + k) * 10;
      const g = c.createLinearGradient(0, 0, 0, gy);
      const a = 0.08 + 0.05 * Math.sin(t / 1300 + k * 2);
      g.addColorStop(0, `rgba(200,255,255,${a.toFixed(3)})`);
      g.addColorStop(1, "rgba(200,255,255,0)");
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x + 14, 0);
      c.lineTo(x + 44, gy);
      c.lineTo(x + 16, gy);
      c.closePath();
      c.fill();
    }
    c.restore();
    // a giant Sea King swimming past in the deep blue
    const sx = mod(-t * 0.012 - e.cam * 0.04, W + 420) - 180, sy = 46 + Math.sin(t / 2200) * 5;
    // one path, filled once, so the translucent silhouette has no darker overlaps
    c.fillStyle = "rgba(8,40,90,0.5)";
    c.beginPath();
    const tailY = sy + Math.sin(t / 700 + 15 * 0.5) * 4;
    for (let k = 0; k < 16; k++) {
      const x = sx + 26 + k * 9, y = sy + Math.sin(t / 700 + k * 0.5) * 4;
      c.moveTo(x + 9 - k * 0.4, y);
      c.arc(x, y, 9 - k * 0.4, 0, TAU);
    }
    c.moveTo(sx + 27, sy); c.arc(sx + 14, sy, 13, 0, TAU);
    c.moveTo(sx + 160, tailY); c.lineTo(sx + 178, tailY - 12); c.lineTo(sx + 174, tailY + 12); c.closePath();
    c.moveTo(sx - 8, sy - 2); c.lineTo(sx + 6, sy - 8); c.lineTo(sx + 6, sy + 6); c.closePath();
    for (let k = 0; k < 4; k++) {
      const y = sy + Math.sin(t / 700 + (2 + k * 3) * 0.5) * 4;
      c.moveTo(sx + 40 + k * 26, y - 7); c.lineTo(sx + 47 + k * 26, y - 17); c.lineTo(sx + 53 + k * 26, y - 6); c.closePath();
    }
    c.fill("nonzero");
    R(c, sx + 6, sy - 4, 3, 2, "rgba(255,230,120,0.7)");
    // Ryugu Palace in its bubble, far away
    tiles(e.cam * 0.08, 420, W, (bx) => {
      const x = bx + 300, y = gy - 46;
      circle(c, x, y, 26, "rgba(200,240,255,0.10)");
      c.strokeStyle = "rgba(220,250,255,0.35)";
      c.beginPath(); c.arc(x, y, 26, 0, TAU); c.stroke();
      R(c, x - 14, y - 2, 28, 16, "#f7a8c4");
      for (let k = 0; k < 3; k++) { R(c, x - 12 + k * 10, y - 14, 5, 12, "#ffc9de"); poly(c, [x - 13 + k * 10, y - 14, x - 6 + k * 10, y - 14, x - 9.5 + k * 10, y - 21], "#e64980"); }
      R(c, x - 3, y + 6, 6, 8, "#c2255c");
    });
  },
  mid: (e) => {
    const { c, W, gy, t } = e;
    // kelp forest
    tiles(e.cam * 0.35, 19, W, (sx, i) => {
      const h = 18 + rnd(i) * 30;
      for (let k = 0; k < h; k++) {
        const x = sx + Math.round(Math.sin(t / 900 + i + k / 6) * (k / 10));
        R(c, x, gy - k, 2, 1, k % 4 ? "#1f6f5c" : "#2b8a6e");
      }
    });
    // coral reef silhouettes
    tiles(e.cam * 0.4, 64, W, (sx, i) => {
      const col = ["#c2255c", "#e8590c", "#9c36b5"][mod(i, 3)];
      for (let k = 0; k < 4; k++) R(c, sx + k * 3, gy - 6 - ((k * 3 + i) % 7), 2, 8 + ((k * 3 + i) % 7), col);
      circle(c, sx + 18, gy - 3, 4, "#f08c00");
    });
  },
  ground: (e, x0, x1) => {
    const { c, gy, H, cam, t } = e;
    const a = Math.max(x0, cam - 20), b = Math.min(x1, cam + e.W + 20);
    for (let row = 0; row < 6; row++) {
      const y = gy + 6 + row * Math.max(3, Math.floor((H - gy - 8) / 6));
      for (let wx = Math.floor(a / 4) * 4; wx < b; wx += 4) {
        const dy = Math.round(Math.sin(wx * 0.07 + row * 2.3) * 1.2);
        R(c, Math.round(wx - cam), y + dy, 4, 1, row % 2 ? "#a88d55" : "#d1b77c");
      }
    }
    for (let i = Math.floor(a / 41); i * 41 <= b; i++) {
      const sx = Math.round(i * 41 - cam), r = rnd(i + 33);
      const y = gy + 10 + Math.floor(r * (H - gy - 16));
      if (r > 0.6) {
        // starfish
        R(c, sx - 2, y, 5, 1, "#ff6b6b"); R(c, sx, y - 2, 1, 5, "#ff6b6b"); R(c, sx - 1, y + 2, 1, 1, "#ff6b6b"); R(c, sx + 1, y + 2, 1, 1, "#ff6b6b");
      } else if (r < 0.25) {
        // shell
        R(c, sx, y, 4, 2, "#fff0f6"); R(c, sx + 1, y - 1, 2, 1, "#fff0f6"); R(c, sx + 1, y, 1, 2, "#fcc2d7");
      }
    }
    void t;
  },
  front: (e) => {
    const { c, H, gy, t } = e;
    fg(e, 1.6, 44, (sx, i) => {
      const r = rnd(i + 71);
      const h = Math.min(H - gy - 4, 10 + r * 16);
      for (let k = 0; k < h; k++) {
        const x = sx + Math.round(Math.sin(t / 800 + i + k / 5) * (k / 6));
        R(c, x, H - k, 3, 1, k % 3 ? "#0b4d3e" : "#126b55");
      }
      if (r > 0.7) {
        circle(c, sx + 18, H - 3, 6, "#a61e4d");
        circle(c, sx + 16, H - 5, 3, "#c2255c");
      }
    });
  },
  air: (e) => {
    const { c } = e;
    field(e, 26, 7, { vx: 0, vy: -0.016, par: 0.5, wob: 3, wobT: 400 }, (x, y, i) => {
      const r = i % 5 === 0 ? 3 : i % 2 ? 1 : 2;
      if (r === 1) { R(c, x, y, 1, 1, "rgba(220,250,255,0.8)"); return; }
      c.strokeStyle = "rgba(220,250,255,0.75)";
      c.lineWidth = 1;
      c.beginPath(); c.arc(x + 0.5, y + 0.5, r, 0, TAU); c.stroke();
      R(c, x - r + 1, y - r + 1, 1, 1, "#ffffff");
    });
  },
  grade: (e) => {
    const { c, W, H, t } = e;
    // shimmering caustics
    c.save();
    c.globalCompositeOperation = "lighter";
    for (let k = 0; k < 22; k++) {
      const x = mod(rnd(k) * W + Math.sin(t / 1500 + k) * 18 - e.cam * 0.3, W);
      const y = rnd(k + 3) * H * 0.8 + Math.cos(t / 1700 + k) * 8;
      c.fillStyle = `rgba(180,255,255,${(0.03 + 0.03 * Math.sin(t / 500 + k)).toFixed(3)})`;
      c.beginPath(); c.ellipse(x, y, 14, 4, Math.sin(t / 3000 + k), 0, TAU); c.fill();
    }
    c.restore();
    vwash(e, 0, H, [[0, "rgba(0,40,90,0)"], [1, "rgba(0,30,70,0.25)"]]);
    vignette(e, 0.4, "0,20,50");
  },
};

// =====================================================================
// 8. DRESSROSA — the Birdcage strings, sunflowers, cobblestones, confetti
// =====================================================================
const dressrosa: SagaFx = {
  back: (e) => {
    const { c, W, gy, t } = e;
    // Doflamingo's Birdcage closing over the island
    const ax = W * 0.5 - e.cam * 0.02, ay = -60;
    c.save();
    for (let k = 0; k < 15; k++) {
      const bx = ax + (k - 7) * 46;
      c.strokeStyle = "rgba(255,255,255,0.32)";
      c.lineWidth = 1;
      c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, gy - 20); c.stroke();
      // a glint sliding down each string
      const p = mod(t / 2600 + k * 0.37, 1);
      const gx = ax + (bx - ax) * p, gyy = ay + (gy - 20 - ay) * p;
      R(c, gx, gyy, 2, 2, "rgba(255,240,255,0.9)");
    }
    c.restore();
    // pink feather coat clouds
    tiles(e.cam * 0.04, 200, W, (sx, i) => puff(c, sx, 14 + rnd(i) * 16, 0.8, "#ffd6e7", "#fcc2d7"));
  },
  ground: (e, x0, x1) => {
    const { c, gy, H, cam } = e;
    const a = Math.max(x0, cam - 20), b = Math.min(x1, cam + e.W + 20);
    for (let row = 0; row * 5 < H - gy - 4; row++) {
      const y = gy + 4 + row * 5;
      for (let wx = Math.floor(a / 8) * 8 + (row % 2) * 4; wx < b; wx += 8) {
        const r = rnd(wx * 0.13 + row);
        R(c, Math.round(wx - cam), y, 7, 4, r > 0.5 ? "#c08a5a" : "#a8764a");
        R(c, Math.round(wx - cam), y, 7, 1, "#d4a373");
      }
    }
  },
  front: (e) => {
    const { c, H, gy, t } = e;
    fg(e, 1.6, 28, (sx, i) => {
      const r = rnd(i + 81);
      const top = Math.max(gy + 6, H - 14 - Math.floor(r * 10));
      const sway = Math.round(Math.sin(t / 650 + i) * 1.2);
      line(c, sx, H, sx + sway, top, "#2b8a3e");
      R(c, sx - 3, top + 6, 3, 1, "#37b24d");
      R(c, sx + 1, top + 9, 3, 1, "#37b24d");
      circle(c, sx + sway, top, 4, "#fcc419");
      circle(c, sx + sway, top, 2, "#5c3d1e");
    });
  },
  air: (e) => {
    const { c, t } = e;
    const cols = ["#ff6b6b", "#ffd43b", "#74c0fc", "#f783ac", "#69db7c", "#ffffff"];
    field(e, 30, 8, { vx: 0.004, vy: 0.012, par: 0.5, wob: 4, wobT: 350 }, (x, y, i) => {
      const flip = Math.sin(t / 150 + i) > 0;
      R(c, x, y, flip ? 2 : 1, flip ? 1 : 2, cols[mod(i, cols.length)]);
    });
  },
  grade: (e) => {
    wash(e, "rgba(255,120,120,0.07)", "multiply");
    glow(e.c, e.W * 0.8, 10, e.W * 0.6, "255,190,140", 0.12);
    vignette(e, 0.28, "80,20,40");
  },
};

// =====================================================================
// 9. WHOLE CAKE ISLAND — cotton-candy clouds, Zeus, candy foreground, falling sprinkles
// =====================================================================
const wholeCake: SagaFx = {
  back: (e) => {
    const { c, W, t } = e;
    tiles(e.cam * 0.04, 150, W, (sx, i) => {
      const cols = [["#ffd6f5", "#f5b3e4"], ["#e5dbff", "#cdbcff"], ["#fff0f6", "#ffc9de"]][mod(i, 3)];
      puff(c, sx, 12 + rnd(i) * 20, 0.9 + rnd(i + 1) * 0.5, cols[0], cols[1]);
    });
    // Zeus, the thundercloud homie
    const zx = W * 0.18 + Math.sin(t / 2500) * 20 - e.cam * 0.03, zy = 22 + Math.sin(t / 800) * 2;
    puff(c, zx, zy, 1.2, "#e9ecef", "#adb5bd");
    R(c, zx + 9, zy - 3, 2, 2, "#212529");
    R(c, zx + 15, zy - 3, 2, 2, "#212529");
    R(c, zx + 11, zy + 1, 4, 1, "#212529");
    if (Math.sin(t / 600) > 0.85) { line(c, zx + 12, zy + 6, zx + 9, zy + 12, "#ffe066"); line(c, zx + 9, zy + 12, zx + 13, zy + 16, "#ffe066"); }
  },
  ground: (e, x0, x1) => {
    const { c, gy, H, cam } = e;
    const xa = Math.round(x0 - cam), w = Math.round(x1 - x0);
    // sponge, cream and jam layers of a giant cake
    R(c, xa, gy + 12, w, 3, "#fff5e6");
    R(c, xa, gy + 15, w, 2, "#e03131");
    R(c, xa, gy + 26, w, 3, "#fff5e6");
    R(c, xa, gy + 29, w, 2, "#f783ac");
    if (H - gy > 40) R(c, xa, gy + 40, w, 3, "#fff5e6");
    const a = Math.max(x0, cam - 20), b = Math.min(x1, cam + e.W + 20);
    for (let i = Math.floor(a / 23); i * 23 <= b; i++) {
      const sx = Math.round(i * 23 - cam);
      R(c, sx, gy + 3, 3, 4 + Math.floor(rnd(i) * 5), "#ffffff"); // frosting drips
      if (rnd(i + 2) > 0.6) circle(c, sx + 10, gy + 21, 2, "#e03131");
    }
  },
  front: (e) => {
    const { c, H, gy } = e;
    fg(e, 1.5, 70, (sx, i) => {
      const k = mod(i, 3);
      if (k === 0) {
        // giant donut
        circle(c, sx + 10, H - 4, 10, "#d9a066");
        circle(c, sx + 10, H - 5, 9, "#f783ac");
        circle(c, sx + 10, H - 5, 3, "#6b3b2a");
        for (let s = 0; s < 6; s++) R(c, sx + 4 + rnd(i + s) * 12, H - 11 + rnd(i + s + 9) * 8, 2, 1, ["#ffd43b", "#74c0fc", "#ffffff"][s % 3]);
      } else if (k === 1) {
        // candy cane
        const top = Math.max(gy + 6, H - 22);
        for (let y = H; y > top; y--) R(c, sx, y, 3, 1, Math.floor(y / 3) % 2 ? "#ffffff" : "#e03131");
        c.strokeStyle = "#e03131"; c.lineWidth = 3;
        c.beginPath(); c.arc(sx + 5.5, top + 1, 4, Math.PI, TAU); c.stroke();
      } else {
        // gumdrops
        poly(c, [sx, H + 1, sx + 4, H - 8, sx + 9, H + 1], "#69db7c");
        poly(c, [sx + 8, H + 1, sx + 12, H - 10, sx + 17, H + 1], "#9775fa");
        R(c, sx + 3, H - 6, 1, 1, "#ffffff");
      }
    });
  },
  air: (e) => {
    const { c } = e;
    const cols = ["#ff8787", "#ffd43b", "#74c0fc", "#b197fc", "#ffffff", "#63e6be"];
    field(e, 34, 9, { vx: 0.002, vy: 0.018, par: 0.5, wob: 2 }, (x, y, i) => R(c, x, y, i % 2 ? 2 : 1, i % 2 ? 1 : 2, cols[mod(i, cols.length)]));
  },
  grade: (e) => {
    glow(e.c, e.W * 0.78, e.gy * 0.18, e.W * 0.6, "255,200,230", 0.18);
    vignette(e, 0.2, "120,30,80");
  },
};

// =====================================================================
// 10. WANO — Kaido's dragon in the sky, misty mountains, bamboo, a sakura branch, petals and embers
// =====================================================================
const wano: SagaFx = {
  back: (e) => {
    const { c, W, gy, t } = e;
    // misty mountain layers far behind
    for (let layer = 0; layer < 2; layer++) {
      const col = layer ? "#b5577a" : "#c9708a";
      c.fillStyle = col;
      for (let x = 0; x < W; x += 2) {
        const wx = x + e.cam * (0.03 + layer * 0.03);
        const h = 20 + Math.abs(Math.sin(wx * 0.013 + layer * 3)) * 26 + Math.sin(wx * 0.05) * 4 - layer * 8;
        c.fillRect(x, Math.round(gy - 40 - h), 2, Math.ceil(h) + 20);
      }
    }
    fogBand(e, gy - 46, 10, "255,210,200", 0.3, 0.006, 1.1, 0.05);
    // Kaido, the azure dragon, snaking across the sky
    const span = W + 260;
    const hx = mod(t * 0.02 - e.cam * 0.04, span) - 130;
    const seg = (k: number) => {
      const x = hx - k * 5;
      const y = 34 + Math.sin((t / 500) - k * 0.35) * 9 + Math.sin(x * 0.01) * 6;
      return [x, y] as const;
    };
    for (let k = 34; k >= 0; k--) {
      const [x, y] = seg(k);
      const r = k > 28 ? 5 - (k - 28) * 0.6 : 5.5 - k * 0.04;
      circle(c, x, y, r, "#2f6fd6");
      R(c, x - 1, y - r, 3, 1, "#74b0ff");
      R(c, x - 1, y + r - 2, 2, 1, "#e8f0ff");
      if (k % 3 === 0) R(c, x, y - r - 2, 2, 2, "#ffffff"); // mane
    }
    const [x, y] = seg(0);
    R(c, x, y - 4, 10, 7, "#2f6fd6");
    R(c, x + 9, y - 2, 4, 4, "#2f6fd6");
    R(c, x + 4, y - 3, 2, 2, "#ffd43b");
    line(c, x + 2, y - 4, x - 3, y - 10, "#f1f3f5"); // horns
    line(c, x + 5, y - 4, x + 3, y - 11, "#f1f3f5");
    line(c, x + 12, y + 1, x + 20, y + 6 + Math.sin(t / 200) * 2, "#e8f0ff"); // whisker
    line(c, x + 12, y - 1, x + 21, y - 4 + Math.sin(t / 230) * 2, "#e8f0ff");
    // Bolo Breath every few seconds
    const br = mod(t, 4200);
    if (br < 900) {
      const k = br / 900;
      for (let f = 0; f < 10; f++) {
        const d = f * 4 * (0.4 + k);
        circle(c, x + 14 + d, y + Math.sin(f + t / 60) * (1 + f * 0.4), 2 + f * 0.5, f < 3 ? "#fff3bf" : f < 6 ? "#ffa94d" : "rgba(240,80,40,0.8)");
      }
      glow(c, x + 30, y, 30, "255,150,60", 0.5 * (1 - k));
    }
  },
  mid: (e) => fogBand(e, e.gy - 4, 10, "255,225,215", 0.2, 0.008, 3.3, 0.4),
  ground: (e, x0, x1) => {
    const { c, gy, H, cam } = e;
    strata(e, x0, x1, "#8c6239", "#d2a679", "#b5a089", 9);
    const a = Math.max(x0, cam - 20), b = Math.min(x1, cam + e.W + 20);
    // stepping stones along the path
    for (let i = Math.floor(a / 15); i * 15 <= b; i++) {
      const sx = Math.round(i * 15 - cam);
      R(c, sx, gy + 4, 10, 3, "#b8ac98");
      R(c, sx + 1, gy + 4, 8, 1, "#d6cdbd");
    }
    void H;
  },
  front: (e) => {
    const { c, H, gy, W, t } = e;
    fg(e, 1.6, 60, (sx, i) => {
      const r = rnd(i + 91);
      if (r > 0.45) {
        // dark bamboo stalks
        for (let k = 0; k < 3; k++) {
          const x = sx + k * 5, top = Math.max(gy + 4, H - 20 - k * 4);
          R(c, x, top, 3, H - top, "#1e3d2a");
          for (let y = top + 4; y < H; y += 6) R(c, x, y, 3, 1, "#2f5c3f");
          poly(c, [x + 2, top + 2, x + 10, top - 1, x + 6, top + 3], "#2f5c3f");
        }
      } else {
        // stone lantern (toro)
        const x = sx + 8;
        R(c, x, H - 6, 10, 6, "#4a4a52");
        R(c, x + 3, H - 13, 4, 7, "#4a4a52");
        R(c, x - 1, H - 17, 12, 4, "#5a5a63");
        R(c, x + 3, H - 16, 4, 2, "#ffd43b");
        glow(c, x + 5, H - 15, 8, "255,200,90", 0.35 + 0.1 * Math.sin(t / 200 + i));
        poly(c, [x - 2, H - 17, x + 12, H - 17, x + 5, H - 22], "#3b3b42");
      }
    });
    // an overhanging sakura branch from the top corner
    fg(e, 1.2, W * 1.4, (sx) => {
      c.strokeStyle = "#3b2a2a"; c.lineWidth = 2;
      c.beginPath(); c.moveTo(sx - 10, -2); c.quadraticCurveTo(sx + 20, 10, sx + 52, 6); c.stroke();
      c.lineWidth = 1;
      c.beginPath(); c.moveTo(sx + 20, 6); c.lineTo(sx + 30, 16); c.stroke();
      for (let k = 0; k < 14; k++) {
        const bx = sx - 4 + rnd(k) * 58, by = 2 + rnd(k + 7) * 14;
        circle(c, bx, by, 2.5, k % 3 ? "#ffc9e0" : "#ff9ec7");
        R(c, bx, by, 1, 1, "#fff0f6");
      }
    });
  },
  air: (e) => {
    const { c, t } = e;
    field(e, 34, 10, { vx: 0.012, vy: 0.012, par: 0.7, wob: 4, wobT: 450 }, (x, y, i) => {
      if (i % 5 === 0) { R(c, x, y, 1, 1, Math.sin(t / 100 + i) > 0 ? "#ff922b" : "#ffd43b"); return; }
      const flip = Math.sin(t / 180 + i) > 0;
      R(c, x, y, flip ? 2 : 1, 1, i % 2 ? "#ffc9e0" : "#ff9ec7");
      if (flip) R(c, x + 1, y + 1, 1, 1, "#ffdeeb");
    });
  },
  grade: (e) => {
    glow(e.c, e.W * 0.7, e.gy * 0.25, e.W * 0.7, "255,120,80", 0.16);
    wash(e, "rgba(255,110,90,0.08)", "multiply");
    vignette(e, 0.34, "60,10,20");
  },
};

// =====================================================================
// 11. ELBAPH — northern twilight with an aurora, distant giants, snow
// =====================================================================
const elbaph: SagaFx = {
  sky: (e) => {
    const { c, W, gy, t } = e;
    vwash(e, 0, gy, [[0, "#14213d"], [0.45, "#3a4f8a"], [0.8, "#c97ba8"], [1, "#ffc9a8"]]);
    for (let k = 0; k < 40; k++) {
      const x = mod(rnd(k) * W - e.cam * 0.01, W), y = rnd(k + 9) * gy * 0.7;
      if (Math.sin(t / 400 + k * 3) > -0.3) R(c, x, y, 1, 1, "rgba(255,255,255,0.8)");
    }
    // aurora ribbons
    c.save();
    c.globalCompositeOperation = "lighter";
    for (let band = 0; band < 3; band++) {
      const rgb = band === 1 ? "160,120,255" : "90,255,170";
      for (let x = 0; x < W; x += 2) {
        const wx = x + e.cam * 0.02;
        const y = gy * 0.38 + band * 8 + Math.sin(wx * 0.02 + t / 1800 + band) * 7 + Math.sin(wx * 0.007 - t / 2600) * 6;
        const h = 14 + Math.sin(wx * 0.05 + t / 900 + band * 2) * 6;
        const g = c.createLinearGradient(0, y, 0, y + h);
        g.addColorStop(0, `rgba(${rgb},0)`);
        g.addColorStop(0.7, `rgba(${rgb},${(0.12 + 0.06 * Math.sin(wx * 0.03 + t / 700)).toFixed(3)})`);
        g.addColorStop(1, `rgba(${rgb},0)`);
        c.fillStyle = g;
        c.fillRect(x, y, 2, h);
      }
    }
    c.restore();
  },
  mid: (e) => {
    const { c, W, gy, t } = e;
    // giants walking in the haze
    tiles(e.cam * 0.22 + t * 0.004, 260, W, (sx, i) => {
      const step = Math.sin(t / 900 + i);
      const x = Math.round(sx), base = gy - 6;
      c.fillStyle = "rgba(70,70,110,0.55)";
      c.beginPath();
      c.rect(Math.round(x + 6 + step * 3), base - 22, 6, 22);
      c.rect(Math.round(x + 16 - step * 3), base - 22, 6, 22);
      c.rect(x + 2, base - 52, 26, 32);
      c.moveTo(x + 23, base - 58); c.arc(x + 15, base - 58, 8, 0, TAU);
      c.moveTo(x + 6, base - 62); c.lineTo(x + 2, base - 72); c.lineTo(x + 10, base - 64); c.closePath(); // horned helmet
      c.moveTo(x + 24, base - 62); c.lineTo(x + 28, base - 72); c.lineTo(x + 20, base - 64); c.closePath();
      c.rect(x + 28, base - 50, 5, Math.round(24 + step * 2));
      c.rect(x - 3, base - 50, 5, Math.round(24 - step * 2));
      if (i % 2) c.rect(x + 34, base - 70, 2, 46); // spear
      c.fill("nonzero");
    });
  },
  ground: (e, x0, x1) => {
    const { c, gy, H, cam } = e;
    strata(e, x0, x1, "#4f3a22", "#e7f5ff", "#8d99ae", 11);
    const a = Math.max(x0, cam - 20), b = Math.min(x1, cam + e.W + 20);
    for (let i = Math.floor(a / 12); i * 12 <= b; i++) {
      const sx = Math.round(i * 12 - cam), r = rnd(i + 3);
      R(c, sx, gy, 6 + Math.floor(r * 8), 2 + Math.floor(r * 2), "#f1f6ff"); // snow on the grass
    }
    void H;
  },
  front: (e) => {
    const { c, H, gy } = e;
    fg(e, 1.6, 66, (sx, i) => {
      const r = rnd(i + 101);
      if (r > 0.5) {
        // snowy pine tops
        const x = sx + 10, top = Math.max(gy + 2, H - 30);
        for (let k = 0; k < 4; k++) {
          const y = top + k * 7, w = 6 + k * 4;
          poly(c, [x - w, y + 8, x, y, x + w, y + 8], "#14342b");
          R(c, x - w + 2, y + 7, w * 2 - 4, 1, "#e7f5ff");
        }
      } else {
        circle(c, sx + 10, H, 12, "#e7f5ff");
        circle(c, sx + 22, H + 2, 9, "#d0e4f7");
        circle(c, sx + 6, H - 6, 3, "#8d99ae");
      }
    });
  },
  air: (e) => {
    const { c } = e;
    field(e, 46, 11, { vx: -0.004, vy: 0.012, par: 0.7, wob: 3, wobT: 700 }, (x, y, i) => {
      R(c, x, y, i % 6 === 0 ? 2 : 1, i % 6 === 0 ? 2 : 1, "rgba(255,255,255,0.9)");
    });
  },
  grade: (e) => {
    wash(e, "rgba(120,110,200,0.14)", "multiply");
    vwash(e, e.gy - 30, e.gy, [[0, "rgba(255,180,150,0)"], [1, "rgba(255,180,150,0.12)"]], "lighter");
    vignette(e, 0.4, "10,10,40");
  },
};

function fireworks(e: Env) {
  const { c, W, gy, t } = e;
  const cols = ["255,107,107", "255,212,59", "116,192,252", "177,151,252", "99,230,190", "255,146,43"];
  for (let f = 0; f < 4; f++) {
    const period = 2300 + f * 610;
    const p = mod(t + f * 830, period) / period;
    const seed = Math.floor((t + f * 830) / period) * 3 + f * 101;
    const fx = Math.round(W * (0.12 + rnd(seed) * 0.76)), fy = Math.round(gy * 0.14 + rnd(seed + 1) * gy * 0.3);
    const rgb = cols[Math.floor(rnd(seed + 2) * cols.length)];
    if (p < 0.22) {
      // the rocket climbing, with a sparkling trail
      const k = p / 0.22, y = gy - 24 - (gy - 24 - fy) * k;
      R(c, fx, y, 1, 3, "#fff3bf");
      for (let s = 1; s < 5; s++) R(c, fx + (rnd(seed + s + Math.floor(t / 60)) - 0.5) * 2, y + 3 + s * 2, 1, 1, `rgba(${rgb},${(1 - s / 5).toFixed(2)})`);
    } else if (p < 0.85) {
      const k = (p - 0.22) / 0.63, a = Math.max(0, 1 - k * 1.1);
      if (k < 0.12) glow(c, fx, fy, 26, rgb, 0.7 * (1 - k / 0.12));
      if (k < 0.06) R(c, fx - 2, fy - 2, 5, 5, "#ffffff");
      for (let s = 0; s < 22; s++) {
        const ang = (s / 22) * TAU + seed;
        const d = 3 + Math.sqrt(k) * 24;
        const x = fx + Math.cos(ang) * d, y = fy + Math.sin(ang) * d + k * k * 10;
        R(c, x, y, 2, 2, `rgba(${rgb},${a.toFixed(2)})`);
        R(c, x, y, 1, 1, `rgba(255,255,255,${(a * 0.9).toFixed(2)})`);
        const d2 = d * 0.75; // trailing spark
        R(c, fx + Math.cos(ang) * d2, fy + Math.sin(ang) * d2 + k * k * 8, 1, 1, `rgba(${rgb},${(a * 0.5).toFixed(2)})`);
      }
    }
  }
}

// =====================================================================
// 12. LAUGH TALE — fireworks, a pillar of golden light, treasure everywhere, rising sparkles
// =====================================================================
const laughTale: SagaFx = {
  back: (e) => {
    const { c, W, gy, t } = e;
    // a pillar of golden light rising from the island
    tiles(e.cam * 0.05, 360, W, (sx) => {
      const x = sx + 280;
      c.save();
      c.globalCompositeOperation = "lighter";
      const g = c.createLinearGradient(x - 12, 0, x + 12, 0);
      const a = 0.22 + 0.06 * Math.sin(t / 500);
      g.addColorStop(0, "rgba(255,210,80,0)");
      g.addColorStop(0.5, `rgba(255,230,140,${a.toFixed(3)})`);
      g.addColorStop(1, "rgba(255,210,80,0)");
      c.fillStyle = g;
      c.fillRect(x - 12, 0, 24, gy - 30);
      c.restore();
    });
  },
  mid: (e) => {
    const { c, W, gy, t } = e;
    // sun glints dancing on the sea
    for (let k = 0; k < 24; k++) {
      const x = mod(rnd(k) * W - e.cam * 0.25, W), y = gy - 14 + rnd(k + 4) * 12;
      if (Math.sin(t / 180 + k * 2.1) > 0.6) { R(c, x, y, 3, 1, "#ffffff"); R(c, x + 1, y - 1, 1, 3, "rgba(255,255,255,0.7)"); }
    }
  },
  ground: (e, x0, x1) => {
    const { c, gy, H, cam, t } = e;
    const a = Math.max(x0, cam - 20), b = Math.min(x1, cam + e.W + 20);
    for (let i = Math.floor(a / 9); i * 9 <= b; i++) {
      const sx = Math.round(i * 9 - cam), r = rnd(i + 121);
      const y = gy + 6 + Math.floor(r * (H - gy - 8));
      if (r > 0.7) {
        R(c, sx, y, 3, 2, "#f59f00");
        R(c, sx, y, 3, 1, "#ffe066");
        if (Math.sin(t / 250 + i) > 0.8) R(c, sx + 1, y - 2, 1, 1, "#ffffff");
      } else if (r < 0.06) {
        R(c, sx, y, 2, 2, ["#e03131", "#1c7ed6", "#37b24d"][mod(i, 3)]);
      } else if (r < 0.3) R(c, sx, y, 2, 1, "#e9c46a");
    }
  },
  front: (e) => {
    const { c, H, gy, t } = e;
    fg(e, 1.6, 82, (sx, i) => {
      const r = rnd(i + 131);
      // heap of gold coins
      for (let k = 0; k < 9; k++) {
        const x = sx + rnd(i * 9 + k) * 26, y = H - 2 - (k % 3) * 3 - (k > 5 ? 3 : 0);
        circle(c, x, y, 3, k % 2 ? "#f59f00" : "#fcc419");
        R(c, x - 1, y - 1, 2, 1, "#fff3bf");
      }
      if (r > 0.5) {
        // a jewelled goblet
        const x = sx + 32, top = Math.max(gy + 6, H - 16);
        R(c, x, top, 8, 6, "#fab005");
        R(c, x + 3, top + 6, 2, 6, "#e67700");
        R(c, x + 1, H - 4, 6, 2, "#e67700");
        R(c, x + 3, top + 2, 2, 2, "#e03131");
      }
      if (Math.sin(t / 220 + i * 3) > 0.85) { R(c, sx + 10, H - 12, 1, 3, "#ffffff"); R(c, sx + 9, H - 11, 3, 1, "#ffffff"); }
    });
  },
  air: (e) => {
    const { c, t } = e;
    fireworks(e);
    field(e, 30, 12, { vx: 0.002, vy: -0.01, par: 0.5, wob: 3 }, (x, y, i) => {
      const on = Math.sin(t / 160 + i * 1.7) > 0;
      if (i % 4 === 0) { R(c, x, y, 2, 1, ["#ff6b6b", "#74c0fc", "#b197fc"][mod(i, 3)]); return; }
      R(c, x, y, 1, 1, on ? "#fff3bf" : "#fcc419");
      if (on && i % 3 === 0) { R(c, x - 1, y, 3, 1, "rgba(255,243,191,0.6)"); R(c, x, y - 1, 1, 3, "rgba(255,243,191,0.6)"); }
    });
  },
  grade: (e) => {
    glow(e.c, e.W * 0.5, e.gy * 0.15, e.W * 0.8, "255,220,120", 0.2);
    wash(e, "rgba(255,200,90,0.06)", "multiply");
    vignette(e, 0.22, "80,50,0");
  },
};

/**
 * Draws a saga's foreground at double pixel size: chunkier pixels read as closer to the camera,
 * which sells the depth. The front functions work in that half-resolution space.
 */
export function drawFront(fx: SagaFx, e: Env) {
  if (!fx.front) return;
  const { c } = e;
  c.save();
  c.scale(2, 2);
  fx.front({ ...e, W: Math.ceil(e.W / 2), H: Math.ceil(e.H / 2), gy: e.gy / 2, cam: e.cam / 2 });
  c.restore();
}

export const SAGA_FX: SagaFx[] = [
  eastBlue,
  alabasta,
  skyIsland,
  eniesLobby,
  thrillerBark,
  marineford,
  fishManIsland,
  dressrosa,
  wholeCake,
  wano,
  elbaph,
  laughTale,
];
