import type { AdventureArc } from "./levels";
import type { LoreSet } from "./lore-types";

// Supplemental arc facts. Existing lore is kept intact and appears first.
export const ADVENTURE_LORE_EXPANSION: Partial<Record<AdventureArc, LoreSet>> = {
  alabasta: {
    core: `
Which port city is the Straw Hats' first stop in Alabasta? :: Nanohana
Which oasis town becomes the rebel army's base? :: Yuba
Which Alabasta town is known as the Green City? :: Erumalu
Which city contains Crocodile's Rain Dinners casino? :: Rainbase
What is the name of Baroque Works' plan to seize Alabasta? :: Operation Utopia
What codename does Vivi use while undercover in Baroque Works? :: Miss Wednesday
What codename does Igaram use in Baroque Works? :: Mr. 8
What criminal organization does Crocodile lead? :: Baroque Works
Which Baroque Works agent is also known as Mr. 2? :: Bentham|Bon Clay
What is the name of Alabasta's royal duck squadron? :: Super Spot-Billed Duck Troops|Super Spot-Billed Ducks
Which Baroque Works agent is known as Mr. 5? :: Gem
Which Baroque Works agent is known as Miss Valentine? :: Mikita
`,
    lore: `
Which Baroque Works pair attacks Usopp and Chopper in Alabasta? :: Mr. 4 and Miss Merry Christmas|Mr. 4 and Drophy
What is the name of Mr. 4's four-ton baseball bat? :: 4-Ton Bat|Four-Ton Bat
Who impersonates King Cobra during Baroque Works' takeover plot? :: Bentham|Mr. 2|Bon Clay
Which agent disguises himself as Nami to fight Sanji? :: Bentham|Mr. 2|Bon Clay
Which Alabasta guardian has the form of a jackal? :: Chaka
Which duck is the captain of Vivi's Super Spot-Billed Duck squadron? :: Karoo
`,
    deep: "",
  },
  skypiea: {
    core: `
What name is given to the dial-powered skyboard used by Sky Islanders? :: Waver
Which Shandian warrior fights with dual pistols? :: Braham
Which Shandian warrior wields a lance? :: Kamakiri
Which Shandian warrior carries an axe? :: Genbo
What is the name of Noland's descendant searching for the City of Gold? :: Mont Blanc Cricket
What is the name of Kalgara's daughter? :: Mousse
Which group patrols Angel Island as its police force? :: White Berets
What precious instrument does the Shandian tribe seek to reclaim? :: Golden Bell
Which Shandian warrior is known for her rifle? :: Raki
What is the name of the huge cloud island that forms Upper Yard? :: Upper Yard
`,
    lore: `
Which dial releases a burst of stored impact? :: Impact Dial
Which dial can record and replay sounds? :: Tone Dial
Which dial stores and releases flame? :: Flame Dial
Which dial stores air for a powerful burst? :: Jet Dial
Which dial captures and replays images? :: Visual Dial
Which dial releases stored light in a flash? :: Flash Dial
Which dial stores a gust of wind? :: Breath Dial
Which dial can create a cloud from stored material? :: Cloud Dial
Which dial stores water for later use? :: Water Dial
Which dial does Wyper use despite its severe recoil? :: Reject Dial
What are the solid clouds used to form islands called? :: Island Cloud
What cloud forms the sea beneath a sky island? :: Sea Cloud
`,
    deep: `
What is the name of the white dog that accompanies Ohm? :: Holy
What is the name of the bird that serves as Shura's mount? :: Fuza
Which of Enel's enforcers is a giant who patrols Upper Yard? :: Yama
What sky current launches Jaya's missing half into the clouds? :: Knock Up Stream
What is the name of the ancient ship found in Upper Yard? :: St. Briss|St. Briss Ship
Which Shandian warrior is Kalgara's descendant and leads the resistance? :: Wyper|Wiper
What is the name of the bell tower's golden instrument? :: Shandora's Golden Bell|Golden Bell
Which sky island priest uses the Ordeal of Iron's iron clouds? :: Ohm
What currency is used by residents of Skypiea? :: Extol|Extols
`,
  },
  "water-7": {
    core: `
Which sea-train station serves Water 7? :: Blue Station
At which dock is Galley-La's headquarters located? :: Dock One|Dock 1
What name does Franky give his family's scrapyard hideout? :: Franky House
Who founded the shipwright tradition that Tom passes on in Water 7? :: Tom
`,
    lore: "",
    deep: "",
  },
  "enies-lobby": {
    core: `
What does Robin shout when she chooses to live with the Straw Hats? :: I want to live
What is the name of the great courthouse at Enies Lobby? :: Enies Lobby Courthouse|Courthouse
`,
    lore: `
Who is Nico Robin's mother? :: Nico Olvia|Olvia
Which two Franky Family sisters help the Straw Hats? :: Mozu and Kiwi|Kiwi and Mozu
Which ship returns from the sea to rescue the crew after Enies Lobby? :: Going Merry|Merry
What name is given to the World Government's call for a fleet bombardment? :: Buster Call
`,
    deep: `
Which CP9 agent uses Life Return to control his hair? :: Kumadori
What is the name of Lucci's leopard-model Devil Fruit? :: Neko Neko no Mi, Model: Leopard|Cat-Cat Fruit, Model: Leopard
Which CP9 member uses the Six King Gun technique? :: Rob Lucci|Lucci
What is the Doriki score assigned to Blueno? :: 820
`,
  },
  "thriller-bark": {
    core: "",
    lore: `
Whose shadow is placed into the corpse that becomes the samurai Ryuma? :: Brook
Whose shadow is used to animate the zombie bride who wants to marry Absalom? :: Nami
What is the name of the enormous ship-island ruled by Gecko Moria? :: Thriller Bark
What is the name of the three-headed dog zombie met in the forest? :: Cerberus
Which bat-like zombie guides visitors through Thriller Bark? :: Hildon
What is the name of Perona's ability that sends negative ghosts through a target? :: Negative Hollow|Negative Hollows
What is the name of Moria's shadow double? :: Doppelman|Doppelman Shadow
Which sea surrounds Thriller Bark in perpetual fog? :: Florian Triangle
What becomes of a zombie when its stolen shadow is returned to its owner? :: It collapses|It becomes lifeless|It dies
Which zombie has the body of a centaur and serves Moria? :: General Zombie Centaur|General Zombie
What is the name of the talking wild boar zombie? :: Hildon
Which group of zombies is made from corpses belonging to famous people? :: General Zombies
What is the name of the zombie who wields a pair of swords and has a samurai's body? :: Ryuma
Which zombie's body is used as the base for the spider-monkey Tararan? :: Tararan
`,
    deep: `
What is the name of the cemetery where the Straw Hats first encounter the island's zombies? :: Thriller Bark Cemetery|Cemetery
Which zombie general uses a giant pair of scissors? :: Kumashi
What is the name of Perona's stuffed bear zombie? :: Kumashi
Which shadow is implanted in the dog-penguin zombie Inuppe? :: Sanji
Which shadow is implanted in the zombie Jigoro? :: Zoro
Which shadow is implanted in the spider-monkey Tararan? :: Franky
What is the name of the zombie that receives Usopp's shadow? :: Cerberus
What is the name of the zombie that receives Chopper's shadow? :: Victoria Cindry|Cindry
Which zombie has the shadow of a famous pirate and is found in the graveyard? :: Captain John
What is the name of the military-style zombie who has a lion's body? :: General Zombie Lion|Lion Zombie
Which wild zombie is a combination of a crocodile and a gorilla? :: Unigaro
What is the name of the zombie horse that carries Moria? :: Zombie Horse|Moria's Horse
Which zombie's body is used for the wedding-cake-loving Lola? :: Lola
What phrase does Perona use for the tiny ghosts she sends into enemies? :: Negative Hollows|Hollows
What is the name of the shadow power Gecko Moria ate? :: Kage Kage no Mi|Shadow-Shadow Fruit
What is the name of Perona's ghost-producing Devil Fruit? :: Horo Horo no Mi|Hollow-Hollow Fruit
What is the name of Absalom's invisibility Devil Fruit? :: Suke Suke no Mi|Clear-Clear Fruit
What is the name of Brook's revival Devil Fruit? :: Yomi Yomi no Mi|Revive-Revive Fruit
Which pirate's corpse is revived as the samurai who duels Zoro? :: Shimotsuki Ryuma|Ryuma
Which member of the Rumbar Pirates was their captain before Brook? :: Yorki
What song did Brook's crew record for Laboon? :: Binks' Sake|Binks Sake|Binks' Brew
How many shadows are placed into Luffy to create Nightmare Luffy? :: 100|One hundred
How many years did Brook drift alone in the Florian Triangle? :: 50 years|50
Which zombie general has the body of a giant wild boar? :: Oars
Which zombie is made from the body of a famous samurai from Wano? :: Ryuma
What is the name of the dog-like zombie that Sanji's shadow inhabits? :: Inuppe
What is the name of the young woman whose corpse becomes a zombie after Hogback's operation? :: Victoria Cindry|Cindry
What emotion do Perona's Negative Hollows force their targets to feel? :: Despair|Hopelessness
`,
  },
  "impel-down": {
    core: "",
    lore: "",
    deep: `
What is the name of Impel Down's Level 2, where wild beasts roam? :: Beast Hell
`,
  },
  marineford: {
    core: "",
    lore: "",
    deep: `
Which giant Vice Admiral has his head struck by Whitebeard during the battle? :: Ronse
Which giant Marine Vice Admiral is knocked away by Luffy as he rushes toward Ace? :: John Giant
What is the name of the elevated structure where Ace is to be executed? :: Marineford Execution Platform|Execution Platform
`,
  },
  "fishman-island": {
    core: "",
    lore: `
What is the name of the large plaza where Hody's coup reaches its climax? :: Gyoncorde Plaza
What is the name of Neptune's underwater palace? :: Ryugu Palace|Ryugu Castle
Which large shark carries Shirahoshi inside a bubble? :: Megalo
What is the name of the mermaid-run cafe in the Mermaid Cove? :: Mermaid Cafe
Which mermaid befriends the Straw Hats and works at the Mermaid Cafe? :: Camie|Keimi
What is the name of the district where Hody and his followers grew up? :: Fish-Man District|Fishman District
Which army protects the Ryugu Kingdom? :: Neptune Army
What is the name of the giant ship kept beneath Fish-Man Island? :: Noah
Which fish-man species is Prince Fukaboshi? :: Shark merman|Shark Merman
Which mermaid fortune teller predicts that Luffy will destroy the island? :: Shyarly|Madam Shyarly
What is the name of the island's coral-covered marketplace? :: Coral Hill
Which group of creatures can Shirahoshi summon and command? :: Sea Kings
What is the name of the seahorse merman who serves as the Minister of the Right? :: Minister of the Right
Which pirate group attacks the island after the Straw Hats arrive? :: New Fish-Man Pirates
What kind of fish-man is Jinbe? :: Whale shark fish-man|Whale Shark Fish-Man
What is the name of the cave where the apology Poneglyph is kept? :: Sea Forest
What type of mermaid is Shirahoshi? :: Giant mermaid|Mermaid
Which fish-man swordsman serves as a captain in Hody's crew? :: Hyouzou|Hyozou
What is the name of the mermaid cove where the Straw Hats meet the mermaids? :: Mermaid Cove
Which royal prince is the second son of Neptune? :: Ryuboshi
Which royal prince is the third son of Neptune? :: Manboshi
Which royal family member urges Queen Otohime to keep pursuing peace? :: Shirahoshi
`,
    deep: `
Who secretly shoots Queen Otohime and sets the palace's fire? :: Hody Jones|Hody
What is the name of the ship Vander Decken commands? :: Flying Dutchman
Which ancient weapon's power is carried by Shirahoshi? :: Poseidon
What are the steroid pills used by Hody's crew called? :: Energy Steroids|Energy Steroid|E.S.
What is the name of the fish-man district's central hideout? :: Fish-Man District|Fishman District
Which Sea King princess is able to hear the voices of the Sea Kings? :: Shirahoshi
What is the name of the royal family's traveling shark? :: Megalo
Which human pirate crew did Fisher Tiger form after escaping Mary Geoise? :: Sun Pirates|Sun Pirate Crew
What mark is branded on former slaves rescued by Fisher Tiger? :: Sun Pirates' Sun|Sun mark
What was the name of the ship Joy Boy left behind on Fish-Man Island? :: Noah
Who is the human recipient of Joy Boy's apology on the Poneglyph? :: Poseidon|The Mermaid Princess
What is the name of the mermaid who runs the island's fortune-telling business? :: Shyarly|Madam Shyarly
Which Big Mom Pirate accompanies Pekoms to collect the island's candy tribute? :: Tamago|Baron Tamago
Which Sun Pirate is a doctor and former slave? :: Aladdin|Aladine
What is the name of the Sea King-sized vessel Vander Decken sends toward Shirahoshi? :: Noah
Which prince leads the Ryugu Kingdom's army during Hody's coup? :: Fukaboshi
What is the name of the blood type compatibility system that allows Jinbe to transfuse Luffy? :: Blood transfusion|Transfusion
Which Fish-Man Island resident is Tom's younger brother and a shipwright? :: Den
What kind of fish-man is Vander Decken IX? :: Japanese bullhead shark fish-man|Japanese Bullhead Shark Fish-Man
What is the name of the pirate who stalks Shirahoshi with the Mark-Mark Fruit? :: Vander Decken IX|Vander Decken
Which former Sun Pirate is also known as the Knight of the Sea? :: Jinbe|Jimbei
What is the name of the island's royal sovereign who once sailed with the Roger Pirates? :: Neptune|King Neptune
Which ancient promise is recorded on the Sea Forest Poneglyph? :: Joy Boy's apology|Joy Boy's Apology
`,
  },
  "punk-hazard": {
    core: "",
    lore: "",
    deep: `
What is the name of the artificial Devil Fruit factory's addictive chemical? :: SAD
Which giant child protects the other children from the poisoned candy? :: Mocha
What are the names of the two Yeti Cool Brothers? :: Rock and Scotch|Scotch and Rock
What is Brownbeard's centaur crew called? :: Brownbeard Pirates
Which gas weapon is created when Smiley transforms? :: Shinokuni|Land of the Dead
`,
  },
  dressrosa: {
    core: "",
    lore: `
What is the name of the living toy soldier who protects Rebecca? :: Soldier|The Toy Soldier
Which colosseum block does Bartolomeo win? :: Block B
Which colosseum block does Rebecca win? :: Block D
What is the name of the pirate club led by Bartolomeo? :: Barto Club
What is the name of the bridge connecting Dressrosa to Green Bit? :: Green Bit Bridge
What is the name of the Donquixote Family's underground factory product? :: SMILE
Which admiral visits Dressrosa while disguised as a blind gambler? :: Fujitora|Issho
What is the name of the dwarf kingdom beneath Green Bit? :: Tontatta Kingdom|Tontatta
`,
    deep: `
Which gladiator is known by the name Thunder Soldier? :: Kyros|The Soldier
What is the name of Kyros and Scarlet's daughter? :: Rebecca
What is the name of the king's wife who is killed by Diamante? :: Scarlet
Which Tontatta warrior captain uses the Stitch-Stitch Fruit? :: Leo
What is the name of the Tontatta princess who can heal injuries? :: Mansherry
Which Tontatta leader is known as the chief? :: Gancho
Which tiny warrior steals Zoro's sword in the colosseum? :: Wicca
What is the name of the colosseum announcer? :: Gatz
Which Donquixote officer is the former Marine who fights Law? :: Vergo
Which Donquixote officer uses the Swim-Swim Fruit? :: Senor Pink|Señor Pink
Which Donquixote officer is assigned to the colosseum's Block C? :: Diamante
What is the name of the string cage that surrounds Dressrosa? :: Birdcage|Torikago
Which young Tontatta leads the mission to free the toys? :: Leo
What is the name of Doflamingo's family ship? :: Numancia Flamingo
Which colosseum fighter is known as the Pirate Prince? :: Cavendish
What is the name of Cavendish's violent alter ego? :: Hakuba
Which country does Elizabello II rule? :: Prodence Kingdom
What is the name of King Riku's granddaughter? :: Rebecca
Which toy soldier is revealed to be a former gladiator? :: Kyros|The Soldier
`,
  },
  "whole-cake": {
    core: "",
    lore: "",
    deep: `
What is the name of Big Mom's sword-shaped homie? :: Napoleon
Which homie does Nami befriend and later command? :: Zeus
What are Big Mom's three most powerful homies called? :: Zeus, Prometheus, and Napoleon|Prometheus, Zeus, and Napoleon
What is the name of the forest filled with living homies? :: Seducing Woods
What is the name of the poison weapon Bege plans to use at the tea party? :: KX Launcher
What is the name of Big Mom's childhood orphanage? :: Sheep's House|Sheep House
Who raises Linlin at Sheep's House? :: Mother Carmel|Carmel
What is the name of the giant chief who is badly injured by young Linlin? :: Jorul
What is the name of the giant village where Linlin spends her childhood? :: Elbaph|Elbaf
What is Pudding's third eye capable of doing when fully awakened? :: Read Poneglyphs|Read the Poneglyphs
What is the name of the Vinsmoke family's kingdom? :: Germa Kingdom|Germa
What is the name of the Germa royal family's mobile warship fleet? :: Germa 66
Which Vinsmoke brother is known as Dengeki Blue? :: Vinsmoke Niji|Niji
Which Vinsmoke brother is known as Winch Green? :: Vinsmoke Yonji|Yonji
Which Vinsmoke brother is known as Poison Pink? :: Vinsmoke Reiju|Reiju
Which Vinsmoke brother is known as Sparking Red? :: Vinsmoke Ichiji|Ichiji
What is the name of Sanji's mother? :: Vinsmoke Sora|Sora
What is the name of Big Mom's living sun homie? :: Prometheus
What is the name of Big Mom's living thundercloud homie? :: Zeus
Which Charlotte daughter is the captain of the chess soldiers? :: Charlotte Amande|Amande
Which underworld broker is called the King of the World of Pleasure? :: Stussy
What is the name of the island where Sanji and Pudding's wedding is held? :: Whole Cake Island
Which Charlotte daughter has the Memo-Memo Fruit? :: Charlotte Pudding|Pudding
`,
  },
  wano: {
    core: "",
    lore: "",
    deep: `
What name is given to Kozuki Oden's nine retainers? :: Akazaya Nine|Nine Red Scabbards
What title is given to Kaido's three strongest lead performers? :: All-Stars|Disasters
What is the name of Kaido's iron club? :: Hassaikai
What is the name of Orochi's residence in the Flower Capital? :: Orochi Castle
Which three calamities serve as Kaido's All-Stars? :: King, Queen, and Jack|Jack, Queen, and King
`,
  },
};