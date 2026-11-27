"use client";

import { useEffect } from "react";
import { UPDATE_LIVE } from "@/lib/release";

/** Pings /api/presence every 30 s while the tab is visible, so the online counter includes this visitor. */
export default function SitePresence() {
  useEffect(() => {
    if (!UPDATE_LIVE) return;
    const ping = () => {
      if (document.visibilityState !== "visible") return;
      void fetch("/api/presence", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}", credentials: "same-origin", keepalive: true }).catch(() => {});
    };
    ping();
    const id = window.setInterval(ping, 30_000);
    document.addEventListener("visibilitychange", ping);
    return () => { window.clearInterval(id); document.removeEventListener("visibilitychange", ping); };
  }, []);
  return null;
}
