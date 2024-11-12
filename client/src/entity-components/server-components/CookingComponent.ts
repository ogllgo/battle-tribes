import { Point, randFloat } from "battletribes-shared/utils";
import Board from "../../Board";
import { Light, attachLightToEntity, createLight, removeLight } from "../../lights";
import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import { Entity } from "../../../../shared/src/entities";
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

export function createCookingComponentParams(heatingProgress: number, isCooking: boolean): CookingComponentParams {
   return {
      heatingProgress: heatingProgress,
      isCooking: isCooking
   };
}

function createParamsFromData(reader: PacketReader): CookingComponentParams {
   const heatingProgress = reader.readNumber();
   const isCooking = reader.readBoolean();
   reader.padOffset(3);

   return createCookingComponentParams(heatingProgress, isCooking);
}

function createComponent(entityConfig: EntityConfig<ServerComponentType.cooking, never>): CookingComponent {
   const cookingComponentParams = entityConfig.serverComponents[ServerComponentType.cooking];
   
   return {
      heatingProgress: cookingComponentParams.heatingProgress,
      isCooking: cookingComponentParams.isCooking,
      light: null
   };
}

const updateLight = (cookingComponent: CookingComponent, entity: Entity): void => {
   if (cookingComponent.isCooking) {
      if (cookingComponent.light === null) {
         cookingComponent.light = createLight(
            new Point(0, 0),
            1,
            1.5,
            40,
            1,
            0.6,
            0.35
         );
         attachLightToEntity(cookingComponent.light, entity);
      }

      if (Board.tickIntervalHasPassed(0.15)) {
         cookingComponent.light.radius = 40 + randFloat(-7, 7);
      }
   } else if (cookingComponent.light !== null) {
      removeLight(cookingComponent.light);
      cookingComponent.light = null;
   }
}

function onLoad(entity: Entity): void {
   const cookingComponent = CookingComponentArray.getComponent(entity);
   updateLight(cookingComponent, entity);
}

function onTick(entity: Entity): void {
   const cookingComponent = CookingComponentArray.getComponent(entity);
   updateLight(cookingComponent, entity);
}

function padData(reader: PacketReader): void {
   reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: Entity): void {
   const cookingComponent = CookingComponentArray.getComponent(entity);
   
   cookingComponent.heatingProgress = reader.readNumber();
   cookingComponent.isCooking = reader.readBoolean();
   reader.padOffset(3);
}