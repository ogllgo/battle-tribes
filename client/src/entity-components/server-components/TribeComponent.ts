import { TribeType } from "battletribes-shared/tribes";
import { ServerComponentType } from "battletribes-shared/components";
import { randAngle, randFloat } from "battletribes-shared/utils";
import { playSoundOnHitbox } from "../../sound";
import { getHumanoidRadius, TribesmanComponentArray } from "./TribesmanComponent";
import { createConversionParticle } from "../../particles";
import { PacketReader } from "battletribes-shared/packets";
import { TransformComponentArray } from "./TransformComponent";
import ServerComponentArray from "../ServerComponentArray";
import { Entity } from "../../../../shared/src/entities";
import { Tribe, tribeExists } from "../../tribes";
import { playerInstance } from "../../player";
import { EntityParams } from "../../world";
import { Hitbox } from "../../hitboxes";

export interface TribeComponentParams {
   readonly tribeID: number;
   readonly tribeType: TribeType;
}

export interface TribeComponent {
   tribeID: number;
   tribeType: TribeType;
}

export const TribeComponentArray = new ServerComponentArray<TribeComponent, TribeComponentParams, never>(ServerComponentType.tribe, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData,
   updatePlayerFromData: updatePlayerFromData
});

const fillTribeComponentParams = (tribeID: number, tribeType: TribeType): TribeComponentParams => {
   return {
      tribeID: tribeID,
      tribeType: tribeType
   };
}

export function createTribeComponentParams(tribe: Tribe): TribeComponentParams {
   return fillTribeComponentParams(tribe.id, tribe.tribeType);
}

function createParamsFromData(reader: PacketReader): TribeComponentParams {
   const tribeID = reader.readNumber();
   if (!tribeExists(tribeID)) {
      console.warn("In creating tribe component from data, no tribe with id '" + tribeID + "' exists!");
   }
   const tribeType = reader.readNumber() as TribeType;
   
   return fillTribeComponentParams(tribeID, tribeType);
}

function createComponent(entityParams: EntityParams): TribeComponent {
   const tribeComponentParams = entityParams.serverComponentParams[ServerComponentType.tribe]!;

   return {
      tribeID: tribeComponentParams.tribeID,
      tribeType: tribeComponentParams.tribeType
   };
}

function getMaxRenderParts(): number {
   return 0;
}

function padData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: Entity): void {
   const tribeComponent = TribeComponentArray.getComponent(entity);
   
   const tribeID = reader.readNumber();
   const tribeType = reader.readNumber();
   
   // Tribesman conversion
   if (tribeID !== tribeComponent.tribeID && TribesmanComponentArray.hasComponent(entity)) {
      const transformComponent = TransformComponentArray.getComponent(entity);
      const hitbox = transformComponent.hitboxes[0];

      playSoundOnHitbox("conversion.mp3", 0.4, 1, entity, hitbox, false);

      const radius = getHumanoidRadius(entity);
      for (let i = 0; i < 10; i++) {
         const offsetDirection = randAngle();
         const offsetMagnitude = radius + randFloat(0, 4);
         const x = hitbox.box.position.x + offsetMagnitude * Math.sin(offsetDirection);
         const y = hitbox.box.position.y + offsetMagnitude * Math.cos(offsetDirection);

         const velocityDirection = offsetDirection + randFloat(-0.5, 0.5);
         const velocityMagnitude = randFloat(55, 110);
         const velocityX = velocityMagnitude * Math.sin(velocityDirection);
         const velocityY = velocityMagnitude * Math.cos(velocityDirection);
         
         createConversionParticle(x, y, velocityX, velocityY);
      }
   }
   
   tribeComponent.tribeID = tribeID;
   tribeComponent.tribeType = tribeType;
}

function updatePlayerFromData(reader: PacketReader): void {
   updateFromData(reader, playerInstance!);
}