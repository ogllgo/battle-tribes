import { Point, randFloat } from "battletribes-shared/utils";
import Board from "../../Board";
import { Light, attachLightToEntity, createLight } from "../../lights";
import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import { createSmokeParticle, createEmberParticle } from "../../particles";
import { TransformComponentArray } from "./TransformComponent";
import { EntityID } from "../../../../shared/src/entities";
import ServerComponentArray from "../ServerComponentArray";
import { EntityConfig } from "../ComponentArray";

export interface CookingComponentParams {
   readonly heatingProgress: number;
   readonly isCooking: boolean;
}

export interface CookingComponent {
   heatingProgress: number;
   isCooking: boolean;

   // @Polymorphism
   light: Light | null;
}

export const CookingComponentArray = new ServerComponentArray<CookingComponent, CookingComponentParams, never>(ServerComponentType.cooking, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   onLoad: onLoad,
   onTick: onTick,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(reader: PacketReader): CookingComponentParams {
   const heatingProgress = reader.readNumber();
   const isCooking = reader.readBoolean();
   reader.padOffset(3);

   return {
      heatingProgress: heatingProgress,
      isCooking: isCooking
   };
}

function createComponent(entityConfig: EntityConfig<ServerComponentType.cooking, never>): CookingComponent {
   const cookingComponentParams = entityConfig.serverComponents[ServerComponentType.cooking];
   
   return {
      heatingProgress: cookingComponentParams.heatingProgress,
      isCooking: cookingComponentParams.isCooking,
      light: null
   };
}

function onLoad(entity: EntityID): void {
   const cookingComponent = CookingComponentArray.getComponent(entity);
   cookingComponent.light = createLight(
      new Point(0, 0),
      1,
      3.5,
      40,
      0,
      0,
      0
   );
   attachLightToEntity(cookingComponent.light, entity);
}

function onTick(entity: EntityID): void {
   const cookingComponent = CookingComponentArray.getComponent(entity);
   if (cookingComponent.light !== null && Board.tickIntervalHasPassed(0.15)) {
      cookingComponent.light.radius = 40 + randFloat(-7, 7);
   }

   if (cookingComponent.isCooking) {
      const transformComponent = TransformComponentArray.getComponent(entity);

      // Smoke particles
      if (Board.tickIntervalHasPassed(0.1)) {
         const spawnOffsetMagnitude = 20 * Math.random();
         const spawnOffsetDirection = 2 * Math.PI * Math.random();
         const spawnPositionX = transformComponent.position.x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
         const spawnPositionY = transformComponent.position.y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);
         createSmokeParticle(spawnPositionX, spawnPositionY);
      }

      // Ember particles
      if (Board.tickIntervalHasPassed(0.05)) {
         let spawnPositionX = transformComponent.position.x - 30 * Math.sin(transformComponent.rotation);
         let spawnPositionY = transformComponent.position.y - 30 * Math.cos(transformComponent.rotation);

         const spawnOffsetMagnitude = 11 * Math.random();
         const spawnOffsetDirection = 2 * Math.PI * Math.random();
         spawnPositionX += spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
         spawnPositionY += spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

         createEmberParticle(spawnPositionX, spawnPositionY, transformComponent.rotation + Math.PI + randFloat(-0.8, 0.8), randFloat(80, 120));
      }
   }
}

function padData(reader: PacketReader): void {
   reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: EntityID): void {
   const cookingComponent = CookingComponentArray.getComponent(entity);
   
   cookingComponent.heatingProgress = reader.readNumber();
   cookingComponent.isCooking = reader.readBoolean();
   reader.padOffset(3);
}