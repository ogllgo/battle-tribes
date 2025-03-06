import { Point, randFloat } from "battletribes-shared/utils";
import Board from "../../Board";
import { Light, attachLightToRenderPart, createLight, removeLight } from "../../lights";
import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import { Entity } from "../../../../shared/src/entities";
import ServerComponentArray from "../ServerComponentArray";
import { EntityParams, getEntityRenderInfo } from "../../world";

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
   getMaxRenderParts: getMaxRenderParts,
   onLoad: onLoad,
   onTick: onTick,
   padData: padData,
   updateFromData: updateFromData
});

const fillParams = (heatingProgress: number, isCooking: boolean): CookingComponentParams => {
   return {
      heatingProgress: heatingProgress,
      isCooking: isCooking
   };
}

export function createCookingComponentParams(): CookingComponentParams {
   return fillParams(0, false);
}

function createParamsFromData(reader: PacketReader): CookingComponentParams {
   const heatingProgress = reader.readNumber();
   const isCooking = reader.readBoolean();
   reader.padOffset(3);

   return fillParams(heatingProgress, isCooking);
}

function createComponent(entityParams: EntityParams): CookingComponent {
   const cookingComponentParams = entityParams.serverComponentParams[ServerComponentType.cooking]!;
   
   return {
      heatingProgress: cookingComponentParams.heatingProgress,
      isCooking: cookingComponentParams.isCooking,
      light: null
   };
}

function getMaxRenderParts(): number {
   return 0;
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

         // @Hack
         const renderInfo = getEntityRenderInfo(entity);
         attachLightToRenderPart(cookingComponent.light, renderInfo.renderPartsByZIndex[0], entity);
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