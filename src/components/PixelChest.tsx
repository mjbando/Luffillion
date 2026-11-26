import type { ChestRarity } from "@/lib/treasure";

// Metal trim, highlight and wood tones for each chest tier.
const CHEST_STYLE: Record<ChestRarity, { metal: string; shine: string; wood: string; woodDark: string; woodLight: string }> = {
  common: { metal: "#8e98a8", shine: "#d5dbe4", wood: "#8b5a2b", woodDark: "#5f3b1b", woodLight: "#a96f37" },
  uncommon: { metal: "#36b46a", shine: "#a7f3c4", wood: "#8b5a2b", woodDark: "#5f3b1b", woodLight: "#a96f37" },
  rare: { metal: "#3f8be8", shine: "#bcdcff", wood: "#7a4a26", woodDark: "#4f2f16", woodLight: "#9a6233" },
  epic: { metal: "#a660ec", shine: "#e6c9ff", wood: "#5e3a5e", woodDark: "#3c2440", woodLight: "#7b4d7b" },
  legendary: { metal: "#e9ae22", shine: "#fff0b3", wood: "#6b2f1d", woodDark: "#451c10", woodLight: "#8a4127" },
  mythic: { metal: "#f0506e", shine: "#ffd1dc", wood: "#2f2346", woodDark: "#1c142c", woodLight: "#45346a" },
};

const OUTLINE = "#1a0f08";

/** A crisp 32×28 pixel-art treasure chest. The lid is its own group so it can fly open. */
export default function PixelChest({ chest, glow, size = 96, className = "" }: {
  chest: ChestRarity;
  /** Colour of the light leaking from the keyhole and seams. */
  glow?: string;
  size?: number;
  className?: string;
}) {
  const c = CHEST_STYLE[chest];
  const light = glow ?? c.shine;
  return (
    <svg viewBox="0 0 32 28" width={size} height={(size * 28) / 32} shapeRendering="crispEdges" aria-hidden="true" className={className}>
      {/* Body */}
      <g className="pc-body">
        <rect x={2} y={12} width={28} height={15} fill={OUTLINE} />
        <rect x={3} y={13} width={26} height={13} fill={c.wood} />
        <rect x={3} y={13} width={26} height={1} fill={c.woodLight} />
        <rect x={3} y={18} width={26} height={1} fill={c.woodDark} />
        <rect x={3} y={22} width={26} height={1} fill={c.woodDark} />
        <rect x={6} y={12} width={3} height={15} fill={c.metal} />
        <rect x={23} y={12} width={3} height={15} fill={c.metal} />
        <rect x={6} y={13} width={1} height={13} fill={c.shine} />
        <rect x={23} y={13} width={1} height={13} fill={c.shine} />
        <rect x={3} y={25} width={26} height={1} fill={c.metal} />
        {/* Light leaking through the seam */}
        <rect x={3} y={12} width={26} height={1} fill={light} className="pc-seam" />
      </g>
      {/* Lid */}
      <g className="pc-lid">
        <rect x={4} y={1} width={24} height={1} fill={OUTLINE} />
        <rect x={3} y={2} width={26} height={1} fill={OUTLINE} />
        <rect x={2} y={3} width={28} height={9} fill={OUTLINE} />
        <rect x={4} y={2} width={24} height={1} fill={c.woodLight} />
        <rect x={3} y={3} width={26} height={8} fill={c.wood} />
        <rect x={3} y={3} width={26} height={1} fill={c.woodLight} />
        <rect x={3} y={7} width={26} height={1} fill={c.woodDark} />
        <rect x={6} y={1} width={3} height={11} fill={c.metal} />
        <rect x={23} y={1} width={3} height={11} fill={c.metal} />
        <rect x={6} y={2} width={1} height={9} fill={c.shine} />
        <rect x={23} y={2} width={1} height={9} fill={c.shine} />
        <rect x={3} y={11} width={26} height={1} fill={c.metal} />
      </g>
      {/* Lock plate + glowing keyhole */}
      <g className="pc-lock">
        <rect x={13} y={9} width={6} height={8} fill={OUTLINE} />
        <rect x={14} y={10} width={4} height={6} fill={c.metal} />
        <rect x={14} y={10} width={4} height={1} fill={c.shine} />
        <rect x={15} y={12} width={2} height={2} fill={light} className="pc-keyhole" />
        <rect x={15.5} y={14} width={1} height={1} fill={light} className="pc-keyhole" />
      </g>
    </svg>
  );
}
