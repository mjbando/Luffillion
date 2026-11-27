import type { Metadata } from "next";
import Ranked from "@/components/ranked/Ranked";
import RankedComingSoon from "@/components/ranked/RankedComingSoon";
import { UPDATE_LIVE } from "@/lib/release";
import "./ranked.css";

export const metadata: Metadata = {
  title: "Online Ranked Battle · Luffillion",
  description: "Queue for ranked One Piece trivia matchmaking or invite a friend to a no-rank-penalty battle.",
};

export default function RankedPage() {
  return UPDATE_LIVE ? <Ranked /> : <RankedComingSoon />;
}
