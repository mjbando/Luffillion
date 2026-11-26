"use client";

import { memo } from "react";
import { runnerSprite } from "./pixel/runners";
import { chestCharacterById } from "@/data/chest-characters";
import type { CharacterId } from "@/data/playable-characters";

function CharacterPortrait({ characterId, size = 64, dim = false, className = "" }: {
  characterId: CharacterId;
  size?: number;
  dim?: boolean;
  className?: string;
}) {
  const sprite = runnerSprite(characterId);
  // Aura sprites (legendary/mythic) can be larger than 32px, so the view box grows to fit.
  const box = Math.max(32, sprite.width, sprite.height + 1);
  const left = Math.floor((box - sprite.width) / 2), top = box - 1 - sprite.height;
  const tier = chestCharacterById(characterId)?.rarity;
  return <svg viewBox={`0 0 ${box} ${box}`} width={size} height={size} shapeRendering="crispEdges" aria-hidden="true"
    className={`${className}${tier ? ` portrait-${tier}` : ""}`} data-portrait={characterId} data-tier={tier}>
    <g opacity={dim ? 0.5 : 1}>
      {sprite.rows.flatMap((row, y) => [...row].map((pixel, x) => sprite.palette[pixel]
        ? <rect key={`${x}:${y}`} x={left + x} y={top + y} width={1} height={1} fill={sprite.palette[pixel]} /> : null))}
    </g>
  </svg>;
}
export default memo(CharacterPortrait);
