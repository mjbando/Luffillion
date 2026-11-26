import type { Question } from "../../questions";
import { C, DF, ranked } from "./names";

// Each list is ordered least niche -> most niche. The last answer is the One in a Luffillion.
export const CURATED_POWERS: Question[] = [
  // ---------------- Devil Fruits & Powers ----------------
  ranked("q-logia-user", "Name a character with a Logia Devil Fruit.", "Users of elemental Logia fruits.",
    "Ace, Akainu, Aokiji, Kizaru, Enel, Crocodile, Smoker, Blackbeard, Sabo, Caesar, Monet, Ryokugyu, Caribou, Gasparde", C),

  ranked("q-zoan-user", "Name a character with a Zoan Devil Fruit.", "Regular, Ancient, Mythical, and Artificial Zoan users.",
    "Chopper, Marco, Kaido, Yamato, Lucci, Kaku, Luffy, King, Queen, Jack, Ulti, PageOne, Drake, Sengoku, Momonosuke, Orochi, WhosWho, BlackMaria, Sasaki, Dalton, Jabra, Pell, Chaka, Devon, Morgans, Onimaru, Saturn, Mars, Warcury, Nusjuro, JuPeter, Killingham, Speed, Holdem, Babanuki, Daifugo, Sheepshead, Ginrummy, BaoHuang, Briscola, Fourtricks, Hamlet, Mizerka, Poker, Dobon, Alpacaman, Madilloman, Gazelleman, Mouseman, Batman, Sarahebi, Smiley, Bunbuku, Pierre, Stronger, Funkfreed, Lassoo", C),

  ranked("q-paramecia-user", "Name a character with a Paramecia Devil Fruit.", "Users of Paramecia fruits.",
    "Law, Doflamingo, Whitebeard, BigMom, Katakuri, Hancock, Buggy, Moria, Kuma, Kid, Brook, Robin, Bonney, Bartolomeo, Sugar, Perona, Absalom, Mr3, BonClay, Ivankov, Magellan, Daz, Mr5, Valentine, Doublefinger, MerryXmas, Cracker, Smoothie, Perospero, Brulee, Pudding, Oven, Daifuku, MontdOr, Galette, Streusen, Newshi, Kanjuro, Toki, Raizo, Shinobu, Tama, Kinemon, Trebol, Diamante, Pica, Baby5, Machvise, Senor, Buffalo, Gladius, Jora, Leo, Mansherry, Viola, KellyFunk, Corazon, Wapol, Foxy, Kalifa, Blueno, Hawkins, Apoo, Bege, Urouge, Fujitora, Shiryu, Burgess, Augur, Pizarro, Tsuru, Hina, Sharinguru, Shu, VeryGood, Kujaku, Grus, Bluegrass, Morley, Karasu, BeloBetty, Inazuma, Vegapunk, Decken, Sommers, Gunko, Loki, Alvida, Shiki, Tesoro, Bullet, Uta, Carmel, Charlotte Moscato|Moscato", C),

  ranked("q-transform-fruit", "Name a Devil Fruit that allows its user to transform.", "Zoans and Paramecia fruits that transform the user's body.",
    "Hito Hito no Mi|Human-Human Fruit, Hito Hito no Mi, Model: Nika|Gum-Gum Fruit|Gomu Gomu no Mi|Nika, Tori Tori no Mi, Model: Phoenix|Phoenix, Uo Uo no Mi, Model: Seiryu|Seiryu|Azure Dragon, Neko Neko no Mi, Model: Leopard|Leopard, Ushi Ushi no Mi, Model: Giraffe|Giraffe, Inu Inu no Mi, Model: Okuchi no Makami|Okuchi no Makami, Mane Mane no Mi|Clone-Clone Fruit, Hito Hito no Mi, Model: Daibutsu|Daibutsu, Ryu Ryu no Mi, Model: Pteranodon|Pteranodon, Ryu Ryu no Mi, Model: Brachiosaurus|Brachiosaurus, Zou Zou no Mi, Model: Mammoth|Mammoth, Hebi Hebi no Mi, Model: Yamata no Orochi|Yamata no Orochi, Inu Inu no Mi, Model: Wolf|Wolf, Ushi Ushi no Mi, Model: Bison|Bison, Tori Tori no Mi, Model: Falcon|Falcon, Inu Inu no Mi, Model: Jackal|Jackal, Hebi Hebi no Mi, Model: Anaconda|Anaconda, Hebi Hebi no Mi, Model: King Cobra|King Cobra, Inu Inu no Mi, Model: Kyubi no Kitsune|Kyubi no Kitsune, Mogu Mogu no Mi|Mole-Mole Fruit, Uma Uma no Mi|Horse-Horse Fruit, Inu Inu no Mi, Model: Dachshund|Dachshund, Ryu Ryu no Mi, Model: Allosaurus|Allosaurus, Ryu Ryu no Mi, Model: Spinosaurus|Spinosaurus, Ryu Ryu no Mi, Model: Triceratops|Triceratops, Ryu Ryu no Mi, Model: Pachycephalosaurus|Pachycephalosaurus, Neko Neko no Mi, Model: Saber Tiger|Saber Tiger, Kumo Kumo no Mi, Model: Rosamygale Grauvogeli|Rosamygale Grauvogeli, Sara Sara no Mi, Model: Axolotl|Axolotl, Supa Supa no Mi|Dice-Dice Fruit, Buki Buki no Mi|Arms-Arms Fruit, Shari Shari no Mi|Wheel-Wheel Fruit, Toshi Toshi no Mi|Age-Age Fruit, Baku Baku no Mi|Munch-Munch Fruit, Hito Hito no Mi, Model: Onyudo|Onyudo, Uma Uma no Mi, Model: Pegasus|Pegasus, Tama Tama no Mi|Egg-Egg Fruit, Ryu Ryu no Mi, Model: Kirin|Kirin, Kame Kame no Mi|Turtle-Turtle Fruit, Mushi Mushi no Mi, Model: Kabutomushi|Kabutomushi, Mushi Mushi no Mi, Model: Suzumebachi|Suzumebachi", DF),

  ranked("q-fire", "Name a character who can control or produce fire.", "Fire, magma, or flame attacks.",
    "Ace, Sabo, Akainu, Marco, Kaido, King, Sanji, Kinemon, BigMom, Oven, Luffy, Zoro, Katakuri, Usopp, Prometheus, Momonosuke, Kanjuro, Raizo, Franky, Marigold, Holdem, Pearl, Heat, Hannyabal, Babanuki, SHawk, SBear, SShark, SSnake, Bluejam", C),

  ranked("q-ice", "Name a character who can control or use ice or snow.", "Ice, snow, or freezing attacks.",
    "Aokiji, Monet, Brook, Yamato, Nami, Queen, Usopp, WhiteyBay, Franky", C),

  ranked("q-lightning", "Name a character who can control lightning or electricity.", "Lightning, thunder, or electric attacks.",
    "Enel, Nami, BigMom, Kaido, Yamato, Luffy, Zeus, Carrot, Pedro, Wanda, Inuarashi, Nekomamushi, Shishilian, BlackBack, Niji, Momonosuke, McGuy", C),

  ranked("q-body", "Name a character who can manipulate their body.", "Stretching, splitting, sprouting, hardening, or reshaping their own body.",
    "Luffy, Buggy, Chopper, Robin, Ivankov, BonClay, Daz, Jozu, Franky, Katakuri, Trebol, Baby5, Machvise, Pica, Inazuma, Apoo, Bege, Doublefinger, Valentine, Alvida, Wapol, Kaku, Lucci, Kumadori, LaoG, Moria, Hawkins", C),

  ranked("q-fly", "Name a character who can fly.", "Flight by Devil Fruit, wings, Geppo, Sky Walk, or gear.",
    "Marco, Kaido, King, Luffy, Sanji, Pell, Enel, Shiki, Momonosuke, Perona, Lucci, Kaku, Robin, Karasu, Laffitte, Kizaru, Smoker, Sabo, Caesar, Monet, Doflamingo, BigMom, Prometheus, Zeus, Satori, Gedatsu, Shura, Wyper, GanFall, Pierre, Koby, Morgans, Mars, Buffalo, Kabu, Bian, Randolph, Stussy, Atlas, Lilith, Nami, SHawk, SSnake, SShark, SBear", C),

  ranked("q-awakened", "Name a character who has awakened their Devil Fruit.", "Confirmed Devil Fruit awakenings.",
    "Luffy, Law, Kid, Katakuri, Doflamingo, Lucci, Kaku, Saturn, Mars, Warcury, Nusjuro, JuPeter, Killingham, Minotaurus, Minorhinoceros, Minokoala, Minozebra, Minochihuahua, Tesoro, Bullet", C),

  ranked("q-conqueror", "Name a character who can use Conqueror's Haki.", "Confirmed Supreme King Haki users.",
    "Luffy, Shanks, Kaido, BigMom, Whitebeard, Roger, Zoro, Hancock, Katakuri, Doflamingo, Yamato, Kid, Ace, Oden, Rayleigh, Gaban, Garp, Sengoku, Saturn, Mars, Warcury, Nusjuro, JuPeter, Garling, Shamrock, Imu, Koby, Loki, Chinjao", C),

  ranked("q-observation", "Name a character who can use Observation Haki.", "Confirmed Observation Haki (Mantra) users.",
    "Luffy, Zoro, Sanji, Usopp, Jinbe, Katakuri, Koby, Helmeppo, Shanks, Rayleigh, Gaban, Roger, Kaido, BigMom, Whitebeard, Garp, Yamato, Law, Kid, Hancock, Enel, Shiryu, Fujitora, Kizaru, Akainu, Aokiji, Ryokugyu, Sengoku, Smoker, Tashigi, Marco, King, Queen, Jack, Ulti, PageOne, WhosWho, BlackMaria, Sasaki, Lucci, Kaku, Momonga, Sabo, Ace, Oden, Kinemon, Kiku, Denjiro, Kawamatsu, Ashura, Raizo, Cracker, Smoothie, Perospero, Pudding, Brulee, Oven, Daifuku, Cavendish, Bartolomeo, Rebecca, Kyros, Viola, Sai, Chinjao, Wyper, Satori, Ohm, Shura, Gedatsu, Aisa, Conis, GanFall, Kalgara", C),

  ranked("q-armament", "Name a character who can use Armament Haki.", "Confirmed Armament Haki users.",
    "Luffy, Zoro, Sanji, Jinbe, Shanks, Garp, Rayleigh, Gaban, Roger, Kaido, BigMom, Whitebeard, Oden, Katakuri, Yamato, Ace, Sabo, Smoker, Tashigi, Koby, Helmeppo, Akainu, Aokiji, Kizaru, Fujitora, Ryokugyu, Sengoku, Tsuru, Hina, Doflamingo, Vergo, Law, Kid, Killer, Hancock, Sandersonia, Marigold, Mihawk, Crocodile, King, Queen, Jack, Ulti, PageOne, WhosWho, BlackMaria, Sasaki, Lucci, Kaku, Jabra, Blueno, Kumadori, Fukurou, Kalifa, Stussy, Blackbeard, Burgess, Shiryu, Cavendish, Bartolomeo, Bellamy, Kyros, Sai, Chinjao, Boo, Ideo, Orlumbus, Hajrudin, Diamante, Pica, Trebol, Kinemon, Kiku, Raizo, Kawamatsu, Denjiro, Ashura, Izou, Hyogoro, Momonosuke, Cracker, Smoothie, Perospero, Oven, Daifuku, Pekoms, Tamago, Pedro, Carrot, Inuarashi, Nekomamushi, Momonga, Sentomaru, Doll, Grus, Kujaku, Beckman, Yasopp, Roux, Karasu, Morley, BeloBetty, Dorry, Brogy, Loki, Zephyr", C),

  ranked("q-animal-fruit", "Name a character who has a Devil Fruit with an animal-based ability.", "Zoans, SMILEs, and other animal-type powers.",
    "Chopper, Marco, Kaido, Lucci, Kaku, Yamato, Luffy, Jack, Queen, King, Ulti, PageOne, Drake, WhosWho, BlackMaria, Sasaki, Orochi, Sengoku, Momonosuke, Dalton, Jabra, Pell, Chaka, Devon, Onimaru, Saturn, Mars, Warcury, Nusjuro, JuPeter, Killingham, Holdem, Speed, Babanuki, Daifugo, Sheepshead, Ginrummy, BaoHuang, Briscola, Fourtricks, Hamlet, Mizerka, Poker, Dobon, Alpacaman, Madilloman, Gazelleman, Mouseman, Batman, Sarahebi, Morgans, Tamago, Sandersonia, Marigold, Smiley, Pierre, Stronger, Funkfreed, Lassoo, Bunbuku", C),

  // ---------------- Weapons & Fighting ----------------
  ranked("q-gun", "Name a character who fights with a gun.", "Pistols, rifles, flintlocks, and cannons.",
    "Yasopp, Beckman, Augur, Bege, Krieg, Roux, Franky, Kid, Blackbeard, Izou, Baby5, Doflamingo, Trebol, Gladius, Vito, Gotti, DaddyMasterson, Mr5, MissFathersDay, Mr7, Pell, Curiel, Spandam, Morgan, Wapol, Higuma, Brannew, Apoo, Judge, Tamago, Pekoms, Queen, Babanuki, Pacifista, Caribou, Wyper, Genbo, Braham, York, Lilith, Atlas", C),

  ranked("q-staff", "Name a character who uses a staff, pole, or club.", "Staffs, pipes, clubs, jitte, or rods.",
    "Nami, Sabo, Smoker, Enel, Kaido, Yamato, Alvida, Kumadori, Vergo, Caesar, Brook, Laffitte, Usopp, Ace, Luffy, Hannyabal, Whitebeard, Katakuri, Ulti, BlackMaria, Monet, Neptune, Fukaboshi, BigMom", C),

  ranked("q-fists", "Name a character who uses their fists to fight.", "Brawlers and punchers.",
    "Luffy, Garp, Jinbe, Koby, Franky, Kuma, Sengoku, Sabo, Ace, Blackbeard, Whitebeard, Burgess, Kaido, BigMom, Katakuri, Akainu, Aokiji, Marco, Jozu, Chopper, Bellamy, Hody, Kuroobi, Hack, Koala, Sai, Chinjao, Ideo, Elizabello, Ulti, PageOne, Lucci, Jabra, Blueno, Fukurou, Kumadori, Senor, Machvise, LaoG, Oven, Daifuku, Vergo, Krieg, Arlong, Wapol, Smoker, Hajrudin, Pearl, MissMonday, Mr5, Mr3", C),

  ranked("q-non-sword-weapon", "Name a character who uses a weapon other than a sword.", "Slingshots, clubs, guns, claws, hammers, tridents, and more.",
    "Usopp, Nami, Franky, Kaido, Yamato, Smoker, Enel, Whitebeard, Katakuri, Buggy, Killer, Jango, Kuro, Krieg, Alvida, Morgan, Gin, Helmeppo, Bege, Yasopp, Beckman, Augur, Roux, Izou, Kumadori, Vergo, Paulie, Wyper, Neptune, Fukaboshi, Hannyabal, Sadie, Saldeath, Minozebra, Minotaurus, Kid, Hawkins, Apoo, Drake, Urouge, Ulti, BlackMaria, Queen, Jack, Perospero, Oven, Daifuku, Daz, Doublefinger, Mr5, MerryXmas, Mr4, Lassoo, Dalton, Hajrudin, Goldberg, Stansen, Sai, Leo, Orlumbus, Brogy, Mr7", C),

  ranked("q-martial-arts", "Name a character who uses a fighting style based on martial arts.", "Black Leg, Fish-Man Karate, Rokushiki, Okama Kenpo, Hasshoken, and others.",
    "Sanji, Jinbe, Lucci, BonClay, Ivankov, Koala, Hack, Kaku, Jabra, Blueno, Kumadori, Fukurou, Kalifa, Zeff, Koby, Helmeppo, Stussy, WhosWho, Sai, Chinjao, Boo, Sabo, Hody, Kuroobi, Ideo, Wanze, Nero, Jerry, Tashigi, Vergo, LaoG, Rebecca, Kyros, Robin, SShark, Aladdin, Kawamatsu, Guernica, Maha, Joseph", C),

  ranked("q-legendary-weapon", "Name a character who has a legendary weapon.", "Wielders of graded Meito blades or iconic named weapons.",
    "Zoro, Mihawk, Shanks, Oden, Whitebeard, Roger, Ryuma, Law, Fujitora, Tashigi, Brook, BigMom, Shiryu, Cavendish, Garling, Shamrock, Nusjuro, Ryokugyu, Kuina, Koushirou, Kozaburo, Sukiyaki, Nami, Usopp, Kaido, Yamato, Katakuri, Cracker, Amande", C),

  ranked("q-spear", "Name a character who uses a spear, trident, or lance.", "Polearm, trident, halberd, or naginata fighters.",
    "Whitebeard, Katakuri, Neptune, Fukaboshi, GanFall, Krieg, Shura, Hannyabal, Dalton, Sai, Enel, Hody, Ryuboshi, Manboshi, Daifuku, Oven, SpeedJiru, Aokiji, Sadie", C),

  ranked("q-named-attack", "Name a character who has used a named attack.", "Anyone who has shouted or used a named attack.",
    "Luffy, Zoro, Sanji, Usopp, Nami, Chopper, Robin, Franky, Brook, Jinbe, Ace, Sabo, Law, Kid, Killer, Shanks, Kaido, BigMom, Whitebeard, Roger, Garp, Rayleigh, Mihawk, Doflamingo, Crocodile, Enel, Lucci, Kaku, Jabra, Blueno, Kalifa, Kumadori, Fukurou, Arlong, Kuro, Krieg, Buggy, Alvida, Morgan, Wapol, Akainu, Aokiji, Kizaru, Fujitora, Ryokugyu, Sengoku, Smoker, Tashigi, Koby, Helmeppo, Hina, Katakuri, Cracker, Smoothie, Perospero, Oven, Daifuku, Pudding, Brulee, Yamato, Oden, King, Queen, Jack, Ulti, PageOne, WhosWho, BlackMaria, Sasaki, Kinemon, Kiku, Raizo, Kawamatsu, Denjiro, Ashura, Izou, Hody, Decken, Moria, Perona, Absalom, Caesar, Monet, Vergo, Diamante, Pica, Trebol, Sugar, Baby5, Gladius, LaoG, Machvise, Senor, Dellinger, BonClay, Mr3, Daz, Mr5, Valentine, Doublefinger, MerryXmas, Mr4, Ivankov, Inazuma, Magellan, Hannyabal, Hancock, Sandersonia, Marigold, Kuma, Blackbeard, Burgess, Augur, Shiryu, Marco, Jozu, Vista, Bartolomeo, Cavendish, Sai, Chinjao, Elizabello, Hajrudin, Dorry, Brogy, Wyper, Ohm, Satori, Gedatsu, Shura, Foxy, Carrot, Pedro, Inuarashi, Nekomamushi, Saturn, Nusjuro, Bonney", C),

  ranked("q-fought-yonko", "Name a character who has fought one of the Four Emperors.", "Fought Kaido, Big Mom, Shanks, Whitebeard, Blackbeard, Luffy, or Buggy.",
    "Luffy, Roger, Whitebeard, Garp, Sengoku, Ace, Zoro, Sanji, Nami, Usopp, Chopper, Robin, Franky, Brook, Jinbe, Law, Kid, Killer, Oden, Yamato, Marco, Jozu, Vista, Kinemon, Kiku, Raizo, Kawamatsu, Denjiro, Ashura, Izou, Kanjuro, Shanks, Akainu, Aokiji, Kizaru, Fujitora, Ryokugyu, Blackbeard, Crocodile, Mihawk, Doflamingo, Moria, Kuma, Hancock, Magellan, Lucci, Saturn, Mars, Warcury, Nusjuro, JuPeter, Buggy, Alvida, Arlong, Krieg, Kuro, Enel, Hody, Caesar, Bellamy, Cracker, Apoo, Hawkins, Drake, Bege, Bonney, Bepo, Inuarashi, Nekomamushi, Carrot, Wanda, Pedro, Squard, Shiki, Xebec, Garling, King, Queen, Jack", C),

  ranked("q-fought-admiral", "Name a character who has fought an Admiral.", "Fought Akainu, Aokiji, Kizaru, Fujitora, Ryokugyu, or a past Admiral.",
    "Luffy, Whitebeard, Marco, Jozu, Vista, Ace, Zoro, Sanji, Robin, Franky, Brook, Jinbe, Crocodile, Rayleigh, Sabo, Garp, Shanks, Blackbeard, Law, Kid, Killer, Hawkins, Apoo, Drake, Urouge, Bonney, Ivankov, Inazuma, Yamato, Momonosuke, Kinemon, Raizo, Kawamatsu, Denjiro, Kiku, Doflamingo, Dorry, Brogy, Emet, Morley, Karasu, Lindbergh, Shiki, Roger, Xebec, Akainu, Aokiji, Kizaru, Zephyr, Weevil, Kuma, Sentomaru, Saul, Cracker, Shiryu, Burgess, Augur, Pizarro, Devon, Shot, Wolf", C),

  ranked("q-fought-commander", "Name a character who has fought a Yonko Commander.", "Fought an Emperor's top officers (All-Stars, Sweet Commanders, etc.).",
    "Luffy, Zoro, Sanji, Nami, Usopp, Robin, Brook, Jinbe, Franky, Chopper, Marco, Law, Kid, Killer, Inuarashi, Nekomamushi, Kinemon, Kawamatsu, Izou, Kiku, Raizo, Denjiro, Ashura, Yamato, Pedro, Carrot, Urouge, Bege, Akainu, Aokiji, Kizaru, Mihawk, Crocodile, Garp, Sengoku, Ryokugyu, Ace, Blackbeard, Shiryu, Burgess, Augur, Yasopp, Bepo, Penguin, Shachi, Apoo, Drake, Hawkins, Ichiji, Niji, Yonji, Reiju, Judge, Fujitora, Tsuru", C),

  ranked("q-fought-alongside", "Name a character who has fought alongside Luffy.", "Allies who battled on Luffy's side.",
    "Zoro, Sanji, Nami, Usopp, Chopper, Robin, Franky, Brook, Jinbe, Ace, Sabo, Law, Kid, Killer, Yamato, Momonosuke, Kinemon, Kiku, Raizo, Kawamatsu, Denjiro, Ashura, Izou, Hyogoro, Marco, Whitebeard, Jozu, Vista, BonClay, Ivankov, Inazuma, Crocodile, Buggy, Mr3, Daz, Hancock, Bartolomeo, Cavendish, Rebecca, Kyros, Viola, Sai, Chinjao, Leo, Ideo, Orlumbus, Hajrudin, Dorry, Brogy, Oimo, Kashii, Inuarashi, Nekomamushi, Carrot, Pedro, Wanda, Bege, Caesar, Vivi, Karoo, Pell, Chaka, Igaram, Koza, Wyper, GanFall, Shirahoshi, Neptune, Fukaboshi, Hatchan, Camie, Bonney, Kuma, Sentomaru, Lilith, Atlas, Stussy, Emet, Smoker, Tashigi, Koby, Garp, Rayleigh, Shanks, Paulie, Iceburg, Zambai, Gambia, Johnny, Yosaku, Bepo, Penguin, Shachi, JeanBart, Lola, Pound", C),
];
