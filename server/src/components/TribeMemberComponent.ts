import { ServerComponentType  } from "battletribes-shared/components";
import { Entity, EntityType } from "battletribes-shared/entities";
import { ComponentArray } from "./ComponentArray";
import { TribeComponentArray } from "./TribeComponent";
import { getStringLengthBytes, Packet } from "battletribes-shared/packets";
import { TransformComponentArray } from "./TransformComponent";
import { getEntityLayer, getEntityType } from "../world";
import { tribeMemberCanPickUpItem, VACUUM_RANGE } from "../entities/tribes/tribe-member";
import { Settings } from "../../../shared/src/settings";
import { lerp } from "../../../shared/src/utils";
import { itemEntityCanBePickedUp, ItemComponentArray } from "./ItemComponent";
import { PhysicsComponentArray } from "./PhysicsComponent";
import { TribesmanComponentArray } from "./TribesmanComponent";
import { registerPlayerDroppedItemPickup } from "../server/player-clients";
import { pickupItemEntity } from "./InventoryComponent";
import { adjustTribesmanRelationsAfterGift } from "./TribesmanAIComponent";

const enum Vars {
   VACUUM_STRENGTH = 25
}

/** For members of a tribe: e.g. tribesmen and automatons. */
export class TribeMemberComponent {
   public name: string;

   constructor(name: string) {
      this.name = name;
   }
}

export const TribeMemberComponentArray = new ComponentArray<TribeMemberComponent>(ServerComponentType.tribeMember, true, getDataLength, addDataToPacket);
TribeMemberComponentArray.onJoin = onJoin;
TribeMemberComponentArray.onTick = {
   func: onTick,
   tickInterval: 1
};
TribeMemberComponentArray.onEntityCollision = onEntityCollision;
TribeMemberComponentArray.onRemove = onRemove;

function onJoin(entity: Entity): void {
   const tribeComponent = TribeComponentArray.getComponent(entity);
   tribeComponent.tribe.registerNewTribeMember(entity);
}

function onTick(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const layer = getEntityLayer(entity);
   
   // Vacuum nearby items to the tribesman
   // @Incomplete: Don't vacuum items which the player doesn't have the inventory space for
   // @Bug: permits vacuuming the same item entity twice
   const minChunkX = Math.max(Math.floor((transformComponent.position.x - VACUUM_RANGE) / Settings.CHUNK_UNITS), 0);
   const maxChunkX = Math.min(Math.floor((transformComponent.position.x + VACUUM_RANGE) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);
   const minChunkY = Math.max(Math.floor((transformComponent.position.y - VACUUM_RANGE) / Settings.CHUNK_UNITS), 0);
   const maxChunkY = Math.min(Math.floor((transformComponent.position.y + VACUUM_RANGE) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = layer.getChunk(chunkX, chunkY);
         for (const itemEntity of chunk.entities) {
            if (getEntityType(itemEntity) !== EntityType.itemEntity || !itemEntityCanBePickedUp(itemEntity, entity)) {
               continue;
            }

            const itemComponent = ItemComponentArray.getComponent(itemEntity);
            if (!tribeMemberCanPickUpItem(entity, itemComponent.itemType)) {
               continue;
            }

            const itemEntityTransformComponent = TransformComponentArray.getComponent(itemEntity);
            
            const distance = transformComponent.position.calculateDistanceBetween(itemEntityTransformComponent.position);
            if (distance <= VACUUM_RANGE) {
               // @Temporary
               let forceMult = 1 - distance / VACUUM_RANGE;
               forceMult = lerp(0.5, 1, forceMult);

               const vacuumDirection = itemEntityTransformComponent.position.calculateAngleBetween(transformComponent.position);
               const physicsComponent = PhysicsComponentArray.getComponent(itemEntity);
               physicsComponent.externalVelocity.x += Vars.VACUUM_STRENGTH * forceMult * Math.sin(vacuumDirection);
               physicsComponent.externalVelocity.y += Vars.VACUUM_STRENGTH * forceMult * Math.cos(vacuumDirection);
            }
         }
      }
   }
}

function onEntityCollision(tribeMember: Entity, collidingEntity: Entity): void {
   if (getEntityType(collidingEntity) === EntityType.itemEntity) {
      const itemComponent = ItemComponentArray.getComponent(collidingEntity);
      
      // Keep track of it beforehand as the amount variable gets changed when being picked up
      const itemAmount = itemComponent.amount;

      const wasPickedUp = pickupItemEntity(tribeMember, collidingEntity);

      if (wasPickedUp) {
         if (getEntityType(tribeMember) === EntityType.player) {
            registerPlayerDroppedItemPickup(tribeMember);
         } else if (TribesmanComponentArray.hasComponent(tribeMember) && itemComponent.throwingEntity !== null && itemComponent.throwingEntity !== tribeMember) {
            adjustTribesmanRelationsAfterGift(tribeMember, itemComponent.throwingEntity, itemComponent.itemType, itemAmount);
         }
      }
   }
}

function onRemove(entity: Entity): void {
   const tribeComponent = TribeComponentArray.getComponent(entity);
   tribeComponent.tribe.registerTribeMemberDeath(entity);
}

function getDataLength(entity: Entity): number {
   const tribeMemberComponent = TribeMemberComponentArray.getComponent(entity);

   let lengthBytes = Float32Array.BYTES_PER_ELEMENT;
   lengthBytes += getStringLengthBytes(tribeMemberComponent.name);

   return lengthBytes;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const tribeMemberComponent = TribeMemberComponentArray.getComponent(entity);
   packet.addString(tribeMemberComponent.name);
}