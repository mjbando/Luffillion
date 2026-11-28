// Chest-only recruits. None of these can be earned through achievements, and no
// achievement character can ever drop from a chest. Characters who also exist as
// achievement rewards (Nami, Chopper, Robin, Jinbe, Shanks, Rayleigh, Kaido, …)
// appear here as distinct era/form variants with their own ids.

export type ChestCharacterRarity = "common" | "uncommon" | "rare" | "epic" | "legendary" | "mythic";

// [id, full name, short name, epithet, accent colour, flavour text]
type Row = readonly [string, string, string, string, string, string];

const COMMON = [
  ["buggy", "Buggy the Clown", "Buggy", "Star Clown", "#5b8def", "Blue hair, a red nose, and a pocket full of Chop-Chop tricks. Don't mention the nose."],
  ["alvida", "Alvida", "Alvida", "Iron Mace", "#e77fb0", "Smooth as silk after eating the Slip-Slip Fruit, and still swinging that iron mace."],
  ["koby", "Koby", "Koby", "Marine Recruit", "#f2a3c7", "Pink hair, round glasses, and a dream of becoming an admiral."],
  ["helmeppo", "Helmeppo", "Helmeppo", "Marine Swordsman", "#f3dc76", "Bowl-cut blond hair and a pair of kukri. He's come a long way."],
  ["morgan", "Axe-Hand Morgan", "Morgan", "Axe-Hand", "#a8b4c4", "A steel jaw and a giant axe where his hand used to be."],
  ["higuma", "Higuma", "Higuma", "Mountain Bandit", "#b5794a", "The bandit who picked a fight with Shanks's crew in Foosha Village."],
  ["jango", "Jango", "Jango", "One-Two Jango", "#d58bf0", "Heart-shaped shades, a hypnosis chakram, and some fancy footwork."],
  ["fullbody", "Fullbody", "Fullbody", "Iron Fist", "#c9d3df", "A Marine lieutenant in a sharp suit with iron knuckles."],
  ["johnny", "Johnny", "Johnny", "Bounty Hunter", "#72c7d9", "Zoro's old partner. Shades, a bandana, and a quick blade."],
  ["yosaku", "Yosaku", "Yosaku", "Bounty Hunter", "#9ad57a", "Johnny's partner. Green bandana and a big grin."],
  ["mohji", "Mohji", "Mohji", "Beast Tamer", "#f0ece0", "Bear-ear hairdo and a lion named Richie."],
  ["cabaji", "Cabaji", "Cabaji", "Acrobat Swordsman", "#7fb6e8", "Buggy's chief of staff, on a unicycle with a blade."],
  ["pearl", "Pearl", "Pearl", "Iron Wall", "#e5e8ef", "Covered in pearl plates and undefeated in sixty-one battles."],
  ["gin", "Gin", "Gin", "Man-Demon", "#8e9ab5", "Krieg's combat commander with a pair of tonfa balls."],
  ["hatchan", "Hatchan", "Hatchan", "Six-Sword Octopus", "#f28c7a", "Six arms, six swords, and a takoyaki stand."],
  ["chew", "Chew", "Chew", "Water Gun", "#7ad1c2", "A fish-man with a beak who fires water like a cannon."],
  ["kuro", "Captain Kuro", "Kuro", "Of a Hundred Plans", "#a9b8d6", "Cat claws, a butler's suit, and very particular glasses."],
  ["sham", "Sham", "Sham", "Nyaban Brother", "#6a7bd1", "The skinny half of the Black Cat Pirates' cat brothers."],
  ["buchi", "Buchi", "Buchi", "Nyaban Brother", "#e9b86a", "The heavy half of the cat brothers. Watch out for Cat Fall."],
  ["wapol", "Wapol", "Wapol", "Tin-Plate", "#9fb0c4", "The former king of Drum, with a metal jaw that eats anything."],
  ["chess", "Chess", "Chess", "Royal Archer", "#d77f5d", "Wapol's royal advisor in a jester hat."],
  ["kuromarimo", "Kuromarimo", "Kuromarimo", "Royal Brawler", "#3c4d68", "Wapol's advisor with an afro made of sticky balls."],
  ["mr-9", "Mr. 9", "Mr. 9", "Baroque Agent", "#e46a5e", "Crown, cape, and a pair of iron bats."],
  ["miss-monday", "Miss Monday", "Miss Monday", "Baroque Agent", "#d98a63", "Strong enough to crush a barrel with one fist."],
] as const satisfies readonly Row[];

const UNCOMMON = [
  ["vivi", "Nefertari Vivi", "Vivi", "Princess of Alabasta", "#7fd4e8", "Blue ponytail, a peacock slasher, and a crew who calls her a friend."],
  ["karoo", "Karoo", "Karoo", "Super Spot-Billed Duck", "#f2d76d", "The fastest duck in Alabasta and Vivi's trusty steed."],
  ["don-krieg", "Don Krieg", "Krieg", "Foul Play", "#d4b13b", "Golden armor, a spear, and the Daisensō war mantle."],
  ["arlong", "Arlong", "Arlong", "Saw-Tooth", "#5f9ee0", "A sawshark fish-man with a long sawtooth nose and the Kiribachi blade."],
  ["kuroobi", "Kuroobi", "Kuroobi", "Fish-Man Karate", "#c94c4c", "A stingray fish-man and master of fish-man karate."],
  ["hyouzou", "Hyouzou", "Hyouzou", "Octopus Swordsman", "#df8c66", "An octopus fish-man swordsman. Better with a sword when he's drunk."],
  ["mr-3", "Galdino · Mr. 3", "Mr. 3", "Candle Artist", "#f6f0d0", "His hair is styled like a 3, and he can make anything out of candle wax."],
  ["miss-goldenweek", "Miss Goldenweek", "Goldenweek", "Colour Trap", "#f4a3b0", "A painter whose colours change how you feel. Never far from tea and rice crackers."],
  ["mr-5", "Mr. 5", "Mr. 5", "Bomb Man", "#9e8cd8", "Shades, a long coat, and explosive boogers."],
  ["miss-valentine", "Miss Valentine", "Valentine", "Kilo Kilo", "#f6d36d", "A lemon-print dress and an umbrella. She can weigh up to 10,000 kilos."],
  ["mr-4", "Mr. 4", "Mr. 4", "Slow Slugger", "#a4c88c", "Slow, but his four-ton baseball bat hits hard."],
  ["miss-merry-christmas", "Miss Merry Christmas", "Merry Xmas", "Mole Mole", "#d97b5e", "A mole woman who digs Mole Pistol tunnels at high speed."],
  ["mr-7", "Mr. 7", "Mr. 7", "Baroque Sniper", "#7aa7d8", "A Baroque Works sniper with pointy hair."],
  ["foxy", "Foxy", "Foxy", "Silver Fox", "#e48f45", "The Davy Back Fight champion, with a split pompadour and the Slow-Slow Beam."],
  ["porche", "Porche", "Porche", "Idol of the Foxy Pirates", "#f08bb6", "Pink hair, a baton, and a cutie-cutie look."],
  ["hamburg", "Hamburg", "Hamburg", "Groggy Monster", "#bf8b5e", "A huge Groggy Monster with a horned cap."],
  ["bellamy", "Bellamy", "Bellamy", "The Hyena", "#e2c25b", "Spring legs, a sneer, and a 55,000,000 bounty."],
  ["sarquiss", "Sarquiss", "Sarquiss", "Hyena Pirate", "#9aa6c8", "Bellamy's first mate. Long hair and a curved sword."],
  ["demaro-black", "Demaro Black", "Demaro Black", "Fake Luffy", "#b5844f", "The fake Straw Hat captain from Sabaody."],
  ["duval", "Duval", "Duval", "Iron Mask", "#72b7a1", "He wore an iron mask, until Sanji gave him a handsome face."],
  ["perona", "Perona", "Perona", "Ghost Princess", "#ff9ccf", "Pink twin-tails, an umbrella, and Negative Hollows."],
  ["vander-decken", "Vander Decken IX", "Vander Decken", "Flying Dutchman", "#7fc8a4", "A great-white-shark fish-man with the Mark-Mark Fruit."],
  ["hody-jones", "Hody Jones", "Hody", "New Fish-Man Pirates", "#3f7fd6", "A great-white-shark fish-man who's taken too many Energy Steroids."],
  ["aladine", "Aladine", "Aladine", "Sun Pirates Doctor", "#c87f5e", "A merman doctor of the Sun Pirates."],
  ["caribou", "Caribou", "Caribou", "Wet-Haired", "#5a7f62", "A grinning pirate with the Swamp-Swamp Fruit."],
  ["coribou", "Coribou", "Coribou", "Caribou's Brother", "#7c9a7c", "Caribou's chunky younger brother."],
  ["caesar-clown", "Caesar Clown", "Caesar", "Master", "#b4a7e8", "A mad scientist with horns who can control gas. Shurororo!"],
  ["brownbeard", "Brownbeard", "Brownbeard", "Chadros Higelyges", "#9a6b3d", "He has a crocodile-like lower body, and became Punk Hazard's guard after losing to Law."],
] as const satisfies readonly Row[];

const RARE = [
  ["robin-miss-all-sunday", "Nico Robin · Miss All Sunday", "Miss All Sunday", "Baroque Works Vice-President", "#a68be6", "A cowboy hat, a white coat, and blooming arms."],
  ["franky", "Franky", "Franky", "Cyborg Shipwright", "#56c7ff", "A blue pompadour, star tattoos, and cola-powered arms. SUPER!"],
  ["brook", "Brook", "Brook", "Soul King", "#e8e4d8", "A skeleton musician with a giant afro and a cane sword. Yohohoho!"],
  ["jinbe-warlord", "Jinbe · Warlord", "Warlord Jinbe", "Knight of the Sea", "#5fb7d8", "Jinbe in his blue Warlord-era kimono."],
  ["smoker", "Smoker", "Smoker", "White Hunter", "#d6dde6", "Two cigars, a seastone jitte, and a coat full of smoke."],
  ["tashigi", "Tashigi", "Tashigi", "Swords Collector", "#7f9de0", "Glasses, Shigure, and a lot of stubborn resolve."],
  ["crocodile", "Crocodile", "Crocodile", "Desert King", "#cfa86a", "Slicked hair, a fur coat, a golden hook, and a lot of sand."],
  ["daz-bones", "Daz Bones · Mr. 1", "Mr. 1", "Killer", "#bfc8d4", "A bald killer whose whole body is a blade."],
  ["bon-clay", "Bon Clay", "Bon Clay", "Okama Way", "#ff8cc6", "Swan coat, ballet moves, and the Clone-Clone Fruit. A true friend!"],
  ["enel", "Enel", "Enel", "God of Skypiea", "#f2d24a", "Long earlobes, drums on his back, and 200 million volts."],
  ["wyper", "Wyper", "Wyper", "War Demon", "#d46a4a", "A Shandia warrior with a Reject Dial and a feather headdress."],
  ["ohm", "Ohm", "Ohm", "Sky Knight Priest", "#e3e7ee", "An iron-cloud sword and his dog, Holy."],
  ["satori", "Satori", "Satori", "Ball Priest", "#f0c77a", "A round priest who sets ball traps and uses mantra."],
  ["gedatsu", "Gedatsu", "Gedatsu", "Swamp Priest", "#9bb67c", "He's very absent-minded, and has been for a long time."],
  ["blueno", "Blueno", "Blueno", "Door Door", "#8c6c58", "A CP9 agent with horn-like hair who can open doors anywhere."],
  ["kalifa", "Kalifa", "Kalifa", "Bubble Bubble", "#f4d988", "A sharp secretary with a thorn whip. Sexual harassment!"],
  ["fukuro", "Fukurou", "Fukurou", "Chatterbox", "#8fa1c4", "A round CP9 agent with a zipped mouth. He can't keep a secret."],
  ["kumadori", "Kumadori", "Kumadori", "Kabuki Assassin", "#ec6f8a", "Pink hair, kabuki makeup, and a monk's staff. Yoyoi!"],
  ["jabra", "Jabra", "Jabra", "Wolf Assassin", "#a0815f", "A CP9 agent with Wolf-Wolf Fruit power and a pointy beard."],
  ["bellamy-dressrosa", "Bellamy · Dressrosa", "Dressrosa Bellamy", "Changed Hyena", "#f0c35c", "Bellamy at the Corrida Colosseum, ready to settle things."],
  ["bartolomeo", "Bartolomeo", "Bartolomeo", "The Cannibal", "#77d36e", "A green-haired superfan with the Barrier-Barrier Fruit."],
  ["cavendish", "Cavendish", "Cavendish", "White Horse", "#f6e7a2", "A golden-haired prince with the sword Durandal, and a darker other self."],
  ["sai", "Sai", "Sai", "Happo Navy Leader", "#6b9fd8", "The Happo Navy's leader. His Drill Finger cuts through anything."],
  ["don-chinjao", "Don Chinjao", "Don Chinjao", "Drill Head", "#c4b8a5", "A Happo Navy veteran whose head was once a drill."],
  ["baby-5", "Baby 5", "Baby 5", "Weapon Woman", "#5a6f9a", "A maid with the Arms-Arms Fruit who can't say no."],
  ["senor-pink", "Señor Pink · Baby Version", "Señor Pink", "Hard-Boiled", "#f0a2c4", "A bonnet, a bib, and the coolest heart in the Donquixote family."],
  ["diamante", "Diamante", "Diamante", "Hero of the Colosseum", "#c8b3e8", "A very tall Donquixote officer with a cape that turns to steel."],
  ["trebol", "Trebol", "Trebol", "Sticky Sticky", "#7aa060", "Shades, a runny nose, and a lot of sticky slime."],
  ["pica", "Pica", "Pica", "Stone Giant", "#9a9d9a", "A Donquixote officer who merges with stone. Huge, with a very high voice."],
  ["rebecca", "Rebecca", "Rebecca", "Undefeated Woman", "#f3a7c8", "A Colosseum gladiator who wins without ever cutting anyone."],
  ["kyros", "Kyros", "Kyros", "Legendary Gladiator", "#d1c08a", "A one-legged hero who was a tin soldier for years."],
  ["pekoms", "Pekoms", "Pekoms", "Lion Mink", "#e6b65c", "A lion mink with a turtle shell and shades."],
  ["tamago", "Tamago", "Tamago", "Baron Egg", "#f5f0dc", "An egg in a monocle. He becomes Viscount Hiyoko, then Count Niwatori. Soir!"],
  ["monet", "Monet", "Monet", "Snow Woman", "#9bd4c7", "A harpy with green hair, wings, and snow powers."],
] as const satisfies readonly Row[];

const EPIC = [
  ["kaku", "Kaku", "Kaku", "CP0 Agent", "#e3b25a", "A white cap, a high white collar, a yellow tie and that long square nose."],
  ["sabo", "Sabo", "Sabo", "Flame Emperor", "#4f7fdc", "A top hat, a pipe, and Ace's Flame-Flame Fruit."],
  ["gecko-moria", "Gecko Moria", "Moria", "Shadow Master", "#a184d6", "A giant warlord with stolen shadows and a big ego. Kishishi!"],
  ["magellan", "Magellan", "Magellan", "Warden of Impel Down", "#9b6bd1", "Horns, bat wings, and Venom Hydra."],
  ["ivankov", "Emporio Ivankov", "Ivankov", "Queen of the Kamabakka", "#c27adf", "A huge purple afro, fishnets, and Horm-Horm miracles."],
  ["inazuma", "Inazuma", "Inazuma", "Snip-Snip", "#f2f2f2", "Half-white, half-red hair and scissor hands."],
  ["shiryu", "Shiryu", "Shiryu", "Shiryu of the Rain", "#5d6a88", "The former head jailer of Impel Down, now invisible and with a blade."],
  ["boa-hancock", "Boa Hancock", "Hancock", "Pirate Empress", "#d9445c", "Long black hair, a snake cape, and Love-Love Mellow."],
  ["charlotte-cracker", "Charlotte Cracker", "Cracker", "Thousand Arms", "#d8a36a", "Biscuit armor, a long blade, and his sword Pretzel."],
  ["charlotte-smoothie", "Charlotte Smoothie", "Smoothie", "Sweet Commander", "#cfe6f2", "A very tall Sweet Commander who can wring the juice out of anything."],
  ["charlotte-oven", "Charlotte Oven", "Oven", "Heat-Heat", "#f0763a", "A huge, heated Sweet Commander."],
  ["charlotte-daifuku", "Charlotte Daifuku", "Daifuku", "Lamp Genie", "#f0c66c", "Rub his belly and a genie comes out."],
  ["charlotte-perospero", "Charlotte Perospero", "Perospero", "Candy Minister", "#a6ec79", "A top hat, a candy-cane staff, and a very long tongue. Perorin!"],
  ["charlotte-brulee", "Charlotte Brûlée", "Brûlée", "Mirror Witch", "#c49ae8", "A witch with a scar who can travel through mirrors."],
  ["pedro", "Pedro", "Pedro", "Jaguar Mink", "#e3a64a", "A jaguar mink with an eyepatch, a dagger, and a brave heart."],
  ["carrot", "Carrot", "Carrot", "Rabbit Mink", "#ffd872", "A rabbit mink warrior. Under a full moon she turns into Sulong."],
  ["wanda", "Wanda", "Wanda", "Dog Mink", "#e9e0c8", "A dog mink with a cutlass, loyal to the Duke."],
  ["denjiro", "Denjiro", "Denjiro", "Kyoshiro", "#7e8de0", "Oden's retainer. He spent years in disguise as Kyoshiro."],
  ["kinemon", "Kin'emon", "Kin'emon", "Foxfire", "#d84e4e", "A samurai with a topknot who can cut fire itself."],
  ["ashura-doji", "Ashura Doji", "Ashura Doji", "Shutenmaru", "#7c5a46", "A huge bandit leader with a big beard and a bigger blade."],
  ["kawamatsu", "Kawamatsu", "Kawamatsu", "Kappa Swordsman", "#7fb06a", "A kappa sumo swordsman who loves cucumbers."],
  ["kanjuro", "Kanjuro", "Kanjuro", "Evening Shower", "#e0577a", "An artist who can bring his brush paintings to life. Watch your back."],
  ["x-drake", "X Drake", "Drake", "Red Flag", "#d34848", "A Marine spy and a T. rex Zoan."],
  ["basil-hawkins", "Basil Hawkins", "Hawkins", "The Magician", "#f0dd9c", "Long blond hair, tarot cards, and straw dolls."],
  ["scratchmen-apoo", "Scratchmen Apoo", "Apoo", "Roar of the Sea", "#e68e48", "A long-armed pirate whose body is a musical instrument."],
  ["urouge", "Urouge", "Urouge", "Mad Monk", "#c9a7e0", "A skyborn monk with wings who grows stronger as he takes damage."],
  ["capone-bege", "Capone Bege", "Bege", "Gang", "#8d7f62", "A mob boss whose body is a fortress."],
  ["jewelry-bonney", "Jewelry Bonney", "Bonney", "Big Eater", "#ff9fc8", "Pink hair, a big appetite, and the Age-Age Fruit."],
  ["sentomaru", "Sentomaru", "Sentomaru", "Strongest Defense", "#c0a46a", "Vegapunk's bodyguard. An axe, and the best defense in the Navy."],
] as const satisfies readonly Row[];

const LEGENDARY = [
  ["kozuki-oden", "Kozuki Oden", "Oden", "Lord of Kuri", "#ef6d4a", "Enma and Ame no Habakiri. He'd boil for a full hour for his friends."],
  ["yamato", "Yamato", "Yamato", "Oden's Successor", "#d9e8ff", "White hair, horns, a kanabo, and a mythical wolf form."],
  ["marco", "Marco", "Marco", "The Phoenix", "#4ad0ff", "Blue phoenix flames that heal. Yoi!"],
  ["jozu", "Jozu", "Jozu", "Diamond Jozu", "#c9e8ff", "Whitebeard's third commander, with a diamond body."],
  ["vista", "Vista", "Vista", "Flower Sword", "#ff8cae", "A top hat, a curled moustache, and two blades covered in petals."],
  ["king", "King", "King", "The Wildfire", "#5b5b78", "A Lunarian with black wings, a mask, and flames on his back."],
  ["queen", "Queen", "Queen", "The Plague", "#7cc96c", "A brachiosaurus Zoan and cyborg with a huge pompadour."],
  ["jack", "Jack", "Jack", "The Drought", "#8f7a6a", "A mammoth Zoan with tusks and a hook blade."],
  ["katakuri", "Charlotte Katakuri", "Katakuri", "Sweet Commander", "#b4386b", "A scarf over his mouth, a mochi trident, and future-seeing Haki."],
  ["doflamingo", "Donquixote Doflamingo", "Doflamingo", "Heavenly Demon", "#ff7ab8", "A pink feather coat, red shades, an open white shirt and the strings of the Birdcage."],
  ["aokiji", "Kuzan · Aokiji", "Aokiji", "Blue Pheasant", "#7bc8f0", "Curly hair, a sleep mask, and Ice Age."],
  ["kizaru", "Borsalino · Kizaru", "Kizaru", "Yellow Monkey", "#f3d04b", "A striped yellow suit and light-speed kicks."],
  ["akainu", "Sakazuki · Akainu", "Akainu", "Red Dog", "#e2442c", "A cap, a red suit, and a magma fist."],
  ["fujitora", "Issho · Fujitora", "Fujitora", "Purple Tiger", "#a479d9", "A blind admiral with a gravity blade and a gambler's luck."],
  ["ryokugyu", "Aramaki · Ryokugyu", "Ryokugyu", "Green Bull", "#4fbf62", "A forest of green hair and the Woods-Woods Fruit."],
  ["tsuru", "Tsuru", "Tsuru", "Great Staff Officer", "#c4cde0", "A veteran vice admiral. Her Wash-Wash Fruit can wash anyone clean."],
  ["edward-weevil", "Edward Weevil", "Weevil", "Whitebeard Junior", "#e8dcc0", "He has Whitebeard's moustache and bisento, and the strength to back them up."],
  ["benn-beckman", "Benn Beckman", "Beckman", "Red Hair First Mate", "#b9c4d4", "A grey ponytail, a cigarette, and a musket."],
  ["lucky-roux", "Lucky Roux", "Lucky Roux", "Meat Lover", "#f0a35a", "Shanks's cook. Always holding a drumstick, never without his pistol."],
  ["yasopp", "Yasopp", "Yasopp", "Chaser", "#d8b45c", "Usopp's father. Dreadlocks, a bandana, and a sniper's aim."],
  ["rob-lucci-awakened", "Rob Lucci", "Lucci", "Leopard of Egghead", "#e8c26a", "Lucci in white: top hat, purple rose, Hattori on his shoulder and a Rokuogan ready to fire."],
  ["law-awakened", "Trafalgar Law", "Law", "Surgeon of Death", "#5ccfd8", "Room glowing and Kikoku drawn."],
  ["kid-awakened", "Eustass Kid", "Kid", "Magnetic Emperor", "#ff5a3c", "A giant magnetic arm and the Damned Punk."],
  ["sanji-ifrit-jambe", "Sanji · Ifrit Jambe", "Ifrit Sanji", "Blue Flame Kicker", "#5ab0ff", "Sanji's legs burning with blue Ifrit flames."],
  ["vergo", "Vergo", "Vergo", "Demon Bamboo", "#b07ae8", "Armament Haki over his whole body, and a bamboo stick harder than steel."],
  ["killer-onigashima", "Killer · Onigashima", "Onigashima Killer", "Kamazo", "#7fc0f0", "Killer at Onigashima: the striped mask, a wild blond mane and the Punisher's scythes."],
] as const satisfies readonly Row[];

const MYTHIC = [
  ["prime-garp", "Monkey D. Garp", "Garp", "Hero of the Marines", "#ffffff", "Young Garp at God Valley, punching a galaxy wide open."],
  ["prime-rayleigh", "Silvers Rayleigh", "Rayleigh", "Right Hand of the King", "#b7ffe9", "The Dark King, right hand of the Roger Pirates at the height of his power."],
  ["rocks-d-xebec", "Rocks D. Xebec", "Rocks", "Captain of the Rocks", "#ff4d6d", "The pirate who almost ruled the world, and whose crew made the Emperors."],
  ["imu", "Imu", "Imu", "Sovereign of the Empty Throne", "#c06bff", "The hidden ruler of the world, with glowing eyes and a crown of shadow."],
  ["joy-boy", "Joy Boy", "Joy Boy", "Warrior of Liberation", "#fff3a6", "A laughing silhouette from the Void Century, sword raised high."],
  ["saint-saturn", "Saint Jaygarcia Saturn", "Saturn", "Elder of Science", "#c9b8ff", "White curls, a scarred brow, and a twisted cane. One of the Five Elders."],
  ["saint-mars", "Saint Marcus Mars", "Mars", "Elder of Environment", "#ff7a5c", "A tall elder who can become a giant bird of fire."],
  ["saint-warcury", "Saint Topman Warcury", "Warcury", "Elder of Justice", "#f2d58a", "A huge elder with a boar form and enormous tusks."],
  ["saint-nusjuro", "Saint Ethanbaron V. Nusjuro", "Nusjuro", "Elder of Finance", "#9fe7ff", "A swordsman elder with a horse form and freezing slashes."],
  ["saint-ju-peter", "Saint Shepherd Ju Peter", "Ju Peter", "Elder of Agriculture", "#8cffb0", "A sandworm form big enough to eat the land."],
  ["saint-garling", "Saint Figarland Garling", "Garling", "Supreme Commander", "#ffe680", "The champion of God Valley, with star-burst hair and a long beard."],
  ["shanks-divine", "Shanks", "Shanks", "Red-Haired Emperor", "#ff3b3b", "Gryphon glows with Conqueror's Haki for Divine Departure."],
  ["blackbeard-full", "Blackbeard", "Blackbeard", "Darkness & Quake", "#7a5cff", "Darkness in one hand, quakes in the other."],
  ["kaido-hybrid", "Kaido", "Kaido", "Strongest Creature", "#4f8fff", "Dragon horns, a kanabo, and the purple lightning of Thunder Bagua."],
  ["big-mom-full", "Big Mom", "Big Mom", "Mother of All Souls", "#ff7ac8", "Zeus and Prometheus at her side, with her soul set to rampage."],
  ["luffy-gear-5-bajrang", "Luffy · Gear 5", "Gear 5 Luffy", "Sun God Nika", "#fff6c9", "Cloud-white hair, a purple sash, and the drums of liberation pounding."],
  ["zoro-conqueror", "Zoro", "Zoro", "King of Hell", "#30ff8a", "All three blades coated in Advanced Conqueror's Haki."],
  ["roger-prime", "Gol D. Roger", "Roger", "The Pirate King", "#ffcc33", "Ace in his hand and the world in his laugh. The man who reached Laugh Tale."],
  ["whitebeard-quake", "Whitebeard", "Whitebeard", "World's Strongest Man", "#e8f6ff", "A bisento and a fist that splits the air."],
  ["dragon-full", "Monkey D. Dragon", "Dragon", "World's Worst Criminal", "#5cff9d", "The leader of the Revolutionary Army, with storms at his command."],
  ["mihawk-strongest", "Mihawk", "Mihawk", "Greatest Swordsman", "#ffd24a", "One swing of Yoru splits glaciers. No one stands above him."],
  ["sengoku", "Sengoku", "Sengoku", "The Buddha", "#ffd84a", "The golden Buddha: a giant of light with a blazing halo and a shockwave palm."],
  ["loki", "Loki", "Loki", "Prince of Elbaph", "#b98cff", "The cursed giant prince of Elbaph: braided pink hair, a horned helm, a purple fur cape and the hammer Ragnir."],
] as const satisfies readonly Row[];

export const CHEST_RARITIES: readonly ChestCharacterRarity[] = ["common", "uncommon", "rare", "epic", "legendary", "mythic"];
const ROWS = { common: COMMON, uncommon: UNCOMMON, rare: RARE, epic: EPIC, legendary: LEGENDARY, mythic: MYTHIC };

type AnyRow = (typeof ROWS)[ChestCharacterRarity][number];
export type ChestCharacterId = AnyRow[0];

export interface ChestCharacter {
  id: ChestCharacterId;
  name: string;
  shortName: string;
  epithet: string;
  color: string;
  detail: string;
  rarity: ChestCharacterRarity;
  grade: string;
  achievementId: null;
  chestOnly: true;
}

const label = (rarity: ChestCharacterRarity) => rarity[0].toUpperCase() + rarity.slice(1);

export const CHEST_CHARACTERS: readonly ChestCharacter[] = CHEST_RARITIES.flatMap(rarity =>
  (ROWS[rarity] as readonly AnyRow[]).map(([id, name, shortName, epithet, color, detail]) => ({
    id, name, shortName, epithet, color, detail, rarity, grade: label(rarity), achievementId: null, chestOnly: true as const,
  })));

export const CHEST_POOLS: Record<ChestCharacterRarity, readonly ChestCharacterId[]> = Object.fromEntries(
  CHEST_RARITIES.map(rarity => [rarity, CHEST_CHARACTERS.filter(c => c.rarity === rarity).map(c => c.id)]),
) as unknown as Record<ChestCharacterRarity, readonly ChestCharacterId[]>;

const BY_ID = new Map<string, ChestCharacter>(CHEST_CHARACTERS.map(c => [c.id, c]));
export function chestCharacterById(id: unknown): ChestCharacter | undefined {
  return typeof id === "string" ? BY_ID.get(id) : undefined;
}
export function isChestCharacterId(id: unknown): id is ChestCharacterId {
  return typeof id === "string" && BY_ID.has(id);
}
