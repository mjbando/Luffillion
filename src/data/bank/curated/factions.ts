import type { Question } from "../../questions";
import { C, ranked } from "./names";

// 24 distinct faction, crew, Marine rank, and group questions.
export const CURATED_FACTIONS: Question[] = [
  ranked("q-straw-hat-fleet", "Name a captain or member of the Straw Hat Grand Fleet.", "The 7 allied divisions formed after Dressrosa.",
    "Bartolomeo, Cavendish, Sai, Chinjao, Leo, Hajrudin, Ideo, Orlumbus, Gambia, Suleiman, Boo, Baby5, Gerd, Goldberg, Road, Stansen, Kabu, Bian, Wicca, Rampo, Flapper, Columbus, BlueGilly, Abdullah, Jeet, Farul", C),

  ranked("q-roger-pirates", "Name a member of the Roger Pirates.", "Gold Roger's crew and passengers.",
    "Roger, Rayleigh, Shanks, Buggy, Oden, Gaban, Crocus, Toki, Inuarashi, Nekomamushi, Bullet, Sunbell, Nozdon, Taro, Doringo, Millet Pine, Spencer, Petermoo, Jacksonbanner, Blumarine, Max Marks, Moon Isaac Jr., Momonora", C),

  ranked("q-rocks-pirates", "Name a member of the Rocks Pirates.", "Rocks D. Xebec's legendary crew.",
    "Xebec, Whitebeard, BigMom, Kaido, Shiki, Bakkin, Captain John, Ochoku, Silver Axe|Kyo, Ganzui, Gloriosa, Gill Bastar", C),

  ranked("q-cross-guild", "Name a member of Cross Guild.", "Buggy, Crocodile, Mihawk, and their organization.",
    "Buggy, Crocodile, Mihawk, Daz, Alvida, Mr3, Mohji, Cabaji, Richie, Sarquiss", C),

  ranked("q-heart-kid-pirates", "Name a member of the Heart Pirates or Kid Pirates.", "Trafalgar Law's or Eustass Kid's crews.",
    "Law, Kid, Killer, Bepo, Shachi, Penguin, JeanBart, Heat, Wire, Ikkaku, Uni, Clione, Hakugan, Gig, Dive, Bubblegum, Faust", C),

  ranked("q-big-mom-pirates", "Name a member of the Big Mom Pirates.", "Big Mom, her children, Homies, and allied crew.",
    "BigMom, Katakuri, Cracker, Smoothie, Perospero, Pudding, Brulee, Oven, Daifuku, Pekoms, Tamago, Streusen, Zeus, Prometheus, Napoleon, Amande, MontdOr, Galette, Opera, Flampe, Praline, Compote, Snack, Moscato, Bobbin, Randolph, Kingbaum, Diesel, Nitro, Rabiyan, Noble Croc, Bege, Jinbe, Aladdin, Lola, Chiffon, Caesar", C),

  ranked("q-sun-arlong-pirates", "Name a member of the Sun Pirates or Arlong Pirates.", "Fisher Tiger, Jinbe, or Arlong's fish-man crews.",
    "Jinbe, FisherTiger, Arlong, Hatchan, Kuroobi, Chew, Aladdin, Praline, Wadatsumi, Koala, Momoo, Macro, Gyaro, Tansui, Pisaro, Take, Shioyaki, Kaneshiro, Den", C),

  ranked("q-foxy-buggy-pirates", "Name a member of the Foxy Pirates or Buggy Pirates.", "Silver Fox Foxy's crew or Buggy's original crew.",
    "Buggy, Foxy, Alvida, Mohji, Cabaji, Richie, Porche, Hamburg, Pickles, BigPan, Capote, Monda, Itomimizu, Galdino|Mr3, Daz, Chiqicheetah, Gina, Sonie", C),

  ranked("q-galley-franky", "Name a member of Galley-La Company or the Franky Family.", "Water 7 shipwrights and Franky's crew.",
    "Franky, Iceburg, Paulie, Lucci, Kaku, Kalifa, Blueno, Tilestone, PeepleyLulu, Zambai, Mozu, Kiwi, Sodom, Gomorrah, Tom, Yokozuna, Tamagon, Kiev, Kop, Schollzo", C),

  ranked("q-germa-66", "Name a member of the Vinsmoke Family or Germa 66.", "The royal family of the Germa Kingdom.",
    "Sanji, Reiju, Ichiji, Niji, Yonji, Judge, Sora, Cosette", C),

  ranked("q-akazaya", "Name a member of the Nine Red Scabbards (Akazaya Nine) or Kozuki retainers.", "Oden's loyal samurai and ninja.",
    "Kinemon, Kiku, Raizo, Kawamatsu, Denjiro, Ashura, Izou, Kanjuro, Inuarashi, Nekomamushi, Shinobu", C),

  ranked("q-vegapunk-mads", "Name a Vegapunk satellite or MADS scientist.", "Vegapunk's bodies or the illegal research team.",
    "Vegapunk, Shaka, Lilith, Edison, Pythagoras, Atlas, York, Judge, Queen, Caesar, Stussy, Bakkin", C),

  ranked("q-seraphim-pacifista", "Name a Seraphim, Pacifista, or Vegapunk cyborg.", "PX units and Lunarian-blooded Seraphim.",
    "Kuma, SSnake, SHawk, SBear, SShark, S-Flamingo|S-Doflamingo, S-Gecko|S-Moria, S-Bat|S-Crocodile, PX-0, PX-1, PX-4, PX-5, PX-7, Pacifista Mark III", C),

  ranked("q-sword-members", "Name a member of SWORD.", "Marines in the secret unit SWORD.",
    "Koby, Helmeppo, Drake, Grus, Kujaku, Hibari, Tashigi, Doll", C),

  ranked("q-kuja-pirates", "Name a member of the Kuja Pirates or resident of Amazon Lily.", "Empress Hancock's crew and the Kuja tribe.",
    "Hancock, Sandersonia, Marigold, Gloriosa, Marguerite, SweetPea, Aphelandra, Kikyo, Belladonna, Ran, Rindo, Salome, Shakky, Tritoma, Enishida, Nerine, Cosmos, Blue Fan, Daisy", C),

  ranked("q-skypiea-shandia", "Name a resident of Skypiea or Shandia.", "Skypieans, Shandians, and Enel's priests.",
    "Enel, GanFall, Conis, Pagaya, Wyper, Aisa, Laki, Kamakiri, Braham, Genbo, Ohm, Satori, Gedatsu, Shura, Yama, McKinley, Pierre, Su, Nola, Holy, Kalgara, Mousse, Herb, Seto, Hotori, Kotori, Amazon, Mayushika, Warashi, Isa", C),

  ranked("q-tontatta", "Name a Tontatta dwarf.", "Residents of the Tontatta Kingdom on Green Bit.",
    "Leo, Mansherry, Kabu, Bian, Wicca, Gancho, Rampo, Flapper, Bomba, Bobomba, Cotton, Inhel, Chao, Maujii, Nubon", C),

  ranked("q-vice-admirals", "Name a character who has held the rank of Marine Vice Admiral.", "Current or former Marine Vice Admirals.",
    "Garp, Tsuru, Smoker, Momonga, Saul, Vergo, Onigumo, Doberman, Strawberry, Yamakaji, Bastille, Dalmatian, JohnGiant, Lacroix, Ronse, Comil, Stainless, Maynard, Gion, Tokikake, Doll, Bluegrass, RedKing, Guillotine, Pomsky, Tosa, Urban, Hound, Jonathan, Mozambia, Cancer, Kadar, T-Bone|TBone, Kuzan|Aokiji, Sakazuki|Akainu, Borsalino|Kizaru", C),

  ranked("q-elders-holy-knights", "Name one of the Five Elders or a Holy Knight.", "The highest authorities of Mary Geoise.",
    "Saturn, Mars, Warcury, Nusjuro, JuPeter, Garling, Shamrock, Killingham, Sommers, Gunko, Imu", C),

  ranked("q-black-cat-krieg", "Name a member of the Black Cat Pirates or Krieg Pirates.", "East Blue crews led by Kuro or Don Krieg.",
    "Kuro, Krieg, Gin, Jango, Pearl, Sham, Buchi, Nugire Yainu, Ideaman, Hustle", C),

  ranked("q-supernova-crews-allies", "Name a member of the Straw Hat, Heart, Kid, or Fire Tank Pirates.", "Members of the main Worst Generation crews.",
    "Luffy, Zoro, Nami, Usopp, Sanji, Chopper, Robin, Franky, Brook, Jinbe, Law, Kid, Killer, Bege, Bepo, Shachi, Penguin, JeanBart, Heat, Wire, Vito, Gotti, Chiffon, Pez, Ikkaku, Uni, Clione, Hakugan, Gig, Dive, Bubblegum, Faust", C),

  ranked("q-corrida-colosseum", "Name a fighter who competed in the Corrida Colosseum.", "Gladiators and contenders for the Mera Mera no Mi.",
    "Luffy, Sabo, Bartolomeo, Cavendish, Rebecca, Kyros, Chinjao, Sai, Boo, Ideo, BlueGilly, Hajrudin, Orlumbus, Suleiman, Elizabello, Dagama, Abdullah, Jeet, Bellamy, Burgess, Diamante, Dellinger, LaoG, Machvise, Senor, KellyFunk, BobbyFunk, Jean Ango, Rolling Logan, Meadows, Tank Lepanto, Acilia, Damask, Mummy, Spartan, Ucy", C),

  ranked("q-god-valley", "Name a character connected to the God Valley Incident.", "Figures present at or tied to God Valley.",
    "Xebec, Roger, Garp, Whitebeard, BigMom, Kaido, Shiki, Garling, Kuma, Ginny, Ivankov, Saturn, Shanks, Rayleigh, Gaban, Bogard, Gloriosa, Bakkin, Ochoku, Silver Axe|Kyo, Ganzui, Gill Bastar, Dragon", C),

  ranked("q-film-special-chars", "Name a character who debuted in a One Piece movie or TV special.", "Original characters from films and anime specials.",
    "Uta, Shiki, Zephyr, Tesoro, Bullet, Ain, Binz, Carina, Baccarat, Dice, Tanaka, Buena Festa, Ann, Gordon, Tot Musica, Patrick Redfield, Byrnndi World, Baron Omatsuri, Gasparde, Jonathan, Jessica, Apis, Nelson Royale, Eric, Saga, Mad Treasure, Breed, Komei, Grount, Cidre, Eldoraggo", C),
];
