import type { Question } from "../../questions";
import { C, LOC, SHIP, SWORD, ranked } from "./names";

// Each list is ordered least niche -> most niche. The last answer is the One in a Luffillion.
export const CURATED_WORLD: Question[] = [
  // ---------------- Locations & Story Arcs ----------------
  ranked("q-visited-islands", "Name an island visited by the Straw Hats.", "Any island or town at least one Straw Hat has set foot on.",
    "Alabasta|Arabasta, Skypiea|Sky Island, Water 7|Water Seven, Enies Lobby, Thriller Bark, Sabaody Archipelago|Sabaody|Shabondy, Fish-Man Island|Fishman Island, Punk Hazard, Dressrosa, Zou, Whole Cake Island|Totto Land, Wano Country|Wano, Egghead|Egghead Island, Elbaph|Elbaf, Drum Island|Drum Kingdom, Little Garden, Whisky Peak|Whiskey Peak, Jaya, Loguetown|Logue Town, Dawn Island, Conomi Islands, Gecko Islands, Long Ring Long Land, Amazon Lily, Rusukaina|Ruskaina, Kuraigana Island, Boin Archipelago|Bowin Islands, Momoiro Island|Kamabakka Kingdom, Weatheria, Karakuri Island|Baldimore, Namakura Island|Harahettania, Torino Kingdom, Kenzan Island|Tehna Gehna Kingdom, Cactus Island, Island of Rare Animals, Organ Islands, Reverse Mountain, Twin Cape, Foosha Village, Shells Town, Orange Town, Syrup Village, Cocoyasi Village|Cocoyashi Village, Shimotsuki Village, Marineford, Impel Down, Green Bit, Cacao Island, Onigashima, Navarone|G-8", LOC),

  ranked("q-grand-line", "Name a location in the Grand Line.", "Paradise (the first half) of the Grand Line.",
    "Reverse Mountain, Alabasta|Arabasta, Skypiea, Water 7|Water Seven, Enies Lobby, Sabaody Archipelago|Sabaody|Shabondy, Thriller Bark, Marineford, Impel Down, Amazon Lily, Drum Island|Drum Kingdom, Little Garden, Whisky Peak|Whiskey Peak, Jaya, Long Ring Long Land, Mary Geoise|Mariejois, Twin Cape, Mock Town, Upper Yard, Shandora, Angel Island, Banaro Island, Kuraigana Island, Weatheria, Boin Archipelago|Bowin Islands, Momoiro Island|Kamabakka Kingdom, Karakuri Island|Baldimore, Namakura Island|Harahettania, Torino Kingdom, Kenzan Island|Tehna Gehna Kingdom, Rusukaina|Ruskaina, Cactus Island, Alubarna, Rainbase, Nanohana, Yuba, Drum Castle, Sakura Kingdom, Florian Triangle, Navarone|G-8, Gates of Justice, Tower of Law|Tower of Justice, Judicial Island, St. Poplar, Pucci, San Faldo, Baltigo, Kumate Island", LOC),

  ranked("q-new-world", "Name a location in the New World.", "Anywhere in the second half of the Grand Line.",
    "Wano Country|Wano, Dressrosa, Whole Cake Island|Totto Land, Punk Hazard, Zou, Egghead|Egghead Island, Elbaph|Elbaf, Laugh Tale|Raftel, Onigashima, Green Bit, New Marineford, Hachinosu|Pirate Island|Fullalead, Cacao Island, Nuts Island, Biscuits Island, Cheese Island, Candy Island, Jam Island, Wheat Island, Milk Island, Liqueur Island, Sweet City, Whole Cake Chateau, Mirro-World|Mirror World, Seducing Woods, Mokomo Dukedom, Kurau City, Whale Forest, Flower Capital, Kuri, Udon, Ringo, Hakumai, Kibi, Ebisu Town, Okobore Town, Bakura Town, Amigasa Village, Udon Prisoner Mine, Sphinx, Prodence Kingdom, Corrida Colosseum, Acacia, Flower Hill, Raijin Island, Risky Red Island, Mystoria Island, Winner Island, G-5, G-1, G-14, Broc Coli Island, Foodvalten, Applenine Island, Gran Tesoro, Lodestar Island|Roadstar Island", LOC),

  ranked("q-east-blue-loc", "Name a location in the East Blue.", "Islands, towns, villages, and landmarks of the East Blue.",
    "Foosha Village|Windmill Village, Loguetown|Logue Town, Shells Town|Shell Town, Orange Town, Syrup Village, Baratie, Arlong Park, Cocoyasi Village|Cocoyashi Village, Goa Kingdom, Gray Terminal, Mt. Colubo|Mount Colubo, Shimotsuki Village, Dawn Island, Conomi Islands, Gecko Islands, Island of Rare Animals, Organ Islands, Tequila Wolf, Polestar Islands, Oykot Kingdom, Sixis, Mirrorball Island, Baterilla, Gosa Village, Partys Bar|Party's Bar, Dadan's Bandit Hut", LOC),

  ranked("q-alabasta-saga-loc", "Name a location in the Alabasta Saga.", "From Reverse Mountain to Alabasta.",
    "Alabasta|Arabasta, Reverse Mountain, Whisky Peak|Whiskey Peak, Little Garden, Drum Island|Drum Kingdom, Alubarna, Rainbase, Nanohana, Yuba, Twin Cape, Cactus Island, Rain Dinners, Spiders Cafe, Katorea, Erumalu, Sandora Desert, Sandora River, Tomb of the Kings, Drum Castle, Drum Rockies, Sakura Kingdom, Bighorn, Cocoa Weed, Gyasta, Robelle, Tamarisk", LOC),

  ranked("q-water7-saga-loc", "Name a location visited during the Water 7 Saga.", "Long Ring Long Land, Water 7, and Enies Lobby.",
    "Water 7|Water Seven, Enies Lobby, Long Ring Long Land, Tower of Law|Tower of Justice, Gates of Justice, Franky House, Galley-La Headquarters|Dock One, Blue Station, Bridge of Hesitation, Judicial Island, Enies Lobby Main Island, St. Poplar, Pucci, San Faldo, Scrap Island, Shift Station", LOC),

  ranked("q-summit-saga-loc", "Name a location visited during the Summit War Saga.", "Sabaody through the post-war arcs.",
    "Marineford, Impel Down, Sabaody Archipelago|Sabaody|Shabondy, Amazon Lily, Rusukaina|Ruskaina, Kuraigana Island, Shakky's Rip-Off Bar|Shakky's Bar, Human Auctioning House, Sabaody Park, Newkama Land|Level 5.5, Crimson Hell|Level 1, Beast Hell|Level 2, Starvation Hell|Level 3, Blazing Hell|Level 4, Freezing Hell|Level 5, Eternal Hell|Level 6, Dawn Island, Gray Terminal, Goa Kingdom, Mt. Colubo, Boin Archipelago, Momoiro Island|Kamabakka Kingdom, Weatheria, Karakuri Island|Baldimore, Namakura Island, Torino Kingdom, Kenzan Island, Gates of Justice, Tarai Current", LOC),

  ranked("q-emperors-saga-loc", "Name a location visited during the Four Emperors Saga.", "Zou, Whole Cake Island, the Levely, and Wano.",
    "Wano Country|Wano, Whole Cake Island|Totto Land, Zou, Onigashima, Mary Geoise|Mariejois, Pangaea Castle, Domain of the Gods, Sweet City, Whole Cake Chateau, Cacao Island, Seducing Woods, Mirro-World|Mirror World, Flower Capital, Kuri, Udon, Ringo, Hakumai, Kibi, Okobore Town, Bakura Town, Ebisu Town, Amigasa Village, Udon Prisoner Mine, Northern Cemetery, Enma Shrine, Mt. Atama, Mt. Fuji, Oden Castle, Kurau City, Mokomo Dukedom, Whale Forest, Right Belly Fortress, Nuts Island, Jam Island, Biscuits Island, Cheese Island, Candy Island, Wheat Island, Milk Island, Liqueur Island", LOC),

  ranked("q-villain-fight-loc", "Name a location where Luffy has fought a major villain.", "Sites of Luffy's major battles.",
    "Arlong Park, Alabasta|Arabasta, Alubarna, Rainbase, Tomb of the Kings, Enies Lobby, Tower of Law|Tower of Justice, Thriller Bark, Dressrosa, Flower Hill, Corrida Colosseum, Onigashima, Whole Cake Island|Totto Land, Mirro-World|Mirror World, Seducing Woods, Skypiea, Upper Yard, Ark Maxim, Fish-Man Island|Fishman Island, Gyoncorde Plaza, Egghead|Egghead Island, Punk Hazard, Marineford, Impel Down, Shells Town, Orange Town, Syrup Village, Baratie, Drum Island, Drum Castle, Loguetown, Little Garden, Long Ring Long Land, Mock Town, Whisky Peak, Green Bit", LOC),

  ranked("q-marine-encounter-loc", "Name a location where the Straw Hats have encountered the Marines.", "Places the crew clashed with or met the Navy.",
    "Loguetown|Logue Town, Alabasta|Arabasta, Enies Lobby, Marineford, Sabaody Archipelago|Sabaody, Shells Town|Shell Town, Water 7|Water Seven, Punk Hazard, Dressrosa, Egghead|Egghead Island, Wano Country|Wano, Long Ring Long Land, Arlong Park, Cocoyasi Village, Foosha Village, Baratie, Amazon Lily, Impel Down, Navarone|G-8", LOC),

  ranked("q-poneglyph-loc", "Name a place where a Poneglyph has been found.", "Locations with a Poneglyph or Road Poneglyph.",
    "Alabasta|Arabasta, Skypiea, Fish-Man Island|Fishman Island, Zou, Whole Cake Island|Totto Land, Wano Country|Wano, Laugh Tale|Raftel, Onigashima, Sea Forest, Tomb of the Kings, Shandora, Whale Forest, Ohara, Whole Cake Chateau, Elbaph|Elbaf", LOC),

  ranked("q-prison-loc", "Name a prison or prison-related location.", "Prisons, prison levels, and places of captivity.",
    "Impel Down, Enies Lobby, Udon Prisoner Mine|Udon, Level 6|Eternal Hell, Level 5|Freezing Hell, Newkama Land|Level 5.5, Level 4|Blazing Hell, Level 3|Starvation Hell, Level 2|Beast Hell, Level 1|Crimson Hell, Tower of Law|Tower of Justice, Shells Town, Toy House, Tequila Wolf, Rain Dinners, Prison Tower|Whole Cake Chateau", LOC),

  ranked("q-villain-ruled", "Name an island or place ruled by a powerful villain.", "Places controlled by a tyrant or villainous crew.",
    "Dressrosa, Wano Country|Wano, Whole Cake Island|Totto Land, Alabasta|Arabasta, Arlong Park, Cocoyasi Village, Conomi Islands, Thriller Bark, Skypiea, Drum Island|Drum Kingdom, Punk Hazard, Onigashima, Shells Town, Orange Town, Mary Geoise|Mariejois, Hachinosu|Pirate Island|Fullalead, Sorbet Kingdom, Egghead|Egghead Island, Evil Black Drum Kingdom", LOC),

  ranked("q-destroyed-loc", "Name a location that has been destroyed.", "Islands or places wiped out or heavily ruined.",
    "Ohara, Marineford, Enies Lobby, Arlong Park, Lulusia Kingdom|Lulusia, God Valley, Flevance, Gray Terminal, Punk Hazard, Shandora, Banaro Island, Onigashima, Egghead|Egghead Island, Orange Town, Baltigo", LOC),

  ranked("q-reunion-loc", "Name a location where the Straw Hats have reunited.", "Where the crew came back together.",
    "Sabaody Archipelago|Sabaody, Zou, Wano Country|Wano, Whole Cake Island|Totto Land, Water 7|Water Seven, Kuri, Shakky's Rip-Off Bar|Shakky's Bar, Flower Capital, Thousand Sunny, Enies Lobby, Onigashima, Dressrosa, Alabasta", LOC),

  // ---------------- Bounties & Rankings ----------------
  ranked("q-bounty-100m", "Name a character with a bounty over 100 million berries.", "Any known bounty strictly above 100,000,000.",
    "Luffy, Zoro, Sanji, Nami, Usopp, Robin, Franky, Brook, Jinbe, Law, Kid, Shanks, Kaido, BigMom, Blackbeard, Whitebeard, Roger, Ace, Sabo, Dragon, Mihawk, Crocodile, Buggy, Doflamingo, Hancock, Marco, Katakuri, Killer, Bonney, Hawkins, Drake, Bege, Apoo, Urouge, Cavendish, Bartolomeo, King, Queen, Jack, Smoothie, Cracker, Perospero, Oven, Daifuku, Snack, Pekoms, Tamago, Shiryu, Burgess, Augur, Laffitte, DocQ, Devon, Wolf, Shot, Pizarro, Ulti, PageOne, WhosWho, BlackMaria, Sasaki, Weevil, Kuma, Moria, Bellamy, Yamato, Ivankov, Karasu, Morley, BeloBetty, Lindbergh, Caribou, Coribou, FisherTiger, Dorry, Brogy, Ideo, Leo, Sai, Orlumbus, Hajrudin, Chinjao, Elizabello, Abdullah, Jeet, BlueGilly, Suleiman, Brulee, Caesar", C),

  ranked("q-bounty-500m", "Name a character with a bounty over 500 million berries.", "Any known bounty strictly above 500,000,000.",
    "Luffy, Zoro, Shanks, Kaido, BigMom, Blackbeard, Whitebeard, Roger, Law, Kid, Mihawk, Crocodile, Buggy, Sanji, Hancock, Marco, Katakuri, Doflamingo, Jinbe, King, Queen, Jack, Ace, Sabo, Smoothie, Cracker, Perospero, Robin, Usopp, Franky, Brook, Killer, Weevil, Dorry, Brogy, Chinjao, LittleOarsJr, Izou", C),

  ranked("q-bounty-1b", "Name a character with a bounty over 1 billion berries.", "Any known bounty strictly above 1,000,000,000.",
    "Luffy, Shanks, Kaido, BigMom, Blackbeard, Whitebeard, Roger, Zoro, Law, Kid, Sanji, Mihawk, Crocodile, Buggy, Hancock, Jinbe, Katakuri, Marco, King, Queen, Dorry, Brogy", C),

  ranked("q-bounty-increased", "Name a character whose bounty has increased.", "Characters who received a higher bounty later on.",
    "Luffy, Zoro, Sanji, Nami, Usopp, Chopper, Robin, Franky, Brook, Jinbe, Law, Kid, Killer, Ace, Sabo, Buggy, Bonney, Bege, Hawkins, Apoo, Drake, Crocodile, Mihawk, Hancock, Blackbeard, Urouge, Bartolomeo, Cavendish, Bellamy, FisherTiger, Dorry, Brogy, Caribou, Coribou, Marco, Kaido, BigMom, Whitebeard, Roger, Kuma", C),

  ranked("q-bounty-frozen", "Name a character who has had their bounty frozen.", "Warlords whose bounties were suspended.",
    "Mihawk, Hancock, Doflamingo, Crocodile, Kuma, Moria, Law, Jinbe, Blackbeard, Buggy, Weevil, Hanafuda", C),

  ranked("q-former-warlord-bounty", "Name a former Warlord with a bounty.", "Ex-Warlords whose bounties are active again.",
    "Mihawk, Crocodile, Buggy, Hancock, Law, Jinbe, Blackbeard, Doflamingo, Moria, Weevil, Kuma, Hanafuda", C),

  ranked("q-post-timeskip-bounty", "Name a character who has been given a bounty after the time skip.", "Bounties issued or updated after the two-year skip.",
    "Luffy, Zoro, Sanji, Nami, Usopp, Chopper, Robin, Franky, Brook, Jinbe, Law, Kid, Killer, Mihawk, Crocodile, Buggy, Hancock, Cavendish, Bartolomeo, Marco, Katakuri, Smoothie, Cracker, Perospero, Oven, Daifuku, Snack, Tamago, Pekoms, King, Queen, Jack, Ulti, PageOne, WhosWho, BlackMaria, Sasaki, Bege, Hawkins, Apoo, Urouge, Bonney, Weevil, Sabo, Karasu, Morley, BeloBetty, Lindbergh, Burgess, Shiryu, Augur, Laffitte, DocQ, Devon, Wolf, Shot, Pizarro, Caribou, Coribou, Caesar, Ideo, Leo, Sai, Hajrudin, Chinjao, Orlumbus, Elizabello, Dorry, Brogy, Abdullah, Jeet, BlueGilly, Suleiman", C),

  ranked("q-emperors", "Name a member of the Four Emperors.", "Anyone who has held the title of Yonko.",
    "Shanks, Kaido, BigMom, Blackbeard, Whitebeard, Luffy, Buggy", C),

  ranked("q-admirals", "Name a character who has been an Admiral.", "Admirals and Fleet Admirals, past or present.",
    "Akainu, Aokiji, Kizaru, Fujitora, Ryokugyu, Sengoku, Kong, Zephyr", C),

  ranked("q-commanders", "Name a character who has been a Yonko Commander.", "Top officers of an Emperor's crew.",
    "Marco, Jozu, Vista, Ace, Thatch, Izou, King, Queen, Jack, Katakuri, Smoothie, Cracker, Snack, Perospero, Beckman, Roux, Yasopp, Burgess, Augur, Laffitte, DocQ, Devon, Wolf, Shot, Pizarro, Shiryu, Aokiji, Mihawk, Crocodile, Oden, Blamenco, Rakuyo, Namur, Blenheim, Curiel, Kingdew, Haruta, Atmos, SpeedJiru, Fossa", C),

  // ---------------- Ships, Objects & Items ----------------
  ranked("q-pirate-ship", "Name a ship belonging to a pirate crew.", "Any pirate crew's ship or submarine.",
    "Going Merry|Merry, Thousand Sunny|Sunny, Oro Jackson, Moby Dick, Red Force, Polar Tang, Victoria Punk, Queen Mama Chanter, Saber of Xebec, Perfume Yuda, Thriller Bark, Going Luffy-senpai|Going Luffy, Nostra Castello, Big Top, Miss Love Duck, Sexy Foxy, Yonta Maria, Shark Superb, Flying Dutchman, Striker, Numancia Flamingo, Ark Maxim|Maxim, Great Erik, Naglfar, Piece of Spadille, Dreadnaught Sabre, Bezan Black, Wind Granma, Sleeping White Horse of the Forest, Happosai, Ipposai, Usoland, Santa Maria, Nita Maria, Jewelry Margherita, Liberal Hind, Hanjomaru, Baroque Gustave, Swanda Express, New Witch's Tongue, Bliking, Victory Hunter, Utan Sonar, Snapper Head, Karasumaru", SHIP),

  ranked("q-supreme-blades", "Name one of the 12 Supreme Grade Blades.", "The known Saijo O Wazamono.",
    "Yoru|Kokuto Yoru, Murakumogiri|Whitebeard's Bisento|Whitebeard's Naginata, Ace, Shodai Kitetsu, Yakuza Kasen", SWORD),

  ranked("q-ancient-weapons", "Name one of the Ancient Weapons.", "The legendary weapons of the Void Century.",
    "Pluton, Poseidon, Uranus"),

  ranked("q-den-den", "Name a type of Den Den Mushi.", "Varieties of transponder snail.",
    "Den Den Mushi|Transponder Snail, Baby Den Den Mushi, Visual Den Den Mushi|Video Den Den Mushi, Black Den Den Mushi, White Den Den Mushi, Golden Den Den Mushi, Silver Den Den Mushi, Projector Den Den Mushi, Horned Den Den Mushi, Self-Propelled Visual Den Den Mushi"),

  ranked("q-grand-line-travel", "Name an item or vessel that can be used to travel through the Grand Line.", "Navigation tools and travel gear.",
    "Log Pose, Eternal Pose, Vivre Card, Ship Coating|Coating|Yarukiman Resin, Waver, Puffing Tom|Sea Train, Sea Prism Stone hull|Kairoseki hull, Coup de Burst, Mini Merry II|Mini Merry, Shark Submerge III|Shark Submerge, Milky Dial, Jet Dial, Knock Up Stream"),

  ranked("q-seastone-item", "Name a type of Sea Stone item.", "Objects made of Sea Prism Stone (Kairoseki).",
    "Seastone handcuffs|Sea Prism Stone handcuffs|Seastone cuffs, Smoker's jitte|Jitte, Seastone cage, Seastone net, Seastone bullets, Kairoseki hull|Seastone hull, Seastone shackles, Seastone wall, Seastone nails, Seastone collar|Explosive Collar, Bubble Gun|Seastone Bubble Gun, Seastone tip|Smoker's weapon, Law's Seastone handcuffs"),

  ranked("q-roger-objects", "Name an object associated with Gol D. Roger.", "Things linked to the Pirate King.",
    "Straw Hat, One Piece, Oro Jackson, Ace|Ace (sword), Execution platform|Loguetown execution platform, Roger's Jolly Roger|Jolly Roger, Oden's Journal|Oden's log, Giant Egg|Oro Jackson Egg, Roger's Captain Coat, Roger's Bicorne Hat"),

  ranked("q-straw-hat-items", "Name an item that belonged to a Straw Hat member.", "Weapons, tools, and keepsakes of the crew.",
    "Straw Hat, Wado Ichimonji, Enma, Shusui, Sandai Kitetsu, Yubashiri, Clima-Tact|Sorcery Clima-Tact, Kabuto|Black Kabuto|Pachinko, Rumble Ball, Soul Solid|Shikomizue, Raid Suit|Stealth Black Raid Suit, Sogeking Mask, Ace's Vivre Card|Vivre Card, Log Pose, Zoro's Bandana|Bandana, Chopper's Hat, Tangerine Trees|Bellmere's Tangerine Trees, Pop Green, Going Merry, Thousand Sunny, Tone Dial|Binks' Sake Tone Dial, Nami's Bracelet|Nojiko's Bracelet, Zoro's Earrings"),

  ranked("q-vegapunk-tech", "Name a piece of technology created by Vegapunk.", "Inventions of the world's greatest scientist.",
    "Pacifista, Seraphim, Punk Records, Mother Flame, Artificial Devil Fruits|Pink Dragon Fruit, SAD, Frontier Dome, Vegaforce-01, Kairoseki hull|Seastone Battleship Hull, Bubble Gun, Holograms, Green Blood, Dom Shoes, Island Air Conditioner, Laser Beams, Sea Beast Weapons"),

  // ---------------- Random One Piece Knowledge ----------------
  ranked("q-marine-family", "Name a character who has a family member in the Marines.", "Blood or adoptive relatives of Marines.",
    "Luffy, Dragon, Ace, Sabo, Garp, Doflamingo, Corazon, Sengoku, Helmeppo, Morgan, Nami, Nojiko, Bellmere, Kujaku, Tsuru, Homing, X Drake|Drake, Diez Barrels", C),

  ranked("q-sibling", "Name a character who has a brother or sister.", "Blood or sworn siblings.",
    "Luffy, Ace, Sabo, Sanji, Nami, Nojiko, Doflamingo, Corazon, Hancock, Sandersonia, Marigold, Katakuri, Pudding, Smoothie, Cracker, Perospero, Brulee, Oven, Daifuku, Lola, Chiffon, Amande, MontdOr, Galette, Opera, Flampe, Praline, Compote, Snack, Moscato, Reiju, Ichiji, Niji, Yonji, Shirahoshi, Fukaboshi, Ryuboshi, Manboshi, Momonosuke, Hiyori, Shanks, Shamrock, Kiku, Izou, Law, Lami, Tom, Den, Caribou, Coribou, Arlong, Shyarly, BobbyFunk, KellyFunk, Boo, Sai, Sterry", C),

  ranked("q-betrayed", "Name a character who has betrayed someone.", "Traitors, double agents, and backstabbers.",
    "Blackbeard, Kanjuro, Robin, Pudding, Lucci, Kaku, Kalifa, Blueno, Kuro, Krieg, Vergo, Monet, Orochi, Drake, Hawkins, Apoo, Corazon, Higurashi, Squard, Stussy, York, Shiryu, Bege, Pudding, Caesar, Nami, Arlong, Morgan, Nezumi, Spandam, Doflamingo, Viola, Baby5, Jango, Wapol", C),

  ranked("q-switched-sides", "Name a character who has switched sides.", "Characters who changed allegiance.",
    "Robin, Jinbe, Franky, Aokiji, Drake, BonClay, Crocodile, Bege, Pudding, Hawkins, Apoo, Yamato, Shiryu, Mr3, Daz, WhosWho, Corazon, Kanjuro, Bellamy, Viola, Baby5, Vivi, Igaram, Stussy, Sentomaru, York, Kuma, Oimo, Kashii, Duval, Hatchan, Perona, Buggy, Caesar, Jango, Fullbody, Chiffon, Lola, Praline, Denjiro, S-Snake|SSnake", C),

  ranked("q-revolutionary", "Name a character who has been part of the Revolutionary Army.", "Leaders, commanders, and members.",
    "Dragon, Sabo, Koala, Ivankov, Kuma, Inazuma, Hack, BeloBetty, Morley, Lindbergh, Karasu, Robin, Ahiru, BunnyJoe, Ushiano, Jiron, Gyogyo, Ginny, Moda, TerryGilteo", C),

  ranked("q-void-century", "Name a character who knows about the Void Century.", "Those who know or uncovered the hidden history.",
    "Robin, Imu, Vegapunk, Shaka, Lilith, Pythagoras, Edison, Atlas, York, Saturn, Mars, Warcury, Nusjuro, JuPeter, Rayleigh, Roger, Gaban, Crocus, Oden, Toki, Clover, Olvia, Saul, Sukiyaki, Zunesha, Emet, JoyBoy, Nefertari Lily|Lily, Cobra", C),

  ranked("q-met-celestial", "Name a character who has encountered a Celestial Dragon.", "Met, fought, or served a World Noble.",
    "Luffy, Zoro, Nami, Usopp, Robin, Franky, Brook, Chopper, Sanji, Jinbe, Hancock, Sandersonia, Marigold, Doflamingo, Corazon, Homing, Koala, FisherTiger, Kuma, Ginny, Sabo, Bonney, Vivi, Cobra, Shirahoshi, Neptune, Fukaboshi, Hatchan, Camie, Pappag, Rayleigh, Law, Kid, Killer, Apoo, Hawkins, Drake, Bege, Urouge, Mjosgard, Sai, Leo, Rebecca, Wapol, Sterry, Kizaru, Garp, Sengoku, Vegapunk, Lucci, Kaku, Stussy, Morley, Karasu, Lindbergh, BeloBetty", C),

  ranked("q-been-skypiea", "Name a character who has been to Skypiea.", "Anyone who has been in Skypiea / Upper Yard.",
    "Luffy, Zoro, Nami, Usopp, Sanji, Chopper, Robin, Enel, Roger, Rayleigh, Gaban, Oden, Toki, Inuarashi, Nekomamushi, Bellamy, Conis, Wyper, GanFall, Pagaya, Aisa, Laki, Ohm, Satori, Shura, Gedatsu, Yama, Kalgara, Noland, Pierre, Braham, Genbo, Kamakiri, McKinley, Su, Nola, Holy, Mousse, Urouge", C),

  ranked("q-been-wano", "Name a character who has been to Wano.", "Anyone who set foot in Wano Country.",
    "Luffy, Zoro, Sanji, Nami, Usopp, Chopper, Robin, Franky, Brook, Jinbe, Kaido, Yamato, Oden, Toki, Law, Kid, Killer, Marco, Izou, Ace, BigMom, Perospero, Roger, Rayleigh, Gaban, Whitebeard, Moria, Ryuma, Kinemon, Momonosuke, Hiyori, Kiku, Raizo, Kawamatsu, Denjiro, Ashura, Shinobu, Orochi, Kanjuro, Tama, Toko, Yasuie, Sukiyaki, Hyogoro, Onimaru, Komachiyo, Hihimaru, Higurashi, Semimaru, Fukurokuju, Hotei, Hawkins, Apoo, Drake, Caribou, Ryokugyu, King, Queen, Jack, Sasaki, Ulti, PageOne, WhosWho, BlackMaria, Holdem, Speed, Babanuki, Daifugo, BaoHuang, Inuarashi, Nekomamushi, Carrot, Wanda, Shishilian, Bepo, Penguin, Shachi, JeanBart, Heat, Wire, Guernica, Maha, Joseph, Ushimaru, Kozaburo", C),

  ranked("q-been-fishman", "Name a character who has been to Fish-Man Island.", "Anyone who visited or lived on Fish-Man Island.",
    "Luffy, Zoro, Nami, Usopp, Sanji, Chopper, Robin, Franky, Brook, Jinbe, Whitebeard, Roger, Rayleigh, Oden, Toki, Inuarashi, Nekomamushi, Shirahoshi, Neptune, Otohime, Hody, Decken, Fukaboshi, Ryuboshi, Manboshi, Shyarly, Camie, Pappag, Hatchan, FisherTiger, Arlong, Kuroobi, Chew, Pekoms, Tamago, Caribou, Coribou, Wadatsumi, Aladdin, Dosun, Zeo, Daruma, Ikaros, Hyouzou, Hammond, Macro, Gyaro, Tansui, Surume, Den, Ishilly", C),

  ranked("q-oro-jackson", "Name a character who has been on Roger's ship.", "Crew and passengers of the Oro Jackson.",
    "Roger, Rayleigh, Shanks, Buggy, Oden, Toki, Crocus, Gaban, Inuarashi, Nekomamushi, Momonosuke, Hiyori, Sunbell, Nozdon, Taro, Doringo, Millet Pine, Spencer, Petermoo, Jacksonbanner, Blumarine, Max Marks, Moon Isaac Jr., Momonora", C),

  ranked("q-baroque", "Name a character who has been part of Baroque Works.", "Agents, partners, and Billions/Millions.",
    "Crocodile, Robin, BonClay, Daz, Mr3, Doublefinger, Goldenweek, Mr4, MerryXmas, Mr5, Valentine, Vivi, Igaram, Mr9, Mr7, MissFathersDay, Mr11, MissMonday, Lassoo, Mr13, MissFriday, MissCatherina, MrBeans", C),

  ranked("q-cp", "Name a character who has been part of CP9 or CP0.", "Agents of Cipher Pol's secret units.",
    "Lucci, Kaku, Kalifa, Jabra, Blueno, Kumadori, Fukurou, Spandam, Spandine, Stussy, Hattori, WhosWho, Joseph, Gismonda, Guernica, Maha, Alpha", C),

  ranked("q-pre-post-skip", "Name a character who has appeared both before and after the time skip.", "Characters shown in both halves of the story.",
    "Luffy, Zoro, Nami, Usopp, Sanji, Chopper, Robin, Franky, Brook, Jinbe, Shanks, Buggy, Smoker, Koby, Helmeppo, Garp, Blackbeard, Law, Kid, Killer, Hawkins, Drake, Bege, Apoo, Bonney, Urouge, Hancock, Sandersonia, Marigold, Gloriosa, Marguerite, Mihawk, Crocodile, Daz, BonClay, Mr3, Vivi, Cobra, Igaram, Pell, Chaka, Koza, Karoo, Doflamingo, Akainu, Kizaru, Aokiji, Sengoku, Tsuru, Hina, Tashigi, Momonga, Onigumo, Sentomaru, Rayleigh, Shakky, Duval, Perona, Moria, Hogback, Absalom, Bellamy, Sarquiss, Wapol, Dalton, Kureha, Makino, Dadan, WoopSlap, Kaya, Merry, Johnny, Yosaku, Nojiko, Genzo, Hatchan, Camie, Pappag, Laboon, Crocus, Dorry, Brogy, Oimo, Kashii, Iceburg, Paulie, Kokoro, Chimney, Tilestone, PeepleyLulu, Yokozuna, Ivankov, Inazuma, Dragon, Sabo, Koala, Kuma, Magellan, Hannyabal, Domino, Sadie, Saldeath, Shiryu, Burgess, Augur, Laffitte, DocQ, Devon, Wolf, Shot, Pizarro, Lucci, Kaku, Jabra, Blueno, Kalifa, Kumadori, Fukurou, Spandam, Hattori, Marco, Jozu, Vista, Whitebeard, Ace, Roger, Sterry, Lola, Pandaman", C),

  ranked("q-fought-wg", "Name a character who has fought against the World Government.", "Rebels, pirates, and others who defied the World Government.",
    "Luffy, Zoro, Nami, Usopp, Sanji, Chopper, Robin, Franky, Brook, Jinbe, Sabo, Dragon, Koala, FisherTiger, Kuma, Bonney, Vegapunk, Lilith, Atlas, Shaka, Ivankov, Inazuma, Saul, Clover, Olvia, Morley, BeloBetty, Lindbergh, Hack, Karasu, Law, Kid, Killer, Dorry, Brogy, Emet, Whitebeard, Marco, Ace, Oden, Rocks D. Xebec|Xebec, Roger, Oimo, Kashii, Paulie, Zambai", C),
];
