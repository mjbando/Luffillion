import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@fontsource/vt323/400.css";
import "@fontsource/pixelify-sans/500.css";
import "@fontsource/pixelify-sans/700.css";
import "./globals.css";
import SitePresence from "@/components/SitePresence";
import UpdateAnnouncement from "@/components/UpdateAnnouncement";

export const metadata: Metadata = {
  title: "Luffillion: One Piece Trivia",
  description: "Seven random One Piece questions per run. The nichest answers score the most, and Luffy runs the whole series.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Google AdSense. Ad formats and placement are set in the AdSense dashboard (Ads → By site). */}
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3460671766515899" crossOrigin="anonymous"></script>
      </head>
      <body className="bg-[#05070f] font-pixel text-slate-100 antialiased">{children}<SitePresence /><UpdateAnnouncement /></body>
    </html>
  );
}
