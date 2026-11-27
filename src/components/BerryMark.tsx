import "./treasure.css";

/** Pixel-font berry sign (฿) used wherever the chest currency is shown. */
export default function BerryMark({ size = 16, className = "" }: { size?: number; className?: string }) {
  return <span aria-hidden="true" className={`berry-mark ${className}`} style={{ fontSize: size * 1.25, lineHeight: 1 }}>฿</span>;
}
