import { Entity, EntityType } from "../../shared/src/entities";
import { ItemRequirements } from "../../shared/src/items/crafting-recipes";
import { ItemType } from "../../shared/src/items/items";
import { PacketReader } from "../../shared/src/packets";
import { getTechByID, Tech, TechID, TechTreeUnlockProgress } from "../../shared/src/techs";
import { TribeType } from "../../shared/src/tribes";
import Camera from "./Camera";
import { updateTechTree } from "./components/game/tech-tree/TechTree";
import { TechInfocard_setSelectedTech } from "./components/game/TechInfocard";
import { playSound } from "./sound";

export interface TribesmanInfo {
   readonly entity: Entity;
   readonly entityType: EntityType;
   readonly name: string;
}

export interface ShortTribeInfo {
   readonly name: string;
   readonly id: number;
   readonly tribeType: TribeType;
}

export interface ExtendedTribeInfo extends ShortTribeInfo {
   readonly hasTotem: boolean;
   readonly numHuts: number;
   readonly tribesmanCap: number;
   readonly area: ReadonlyArray<[tileX: number, tileY: number]>;
   readonly selectedTech: Tech | null;
   readonly unlockedTechs: ReadonlyArray<Tech>;
   readonly techTreeUnlockProgress: TechTreeUnlockProgress;
   readonly tribesmen: ReadonlyArray<TribesmanInfo>;
}

export type TribeData = ExtendedTribeInfo | ShortTribeInfo;

export let playerTribe: ExtendedTribeInfo;
export const tribes = new Array<TribeData>();

export function tribeHasExtendedInfo(tribe: TribeData): tribe is ExtendedTribeInfo {
   return typeof (tribe as ExtendedTribeInfo).tribesmen !== "undefined";
}

export function updatePlayerTribe(tribe: ExtendedTribeInfo): void {
   // @Hack: the check for undefined
   if (typeof playerTribe !== "undefined" && tribe.unlockedTechs.length > playerTribe.unlockedTechs.length) {
      // @Incomplete: attach to camera so it doesn't decrease in loudness. Or make 'global sounds'
      playSound("research.mp3", 0.4, 1, Camera.position, null);
   }

   playerTribe = tribe;

   updateTechTree();
   TechInfocard_setSelectedTech(tribe.selectedTech);
}

export function getTribeByID(tribeID: number): TribeData {
   for (const tribe of tribes) {
      if (tribe.id === tribeID) {
         return tribe;
      }
   }
   throw new Error("No tribe data for tribe with ID " + tribeID);
}

export function readShortTribeData(reader: PacketReader): ShortTribeInfo {
   const tribeName = reader.readString();
   const tribeID = reader.readNumber();
   const tribeType = reader.readNumber();

   return {
      name: tribeName,
      id: tribeID,
      tribeType: tribeType
   };
}

export function readExtendedTribeData(reader: PacketReader): ExtendedTribeInfo {
   const tribeName = reader.readString();
   const tribeID = reader.readNumber();
   const tribeType = reader.readNumber();

   const hasTotem = reader.readBoolean();
   reader.padOffset(3);
   const numHuts = reader.readNumber();
   const tribesmanCap = reader.readNumber();

   const area = new Array<[tileX: number, tileY: number]>();
   const areaLength = reader.readNumber();
   for (let i = 0; i < areaLength; i++) {
      const tileX = reader.readNumber();
      const tileY = reader.readNumber();
      area.push([tileX, tileY]);
   }

   const rawSelectedTechID = reader.readNumber();
   const selectedTech = rawSelectedTechID !== -1 ? getTechByID(rawSelectedTechID) : null;

   const unlockedTechs = new Array<Tech>();
   const numUnlockedTechs = reader.readNumber();
   for (let i = 0; i < numUnlockedTechs; i++) {
      const techID = reader.readNumber();
      unlockedTechs.push(getTechByID(techID));
   }

   // Tech tree unlock progress
   const techTreeUnlockProgress: TechTreeUnlockProgress = {};
   const numTechProgressEntries = reader.readNumber();
   for (let i = 0; i < numTechProgressEntries; i++) {
      const techID = reader.readNumber() as TechID;

      const itemProgress: ItemRequirements = {};
      const numRequirements = reader.readNumber();
      for (let j = 0; j < numRequirements; j++) {
         const itemType = reader.readNumber() as ItemType;
         const amount = reader.readNumber();
         itemProgress[itemType] = amount;
      }

      const studyProgress = reader.readNumber();

      techTreeUnlockProgress[techID] = {
         itemProgress: itemProgress,
         studyProgress: studyProgress
      };
   }

   const tribesmen = new Array<TribesmanInfo>();
   const numTribesmen = reader.readNumber();
   for (let i = 0; i < numTribesmen; i++) {
      const entity = reader.readNumber() as Entity;
      const entityType = reader.readNumber() as EntityType;
      const name = reader.readString();

      const tribesman: TribesmanInfo = {
         entity: entity,
         entityType: entityType,
         name: name
      };
      tribesmen.push(tribesman);
   }

   return  {
      name: tribeName,
      id: tribeID,
      tribeType: tribeType,
      hasTotem: hasTotem,
      numHuts: numHuts,
      tribesmanCap: tribesmanCap,
      area: area,
      selectedTech: selectedTech,
      unlockedTechs: unlockedTechs,
      techTreeUnlockProgress: techTreeUnlockProgress,
      tribesmen: tribesmen
   };
}