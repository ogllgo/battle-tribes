import { DamageSource, Entity } from "battletribes-shared/entities";
import { Point } from "battletribes-shared/utils";
import { parseCommand } from "battletribes-shared/commands";
import { damageEntity, healEntity } from "./components/HealthComponent";
import { InventoryComponentArray, addItem } from "./components/InventoryComponent";
import { AttackEffectiveness } from "battletribes-shared/entity-damage-types";
import { getPlayerFromUsername } from "./server/player-clients";
import { TribeComponentArray } from "./components/TribeComponent";
import { ItemType, getItemTypeFromString } from "battletribes-shared/items/items";
import { getRandomPositionInEntity, TransformComponentArray } from "./components/TransformComponent";
import { Biome } from "../../shared/src/biomes";
import { Hitbox } from "./hitboxes";

const ENTITY_SPAWN_RANGE = 200;

const killPlayer = (player: Entity): void => {
   const transformComponent = TransformComponentArray.getComponent(player);
   const hitbox = transformComponent.hitboxes[0];
   
   const hitPosition = getRandomPositionInEntity(transformComponent);
   damageEntity(player, hitbox, null, 999999, DamageSource.god, AttackEffectiveness.effective, hitPosition, 0);
}

const damagePlayer = (player: Entity, damage: number): void => {
   const transformComponent = TransformComponentArray.getComponent(player);
   const hitbox = transformComponent.hitboxes[0];

   const hitPosition = getRandomPositionInEntity(transformComponent);
   damageEntity(player, hitbox, null, damage, DamageSource.god, AttackEffectiveness.effective, hitPosition, 0);
}

const setTime = (time: number): void => {
   // @Incomplete
   // Board.time = time;
}

const giveItem = (player: Entity, itemType: ItemType, amount: number): void => {
   if (amount === 0) {
      return;
   }

   addItem(player, InventoryComponentArray.getComponent(player), itemType, amount);
}

const tp = (player: Entity, x: number, y: number): void => {
   // const newPosition = new Point(x, y);
   // forcePlayerTeleport(player, newPosition);
}

// @Incomplete
// const tpBiome = (player: Entity, biomeName: Biome): void => {
//    const potentialTiles = getTilesOfBiome(biomeName);
//    if (potentialTiles.length === 0) {
//       console.warn(`No available tiles of biome '${biomeName}' to teleport to.`);
//       return;
//    }

//    let numAttempts = 0;
//    let tileIndex: TileIndex;
//    do {
//       tileIndex = randItem(potentialTiles);
//       if (++numAttempts === 999) {
//          return;
//       }
//    } while (surfaceLayer.tileIsWalls[tileIndex] === 1);
   
//    const tileX = getTileX(tileIndex);
//    const tileY = getTileY(tileIndex);
//    const x = (tileX + Math.random()) * Settings.TILE_SIZE;
//    const y = (tileY + Math.random()) * Settings.TILE_SIZE;

//    const newPosition = new Point(x, y);
//    forcePlayerTeleport(player, newPosition);
// }

export function registerCommand(command: string, player: Entity): void {
   const commandComponents = parseCommand(command);
   const numParameters = commandComponents.length - 1;

   switch (commandComponents[0]) {
      case "kill": {
         if (numParameters === 0) {
            killPlayer(player);
         } else if (numParameters === 1) {
            const targetPlayerName = commandComponents[1] as string;
            const player = getPlayerFromUsername(targetPlayerName);
            if (player !== null) {
               killPlayer(player);
            }
         }

         break;
      }
      case "damage": {
         if (numParameters === 1) {
            const damage = commandComponents[1] as number;
            damagePlayer(player, damage);
         } else if (numParameters === 2) {
            const username = commandComponents[1] as string;
            const damage = commandComponents[2] as number;

            const player = getPlayerFromUsername(username);
            if (player !== null) {
               damagePlayer(player, damage);
            }
         }

         break;
      }
      case "heal": {
         if (numParameters === 0) {
            healEntity(player, 99999, -1);
         } else if (numParameters === 1) {
            const healing = commandComponents[1] as number;
            healEntity(player, healing, -1);
         } else if (numParameters === 2) {
            const username = commandComponents[1] as string;
            const healing = commandComponents[2] as number;

            const player = getPlayerFromUsername(username);
            if (player !== null) {
               healEntity(player, healing, -1);
            }
         }

         break;
      }
      case "set_time": {
         setTime(commandComponents[1] as number);

         break;
      }
      case "give": {
         const itemTypeString = commandComponents[1];
         if (typeof itemTypeString === "number") {
            break;
         }

         const itemType = getItemTypeFromString(itemTypeString);
         if (itemType === null) {
            break;
         }

         if (numParameters === 1) {
            giveItem(player, itemType, 1);
         } else if (numParameters === 2) {
            const amount = commandComponents[2] as number;
            giveItem(player, itemType, amount);
         }
         
         break;
      }
      case "tp": {
         const x = commandComponents[1] as number;
         const y = commandComponents[2] as number;
         tp(player, x, y);
         break;
      }
      case "tpbiome": {
         const biomeName = commandComponents[1] as Biome;
         // tpBiome(player, biomeName);
         break;
      }
      case "unlockall": {
         const tribeComponent = TribeComponentArray.getComponent(player);
         tribeComponent.tribe.unlockAllTechs();
         
         break;
      }
      case "build": {
         const tribeComponent = TribeComponentArray.getComponent(player);
         // @Incomplete
         // forceBuildPlans(tribeComponent.tribe);
      }
   }
}