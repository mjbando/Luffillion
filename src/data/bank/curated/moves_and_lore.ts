import type { Question } from "../../questions";
import { ARC, C, CREW, LOC, SHIP, SWORD, TECH, ranked } from "./names";

// 32 distinct attack, sword, ship, location, and deep lore questions.
export const CURATED_MOVES_AND_LORE: Question[] = [
  // ---------------- Attacks & Techniques ----------------
  ranked("q-luffy-moves", "Name one of Luffy's attacks or Gears.", "Any named Gomu Gomu move, Gear form, or Nika attack.",
    "Gomu Gomu no Pistol|Gum-Gum Pistol|Pistol, Gomu Gomu no Gatling|Gum-Gum Gatling|Gatling, Gomu Gomu no Bazooka|Gum-Gum Bazooka|Bazooka, Gear Second|Gear 2, Gear Third|Gear 3, Gear Fourth|Gear 4, Gear Fifth|Gear 5, Boundman|Bounceman, Snakeman, Tankman, Gomu Gomu no Rifle|Rifle, Gomu Gomu no Whip|Whip, Gomu Gomu no Balloon|Balloon, Gomu Gomu no Rocket|Rocket, Gomu Gomu no Jet Pistol|Jet Pistol, Gomu Gomu no Jet Gatling|Jet Gatling, Gomu Gomu no Gigant Pistol|Gigant Pistol, Gomu Gomu no Elephant Gun|Elephant Gun, Gomu Gomu no Red Hawk|Red Hawk, Gomu Gomu no Red Roc|Red Roc, Gomu Gomu no Kong Gun|Kong Gun, Gomu Gomu no King Kong Gun|King Kong Gun, Gomu Gomu no Bajrang Gun|Bajrang Gun, Gomu Gomu no Bullet|Bullet, Gomu Gomu no Stamp|Stamp, Gomu Gomu no Spear|Spear, Gomu Gomu no Axe|Battle Axe, Gomu Gomu no Bell|Bell, Gomu Gomu no Storm|Storm, Gomu Gomu no Fireworks|Fireworks, Gomu Gomu no Jet Bazooka|Jet Bazooka, Gomu Gomu no Grizzly Magnum|Grizzly Magnum, Gomu Gomu no Elephant Gatling|Elephant Gatling, Gomu Gomu no Hawk Gatling|Hawk Gatling, Gomu Gomu no Leo Bazooka|Leo Bazooka, Gomu Gomu no Culverin|Culverin, Gomu Gomu no Black Mamba|Black Mamba, Gomu Gomu no King Cobra|King Cobra, Gomu Gomu no Dawn Rocket|Dawn Rocket, Gomu Gomu no Dawn Whip|Dawn Whip, Gomu Gomu no Dawn Gatling|Dawn Gatling, Gomu Gomu no Star Gun|White Star Gun, Gomu Gomu no Roc Gun|Roc Gun, Gomu Gomu no Over Kong Gun|Over Kong Gun, Gomu Gomu no Rhino Schneider|Rhino Schneider, Gomu Gomu no Kong Organ|Kong Organ, Gomu Gomu no Python|Python, Gomu Gomu no Dawn Cymbal|Dawn Cymbal, Gomu Gomu no Gigant|Gum-Gum Giant, Gomu Gomu no Kaminari|Gum-Gum Lightning, Mizu Luffy|Water Luffy, Nightmare Luffy, Gomu Gomu no Pinwheel|Kazaguruma, Gomu Gomu no Boh|Spaced Out, Gomu Gomu no UFO|UFO", TECH),

  ranked("q-zoro-moves", "Name one of Roronoa Zoro's attacks or sword styles.", "Santoryu, Nitoryu, Ittoryu, Asura, and King of Hell techniques.",
    "Santoryu|Three Sword Style, Oni Giri|Onigiri|Demon Slash, Sanzen Sekai|Three Thousand Worlds, Ittoryu Iai: Shishi Sonson|Shishi Sonson|Lion's Song, Kyutoryu: Asura|Asura|Ashura|Nine Sword Style, Tatsu Maki|Tatsumaki|Dragon Twister, Rengoku Oni Giri|Purgatory Onigiri, Hyaku Hachi Pound Ho|108 Pound Phoenix, Sen Hachi Ju Pound Ho|1080 Pound Phoenix, Rashomon|Nitoryu Iai: Rashomon, Tora Gari|Tiger Hunt, Ichidai Sanzen Daisen Sekai, En-Oh Santoryu: Ippyaku Sanjo Hiryu Jigoku|King of Hell|Dragon Damnation, Ittoryu|One Sword Style, Nitoryu|Two Sword Style, Mutoryu|No Sword Style, Toro Nagashi, Nigiri|Two Sword Tower Climb, Daishinkan|Great Dragon Shock, Kokujo O Tatsumaki|Black Rope Dragon Twister, Enbima Yonezu Oni Giri, Asura Ichibugin|Silver Mist, Asura Makyusen, Asura Bakkei: Moja no Tawamure|Dead Man's Game, Sanjuuroku Pound Ho|36 Pound Phoenix, Shichijuuni Pound Ho|72 Pound Phoenix, Gyuki: Yuzume, Karasuma Gari, Hiryu: Kaen|Flying Dragon Blaze, Yakkodori, Ul-Tora Gari, Rokudou no Tsuji|Crossing of Six Paths, Baki, Shi Shishi Sonson, Bird Dance, Foxfire Style|Kitsunebiryu", TECH),

  ranked("q-sanji-moves", "Name one of Sanji's attacks or techniques.", "Black Leg Style, Diable Jambe, and Ifrit Jambe moves.",
    "Diable Jambe|Devil Leg, Ifrit Jambe, Black Leg Style|Black Leg, Concasse, Anti-Manner Kick Course, Mouton Shot|Mutton Shot, Hell Memories, Boeuf Burst, Party Table Kick Course, Sky Walk, Blue Walk, Flambage Shot, Collier, Epaule, Cotelette, Selle, Poitrine, Gigot, Flanchet, Veau Shot, Frit Assorti, Bien Cuit: Grill Shot, Spectre, Collier Strike, Poile a Frire: Spectre, Jarret, Crosse Strike, Boeuf Burst, O-Soba Mask", TECH),

  ranked("q-nami-usopp-chopper-moves", "Name an attack or weapon technique used by Nami, Usopp, or Chopper.", "Clima-Tact, Usopp's Stars/Pop Greens, or Chopper's Rumble Ball forms.",
    "Thunderbolt Tempo, Mirage Tempo, Zeus Breeze Tempo, Happiness Punch, Thunderbolt, Gust Sword, Milky Road, Black Ball: Raiun Rod, Thunder Lance Tempo, Cyclone Tempo, Tornado Tempo, Fire Bird Star|Hi no Tori Boshi, Impact Wolf, Kayaku Boshi|Gunpowder Star, Kemuri Boshi|Smoke Star, Kaen Boshi|Flame Star, Shuriken Ryuseigun, Bagworm, Midori Boshi: Devil|Devil, Midori Boshi: Sargasso|Sargasso, Midori Boshi: Trampolia|Trampolia, Midori Boshi: Skull Exploding Grass, Midori Boshi: Rafflesia, Monster Point, Kung Fu Point, Heavy Point, Guard Point, Brain Point, Walk Point, Horn Point, Arm Point, Jumping Point, Kokutei Roseo|Roseo Metel|Cloven Rose, Scope", TECH),

  ranked("q-robin-franky-brook-jinbe-moves", "Name an attack or technique used by Robin, Franky, Brook, or Jinbe.", "Hana Hana, cyborg weapons, Soul Solid, or Fish-Man Karate.",
    "Cien Fleur|One Hundred Fleur, Gigantesco Mano, Demonio Fleur, Clutch, Mil Fleur, Dos Fleur, Tres Fleur, Seis Fleur, Treinta Fleur, Ochenta Fleur, Spank, Coup de Vent, Franky Radical Beam|Radical Beam, Coup de Boo, Fresh Fire, Strong Right, Weapons Left, Franky Boxing, Franky Centaur, Franky Fireball, Franky Iron Boxing, Yahazu Giri|Arrow Notch Slash, Soul Solid, Nemuriuta Flanc|Lullaby Parry, Aubade Coup Droit, Gavotte Bond en Avant, Kasuriuta: Fubuki Giri, Soul Parade, Quinte Tierce Fantasia, Karakusa Gawara Seiken|Arabesque Tile True Punch, Buraikan|Vagabond Drill, Samegawara Seiken|Shark Tile True Punch, Uchimizu|Water Shot, Kairyu Ipponzeoi|Ocean Current Shoulder Throw, Gyojin Karate Ogi: Onigawara Seiken", TECH),

  ranked("q-villain-moves", "Name an attack or technique used by a One Piece villain.", "Signature moves of Crocodile, Enel, Lucci, Doflamingo, Katakuri, Kaido, and more.",
    "Raimei Hakke|Thunder Bagua, Torikago|Birdcage, Desert Spada, Sables, El Thor, Raigo|Advent of Thunder, Black Hole, Kurouzu|Black Vortex, Hydra, Negative Hollow, Rokuogan|Six King Gun, Bolo Breath|Blast Breath, Barjan, Ground Seco, Ground Death, Sables Pesado, Mamaragan, Kari, Sango, Overheat, Parasite, Black Knight, God Thread, Sixteen Holy Bullets: God Thread, Bullet String|Tamaito, Buzz Cut Mochi|Zan Giri Mochi, Power Mochi, Block Mochi, Peerless Donuts, Venom Demon, Chloro Ball, Venom Road, Brick Bat, Shadows Asgard, Tsuno-Tokage,Ice Age|Ice Age, Yasakani no Magatama, Ama no Murakumo, Dai Funka|Great Eruption, Meteor Volcano, Ryusei Kazan, Gravito|Raging Tiger, Kosanze Ragnaraku, Kundali Dragon Swarm, Death Destroyer Thunder Bagua, Ikoku Sovereignty, Maser Cannon, Misery", TECH),

  ranked("q-emperor-moves", "Name an attack or technique used by one of the Four Emperors.", "Moves used by Shanks, Whitebeard, Kaido, Big Mom, Blackbeard, Luffy, or Buggy.",
    "Kamusari|Divine Departure, Raimei Hakke|Thunder Bagua, Hakai|Ocean Sovereignty|Conquest of the Sea, Bolo Breath|Blast Breath, Black Hole, Kurouzu|Black Vortex, Gomu Gomu no Pistol|Pistol, Gomu Gomu no Bajrang Gun|Bajrang Gun, Gomu Gomu no Red Roc|Red Roc, Ikoku Sovereignty, Heavenly Bonbons, Mama-Raid, Maser Cannon, Cognac, Elbaf Spear, Misery, Fulfilling Soul, Kabutowari|Helmet Splitter, Kaishin|Seaquake, Gekishin, Kosanze Ragnaraku, Death Destroyer Thunder Bagua, Kundali Dragon Swarm, Flame Dragon Torch, Buggy Ball, Muggy Ball, Bara Bara Festival, Bara Bara Cannon", TECH),

  ranked("q-haki-rokushiki-list", "Name a Haki ability or Rokushiki (Six Powers) technique.", "Any form of Haki or CP9 martial arts technique.",
    "Observation Haki|Kenbunshoku Haki|Mantra, Armament Haki|Busoshoku Haki, Conqueror's Haki|Haoshoku Haki, Future Sight, Ryuo, Soru|Shave, Geppo|Moonwalk, Tekkai|Iron Body, Rankyaku|Tempest Kick, Shigan|Finger Pistol, Kami-e|Kamie|Paper Art, Rokuogan|Six King Gun, Seimei Kikan|Life Return, Sky Walk, Blue Walk, Amane Dachi, Madara, Jusshigan, Tobu Shigan, Tekkai Kenpo", TECH),

  // ---------------- Swords & Ships ----------------
  ranked("q-graded-swords", "Name a graded Meito sword.", "Supreme Grade, Great Grade, or Skillful Grade blades.",
    "Wado Ichimonji|Wado, Enma, Shusui, Sandai Kitetsu|Kitetsu, Yoru|Kokuto Yoru, Ace, Murakumogiri|Whitebeard's Bisento|Whitebeard's Naginata, Shodai Kitetsu, Yakuza Kasen, Nidai Kitetsu, Ame no Habakiri|Habakiri, Yubashiri, Shigure, Kashu, Oto, Kogarashi, Shirauo, Soto Muso, Sukesan, Same-kiri Bocho|Samekiri Bocho, Konpira, Durandal", SWORD),

  ranked("q-wano-swords", "Name a sword forged in or closely tied to Wano Country.", "Famous katanas and blades of Wano.",
    "Enma, Wado Ichimonji|Wado, Shusui, Ame no Habakiri|Habakiri, Sandai Kitetsu|Kitetsu, Nidai Kitetsu, Shodai Kitetsu, Kogarashi, Sukesan, Kakusan, Oto", SWORD),

  ranked("q-cursed-black-blades", "Name a cursed sword or Black Blade.", "Kitetsu blades, Yoru, Shusui, and cursed Meito.",
    "Yoru|Kokuto Yoru, Shusui, Sandai Kitetsu|Kitetsu, Nidai Kitetsu, Shodai Kitetsu, Kikoku", SWORD),

  // ---------------- Regions, Kingdoms, Seas, Landmarks ----------------
  ranked("q-kingdoms-nations", "Name a kingdom, country, or nation in One Piece.", "Any named kingdom, country, or independent state.",
    "Alabasta|Arabasta, Dressrosa, Wano Country|Wano, Drum Kingdom|Drum Island, Sakura Kingdom, Goa Kingdom, Ryugu Kingdom, Tontatta Kingdom, Germa Kingdom, Prodence Kingdom, Kano Country, Sorbet Kingdom, Lulusia Kingdom|Lulusia, Kamabakka Kingdom|Momoiro Island, Torino Kingdom, Tehna Gehna Kingdom|Kenzan Island, Lvneel Kingdom, Briss Kingdom, Ballywood Kingdom, Vodka Kingdom, Rommel Kingdom, Roshwan Kingdom, Shishano Kingdom, Tajine Kingdom, Mogaro Kingdom, Evil Black Drum Kingdom, Oykot Kingdom, Mokomo Dukedom, Amazon Lily, Totto Land, Elbaph|Elbaf, Mary Geoise|Mariejois, Flevance", LOC),

  ranked("q-seas-waterways", "Name a sea, ocean, current, or body of water in One Piece.", "Seas, Blues, currents, rivers, and sea regions.",
    "East Blue, West Blue, North Blue, South Blue, Grand Line, Paradise, New World, Calm Belt, All Blue, White Sea, White-White Sea, Florian Triangle, Knock Up Stream, Aqua Laguna, Tarai Current, Sandora River, Sea Forest, Maubeugemour Sea, Totto Land Waters, Reverse Mountain", LOC),

  ranked("q-landmarks", "Name a famous building, bar, or landmark in One Piece.", "Taverns, castles, shrines, plazas, and monuments.",
    "Baratie, Arlong Park, Drum Castle, Rain Dinners, Spiders Cafe, Tomb of the Kings, Giant Jack, Shandora, Tower of Law|Tower of Justice, Gates of Justice, Bridge of Hesitation, Franky House, Galley-La Headquarters|Dock One, Shift Station, Blue Station, Human Auctioning House, Shakky's Rip-Off Bar|Shakky's Bar, Newkama Land, Pangaea Castle, Domain of the Gods, Gyoncorde Plaza, Ryugu Palace, Sea Forest, Corrida Colosseum, Toy House, SMILE Factory, Royal Palace of Dressrosa, Flower Hill, Whole Cake Chateau, Mirro-World|Mirror World, Seducing Woods, Whale Forest, Right Belly Fortress, Oden Castle, Udon Prisoner Mine, Enma Shrine, Northern Cemetery, Punk Records, Labophase, Fabiriophase, Partys Bar|Party's Bar, Dadan's Bandit Hut, Kuraigana Castle, Gran Tesoro", LOC),

  ranked("q-wano-locations", "Name a location inside Wano Country.", "Regions, towns, ports, and landmarks of Wano.",
    "Flower Capital, Onigashima, Kuri, Udon, Ringo, Hakumai, Kibi, Ebisu Town, Okobore Town, Bakura Town, Amigasa Village, Kuri Beach, Port Mogura, Tokage Port, Habu Port, Itachi Port, Udon Prisoner Mine, Northern Cemetery, Enma Shrine, Mt. Atama, Mt. Fuji, Oden Castle, Rasetsu Town, Kibi Wasteland", LOC),

  ranked("q-totto-land-locations", "Name an island or location in Totto Land.", "Whole Cake Island and Big Mom's 34 islands.",
    "Whole Cake Island|Totto Land, Whole Cake Chateau, Sweet City, Cacao Island, Nuts Island, Biscuits Island, Cheese Island, Candy Island, Jam Island, Wheat Island, Milk Island, Liqueur Island, Potato Island, Pie Island, Fudge Island, Papanapple Island, Noko Island, Seducing Woods, Mirro-World|Mirror World, Totto Land Waters", LOC),

  ranked("q-alabasta-locations", "Name a location in Alabasta.", "Cities, ruins, rivers, and cafes of the desert kingdom.",
    "Alubarna, Rainbase, Nanohana, Yuba, Erumalu, Katorea, Spiders Cafe, Rain Dinners, Sandora Desert, Sandora River, Tomb of the Kings, Tamarisk", LOC),

  ranked("q-skypiea-locations", "Name a location in Skypiea or Jaya.", "Sky islands, ruins, and Mock Town.",
    "Skypiea, Upper Yard, Shandora, Angel Island, Jaya, Mock Town, White Sea, White-White Sea, Heaven's Gate, Cloud End, Milky Road, Giant Jack, Birka", LOC),

  ranked("q-water7-enies-locations", "Name a location in Water 7 or Enies Lobby.", "Shipyards, sea train stations, and Judicial Island.",
    "Water 7|Water Seven, Enies Lobby, Galley-La Headquarters|Dock One, Franky House, Shift Station, Blue Station, St. Poplar, Pucci, San Faldo, Scrap Island, Judicial Island, Enies Lobby Main Island, Tower of Law|Tower of Justice, Gates of Justice, Bridge of Hesitation", LOC),

  ranked("q-east-blue-characters", "Name a character from the Romance Dawn, Orange Town, or Syrup Village arcs.", "Early East Blue characters.",
    "Luffy, Zoro, Nami, Usopp, Shanks, Buggy, Koby, Helmeppo, Morgan, Alvida, Beckman, Roux, Yasopp, Makino, Higuma, WoopSlap, Rika, Ririka, Kuina, Koushirou, Mohji, Cabaji, Richie, Boodle, Chouchou, Kuro, Jango, Kaya, Merry, Sham, Buchi, Ninjin, Piiman, Tamanegi, Gaimon, Hocker", C),

  ranked("q-baratie-arlong-characters", "Name a character from the Baratie or Arlong Park arcs.", "Floating restaurant chefs, Krieg's fleet, and Arlong's crew.",
    "Luffy, Zoro, Nami, Usopp, Sanji, Zeff, Mihawk, Krieg, Gin, Pearl, Fullbody, Patty, Carne, Johnny, Yosaku, Arlong, Hatchan, Kuroobi, Chew, Momoo, Bellmere, Nojiko, Genzo, Nezumi, Nako, PuddingPudding, FisherTiger, Jinbe", C),

  ranked("q-straw-hat-pirates-ships-crews", "Name a fleet or organization allied with Luffy.", "Kingdoms, pirate crews, and divisions supporting the Straw Hats.",
    "Straw Hat Grand Fleet|Grand Fleet, Barto Club, Beautiful Pirates, Happo Navy, Tontatta Pirates|Tonta Corps, New Giant Warrior Pirates, Yonta Maria Grand Fleet, Ideo Pirates, Heart Pirates, Kid Pirates, Nine Red Scabbards|Akazaya Nine, Kozuki Family, Kuja Pirates, Sun Pirates, Revolutionary Army, Galley-La Company, Franky Family, Whitebeard Pirates, Red Hair Pirates, Giant Warrior Pirates, Saruyama Alliance, Shandia, Guardians, Inuarashi Musketeer Squad, Nefertari Family, Ryugu Royal Army, Riku Royal Army, Sakura Kingdom Royal Guard", CREW),

  ranked("q-emperor-crews", "Name a Yonko's pirate crew or sub-division.", "Crews and squads under Whitebeard, Shanks, Big Mom, Kaido, Blackbeard, Luffy, or Buggy.",
    "Straw Hat Pirates|Straw Hats, Whitebeard Pirates, Red Hair Pirates, Big Mom Pirates, Beast Pirates|Animal Kingdom Pirates, Blackbeard Pirates, Cross Guild, Buggy's Delivery, Sweet Commanders, All-Stars|Disasters, Tobiroppo|Flying Six, Ten Titanic Captains, Charlotte Family, Numbers, Shinuchi|Headliners, Gifters, Pleasures, Waiters, Oniwabanshu, Mimawarigumi, Straw Hat Grand Fleet, Spade Pirates", CREW),

  ranked("q-wg-branches", "Name a World Government or Marine unit or branch.", "Branches of the Navy, Cipher Pol, and government forces.",
    "Marines|Navy, World Government, Cipher Pol, CP9|Cipher Pol 9, CP0|Cipher Pol 0, Five Elders|Gorosei, Celestial Dragons|World Nobles, Seven Warlords of the Sea|Shichibukai, SWORD, Holy Knights|God's Knights, SSG|Special Science Group, Seraphim, Pacifista, Impel Down, G-5 Marines, G-8 Marines, Giant Squad, CP8|Cipher Pol 8, CP7|Cipher Pol 7, CP6|Cipher Pol 6, CP5|Cipher Pol 5, Blugori, Jailer Beasts, Demon Guards", CREW),

  ranked("q-canon-arcs", "Name a canon story arc in the One Piece manga.", "Main storyline arcs from Romance Dawn to Elbaph.",
    "Romance Dawn Arc|Romance Dawn, Orange Town Arc|Orange Town, Syrup Village Arc|Syrup Village, Baratie Arc|Baratie, Arlong Park Arc|Arlong Park, Loguetown Arc|Loguetown, Reverse Mountain Arc|Reverse Mountain, Whisky Peak Arc|Whisky Peak, Little Garden Arc|Little Garden, Drum Island Arc|Drum Island, Alabasta Arc|Alabasta, Jaya Arc|Jaya, Skypiea Arc|Skypiea, Long Ring Long Land Arc|Long Ring Long Land, Water 7 Arc|Water 7, Enies Lobby Arc|Enies Lobby, Post-Enies Lobby Arc|Post-Enies Lobby, Thriller Bark Arc|Thriller Bark, Sabaody Archipelago Arc|Sabaody, Amazon Lily Arc|Amazon Lily, Impel Down Arc|Impel Down, Marineford Arc|Marineford, Post-War Arc|Post-War, Return to Sabaody Arc|Return to Sabaody, Fish-Man Island Arc|Fish-Man Island, Punk Hazard Arc|Punk Hazard, Dressrosa Arc|Dressrosa, Zou Arc|Zou, Whole Cake Island Arc|Whole Cake Island, Levely Arc|Reverie Arc|Levely|Reverie, Wano Country Arc|Wano, Egghead Arc|Egghead, Elbaph Arc|Elbaph|Elbaf", ARC),

  ranked("q-sagas-of-op", "Name one of the major Sagas of One Piece.", "Multi-arc sagas from East Blue to the Final Saga.",
    "East Blue Saga|East Blue, Alabasta Saga|Alabasta, Sky Island Saga|Sky Island, Water 7 Saga|Water 7, Thriller Bark Saga|Thriller Bark, Summit War Saga|Paramount War Saga, Fish-Man Island Saga|Fish-Man Island, Dressrosa Saga|Pirate Alliance Saga, Whole Cake Island Saga|Four Emperors Saga, Wano Country Saga|Wano, Final Saga", ARC),

  ranked("q-cover-story-arcs", "Name a manga cover story or anime filler/special arc.", "Cover serials, filler arcs, and TV specials.",
    "G-8 Arc|G-8, Warship Island Arc|Warship Island, Diary of Koby-Meppo|Koby-Meppo, Buggy's Crew Adventure Chronicles, Enel's Great Space Operations, CP9's Independent Report, Ace's Great Blackbeard Search, Straw Hat's Separation Serial, Jango's Dance Paradise, Hatchan's Sea-Floor Stroll, Wapol's Omnivorous Hurrah, Gedatsu's Accidental Blue-Sea Life, Miss Goldenweek's Operation: Meet Baroque Works, Caribou's Kehihihihi in the New World, Solo Journey of Jinbe, Stories of the Self-Proclaimed Straw Hat Grand Fleet, Germa 66's Ahh... An Emotionless Excursion, Oni Child Yamato's Golden Harvest Surrogate Pilgrimage, From the Decks of the World, Ocean's Dream Arc|Ocean's Dream, Ice Hunter Arc|Ice Hunter, Ruluka Island Arc|Rainbow Mist Arc, Goat Island Arc|Goat Island, Post-Alabasta Arc|Post-Alabasta, Foxy's Return Arc|Foxy's Return, Spa Island Arc|Spa Island, Little East Blue Arc|Little East Blue, Z's Ambition Arc|Z's Ambition, Caesar Retrieval Arc|Caesar Retrieval, Silver Mine Arc|Silver Mine, Marine Rookie Arc|Marine Rookie", ARC),

  ranked("q-one-piece-movies", "Name a One Piece theatrical movie.", "Feature films from the first movie to Film: Red.",
    "Film: Red|One Piece Film: Red, Film: Gold|One Piece Film: Gold, Film: Z|One Piece Film: Z, Strong World|One Piece Film: Strong World, Stampede|One Piece: Stampede, Baron Omatsuri and the Secret Island|Baron Omatsuri, Dead End Adventure, Giant Mecha Soldier of Karakuri Castle, The Cursed Holy Sword, Clockwork Island Adventure, Chopper's Kingdom on the Island of Strange Animals, One Piece: The Movie, Episode of Alabasta, Episode of Chopper", ARC),

  ranked("q-marine-admirals-fleet", "Name a Fleet Admiral, Admiral, or former Admiral candidate.", "Top Marine leadership, including Gion and Tokikake.",
    "Akainu, Aokiji, Kizaru, Fujitora, Ryokugyu, Sengoku, Kong, Zephyr, Gion, Tokikake", C),

  ranked("q-sky-island-warriors", "Name a character who fought in the Upper Yard Survival Game on Skypiea.", "Straw Hats, Shandians, Priests, and Enel's forces in Upper Yard.",
    "Luffy, Zoro, Nami, Usopp, Sanji, Chopper, Robin, Enel, Wyper, GanFall, Pierre, Ohm, Satori, Gedatsu, Shura, Yama, Braham, Kamakiri, Genbo, Laki, Hotori, Kotori, Fuza, Holy, Nola", C),

  ranked("q-alabasta-combatants", "Name a Baroque Works officer or Alabasta Royal Guard.", "Combatants from the battle for Alabasta.",
    "Crocodile, Robin, BonClay, Daz, Mr3, Doublefinger, Goldenweek, Mr4, MerryXmas, Mr5, Valentine, Pell, Chaka, Igaram, Vivi, Karoo, Koza, Lassoo, Mr7, MissFathersDay", C),

  ranked("q-straw-hat-mentor", "Name a character who trained or mentored a Straw Hat during the 2-year timeskip.", "Mentors and islands' helpers during 3D2Y.",
    "Rayleigh, Mihawk, Ivankov, Heracles|Heracles'n, Haredas, Kuma, Perona, Hack, Dragon, Sabo, Koala, Caroline, Elizabeth|Tibany, Shanba", C),
];
