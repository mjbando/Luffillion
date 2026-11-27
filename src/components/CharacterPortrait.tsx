"use client";

import { memo } from "react";
import { portraitSprite } from "./pixel/runners";
import { spriteDataUrl } from "./pixel/sprite-image";
import { chestCharacterById } from "@/data/chest-characters";
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

function CharacterPortrait({ characterId, size = 64, dim = false, className = "" }: {
  characterId: CharacterId;
  size?: number;
  dim?: boolean;
  className?: string;
}) {
  // The creator's Gear 6 is a still frame drawn as a single cached image (thousands of pixels as rects lag).
  const creator = characterId === "gear-6";
  const sprite = portraitSprite(characterId);
  // Aura sprites (legendary/mythic) can be larger than 32px, so the view box grows to fit.
  // High-detail art (scale 2) packs two pixels per world pixel into the same frame.
  const k = sprite.scale ?? 1;
  const bleed = sprite.bleed ?? 0;
  const box = Math.max(32 * k, sprite.width - bleed * 2, sprite.height - bleed * 2 + k);
  const left = Math.floor((box - sprite.width) / 2), top = box - k - sprite.height + bleed;
  const tier = creator ? "creator" : chestCharacterById(characterId)?.rarity;
  return <svg viewBox={`0 0 ${box} ${box}`} width={size} height={size} shapeRendering="crispEdges" aria-hidden="true"
    overflow={bleed ? "visible" : undefined}
    className={`${className}${tier ? ` portrait-${tier}` : ""}`} data-portrait={characterId} data-tier={tier}>
    <g opacity={dim ? 0.5 : 1}>
      {creator
        ? <image href={spriteDataUrl(sprite)} x={left} y={top} width={sprite.width} height={sprite.height} style={{ imageRendering: "pixelated" }} />
        : runs(sprite.rows, sprite.palette).map(([x, y, w, fill]) =>
          <rect key={`${x}:${y}`} x={left + x} y={top + y} width={w} height={1} fill={fill} />)}
    </g>
  </svg>;
}
export default memo(CharacterPortrait);
