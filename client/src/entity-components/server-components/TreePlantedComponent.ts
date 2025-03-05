import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import { PacketReader } from "../../../../shared/src/packets";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { Entity } from "../../../../shared/src/entities";
import { HitData, HitFlags } from "../../../../shared/src/client-server-types";
import { randFloat, angle, randItem, randInt } from "../../../../shared/src/utils";
import { createLeafParticle, LeafParticleSize, createLeafSpeckParticle, LEAF_SPECK_COLOUR_LOW, LEAF_SPECK_COLOUR_HIGH, createWoodSpeckParticle } from "../../particles";
import { playSoundOnHitbox } from "../../sound";
import { TREE_HIT_SOUNDS, TREE_DESTROY_SOUNDS } from "./TreeComponent";
import { TransformComponentArray } from "./TransformComponent";
import { EntityIntermediateInfo, EntityParams } from "../../world";

export interface TreePlantedComponentParams {
   readonly growthProgress: number;
}

interface IntermediateInfo {
   readonly renderPart: TexturedRenderPart;
}

export interface TreePlantedComponent {
   growthProgress: number;
   readonly renderPart: TexturedRenderPart;
}

const TEXTURE_SOURCES = ["entities/plant/tree-sapling-1.png", "entities/plant/tree-sapling-2.png", "entities/plant/tree-sapling-3.png", "entities/plant/tree-sapling-4.png", "entities/plant/tree-sapling-5.png", "entities/plant/tree-sapling-6.png", "entities/plant/tree-sapling-7.png", "entities/plant/tree-sapling-8.png", "entities/plant/tree-sapling-9.png", "entities/plant/tree-sapling-10.png", "entities/plant/tree-sapling-11.png"];

export const TreePlantedComponentArray = new ServerComponentArray<TreePlantedComponent, TreePlantedComponentParams, IntermediateInfo>(ServerComponentType.treePlanted, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData,
   onHit: onHit,
   onDie: onDie
});

const getTextureSource = (growthProgress: number): string => {
   const idx = Math.floor(growthProgress * (TEXTURE_SOURCES.length - 1))
   return TEXTURE_SOURCES[idx];
}

function createParamsFromData(reader: PacketReader): TreePlantedComponentParams {
   const growthProgress = reader.readNumber();
   return {
      growthProgress: growthProgress
   };
}

function populateIntermediateInfo(entityIntermediateInfo: EntityIntermediateInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponent = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponent.hitboxes[0];

   const growthProgress = entityParams.serverComponentParams[ServerComponentType.treePlanted]!.growthProgress;
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      9,
      0,
      getTextureArrayIndex(getTextureSource(growthProgress))
   );
   entityIntermediateInfo.renderInfo.attachRenderPart(renderPart);

   return {
      renderPart: renderPart
   };
}

function createComponent(entityParams: EntityParams, intermediateInfo: IntermediateInfo): TreePlantedComponent {
   const growthProgress = entityParams.serverComponentParams[ServerComponentType.treePlanted]!.growthProgress;
   return {
      growthProgress: growthProgress,
      renderPart: intermediateInfo.renderPart
   };
}

function getMaxRenderParts(): number {
   return 1;
}

function padData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: Entity): void {
   const treePlantedComponent = TreePlantedComponentArray.getComponent(entity);
   
   treePlantedComponent.growthProgress = reader.readNumber();
   treePlantedComponent.renderPart.switchTextureSource(getTextureSource(treePlantedComponent.growthProgress));
}

function onHit(entity: Entity, hitData: HitData): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   
   const treePlantedComponent = TreePlantedComponentArray.getComponent(entity);
   
   const radius = Math.floor(treePlantedComponent.growthProgress * 10);

   // @Cleanup: copy and paste
   const isDamagingHit = (hitData.flags & HitFlags.NON_DAMAGING_HIT) === 0;
   
   // Create leaf particles
   {
      const moveDirection = 2 * Math.PI * Math.random();

      const spawnPositionX = hitbox.box.position.x + radius * Math.sin(moveDirection);
      const spawnPositionY = hitbox.box.position.y + radius * Math.cos(moveDirection);

      createLeafParticle(spawnPositionX, spawnPositionY, moveDirection + randFloat(-1, 1), Math.random() < 0.5 ? LeafParticleSize.large : LeafParticleSize.small);
   }
   
   // Create leaf specks
   const numSpecks = Math.floor(treePlantedComponent.growthProgress * 7) + 2;
   for (let i = 0; i < numSpecks; i++) {
      createLeafSpeckParticle(hitbox.box.position.x, hitbox.box.position.y, radius, LEAF_SPECK_COLOUR_LOW, LEAF_SPECK_COLOUR_HIGH);
   }

   if (isDamagingHit) {
      // Create wood specks at the point of hit

      let offsetDirection = angle(hitData.hitPosition[0] - hitbox.box.position.x, hitData.hitPosition[1] - hitbox.box.position.y);
      offsetDirection += 0.2 * Math.PI * (Math.random() - 0.5);

      const spawnPositionX = hitbox.box.position.x + (radius + 2) * Math.sin(offsetDirection);
      const spawnPositionY = hitbox.box.position.y + (radius + 2) * Math.cos(offsetDirection);
      for (let i = 0; i < 4; i++) {
         createWoodSpeckParticle(spawnPositionX, spawnPositionY, 3);
      }
      
      playSoundOnHitbox(randItem(TREE_HIT_SOUNDS), 0.4, 1, hitbox, false);
   } else {
      // @Temporary
      playSoundOnHitbox("berry-bush-hit-" + randInt(1, 3) + ".mp3", 0.4, 1, hitbox, false);
   }
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   playSoundOnHitbox(randItem(TREE_DESTROY_SOUNDS), 0.5, 1, hitbox, false);
}