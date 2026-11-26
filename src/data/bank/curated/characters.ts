import type { Question } from "../../questions";
import { C, ranked } from "./names";

// Each list is ordered least niche -> most niche. The last answer is the One in a Luffillion.
export const CURATED_CHARACTERS: Question[] = [
  ranked("q-impel-down", "Name a character who has appeared in Impel Down.", "Prisoners, guards, wardens, or anyone who set foot inside.",
    "Luffy, Ace, Buggy, Crocodile, BonClay, Ivankov, Magellan, Jinbe, Hannyabal, Blackbeard, Mr3, Inazuma, Sadie, Shiryu, Domino, Saldeath, Daz, Hancock, Doflamingo, Shiki, Devon, Wolf, Shot, Burgess, Augur, Laffitte, DocQ, Stronger, Morley, Arlong, Momonga, Minotaurus, Minorhinoceros, Minokoala, Minozebra, Minochihuahua, Bluejam, Cabaji, Mohji, Richie, Bullet, Sphinx, Manticore, Basilisk, Army Wolf, Blugori, Bellett, Candy, Tibany|Elizabeth, Caroline, Roche Tomson, Olive, Jean Ango? ".replace("Jean Ango? ", "") + "Pandaman", C),

  ranked("q-straw-hats", "Name a character who has been part of the Straw Hat Pirates.", "Official crew, plus honorary members and allies who sailed with them.",
    "Luffy, Zoro, Nami, Usopp, Sanji, Chopper, Robin, Franky, Brook, Jinbe, Vivi, Karoo, Yamato, Momonosuke, Kinemon, Carrot, Pedro, Zeus, GoingMerry, ThousandSunny, Laboon", C),

  ranked("q-worst-generation", "Name a member of the Worst Generation.", "The Supernovas at Sabaody, plus Blackbeard.",
    "Luffy, Law, Kid, Zoro, Killer, Bonney, Blackbeard, Hawkins, Drake, Bege, Apoo, Urouge", C),

  ranked("q-has-bounty", "Name a character who has a bounty.", "Any character who has had a bounty placed on them, past or present.",
    "Luffy, Zoro, Nami, Usopp, Sanji, Chopper, Robin, Franky, Brook, Jinbe, Shanks, Blackbeard, Kaido, BigMom, Whitebeard, Roger, Ace, Sabo, Dragon, Law, Kid, Mihawk, Crocodile, Buggy, Doflamingo, Hancock, Kuma, Moria, Marco, Katakuri, Arlong, Kuro, Krieg, Alvida, Bonney, Killer, Hawkins, Drake, Bege, Apoo, Urouge, Weevil, Cavendish, Bartolomeo, Bellamy, Foxy, King, Queen, Jack, Smoothie, Cracker, Perospero, Oven, Daifuku, Snack, Pekoms, Tamago, Shiryu, Burgess, Augur, Laffitte, DocQ, Devon, Wolf, Shot, Pizarro, Ivankov, Koala, Hack, BeloBetty, Morley, Lindbergh, Karasu, Yamato, Ulti, PageOne, WhosWho, BlackMaria, Sasaki, Ideo, Leo, Sai, Chinjao, Orlumbus, Hajrudin, Abdullah, Jeet, BlueGilly, Elizabello, Suleiman, Dorry, Brogy, Oimo, Kashii, Loki, Gin, Chew, Kuroobi, Hatchan, Jango, Higuma, Mohji, Cabaji, Sarquiss, Masira, Shoujou, Porche, Hamburg, FisherTiger, Hody, Decken, Caribou, Coribou, Caesar, Pedro, Inuarashi, Nekomamushi, Rayleigh, Shakky, Xebec, Shiki, Bullet, Tesoro, Uta, Stussy, Squard, WhiteyBay, Brownbeard, Macro, Roshio, Gyro, Albion, Bluejam, Vito, Gotti, Mr3, BonClay, Daz, Mr4, Mr5, Valentine, Doublefinger, Goldenweek, MerryXmas, Gaimon, Bakkin", C),

  ranked("q-warlords", "Name a member of the Seven Warlords of the Sea.", "Anyone who held a Warlord seat before the system was abolished.",
    "Mihawk, Hancock, Doflamingo, Crocodile, Kuma, Moria, Law, Jinbe, Blackbeard, Buggy, Weevil, Hanafuda", C),

  ranked("q-marines", "Name a character who has been a Marine.", "Current or former Marines of any rank.",
    "Garp, Akainu, Aokiji, Kizaru, Koby, Smoker, Fujitora, Ryokugyu, Sengoku, Tashigi, Helmeppo, Tsuru, Kong, Zephyr, Momonga, Sentomaru, Hina, Corazon, Vergo, Drake, Saul, Bogard, Grus, Kujaku, Hibari, Gion, Tokikake, Doll, Bluegrass, Onigumo, Strawberry, Doberman, Yamakaji, Bastille, Dalmatian, Comil, Lacroix, Ronse, TBone, Fullbody, Morgan, Nezumi, Jango, Brannew, Attach, VeryGood, Bellmere, Dragon, JohnGiant, Stainless, Maynard, Shu, Sharinguru, Mozambia, Cancer, Kadar, Rokkaku, Ripper, PuddingPudding, RedKing, Guillotine, Pomsky, Tosa, Urban, Hound, Ain, Binz, Komei, Grount, Ukki, Lines, Jonathan", C),

  ranked("q-blackbeard-pirates", "Name a member of the Blackbeard Pirates.", "Blackbeard, the Ten Titanic Captains, and crew.",
    "Blackbeard, Burgess, Laffitte, Augur, DocQ, Shiryu, Aokiji, Devon, Wolf, Shot, Pizarro, Stronger", C),

  ranked("q-red-hair-pirates", "Name a member of the Red Hair Pirates.", "Shanks and his crew, past or present.",
    "Shanks, Beckman, Roux, Yasopp, Uta, Rockstar, Limejuice, BonkPunch, Monster, BuildingSnake, Hongo, HowlingGab", C),

  ranked("q-whitebeard-pirates", "Name a member of the Whitebeard Pirates.", "Whitebeard, his division commanders, crew, and allied captains.",
    "Whitebeard, Marco, Ace, Jozu, Vista, Thatch, Izou, Blackbeard, Oden, Toki, Inuarashi, Nekomamushi, Blamenco, Rakuyo, Namur, Blenheim, Curiel, Kingdew, Haruta, Atmos, SpeedJiru, Fossa, Squard, WhiteyBay, LittleOarsJr, Doma, McGuy, Decalvan Brothers, Elmy, A.O, Delacuaji, Ramba, Andre, Karma, Islewan, Pavlik, Nosgarl, Agsilly, Brew, Choi, Arthur, Palms, Bizarre, Blondie, Amadob, Hangan, Ninth, Reforte, Epoida, Stefan, Zodia", C),

  ranked("q-fought-luffy", "Name a character who has fought Luffy.", "Anyone who has traded blows with Luffy on screen.",
    "Kaido, Katakuri, Doflamingo, Crocodile, Enel, Lucci, Arlong, Moria, BigMom, Buggy, Kuro, Krieg, Alvida, Morgan, Wapol, Mr3, Smoker, Akainu, Kizaru, Aokiji, Fujitora, Ryokugyu, Hody, Blackbeard, Magellan, Bellamy, Caesar, Cracker, Foxy, Oars, Absalom, Garp, Koby, Zoro, Usopp, Sanji, Franky, Jinbe, Yamato, Saturn, Mars, Warcury, Nusjuro, JuPeter, Lilith, SSnake|S-Snake, SHawk|S-Hawk, SBear|S-Bear, Ulti, PageOne, WhosWho, Hawkins, Kid, Apoo, Shiki, Tesoro, Bullet, Zephyr, Uta, BonClay, Burgess, Sabo, Perospero, Wadatsumi, Hannyabal, Decken, Vergo, Diamante, Blueno, Satori, Gedatsu, Ohm, Shura, Wyper, GanFall, Laboon, Mohji, Cabaji, Jango, Mr5, Valentine, Sugar, Chew, Kuroobi, Momoo, Chinjao, Hajrudin, Ideo, Sai, Pekoms, Tamago, Oven, Daifuku, Galette, Amande, MontdOr, Brulee, Holdem, Urashima, Babanuki, Queen, Jack, Higuma, Porchemy, Minotaurus, Pandaman", C),

  ranked("q-fought-zoro", "Name a character who has fought Zoro.", "Anyone Zoro has crossed swords (or blows) with on screen.",
    "Mihawk, King, Kaku, Pica, Daz, Hody, Ryuma, Kuma, Oars, Kuro, Cabaji, Jango, Mr5, Hatchan, Ohm, Shura, Mr3, Smoker, Tashigi, Kizaru, Lucci, Fujitora, Kinemon, Sanji, Luffy, Kaido, BigMom, Killer, Hawkins, Apoo, SHawk|S-Hawk, Nusjuro, Mars, Absalom, Kumadori, MissMonday, Mr9, Valentine, Mr7, Chaka, Kuina, Chew, Gin, Morgan, Helmeppo, Kalifa, Yamato, WhosWho, Jack, Hyogoro, Ushimaru, Monet, Onimaru, Daifugo, Babanuki, Hyouzou, Fujitora, Enel, Braham, Yama, Satori, Carrot, Wanda, Denjiro, Kanjuro, Kiku, Prometheus, Hera, Picca|Pica, Gladius, Diamante, T-Bone|TBone, Hamburger|Hamburg, Pickles, BigPan, Sarquiss, Bellamy, Buchi, Sham, Nezumi, Boodle", C),

  ranked("q-female", "Name a female character in One Piece.", "Any named female character.",
    "Nami, Robin, Hancock, Vivi, Yamato, BigMom, Perona, Tashigi, Uta, Shirahoshi, Bonney, Carrot, Rebecca, Koala, Hina, Pudding, Makino, Kaya, Kuina, Bellmere, Nojiko, Kureha, Alvida, Kalifa, Monet, Viola, Sugar, Baby5, Hiyori, Kiku, Tama, Toko, Tsurujo, Otohime, Camie, Conis, Smoothie, Brulee, Lola, Chiffon, Amande, Galette, Praline, Flampe, Compote, Custard, Anana, Citron, Cinnamon, Mozart, Marnier, Poire, Effilee, Myukuru, Joscarpone, Normande, Nutmeg, Akimeg, Allmeg, Harumeg, Fuyumeg, Tsuru, Shakky, Toki, Shinobu, Ulti, BlackMaria, Speed, BaoHuang, Solitaire, Mizerka, Sarahebi, Kunyun, Higurashi, Osome|Some, Valentine, Doublefinger, Goldenweek, MerryXmas, MissMonday, MissFathersDay, MissFriday, MissMother'sDay|Miss Mother's Day, Porche, BeloBetty, Ginny, Moda, Ahiru, Rouge, Olvia, Kujaku, Hibari, Doll, Bluegrass, Gion, Lilith, York, Atlas, Stussy, Bakkin, SSnake|S-Snake, Alpha, Mansherry, Wicca, Bian, Flapper, Scarlet, Titi, Terracotta, Kokoro, Chimney, Mozu, Kiwi, Aisa, Laki, Amazon, Rindo, Ran, Marguerite, SweetPea, Aphelandra, Kikyo, Belladonna, Gloriosa, Sandersonia, Marigold, Shalria, Reiju, Sora, Shyarly, Ishilly, Kairen, Seira, Meroie, Hiramera, Mero, Octopako, Cindry, Wanda, Milky, Tristan, Gerd, Ripley, Ida, Connie, Carmel, Gunko, Banchina, Rika, Ririka, Chocolat, Cocoa, Carina, Baccarat, Ann, Apis, Jessica, Ain, MissCatherina|Miss Catherina", C),
];
