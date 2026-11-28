import type { Question } from "../../questions";
import { C, D, ranked } from "./names";

// Hand-written questions for the Season 1 Daily Voyage days that repeated a Nov 23–25 question
// (Dec 8, 10, 11, 15 and 23). Answers are listed most-to-least well known: the last one is the Luffillion.
export const CURATED_SEASON_SWAPS: Question[] = [
  ranked("q-smokers", "Name a character who smokes.", "Cigarettes, cigars, or a pipe: seen smoking on screen.",
    "Sanji, Smoker, Crocodile, Beckman, Corazon, Hina, Shakky, Paulie, Bege, Shyarly, DaddyMasterson, Hyogoro", C),

  ranked("q-enslaved", "Name a character who has been enslaved.", "Owned by the Celestial Dragons or sold as a slave at some point.",
    "Hancock, Kuma, Koala, FisherTiger, Sandersonia, Marigold, JeanBart, Ginny, Clapp", C),

  {
    id: "q-arc-little-garden",
    prompt: "Name a character who appears in the Little Garden Arc.",
    hint: "The prehistoric island of the giants Dorry and Brogy, and Mr. 3's wax trap.",
    matchAs: C,
    tiers: {
      common: [D.Luffy, D.Zoro, D.Nami, D.Usopp, D.Sanji],
      uncommon: [D.Vivi, D.Dorry, D.Brogy, D.Mr3],
      rare: [D.Karoo, D.Mr5, D.Valentine, D.Goldenweek],
      epic: [D.Crocodile, D.Mr13],
      luffillion: [D.MissFriday],
    },
  },

  ranked("q-smile-users", "Name a character who has eaten a SMILE or another artificial Devil Fruit.", "Kaido's Gifters and Pleasures, or Vegapunk's artificial fruits.",
    "Momonosuke, Killer, Holdem, Speed, Sheepshead, Dobon, Gazelleman, Batman, Mouseman, Alpacaman, Babanuki, Madilloman", C),

  ranked("q-bounty-hunters", "Name a character who has worked as a bounty hunter.", "Hunting pirates for the reward, including Baroque Works' cover at Whisky Peak.",
    "Zoro, Johnny, Yosaku, Vivi, Mr9, MissMonday, Igaram, DaddyMasterson", C),
];
