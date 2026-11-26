import type { Metadata } from "next";
import Ranked from "@/components/ranked/Ranked";
import "./ranked.css";

export const metadata: Metadata = {
  title: "Online Ranked Battle · Luffillion",
  description: "Queue for ranked One Piece trivia matchmaking or invite a friend to a no-rank-penalty battle.",
};

export default function RankedPage() {
  return <Ranked />;
}
