import type { Question } from "../../questions";
import { C, ranked } from "./names";

// 22 arc-specific cast questions, each exhaustively listing characters who appear in that arc.
export const CURATED_SAGA_CASTS: Question[] = [
  ranked("q-arc-romance-dawn", "Name a character who appears in the Romance Dawn Arc.", "Foosha Village, Alvida's ship, and Shells Town.",
    "Luffy, Zoro, Shanks, Koby, Helmeppo, Morgan, Alvida, Beckman, Roux, Yasopp, Makino, Higuma, WoopSlap, Rika, Ririka, Kuina, Koushirou, Ripper, Ukki, Lines", C),

  ranked("q-arc-orange-town", "Name a character who appears in the Orange Town or Syrup Village Arc.", "Buggy's town or Usopp's village.",
    "Luffy, Zoro, Nami, Usopp, Buggy, Mohji, Cabaji, Richie, Boodle, Chouchou, Kuro, Jango, Kaya, Merry, Sham, Buchi, Ninjin, Piiman, Tamanegi, Gaimon, Hocker", C),

  ranked("q-arc-baratie", "Name a character who appears in the Baratie Arc.", "At the floating restaurant Baratie.",
    "Luffy, Zoro, Nami, Usopp, Sanji, Zeff, Mihawk, Krieg, Gin, Pearl, Fullbody, Patty, Carne, Johnny, Yosaku, Moodie", C),

  ranked("q-arc-arlong-park", "Name a character who appears in the Arlong Park Arc.", "Cocoyasi Village, Arlong Park, and Nami's flashback.",
    "Luffy, Zoro, Nami, Usopp, Sanji, Arlong, Hatchan, Kuroobi, Chew, Momoo, Bellmere, Nojiko, Genzo, Nezumi, Nako, Johnny, Yosaku, Chabo, PuddingPudding, Jinbe, FisherTiger", C),

  ranked("q-arc-loguetown", "Name a character who appears in the Loguetown Arc.", "The Town of the Beginning and the End.",
    "Luffy, Zoro, Nami, Usopp, Sanji, Smoker, Tashigi, Buggy, Alvida, Mohji, Cabaji, Richie, Dragon, Roger, Ipponmatsu, DaddyMasterson, Bartolomeo, Boodle, Makino, WoopSlap, Mihawk, Shanks", C),

  ranked("q-arc-drum-island", "Name a character who appears in the Drum Island Arc.", "Drum Kingdom and Chopper's flashback.",
    "Luffy, Zoro, Nami, Usopp, Sanji, Vivi, Karoo, Chopper, Kureha, Hiriluk, Wapol, Dalton, Chess, Kuromarimo, Chessmarimo, Isshi20, Robson, Negikuma Maria, Ace, Blackbeard", C),

  ranked("q-arc-alabasta", "Name a character who appears in the Alabasta Arc.", "Anyone seen in the desert kingdom during the Alabasta Arc.",
    "Luffy, Zoro, Nami, Usopp, Sanji, Chopper, Vivi, Karoo, Crocodile, Robin, Ace, Smoker, Tashigi, Cobra, Pell, Chaka, Igaram, Koza, Toto, Terracotta, Daz, Doublefinger, BonClay, Mr3, Goldenweek, Mr4, MerryXmas, Lassoo, Mr5, Valentine, Hina, Jango, Fullbody, Matsuge, Titi, Kappa, Banchi, Scissors, Bourbon Jr., Hyota, Brahm, Arrow, Barrel, Erik, Kebi, Okame, Farafra, Stomp, IvanX|Ivan X, Cowboy, Kentauros, Hikoichi", C),

  ranked("q-arc-jaya", "Name a character who appears in the Jaya Arc.", "Mock Town and Mont Blanc Cricket's home.",
    "Luffy, Zoro, Nami, Usopp, Sanji, Chopper, Robin, Blackbeard, Bellamy, Sarquiss, Cricket, Masira, Shoujou, Burgess, Augur, Laffitte, DocQ, Stronger, Whitebeard, Marco, Jozu, Shanks, Rockstar, Doflamingo, Kuma, Sengoku, Tsuru, Mihawk, Lafitte|Laffitte, Roshio, MontBlancNoland|Noland, Kalgara", C),

  ranked("q-arc-skypiea", "Name a character who appears in the Skypiea Arc.", "Angel Island, Upper Yard, Shandora, and the Noland flashback.",
    "Luffy, Zoro, Nami, Usopp, Sanji, Chopper, Robin, Enel, Conis, Pagaya, Su, GanFall, Pierre, Wyper, Aisa, Laki, Kamakiri, Braham, Genbo, Ohm, Satori, Gedatsu, Shura, Yama, McKinley, Nola, Holy, Hotori, Kotori, Fuza, Amazon, Noland, Kalgara, Mousse, Herb, Seto, Kashigami, Roger, Rayleigh, Gaban", C),

  ranked("q-arc-water7", "Name a character who appears in the Water 7 Arc.", "Water 7 and the sea train.",
    "Luffy, Zoro, Nami, Usopp, Sanji, Chopper, Robin, Franky, Iceburg, Paulie, Kokoro, Chimney, Gonbe, Lucci, Kaku, Blueno, Kalifa, Hattori, Tom, Zambai, Mozu, Kiwi, Tilestone, PeepleyLulu, Yokozuna, Sodom, Gomorrah, Aokiji, T-Bone|TBone, Wanze, Nero, Jerry, Corgi, Mikazuki, Tyrannosaurus, Michael, Hoichael", C),

  ranked("q-arc-enies-lobby", "Name a character who appears in the Enies Lobby Arc.", "Judicial Island, the Tower of Law, and the Buster Call.",
    "Luffy, Zoro, Nami, Usopp, Sanji, Chopper, Robin, Franky, Lucci, Kaku, Jabra, Blueno, Kalifa, Kumadori, Fukurou, Spandam, Hattori, Kokoro, Chimney, Gonbe, Iceburg, Paulie, Zambai, Mozu, Kiwi, Tilestone, PeepleyLulu, Yokozuna, Sodom, Gomorrah, Saul, Olvia, Clover, Oimo, Kashii, Baskerville, Kerville, Bas, Onigumo, Doberman, Strawberry, Yamakaji, Momonga, Shu, VeryGood, Sharinguru, Spandine, Aokiji, Garp, Koby, Helmeppo, GoingMerry", C),

  ranked("q-arc-thriller-bark", "Name a character who appears in the Thriller Bark Arc.", "Florian Triangle, Moria's ship-island, and Brook's flashback.",
    "Luffy, Zoro, Nami, Usopp, Sanji, Chopper, Robin, Franky, Brook, Moria, Perona, Hogback, Absalom, Oars, Ryuma, Kuma, Cindry, Kumashi, Jigoro, Inuppe, Tararan, Lola, Laboon, Yorki, Spoil, Hildon, Gyoro, Nin, Bao, Buhichuck, Hippo Gentleman, Cerberus, Unigaro, MocDonald, Captain John, Risky Brothers", C),

  ranked("q-arc-sabaody", "Name a character who appears in the Sabaody Archipelago Arc.", "The eleven Supernovas, Celestial Dragons, and Kizaru's raid.",
    "Luffy, Zoro, Nami, Usopp, Sanji, Chopper, Robin, Franky, Brook, Rayleigh, Shakky, Camie, Hatchan, Pappag, Law, Kid, Killer, Hawkins, Drake, Apoo, Bege, Bonney, Urouge, Bepo, Penguin, Shachi, JeanBart, Heat, Wire, Kizaru, Sentomaru, Kuma, Charlos, Rosward, Shalria, Duval, Disco, Peterman, Devil Dias, Faust", C),

  ranked("q-arc-amazon-lily", "Name a character who appears in the Amazon Lily Arc.", "The island of women in the Calm Belt.",
    "Luffy, Hancock, Sandersonia, Marigold, Gloriosa, Marguerite, SweetPea, Aphelandra, Kikyo, Belladonna, Ran, Rindo, Salome, Momonga, Enishida, Nerine, Cosmos, Blue Fan, Daisy, Ace, Jinbe, Garp, Rayleigh, Shakky, FisherTiger", C),

  ranked("q-arc-marineford", "Name a character who appears in the Marineford Arc.", "The Summit War at Marine Headquarters.",
    "Luffy, Ace, Whitebeard, Shanks, Blackbeard, Akainu, Aokiji, Kizaru, Sengoku, Garp, Marco, Jozu, Vista, Izou, Jinbe, Crocodile, Mihawk, Doflamingo, Hancock, Kuma, Moria, Buggy, Ivankov, Inazuma, Mr3, Daz, Koby, Helmeppo, Smoker, Tashigi, Hina, Tsuru, Momonga, Onigumo, Doberman, Strawberry, Yamakaji, Bastille, Dalmatian, JohnGiant, Lacroix, Ronse, Sentomaru, Law, Bepo, Beckman, Roux, Yasopp, Limejuice, BonkPunch, Monster, BuildingSnake, Hongo, HowlingGab, Burgess, Shiryu, Augur, Laffitte, DocQ, Devon, Wolf, Shot, Pizarro, Squard, LittleOarsJr, WhiteyBay, Blamenco, Rakuyo, Namur, Blenheim, Curiel, Kingdew, Haruta, Atmos, SpeedJiru, Fossa, Doma, McGuy, Decalvan Brothers, Elmy, A.O, Delacuaji, Ramba, Andre, Karma, Epoida, Kong, Roger", C),

  ranked("q-arc-fishman", "Name a character who appears in the Fish-Man Island Arc.", "Ryugu Kingdom, the Sea Forest, and Fisher Tiger's flashback.",
    "Luffy, Zoro, Nami, Usopp, Sanji, Chopper, Robin, Franky, Brook, Jinbe, Shirahoshi, Neptune, Otohime, Fukaboshi, Ryuboshi, Manboshi, Hody, Decken, Shyarly, Camie, Hatchan, Pappag, FisherTiger, Arlong, Kuroobi, Chew, Aladdin, Wadatsumi, Den, Surume, Pekoms, Tamago, Caribou, Coribou, Dosun, Zeo, Daruma, Ikaros, Hyouzou, Hammond, Macro, Gyaro, Tansui, Ishilly, Hiramera, Seira, Meroie, Kairen, Minister of the Left, Minister of the Right, Koala, Strawberry, Kizaru, BigMom, Bobbin, Amande, Roger, Rayleigh, Whitebeard", C),

  ranked("q-arc-punk-hazard", "Name a character who appears in the Punk Hazard Arc.", "The half-fire, half-ice island and its underground lab.",
    "Luffy, Zoro, Nami, Usopp, Sanji, Chopper, Robin, Franky, Brook, Law, Kinemon, Momonosuke, Caesar, Vergo, Monet, Smoker, Tashigi, Smiley, Mocha, Brownbeard, Rock, Scotch, Buffalo, Baby5, Doflamingo, Aokiji, Kid, Killer, Hawkins, Apoo, Tamago, Pekoms, Vegapunk, Sind, Chadros Higelyges|Brownbeard, Dragon Number Thirteen, Fen Boc, Run", C),

  ranked("q-arc-dressrosa", "Name a character who appears in the Dressrosa Arc.", "The kingdom of toys, colosseum fighters, and Doflamingo's family.",
    "Luffy, Zoro, Nami, Usopp, Sanji, Chopper, Robin, Franky, Brook, Law, Sabo, Fujitora, Doflamingo, Rebecca, Kyros, Viola, Riku, Scarlet, Sugar, Diamante, Pica, Trebol, Senor, LaoG, Machvise, Dellinger, Baby5, Buffalo, Gladius, Jora, Corazon, Bellamy, Bartolomeo, Cavendish, Sai, Chinjao, Boo, Ideo, BlueGilly, Abdullah, Jeet, Orlumbus, Hajrudin, Elizabello, Dagama, Suleiman, Leo, Mansherry, Kabu, Bian, Wicca, Gancho, Rampo, Flapper, KellyFunk, BobbyFunk, Ucy, Gatz, Burgess, Kaido, Sengoku, Tsuru, Bastille, Maynard, Koala, Hack, Kinemon, Kanjuro, Momonosuke, Tank Lepanto, Rolling Logan, Meadows, Jean Ango, Ricky, Acilia, Damask, Mummy, Spartan, Kyuin, BigMom, Tamago, Pekoms", C),

  ranked("q-arc-zou", "Name a character who appears in the Zou Arc.", "Atop Zunesha with the Mink Tribe.",
    "Luffy, Zoro, Nami, Usopp, Sanji, Chopper, Robin, Franky, Brook, Law, Kinemon, Momonosuke, Kanjuro, Raizo, Carrot, Pedro, Wanda, Inuarashi, Nekomamushi, Shishilian, Concelot, Giovanni, Roddy, BlackBack, Bariete, Miyagi, Tristan, Milky, Bepo, Penguin, Shachi, JeanBart, Jack, Sheepshead, Ginrummy, Zunesha, Vito, Gotti, Bege, Pekoms, Tamago, Caesar", C),

  ranked("q-arc-wci", "Name a character who appears in the Whole Cake Island Arc.", "Totto Land, Big Mom's tea party, and Germa 66.",
    "Luffy, Nami, Chopper, Brook, Sanji, Jinbe, Carrot, Pedro, BigMom, Katakuri, Pudding, Cracker, Smoothie, Perospero, Brulee, Oven, Daifuku, Amande, MontdOr, Galette, Opera, Flampe, Praline, Compote, Snack, Moscato, Counter, Cadenza, Cabaletta, Raisin, Yuen, Brownie, Joconde, Custard, Angel, Citron, Cinnamon, Mascarpone, Joscarpone, Bavarois, Noisette, Nusstorte, Basskarte, Dosmarche, Kato, Poire, Effilee, Myukuru, Anana, Dolce, Dragee, Mozart, Marnier, Lola, Chiffon, Bege, Vito, Gotti, Pez, Judge, Reiju, Ichiji, Niji, Yonji, Sora, Pekoms, Tamago, Streusen, Pound, Carmel, Bobbin, Randolph, Kingbaum, Zeus, Prometheus, Napoleon, Morgans, Du Feld, Drug Peclo, Giberson, Umit, Stussy, Aladdin, Wadatsumi, Caesar, Diesel, Nitro, Rabiyan, Noble Croc", C),

  ranked("q-arc-egghead", "Name a character who appears in the Egghead Arc.", "Future Island Egghead and the worldwide broadcast.",
    "Luffy, Zoro, Nami, Usopp, Sanji, Chopper, Robin, Franky, Brook, Jinbe, Vegapunk, Shaka, Lilith, Edison, Pythagoras, Atlas, York, Bonney, Kuma, Ginny, Sentomaru, Kizaru, Saturn, Mars, Warcury, Nusjuro, JuPeter, Garling, Lucci, Kaku, Stussy, Doll, Bluegrass, RedKing, Guillotine, Pomsky, Tosa, Urban, Hound, SSnake, SHawk, SBear, SShark, Dorry, Brogy, Oimo, Kashii, Emet, Shanks, Beckman, Roux, Yasopp, Kid, Killer, Law, Bepo, Blackbeard, Kuzan|Aokiji, Burgess, Augur, Devon, Shiryu, Pizarro, Wolf, Shot, DocQ, Coby|Koby, Garp, Grus, Kujaku, Hibari, Helmeppo, Sabo, Dragon, Ivankov, Vivi, Morgans, Wapol, Cobra, Imu, Rayleigh, Shakky, Crocus, Clapp, Bekori, Alpha, Connie", C),

  ranked("q-arc-elbaph", "Name a character who appears in the Elbaph Arc.", "The Land of Giants and the Holy Knights.",
    "Luffy, Zoro, Nami, Usopp, Sanji, Chopper, Robin, Franky, Brook, Jinbe, Dorry, Brogy, Hajrudin, Gerd, Goldberg, Road, Stansen, Loki, Jarul, Jorul, Harald, Ripley, Colon, Ida, Saul, Lilith, Bonney, Shamrock, Killingham, Sommers, Gunko, Shanks, Gaban, Oimo, Kashii", C),
];
