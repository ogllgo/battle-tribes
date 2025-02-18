import { ServerComponentType } from "battletribes-shared/components";
import ColouredRenderPart, { RenderPartColour } from "../../render-parts/ColouredRenderPart";
import { Colour, hueShift, lerp, multiColourLerp } from "battletribes-shared/utils";
import { Settings } from "battletribes-shared/settings";
import { PacketReader } from "battletribes-shared/packets";
import { Entity, EntityType } from "battletribes-shared/entities";
import { Hitbox } from "battletribes-shared/boxes/boxes";
import { EntityPreCreationInfo, getEntityRenderInfo, getEntityType } from "../../world";
import { TransformComponentArray } from "./TransformComponent";
import ServerComponentArray from "../ServerComponentArray";
import { EntityConfig } from "../ComponentArray";
import { registerDirtyRenderInfo } from "../../rendering/render-part-matrices";

const enum Vars {
   NATURAL_DRIFT = 20 / Settings.TPS
}

export interface LayeredRodComponentParams {
   readonly numLayers: number;
   readonly naturalBendX: number;
   readonly naturalBendY: number;
   readonly r: number;
   readonly g: number;
   readonly b: number;
}

export interface LayeredRodComponent {
   readonly numLayers: number;
   
   readonly naturalBendX: number;
   readonly naturalBendY: number;
   
   bendX: number;
   bendY: number;
}

const MAX_BEND = 6;

const REED_COLOURS: ReadonlyArray<Colour> = [
   {
      r: 219/255,
      g: 215/255,
      b: 197/255,
      a: 1
   },
   {
      r: 68/255,
      g: 181/255,
      b: 49/255,
      a: 1
   },
   {
      r: 97/255,
      g: 214/255,
      b: 77/255,
      a: 1
   },
   {
      r: 203/255,
      g: 255/255,
      b: 194/255,
      a: 1
   }
];

const bendToPushAmount = (bend: number): number => {
   return bend - 1 / (bend - MAX_BEND) - 1 / MAX_BEND;
}

const pushAmountToBend = (pushAmount: number): number => {
   let bend = pushAmount + 1 / MAX_BEND - MAX_BEND - Math.sqrt(Math.pow(pushAmount + 1 / MAX_BEND - MAX_BEND, 2) + 4);
   bend /= 2;
   bend += MAX_BEND;
   return bend;
}

const getLayerColour = (entityConfig: EntityConfig<ServerComponentType.transform, never>, r: number, g: number, b: number, layer: number, numLayers: number): RenderPartColour => {
   switch (entityConfig.entityType as EntityType.grassStrand | EntityType.reed) {
      case EntityType.grassStrand: {
         // @Speed: a lot of this is shared for all strands
         
         const transformComponentParams = entityConfig.serverComponents[ServerComponentType.transform];
   
         const tileX = Math.floor(transformComponentParams.position.x / Settings.TILE_SIZE);
         const tileY = Math.floor(transformComponentParams.position.y / Settings.TILE_SIZE);
   
         const grassInfo = entityConfig.layer.grassInfo[tileX][tileY];
   
         let humidity = grassInfo.humidity;
         if (grassInfo.temperature <= 0.5) {
            humidity = lerp(humidity, 0, 1 - grassInfo.temperature * 2);
         }

         // Lower layers are darker
         // let brightnessMultiplier = layer / data.numLayers;
         let brightnessMultiplier = (layer - 1) / Math.max((numLayers - 1), 1);
         // Minimum brighness
         brightnessMultiplier = lerp(brightnessMultiplier, 1, 0.915);

         const colour: RenderPartColour = {
            r: r * brightnessMultiplier,
            g: g * brightnessMultiplier,
            b: b * brightnessMultiplier,
            a: 1
         };
         if (grassInfo.temperature > 0) {
            const humidityMultiplier = (humidity - 0.5) * -0.7;
            if (humidityMultiplier > 0) {
               colour.r = lerp(colour.r, 1, humidityMultiplier * 0.7);
               colour.b = lerp(colour.b, 1, humidityMultiplier * 0.7);
            } else {
               colour.r = lerp(colour.r, 0, -humidityMultiplier);
               colour.b = lerp(colour.b, 0, -humidityMultiplier);
            }
   
            const hueAdjust = (grassInfo.temperature - 0.5) * 0.8;
            hueShift(colour, hueAdjust);
         }
         return colour;
      }
      case EntityType.reed: {
         const height = (layer - 1) / Math.max((numLayers - 1), 1);
         return multiColourLerp(REED_COLOURS, height);
      }
   }
}

export const LayeredRodComponentArray = new ServerComponentArray<LayeredRodComponent, LayeredRodComponentParams, never>(ServerComponentType.layeredRod, false, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   onTick: onTick,
   onCollision: onCollision,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(reader: PacketReader): LayeredRodComponentParams {
   const numLayers = reader.readNumber();
   const naturalBendX = reader.readNumber();
   const naturalBendY = reader.readNumber();

   const r = reader.readNumber();
   const g = reader.readNumber();
   const b = reader.readNumber();

   return {
      numLayers: numLayers,
      naturalBendX: naturalBendX,
      naturalBendY: naturalBendY,
      r: r,
      g: g,
      b: b
   };
}

function createComponent(entityConfig: EntityConfig<ServerComponentType.layeredRod | ServerComponentType.transform, never>): LayeredRodComponent {
   const layeredRodComponentParams = entityConfig.serverComponents[ServerComponentType.layeredRod];

   const naturalBendX = layeredRodComponentParams.naturalBendX;
   const naturalBendY = layeredRodComponentParams.naturalBendY;
   
   // Create layers
   for (let layer = 1; layer <= layeredRodComponentParams.numLayers; layer++) {
      const colour = getLayerColour(entityConfig, layeredRodComponentParams.r, layeredRodComponentParams.g, layeredRodComponentParams.b, layer, layeredRodComponentParams.numLayers);

      const zIndex = layer / 10;
      const renderPart = new ColouredRenderPart(
         null,
         zIndex,
         0,
         colour
      );

      renderPart.offset.x = naturalBendX * layer;
      renderPart.offset.y = naturalBendY * layer;

      entityConfig.renderInfo.attachRenderPart(renderPart);
   }

   return {
      numLayers: layeredRodComponentParams.numLayers,
      naturalBendX: naturalBendX,
      naturalBendY: naturalBendY,
      bendX: naturalBendX,
      bendY: naturalBendY
   };
}

function getMaxRenderParts(preCreationInfo: EntityPreCreationInfo<ServerComponentType.layeredRod>): number {
   const layeredRodComponentParams = preCreationInfo.serverComponentParams[ServerComponentType.layeredRod];
   return layeredRodComponentParams.numLayers;
}

const updateOffsets = (layeredRodComponent: LayeredRodComponent, entity: Entity): void => {
   const bendMagnitude = Math.sqrt(layeredRodComponent.bendX * layeredRodComponent.bendX + layeredRodComponent.bendY * layeredRodComponent.bendY);
   const bendProgress = bendMagnitude / MAX_BEND;
   const naturalBendMultiplier = 1 - bendProgress;
   
   const bendX = layeredRodComponent.naturalBendX * naturalBendMultiplier + layeredRodComponent.bendX;
   const bendY = layeredRodComponent.naturalBendY * naturalBendMultiplier + layeredRodComponent.bendY;
   
   const renderInfo = getEntityRenderInfo(entity);
   for (let layer = 1; layer <= layeredRodComponent.numLayers; layer++) {
      const renderPart = renderInfo.allRenderThings[layer - 1];

      renderPart.offset.x = bendX * layer;
      renderPart.offset.y = bendY * layer;
   }
}

function onTick(entity: Entity): void {
   const layeredRodComponent = LayeredRodComponentArray.getComponent(entity);
   if (layeredRodComponent.bendX === 0 && layeredRodComponent.bendY === 0) {
      LayeredRodComponentArray.queueComponentDeactivate(entity);
      return;
   }
   
   const bendMagnitude = Math.sqrt(layeredRodComponent.bendX * layeredRodComponent.bendX + layeredRodComponent.bendY * layeredRodComponent.bendY);

   // Slow the return the closer to straight it is
   let bendSmoothnessMultiplier = 1 - bendMagnitude / MAX_BEND;
   bendSmoothnessMultiplier *= bendSmoothnessMultiplier * bendSmoothnessMultiplier;
   bendSmoothnessMultiplier = 1 - bendSmoothnessMultiplier;
   // Make sure it doesn't completely stop movement
   bendSmoothnessMultiplier = bendSmoothnessMultiplier * 0.9 + 0.1;
   
   layeredRodComponent.bendX -= Vars.NATURAL_DRIFT * bendSmoothnessMultiplier * layeredRodComponent.bendX / bendMagnitude / Math.sqrt(layeredRodComponent.numLayers);
   layeredRodComponent.bendY -= Vars.NATURAL_DRIFT * bendSmoothnessMultiplier * layeredRodComponent.bendY / bendMagnitude / Math.sqrt(layeredRodComponent.numLayers);

   updateOffsets(layeredRodComponent, entity);

   const renderInfo = getEntityRenderInfo(entity);
   registerDirtyRenderInfo(renderInfo);
}

function onCollision(entity: Entity, collidingEntity: Entity, _pushedHitbox: Hitbox, pushingHitbox: Hitbox): void {
   if (getEntityType(collidingEntity) === EntityType.tree) {
      return;
   }
   
   const layeredRodComponent = LayeredRodComponentArray.getComponent(entity);
   LayeredRodComponentArray.activateComponent(layeredRodComponent, entity);
   
   const transformComponent = TransformComponentArray.getComponent(entity);

   const directionFromCollidingEntity = pushingHitbox.box.position.calculateAngleBetween(transformComponent.position);

   let existingPushX = bendToPushAmount(layeredRodComponent.bendX);
   let existingPushY = bendToPushAmount(layeredRodComponent.bendY);
   
   let pushAmount = 50 * pushingHitbox.mass / Settings.TPS / Math.sqrt(layeredRodComponent.numLayers);
   
   // Restrict the bend from going past the max bend
   const currentBend = Math.sqrt(layeredRodComponent.bendX * layeredRodComponent.bendX + layeredRodComponent.bendY * layeredRodComponent.bendY);
   pushAmount *= Math.pow((MAX_BEND - currentBend) / MAX_BEND, 0.5);

   existingPushX += pushAmount * Math.sin(directionFromCollidingEntity);
   existingPushY += pushAmount * Math.cos(directionFromCollidingEntity);

   const bendX = pushAmountToBend(existingPushX);
   const bendY = pushAmountToBend(existingPushY);

   // @Hack
   if (Math.sqrt(bendX * bendX + bendY * bendY) >= MAX_BEND) {
      return;
   }

   layeredRodComponent.bendX = bendX;
   layeredRodComponent.bendY = bendY;
   
   updateOffsets(layeredRodComponent, entity);

   const renderInfo = getEntityRenderInfo(entity);
   registerDirtyRenderInfo(renderInfo);
}

function padData(reader: PacketReader): void {
   reader.padOffset(6 * Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader): void {
   reader.padOffset(6 * Float32Array.BYTES_PER_ELEMENT);
}