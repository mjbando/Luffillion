const OUTLINE = "#1a0f08", METAL = "#8e98a8", SHINE = "#e2e8f0", CONE = "#edc05e", CONE_DARK = "#b8862e", WAVE = "#67e8f9", MUTE = "#ff4f7b";

/** A crisp 16×14 pixel-art speaker. When sound is on, three waves pulse outward; muted shows a red ✕. */
export default function PixelSpeaker({ muted, size = 24, className = "" }: { muted: boolean; size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 16 14" width={size} height={(size * 14) / 16} shapeRendering="crispEdges" aria-hidden="true" className={`pixel-speaker ${className}`}>
      {/* Magnet housing */}
      <rect x={0} y={4} width={5} height={6} fill={OUTLINE} />
      <rect x={1} y={5} width={3} height={4} fill={METAL} />
      <rect x={1} y={5} width={3} height={1} fill={SHINE} />
      {/* Cone */}
      <rect x={5} y={2} width={2} height={10} fill={OUTLINE} />
      <rect x={7} y={0} width={2} height={14} fill={OUTLINE} />
      <rect x={5} y={4} width={1} height={6} fill={CONE_DARK} />
      <rect x={6} y={3} width={1} height={8} fill={CONE} />
      <rect x={7} y={1} width={1} height={12} fill={CONE} />
      <rect x={6} y={3} width={2} height={2} fill="#fff1b8" />
      {muted ? (
        <g className="ps-mute">
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i}>
              <rect x={10 + i} y={4 + i} width={1} height={1} fill={MUTE} />
              <rect x={14 - i} y={4 + i} width={1} height={1} fill={MUTE} />
            </g>
          ))}
          <rect x={10} y={5} width={1} height={1} fill={MUTE} opacity={0.55} />
          <rect x={14} y={5} width={1} height={1} fill={MUTE} opacity={0.55} />
        </g>
      ) : (
        <g>
          <g className="ps-wave ps-wave-1"><rect x={10} y={5} width={1} height={4} fill={WAVE} /></g>
          <g className="ps-wave ps-wave-2">
            <rect x={12} y={3} width={1} height={2} fill={WAVE} /><rect x={13} y={5} width={1} height={4} fill={WAVE} /><rect x={12} y={9} width={1} height={2} fill={WAVE} />
          </g>
          <g className="ps-wave ps-wave-3">
            <rect x={14} y={1} width={1} height={2} fill={WAVE} /><rect x={15} y={3} width={1} height={8} fill={WAVE} /><rect x={14} y={11} width={1} height={2} fill={WAVE} />
          </g>
        </g>
      )}
    </svg>
  );
}
