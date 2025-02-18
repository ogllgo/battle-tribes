import { TribeType } from "battletribes-shared/tribes";
import { ServerComponentType } from "battletribes-shared/components";
import { randFloat } from "battletribes-shared/utils";
import { playSoundOnEntity } from "../../sound";
import { getHumanoidRadius, TribesmanComponentArray } from "./TribesmanComponent";
import { createConversionParticle } from "../../particles";
import { PacketReader } from "battletribes-shared/packets";
import { TransformComponentArray } from "./TransformComponent";
import ServerComponentArray from "../ServerComponentArray";
import { Entity } from "../../../../shared/src/entities";
import { EntityConfig } from "../ComponentArray";
import { getTribeByID } from "../../tribes";
import { playerInstance } from "../../player";

export interface TribeComponentParams {
   readonly tribeID: number;
   readonly tribeType: TribeType;
}

export interface TribeComponent {
   tribeID: number;
   tribeType: TribeType;
}

// @Hack
export function getTribeType(tribeID: number): TribeType {
   return getTribeByID(tribeID).tribeType;
}

export const TribeComponentArray = new ServerComponentArray<TribeComponent, TribeComponentParams, never>(ServerComponentType.tribe, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData,
   updatePlayerFromData: updatePlayerFromData
});

export function createTribeComponentParams(tribeID: number): TribeComponentParams {
   return {
      tribeID: tribeID,
      tribeType: getTribeType(tribeID)
   };
}

function createParamsFromData(reader: PacketReader): TribeComponentParams {
   const tribeID = reader.readNumber();
   return createTribeComponentParams(tribeID);
}

function createComponent(entityConfig: EntityConfig<ServerComponentType.tribe, never>): TribeComponent {
   const tribeComponentParams = entityConfig.serverComponents[ServerComponentType.tribe];

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
   
   // Tribesman conversion
   if (tribeID !== tribeComponent.tribeID && TribesmanComponentArray.hasComponent(entity)) {
      const transformComponent = TransformComponentArray.getComponent(entity);

      playSoundOnEntity("conversion.mp3", 0.4, 1, entity, false);

      const radius = getHumanoidRadius(entity);
      for (let i = 0; i < 10; i++) {
         const offsetDirection = 2 * Math.PI * Math.random();
         const offsetMagnitude = radius + randFloat(0, 4);
         const x = transformComponent.position.x + offsetMagnitude * Math.sin(offsetDirection);
         const y = transformComponent.position.y + offsetMagnitude * Math.cos(offsetDirection);

         const velocityDirection = offsetDirection + randFloat(-0.5, 0.5);
         const velocityMagnitude = randFloat(55, 110);
         const velocityX = velocityMagnitude * Math.sin(velocityDirection);
         const velocityY = velocityMagnitude * Math.cos(velocityDirection);
         
         createConversionParticle(x, y, velocityX, velocityY);
      }
   }
   
   tribeComponent.tribeID = tribeID;
   tribeComponent.tribeType = getTribeType(tribeID);
}

function updatePlayerFromData(reader: PacketReader): void {
   const tribeComponent = TribeComponentArray.getComponent(playerInstance!);
   tribeComponent.tribeID = reader.readNumber();
   tribeComponent.tribeType = getTribeType(tribeComponent.tribeID);
}