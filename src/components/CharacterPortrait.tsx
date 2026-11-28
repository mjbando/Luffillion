"use client";

import { memo } from "react";
import { portraitAuraFrames, portraitSprite, type RunnerSprite } from "./pixel/runners";
import { spriteDataUrl } from "./pixel/sprite-image";
import { isLegendaryArt } from "./pixel/legendary-hd";
import { chestCharacterById } from "@/data/chest-characters";
import { UPDATE_LIVE } from "@/lib/release";
import type { CharacterId } from "@/data/playable-characters";

/** Merges horizontal runs of one colour into a single rect (high-detail art has thousands of pixels). */
function runs(rows: string[], palette: Record<string, string>) {
  const out: [number, number, number, string][] = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length;) {
      const fill = palette[row[x]];
      let end = x + 1;
      while (end < row.length && row[end] === row[x]) end++;
      if (fill) out.push([x, y, end - x, fill]);
      x = end;
    }
  });
  return out;
}

/** The body and glow halves of high-detail art as sprites of their own (cached per sprite). */
const halves = new WeakMap<RunnerSprite, { body: RunnerSprite; aura: RunnerSprite }>();
function split(sprite: RunnerSprite) {
  let h = halves.get(sprite);
  if (!h && sprite.layers) {
    h = { body: { ...sprite, rows: sprite.layers.body }, aura: { ...sprite, rows: sprite.layers.aura } };
    halves.set(sprite, h);
  }
  return h;
}

/** Tiers whose glow moves: Epics barely breathe, Legendaries pulse and flicker, Mythics surge. */
const MOVING_AURA = new Set(["epic", "legendary", "mythic"]);

function CharacterPortrait({ characterId, size = 64, dim = false, className = "" }: {
  characterId: CharacterId;
  size?: number;
  dim?: boolean;
  className?: string;
}) {
  // High-detail art (Gear 6, mythics, legendaries) is drawn as a single cached image: thousands of pixels as rects lag.
  const creator = UPDATE_LIVE && characterId === "gear-6";
  const sprite = portraitSprite(characterId);
  // Aura sprites (legendary/mythic) can be larger than 32px, so the view box grows to fit.
  // High-detail art (scale 2) packs two pixels per world pixel into the same frame.
  const k = sprite.scale ?? 1;
  const bleed = sprite.bleed ?? 0;
  const box = Math.max(32 * k, sprite.width - bleed * 2, sprite.height - bleed * 2 + k);
  const left = Math.floor((box - sprite.width) / 2), top = box - k - sprite.height + bleed;
  const tier = creator ? "creator" : chestCharacterById(characterId)?.rarity;
  // The former achievement legends (Law, Rayleigh, Whitebeard, Shanks) wear Legendary art too.
  const auraTier = tier ?? (isLegendaryArt(characterId) ? "legendary" : undefined);
  const layered = auraTier && MOVING_AURA.has(auraTier) ? split(sprite) : undefined;
  // Later glow frames, only kept when they line up exactly with the standing sprite.
  const extra = layered ? portraitAuraFrames(characterId).filter((f) => f.width === sprite.width && f.height === sprite.height)
    .map((f) => split(f)?.aura).filter((f): f is RunnerSprite => !!f) : [];
  return <svg viewBox={`0 0 ${box} ${box}`} width={size} height={size} shapeRendering="crispEdges" aria-hidden="true"
    overflow={bleed ? "visible" : undefined}
    className={`${className}${tier ? ` portrait-${tier}` : ""}`} data-portrait={characterId} data-tier={tier}>
    <g opacity={dim ? 0.5 : 1}>
      {layered
        ? <>
          {/* Mythics stack a second, flaring copy of the glow on top: brighter, but it never leaves the outline. */}
          {(auraTier === "mythic" ? ["aura-layer", "aura-layer aura-boost"] : ["aura-layer"]).map((cls) =>
            <g key={cls} className={`${cls} aura-${auraTier}`}>
              {[layered.aura, ...extra].map((frame, i, all) =>
                <image key={i} href={spriteDataUrl(frame)} x={left} y={top} width={sprite.width} height={sprite.height}
                  className={all.length > 1 ? `aura-frame aura-frame-${all.length}` : undefined}
                  opacity={i ? 0 : undefined} style={{ imageRendering: "pixelated", animationDelay: i ? `calc(var(--aura-step) * -${all.length - i})` : undefined }} />)}
            </g>)}
          <image href={spriteDataUrl(layered.body)} x={left} y={top} width={sprite.width} height={sprite.height} style={{ imageRendering: "pixelated" }} />
        </>
        : creator || k >= 2
        ? <image href={spriteDataUrl(sprite)} x={left} y={top} width={sprite.width} height={sprite.height} style={{ imageRendering: "pixelated" }} />
        : runs(sprite.rows, sprite.palette).map(([x, y, w, fill]) =>
          <rect key={`${x}:${y}`} x={left + x} y={top + y} width={w} height={1} fill={fill} />)}
    </g>
  </svg>;
}
export default memo(CharacterPortrait);
