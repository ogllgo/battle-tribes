import { TribesmanTitle } from "../../shared/src/titles";
import { TribeType } from "../../shared/src/tribes";
import { randItem } from "../../shared/src/utils";

// @Incomplete: different names for workers and warriors

const SCRAPPY_NAMES = [
   "Scrapz",
   "Klik",
   "Tinker",
   "Boltz",
   "Clunk",
   "Spindle",
   "Patch",
   "Sprocket",
   "Nutscraper"
];

// @Cleanup: location?
const COGWALKER_NAMES = [
   "Sparky",
   "Bill Cogsby",
   "Gearlok the Destroyer",
   "Axel",
   "Brassik",
   "Clanker",
   "Grindr",
   "Torque",
   "Mechus",
   "Pistorius",
   "Weldon",
   "Thunderclock",
   "MiniLad"
];

const STRIDER_NAMES = [
   "Treadnaught",
   "Ironstrider",
   "Tri-Gear",
   "Blastrek",
   "Warstalk",
   "Gunlok",
   "Thundraxx",
   "Tripodion",
   "Ironshot",
   "Gearstride",
   "Third-Leg"
];

const PLAINSPEOPLE_NAMES: ReadonlyArray<string> = [
   "Oda",
   "Grug",
   "Og",
   "Urgh",
   "Blurgh"
];

const BARBARIAN_NAMES: ReadonlyArray<string> = [
   "RAAAAGH",
   "Bjorn",
   "HOUUUURGH",
   "Erik",
   "Ivar",
   "Agmundr",
   "Harald",
   "Frednog",
   "Snigvut"
];

const FROSTLING_NAMES: ReadonlyArray<string> = [
   "Fraazgakk",
   "Fruzeek",
   "Grivve"
];

const GOBLIN_NAMES: ReadonlyArray<string> = [
   "Vuzz",
   "Klanzogz",
   "Striex",
   "Slokx"
];

const DWARF_NAMES: ReadonlyArray<string> = [
   "Durin",
   "Thorin",
   "Dugim",
   "Gimli",
   "Baldrik",
   "Bronin",
   "Fundin",
   "Garim",
   "Nain",
   "Marrin",
   "Stigr",
   "Brokk",
   "Durrak",
   "Grottin",
   "Hraldir",
   "Kromlin",
   "Nordri",
   "Ulgrim",
   "Varrik",
   "Wulfrin",
   "Borrik",
   "Erdrik",
   "Thrain",
   "Orik",
   "Skorr",
   "Frerin",
   "Torrin",
   "Zarn",
   "Grimm",
   "Haddar"
];

const TITLE_DISPLAY_OPTIONS: Record<TribesmanTitle, ReadonlyArray<string>> = {
   [TribesmanTitle.builder]: ["Builder", "Object Constructor", "Manipulator of Materials"],
   [TribesmanTitle.berrymuncher]: ["Berry-muncher", "Muncher of Berries"],
   [TribesmanTitle.bloodaxe]: ["Bloodaxe", "Shedder of Blood"],
   [TribesmanTitle.deathbringer]: ["Deathbringer", "Precursor of Doom", "Enemy of Life"],
   [TribesmanTitle.gardener]: ["Gardener", "Maintainer of Plants", "Friend to Plants"],
   [TribesmanTitle.packrat]: ["Packrat", "Carryer of Things"],
   [TribesmanTitle.shrewd]: ["the Shrewd", "Haver of Brains"],
   [TribesmanTitle.sprinter]: ["Owner of the Fast Legs", "Haver of Legs", "the Fast"],
   [TribesmanTitle.wellful]: ["of Good Health", "the Wellful"],
   [TribesmanTitle.winterswrath]: ["Winterswrath", "Antithesis of Cold", "Torment of Winter"],
   [TribesmanTitle.yetisbane]: ["Yetisbane", "Slayer of Yetis"]
};

const UNTITLED_ADJECTIVES: ReadonlyArray<string> = [
   "Useless",
   "Weak",
   "Puny",
   "Small",
   "Frail",
   "Sickly",
   "Inebriated",
   "Demented",
   "Wimp",
   "Weed",
   "Twig",
   "Ant",
   "Rickety",
   "Elderly",
   "Pale",
   "Feeble",
   "Poor",
   "Thing",
   "Pebble",
   "Thin",
   "Anorexic",
   "Depressed",
   "Struggler",
   "Limp",
   "Lame",
   // shh
   "Twink"
];

export function generateTribesmanName(tribeType: TribeType): string {
   let nameArray: ReadonlyArray<string>;
   switch (tribeType) {
      case TribeType.plainspeople: {
         nameArray = PLAINSPEOPLE_NAMES;
         break;
      }
      case TribeType.barbarians: {
         nameArray = BARBARIAN_NAMES;
         break;
      }
      case TribeType.frostlings: {
         nameArray = FROSTLING_NAMES;
         break;
      }
      case TribeType.goblins: {
         nameArray = GOBLIN_NAMES;
         break;
      }
      case TribeType.dwarves: {
         nameArray = DWARF_NAMES;
      }
   }
   
   // Pick a random base name
   let name = nameArray[Math.floor(Math.random() * nameArray.length)];

   // Add the untitled adjective
   const descriptor = UNTITLED_ADJECTIVES[Math.floor(Math.random() * UNTITLED_ADJECTIVES.length)];
   name += " the " + descriptor;

   return name;
}

export function addTitleToTribesmanName(name: string, title: TribesmanTitle): string {
   // @Incomplete: remove the untitled adjective
         
   const displayOptions = TITLE_DISPLAY_OPTIONS[title];
   const displayText = displayOptions[Math.floor(Math.random() * displayOptions.length)];
   return name + ", " + displayText;
}

export function generateScrappyName(): string {
   return randItem(SCRAPPY_NAMES);
}

export function generateCogwalkerName(): string {
   return randItem(COGWALKER_NAMES);
}