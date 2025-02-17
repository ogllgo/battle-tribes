import { ServerComponentType, TribesmanAIType } from "battletribes-shared/components";
import { Settings } from "battletribes-shared/settings";
import { TribeType } from "battletribes-shared/tribes";
import { randInt, randItem } from "battletribes-shared/utils";
import { PacketReader } from "battletribes-shared/packets";
import { TribeComponentArray } from "./TribeComponent";
import { Entity } from "../../../../shared/src/entities";
import { playSoundOnEntity } from "../../sound";
import ServerComponentArray from "../ServerComponentArray";
import { ItemType } from "../../../../shared/src/items/items";
import { EntityConfig } from "../ComponentArray";

export interface TribesmanAIComponentParams {
   readonly aiType: TribesmanAIType;
   readonly relationsWithPlayer: number;
   readonly craftingItemType: ItemType;
   readonly craftingProgress: number;
}

export interface TribesmanAIComponent {
   aiType: TribesmanAIType;
   relationsWithPlayer: number;

   craftingItemType: ItemType;
   craftingProgress: number;
}

const GOBLIN_ANGRY_SOUNDS: ReadonlyArray<string> = ["goblin-angry-1.mp3", "goblin-angry-2.mp3", "goblin-angry-3.mp3", "goblin-angry-4.mp3"];
const GOBLIN_ESCAPE_SOUNDS: ReadonlyArray<string> = ["goblin-escape-1.mp3", "goblin-escape-2.mp3", "goblin-escape-3.mp3"];
const GOBLIN_AMBIENT_SOUNDS: ReadonlyArray<string> = ["goblin-ambient-1.mp3", "goblin-ambient-2.mp3", "goblin-ambient-3.mp3", "goblin-ambient-4.mp3", "goblin-ambient-5.mp3"];

export const TribesmanAIComponentArray = new ServerComponentArray<TribesmanAIComponent, TribesmanAIComponentParams, never>(ServerComponentType.tribesmanAI, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   onTick: onTick,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(reader: PacketReader): TribesmanAIComponentParams {
   const aiType = reader.readNumber();
   const relationsWithPlayer = reader.readNumber();
   const craftingItemType = reader.readNumber();
   const craftingProgress = reader.readNumber();

   return {
      aiType: aiType,
      relationsWithPlayer: relationsWithPlayer,
      craftingItemType: craftingItemType,
      craftingProgress: craftingProgress
   };
}

function createComponent(entityConfig: EntityConfig<ServerComponentType.tribesmanAI, never>): TribesmanAIComponent {
   const tribesmanAIComponentParams = entityConfig.serverComponents[ServerComponentType.tribesmanAI];

   return {
      aiType: tribesmanAIComponentParams.aiType,
      relationsWithPlayer: tribesmanAIComponentParams.relationsWithPlayer,
      craftingItemType: tribesmanAIComponentParams.craftingItemType,
      craftingProgress: tribesmanAIComponentParams.craftingProgress
   };
}

function getMaxRenderParts(): number {
   return 0;
}

function onTick(entity: Entity): void {
   const tribeComponent = TribeComponentArray.getComponent(entity);
   const tribesmanAIComponent = TribesmanAIComponentArray.getComponent(entity);

   // Sounds
   switch (tribesmanAIComponent.aiType) {
      case TribesmanAIType.attacking: {
         if (Math.random() < 0.2 / Settings.TPS) {
            switch (tribeComponent.tribeType) {
               case TribeType.goblins: {
                  playSoundOnEntity(randItem(GOBLIN_ANGRY_SOUNDS), 0.4, 1, entity, true);
                  break;
               }
               case TribeType.barbarians: {
                  playSoundOnEntity("barbarian-angry-1.mp3", 0.4, 1, entity, true);
                  break;
               }
            }
         }
         break;
      }
      case TribesmanAIType.escaping: {
         if (Math.random() < 0.2 / Settings.TPS) {
            switch (tribeComponent.tribeType) {
               case TribeType.goblins: {
                  playSoundOnEntity(randItem(GOBLIN_ESCAPE_SOUNDS), 0.4, 1, entity, true);
                  break;
               }
            }
         }
         break;
      }
      default: {
         if (Math.random() < 0.2 / Settings.TPS) {
            switch (tribeComponent.tribeType) {
               case TribeType.goblins: {
                  playSoundOnEntity(randItem(GOBLIN_AMBIENT_SOUNDS), 0.4, 1, entity, true);
                  break;
               }
               case TribeType.barbarians: {
                  playSoundOnEntity("barbarian-ambient-" + randInt(1, 2) + ".mp3", 0.4, 1, entity, true);
                  break;
               }
            }
         }
         break;
      }
   }
}

function padData(reader: PacketReader): void {
   reader.padOffset(4 * Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: Entity): void {
   const tribesmanAIComponent = TribesmanAIComponentArray.getComponent(entity);

   tribesmanAIComponent.aiType = reader.readNumber();
   tribesmanAIComponent.relationsWithPlayer = reader.readNumber();
   tribesmanAIComponent.craftingItemType = reader.readNumber();
   tribesmanAIComponent.craftingProgress = reader.readNumber();
}