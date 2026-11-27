import type { Tier } from "../tiers";

// Hand-reviewed answer additions, applied on top of the generated/curated banks.
// Names go straight into the tier listed (they do not reshuffle existing answers), and any
// name the question already accepts, under its display name or an alias, is skipped.
// Use "Name|alias|alias" for alternate spellings, as everywhere else in the bank.
type Additions = Partial<Record<Exclude<Tier, "luffillion">, string[]>>;

export const ANSWER_ADDITIONS: Record<string, Additions> = {
  // Mythical Zoan forms whose fruit names were never given (the Five Elders), plus Bunbuku's Bake-danuki.
  "q-mythical-zoan-fruit": {
    epic: [
      "Inu Inu no Mi, Model: Tanuki|Inu Inu no Mi, Model: Bake-danuki|Tanuki|Bake-danuki",
      "Gyuki|Ushi-Oni|Saturn's fruit", "Itsumade|Mars's fruit|Mars' fruit", "Fengxi|Hoki|Warcury's fruit",
      "Bakotsu|Nusjuro's fruit", "Sandworm|Ju Peter's fruit",
    ],
  },
  "q-transform-fruit": {
    epic: ["Gyuki|Ushi-Oni|Saturn's fruit", "Itsumade|Mars's fruit|Mars' fruit", "Fengxi|Hoki|Warcury's fruit", "Bakotsu|Nusjuro's fruit", "Sandworm|Ju Peter's fruit"],
  },
  "q-arc-alabasta": {
    uncommon: ["Mr. 9|Mr 9", "Miss Monday|Ms. Monday", "Mr. 13|Mr 13", "Miss Friday|Ms. Friday", "Miss Catherina|Ms. Catherina"],
    rare: [
      "Mr. 7|Mr 7", "Miss Father's Day|Ms. Father's Day", "Mr. Mellow", "Mr. Love", "Mr. Beans", "Mr. Shimizu",
      "Miss Mother's Day|Ms. Mother's Day", "Miss Tuesday|Ms. Tuesday", "Miss Thursday|Ms. Thursday",
      "Miss Saturday|Ms. Saturday", "Mr. 10|Mr 10", "Mr. 11|Mr 11", "Mr. 12|Mr 12", "Akumai",
    ],
  },
  minks: {
    rare: ["Hitsugisukan", "Keith", "Nyornyo Nyarmani"],
    epic: ["Kingsbird", "Wany"],
  },
  "q-glasses-goggles": {
    common: ["Bartholomew Kuma|Kuma", "Nico Robin|Robin", "Brook|Soul King", "Crocus"],
    uncommon: ["Lucky Roux|Lucky Roo|Roux|Roo", "Baby 5|Baby Five", "Koza|Kohza", "Jabra", "Giolla"],
    rare: [
      "Bobby Funk", "Bakkin", "Wanze", "Mr. 13|Mr 13", "Miss Friday|Ms. Friday", "Asuwa", "Belladonna",
      "Caroline", "Kobato", "Creele", "Hotori", "Kotori", "Lily", "Killer Whale",
    ],
    epic: ["Capote", "Chao", "Girarin", "Kiev", "Leo", "Lulis", "Mashira", "Mozu", "Porche", "York", "Hyougorou|Hyogoro"],
  },
  locations: {
    rare: [
      "Frauce Kingdom", "Nagagutsu Kingdom", "Satsuruzo Kingdom", "Downs", "Rakesh", "Kuen Village", "Deul Kingdom",
      "Whiteland Kingdom", "Soja Island", "Las Camp", "Renaisse", "Nanimonai Island", "Suiren", "Midway Forest",
      "Red Port", "Ballon Terminal", "Goldfish Empire", "Headband Catfish Village", "Underworld of the Sea",
      "Warland Kingdom", "Kaju Town", "Cookie Town", "Chocolat Town", "Perori Town", "Sherbet Town", "Table Town",
      "Punch Town", "Love Town", "Butter Town", "White Town", "Peanuts Town", "Chips Town",
    ],
    epic: [
      "North Pole", "Emerald City", "Great Kingdom", "Land of Ice", "Nakrowa", "Dias", "Micqueot", "Mt. Mauri|Mount Mauri",
      "Rum Wolf", "Bourbon Wolf", "Vodka Wolf", "Sankan Kingdom", "Yano Country", "Euro Peninsula", "Kamigata",
      "Shade Port", "Eigis Kingdom", "Bourgeois Kingdom", "Standing Kingdom", "Aoi Kingdom", "Porco Kingdom",
      "Mt. Kintoki|Mount Kintoki", "Gartel Island", "Bunt Kingdom", "Enishi", "Foot Colony", "Port Chibaralta Island",
      "Jewel Ice Sheet", "Doerena Kingdom", "Majiatsuka Kingdom", "Bestland Kingdom", "South Fire Kingdom",
      "Chaco Kingdom", "Jambalaya Kingdom", "Gingapore Kingdom", "Cameron Kingdom", "Beef Kingdom", "Pepe Kingdom",
    ],
  },
  techniques: {
    rare: [
      "Gomu Gomu no Mat", "Tobu Zangeki", "Yakkodori", "Ashura: Makyusen|Makyusen|Asura Makyusen", "Kamisori",
      "Rankyaku: Sen", "Rankyaku: Renge", "Soru: Tekkai", "Tekkai: Go", "Shigan: Bachi",
    ],
    epic: [
      "Gomu Gomu no Giant Rifle", "Gomu Gomu no Kong Rifle", "Gomu Gomu no Kong Gatling", "Gomu Gomu no Kong Stamp",
      "Gomu Gomu no Gigant Rifle", "Gomu Gomu no Dawn Thor Rifle",
    ],
  },
  "q-emperor-crews": {
    rare: [
      "Beautiful Pirates", "Barto Club", "Happo Navy", "Ideo Pirates", "Tontatta Pirates", "New Giant Warrior Pirates",
      "Yonta Maria Grand Fleet",
      ...Array.from({ length: 16 }, (_, i) => {
        const n = i + 1, ord = `${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"}`;
        return `Whitebeard's ${ord} Division|Whitebeard Pirates ${ord} Division`;
      }),
    ],
    epic: [
      "Whitebeard Pirates' Division Commanders|Whitebeard Division Commanders", "Red Hair Pirates' Senior Officers|Red Hair Senior Officers",
      "Charlotte Three Sweet Generals|Three Sweet Generals",
      ...["First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh"].map((n) => `Straw Hat Grand Fleet's ${n} Ship|Grand Fleet ${n} Ship`),
    ],
  },
};

// Extra spellings for answers that already exist (keyed by the existing display name).
// These widen matching without creating a second, double-scoring entry.
export const ANSWER_ALIASES: Record<string, Record<string, string[]>> = {
  techniques: {
    "Gomu Gomu no Balloon": ["Gomu Gomu no Fusen"],
    "Gomu Gomu no Net": ["Gomu Gomu no Ami"],
    "Ittoryu Iai: Shishi Sonson": ["Shishi: Sonson", "Shishi Sonson"],
    "Yahazu Giri": ["Hanauta Sancho: Yahazu Giri"],
    "Hyaku Hachi Pound Ho": ["Hyakuhachi Pound Ho"],
    "Hiryu: Kaen": ["Hiryuu Kaen", "Hiryuu: Kaen", "Flying Dragon Blaze"],
    "Kyutoryu: Asura": ["Kiki Kyutoryu", "Kiki Kyutoryu: Asura"],
  },
};
