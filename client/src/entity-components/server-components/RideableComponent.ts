import { ServerComponentType } from "../../../../shared/src/components";
import { Entity, EntityType } from "../../../../shared/src/entities";
import { PacketReader } from "../../../../shared/src/packets";
import { assert, Point, rotatePoint, rotateXAroundOrigin, rotateYAroundOrigin } from "../../../../shared/src/utils";
import { getHitboxVelocity, translateHitbox } from "../../hitboxes";
import { playerInstance } from "../../player";
import { playSound } from "../../sound";
import { entityExists, EntityParams, getEntityLayer, getEntityType } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";

interface CarrySlot {
   occupiedEntity: Entity;
   readonly hitboxLocalID: number;
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

      const hitboxLocalID = reader.readNumber();

      const offsetX = reader.readNumber();
      const offsetY = reader.readNumber();

      const dismountOffsetX = reader.readNumber();
      const dismountOffsetY = reader.readNumber();

      const carrySlot: CarrySlot = {
         occupiedEntity: occupiedEntity,
         hitboxLocalID: hitboxLocalID,
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
      reader.padOffset(6 * Float32Array.BYTES_PER_ELEMENT);
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
         const mountHitbox = transformComponent.hitboxMap.get(carrySlot.hitboxLocalID);
         assert(typeof mountHitbox !== "undefined");
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
               // Dismount
               
               const transformComponent = TransformComponentArray.getComponent(playerInstance);
               const playerHitbox = transformComponent.hitboxes[0];

               const tx = rotateXAroundOrigin(carrySlot.offsetX + carrySlot.dismountOffsetX, carrySlot.offsetY + carrySlot.dismountOffsetY, mountHitbox.box.angle);
               const ty = rotateYAroundOrigin(carrySlot.offsetX + carrySlot.dismountOffsetX, carrySlot.offsetY + carrySlot.dismountOffsetY, mountHitbox.box.angle);
               translateHitbox(playerHitbox, tx, ty);

               // @HACK reset acceleration because it's accumulated a bunch for some reason
               playerHitbox.acceleration.x = 0;
               playerHitbox.acceleration.y = 0;
            }
         }
      }
      
      carrySlot.occupiedEntity = occupiedEntity;

      reader.padOffset(5 * Float32Array.BYTES_PER_ELEMENT);
   }
}
