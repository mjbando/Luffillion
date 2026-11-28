"use client";

import { useEffect, useRef } from "react";

export const ADSENSE_CLIENT = "ca-pub-3460671766515899";
/** Display ad unit for the end-of-voyage results screen (AdSense → Ads → By ad unit). */
export const RESULTS_AD_SLOT = "";

declare global {
  interface Window { adsbygoogle?: unknown[] }
}

/**
 * One fixed-height, clearly labelled ad. It keeps its own space so nothing jumps around,
 * and it disappears entirely when Google has no ad to show (e.g. before the site is approved).
 */
export default function AdSlot({ slot, height = 100, className = "" }: { slot: string; height?: number; className?: string }) {
  const ref = useRef<HTMLModElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!slot || !el || el.dataset.adsbygoogleStatus) return;
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch { /* blocked or not loaded: the slot stays hidden */ }
  }, [slot]);
  if (!slot) return null;
  return <div className={`ad-slot ${className}`} aria-label="Advertisement">
    <p className="ad-slot-label">ADVERTISEMENT</p>
    <ins ref={ref} className="adsbygoogle" style={{ display: "block", width: "100%", height }}
      data-ad-client={ADSENSE_CLIENT} data-ad-slot={slot} />
  </div>;
}
