import { ServerComponentType } from "../../../../shared/src/components";
import { Entity, EntityType } from "../../../../shared/src/entities";
import { PacketReader } from "../../../../shared/src/packets";
import { rotateXAroundOrigin, rotateYAroundOrigin } from "../../../../shared/src/utils";
import { Hitbox } from "../../hitboxes";
import { playerInstance } from "../../player";
import { playSound } from "../../sound";
import { entityExists, EntityParams, getEntityLayer, getEntityType } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";

interface CarrySlot {
   occupiedEntity: Entity;
   readonly offsetX: number;
   readonly offsetY: number;
   readonly dismountOffsetX: number;
   readonly dismountOffsetY: number;
}

export interface RideableComponentParams {
   readonly carrySlots: ReadonlyArray<CarrySlot>;
}

export interface RideableComponent {
   readonly carrySlots: ReadonlyArray<CarrySlot>;
}

export const RideableComponentArray = new ServerComponentArray<RideableComponent, RideableComponentParams, never>(ServerComponentType.rideable, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData
});

export function createRideableComponentParams(carrySlots: ReadonlyArray<CarrySlot>): RideableComponentParams {
   return {
      carrySlots: carrySlots
   };
}

function createParamsFromData(reader: PacketReader): RideableComponentParams {
   const carrySlots = new Array<CarrySlot>();
   
   const numCarrySlots = reader.readNumber();
   for (let i = 0; i < numCarrySlots; i++) {
      const occupiedEntity = reader.readNumber();

      const offsetX = reader.readNumber();
      const offsetY = reader.readNumber();

      const dismountOffsetX = reader.readNumber();
      const dismountOffsetY = reader.readNumber();

      const carrySlot: CarrySlot = {
         occupiedEntity: occupiedEntity,
         offsetX: offsetX,
         offsetY: offsetY,
         dismountOffsetX: dismountOffsetX,
         dismountOffsetY: dismountOffsetY
      };
      carrySlots.push(carrySlot);
   }
   
   return createRideableComponentParams(carrySlots);
}

function createComponent(entityParams: EntityParams): RideableComponent {
   const rideableComponentParams = entityParams.serverComponentParams[ServerComponentType.rideable]!;
   return {
      carrySlots: rideableComponentParams.carrySlots
   };
}

function getMaxRenderParts(): number {
   return 0;
}

function padData(reader: PacketReader): void {
   const numCarrySlots = reader.readNumber();
   for (let i = 0; i < numCarrySlots; i++) {
      // (so that i find this when i remove the need to pad by 3 for bools)
      // reader.padOffset(3);
      reader.padOffset(5 * Float32Array.BYTES_PER_ELEMENT);
   }
}

function updateFromData(reader: PacketReader, entity: Entity): void {
   const rideableComponent = RideableComponentArray.getComponent(entity);

   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);

   for (let i = 0; i < rideableComponent.carrySlots.length; i++) {
      const carrySlot = rideableComponent.carrySlots[i];
      
      const occupiedEntity = reader.readNumber();

      if (occupiedEntity !== carrySlot.occupiedEntity) {
         const transformComponent = TransformComponentArray.getComponent(entity);
         // @Hack
         const mountHitbox = transformComponent.hitboxes[0];
         const layer = getEntityLayer(entity);
         
         if (entityExists(occupiedEntity)) {
            // Play mount sound when entity mounts a carry slot
            switch (getEntityType(occupiedEntity)) {
               case EntityType.barrel: {
                  playSound("barrel-mount.mp3", 0.4, 1, mountHitbox.box.position.copy(), layer);
                  break;
               }
               default: {
                  playSound("mount.mp3", 0.4, 1, mountHitbox.box.position.copy(), layer);
                  break;
               }
            }
         } else {
            // Play a sound when the entity dismounts a carry slot
            playSound("dismount.mp3", 0.4, 1, mountHitbox.box.position.copy(), layer);

            if (carrySlot.occupiedEntity === playerInstance) {
               // Set the player to the dismount position
   
               const transformComponent = TransformComponentArray.getComponent(playerInstance);
               const playerHitbox = transformComponent.hitboxes[0];
   
               playerHitbox.box.position.x = mountHitbox.box.position.x + rotateXAroundOrigin(carrySlot.offsetX + carrySlot.dismountOffsetX, carrySlot.offsetY + carrySlot.dismountOffsetY, mountHitbox.box.relativeAngle);
               playerHitbox.box.position.y = mountHitbox.box.position.y + rotateYAroundOrigin(carrySlot.offsetX + carrySlot.dismountOffsetX, carrySlot.offsetY + carrySlot.dismountOffsetY, mountHitbox.box.relativeAngle);
            }
         }
      }
      
      carrySlot.occupiedEntity = occupiedEntity;

      reader.padOffset(4 * Float32Array.BYTES_PER_ELEMENT);
   }
}
