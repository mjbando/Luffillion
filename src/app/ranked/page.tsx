import type { Metadata } from "next";
import Ranked from "@/components/ranked/Ranked";
import "./ranked.css";

export const metadata: Metadata = {
  title: "Online Ranked Battle · Luffillion",
  description: "Challenge online One Piece fans to 10-second niche knowledge duels, climb from Bronze to Legend, and build win streaks.",
};

export default function RankedPage() {
  return <Ranked />;
}
