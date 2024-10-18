import { EntityID, SnowballSize } from "battletribes-shared/entities";
import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import { randFloat } from "battletribes-shared/utils";
import Board from "../../Board";
import { createSnowParticle } from "../../particles";
import { TransformComponentArray } from "./TransformComponent";
import { PhysicsComponentArray } from "./PhysicsComponent";
import ServerComponentArray, { EntityConfig } from "../ServerComponentArray";

export interface SnowballComponentParams {
   readonly size: SnowballSize;
}

export interface SnowballComponent {
   readonly size: SnowballSize;
}

export const SnowballComponentArray = new ServerComponentArray<SnowballComponent, SnowballComponentParams, never>(ServerComponentType.snowball, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   onTick: onTick,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(reader: PacketReader): SnowballComponentParams {
   const size = reader.readNumber();

   return {
      size: size
   };
}
   
function createComponent(entityConfig: EntityConfig<ServerComponentType.snowball>): SnowballComponent {
   return {
      size: entityConfig.components[ServerComponentType.snowball].size
   };
}

function onTick(_snowballComponent: SnowballComponent, entity: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const physicsComponent = PhysicsComponentArray.getComponent(entity);
   if ((physicsComponent.selfVelocity.x !== 0 || physicsComponent.selfVelocity.y !== 0) && physicsComponent.selfVelocity.lengthSquared() > 2500) {
      if (Board.tickIntervalHasPassed(0.05)) {
         createSnowParticle(transformComponent.position.x, transformComponent.position.y, randFloat(40, 60));
      }
   }
}
   
function padData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}