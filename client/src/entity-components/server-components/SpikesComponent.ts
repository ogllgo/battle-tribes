import { randFloat } from "battletribes-shared/utils";
import { ServerComponentType } from "battletribes-shared/components";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { playSoundOnHitbox } from "../../sound";
import { LeafParticleSize, createLeafParticle, createLeafSpeckParticle } from "../../particles";
import { VisualRenderPart } from "../../render-parts/render-parts";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { PacketReader } from "battletribes-shared/packets";
import { TransformComponentArray } from "./TransformComponent";
import ServerComponentArray from "../ServerComponentArray";
import { Entity } from "../../../../shared/src/entities";
import { EntityIntermediateInfo, EntityParams } from "../../world";
import { Hitbox } from "../../hitboxes";

export interface SpikesComponentParams {
   readonly isCovered: boolean;
}

interface IntermediateInfo {
   leafRenderParts: Array<VisualRenderPart>;
}

export interface SpikesComponent {
   isCovered: boolean;
   // @Incomplete: We should randomise their position every time they are re-covered
   readonly leafRenderParts: ReadonlyArray<VisualRenderPart>;
}

export const NUM_SMALL_COVER_LEAVES = 8;
export const NUM_LARGE_COVER_LEAVES = 3;

// @Cleanup: should be in particles.ts
const LEAF_SPECK_COLOUR_LOW = [63/255, 204/255, 91/255] as const;
const LEAF_SPECK_COLOUR_HIGH = [35/255, 158/255, 88/255] as const;

export const SpikesComponentArray = new ServerComponentArray<SpikesComponent, SpikesComponentParams, IntermediateInfo>(ServerComponentType.spikes, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   onLoad: onLoad,
   padData: padData,
   updateFromData: updateFromData
});

const fillParams = (isCovered: boolean): SpikesComponentParams => {
   return {
      isCovered: isCovered
   };
}

export function createSpikesComponentParams(): SpikesComponentParams {
   return fillParams(false);
}

function createParamsFromData(reader: PacketReader): SpikesComponentParams {
   const isCovered = reader.readBoolean();
   reader.padOffset(3);

   return fillParams(isCovered);
}

const createLeafRenderPart = (isSmall: boolean, parentHitbox: Hitbox): VisualRenderPart => {
   let textureSource: string;
   if (isSmall) {
      textureSource = "entities/miscellaneous/cover-leaf-small.png";
   } else {
      textureSource = "entities/miscellaneous/cover-leaf-large.png";
   }
   
   const renderPart = new TexturedRenderPart(
      parentHitbox,
      1 + Math.random() * 0.5,
      2 * Math.PI * Math.random(),
      getTextureArrayIndex(textureSource)
   );

   const spawnRange = isSmall ? 24 : 18;

   renderPart.offset.x = randFloat(-spawnRange, spawnRange);
   renderPart.offset.y = randFloat(-spawnRange, spawnRange);

   return renderPart;
}

function populateIntermediateInfo(entityIntermediateInfo: EntityIntermediateInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.children[0] as Hitbox;
   
   const leafRenderParts = new Array<VisualRenderPart>();
   for (let i = 0; i < NUM_SMALL_COVER_LEAVES; i++) {
      const renderPart = createLeafRenderPart(true, hitbox);
      // @TEMPORARY
      renderPart.opacity = 0;
      entityIntermediateInfo.renderInfo.attachRenderPart(renderPart);
      leafRenderParts.push(renderPart);
   }
   for (let i = 0; i < NUM_LARGE_COVER_LEAVES; i++) {
      const renderPart = createLeafRenderPart(false, hitbox);
      // @TEMPORARY
      renderPart.opacity = 0;
      entityIntermediateInfo.renderInfo.attachRenderPart(renderPart);
      leafRenderParts.push(renderPart);
   }

   return {
      leafRenderParts: leafRenderParts
   };
}

function createComponent(entityParams: EntityParams, intermediateInfo: IntermediateInfo): SpikesComponent {
   return {
      isCovered: entityParams.serverComponentParams[ServerComponentType.spikes]!.isCovered,
      leafRenderParts: intermediateInfo.leafRenderParts
   };
}

function getMaxRenderParts(): number {
   return NUM_SMALL_COVER_LEAVES + NUM_LARGE_COVER_LEAVES;
}

function onLoad(entity: Entity): void {
   const spikesComponent = SpikesComponentArray.getComponent(entity);
   updateLeafRenderParts(spikesComponent);
}

function updateLeafRenderParts(spikesComponent: SpikesComponent): void {
   const opacity = spikesComponent.isCovered ? 0.8 : 0;
   for (let i = 0; i < spikesComponent.leafRenderParts.length; i++) {
      const renderPart = spikesComponent.leafRenderParts[i];
      renderPart.opacity = opacity;
   }
}

function padData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: Entity): void {
   const spikesComponent = SpikesComponentArray.getComponent(entity);
   
   const isCoveredBefore = spikesComponent.isCovered;
   
   spikesComponent.isCovered = reader.readBoolean();
   reader.padOffset(3);
   
   if (isCoveredBefore !== spikesComponent.isCovered) {
      const transformComponent = TransformComponentArray.getComponent(entity);
      const hitbox = transformComponent.children[0] as Hitbox;

      if (spikesComponent.isCovered) {
         // When covering trap
         playSoundOnHitbox("trap-cover.mp3", 0.4, 1, hitbox, false);
      } else {
         // When trap is sprung
         playSoundOnHitbox("trap-spring.mp3", 0.4, 1, hitbox, false);
   
         // Create leaf particles
         for (let i = 0; i < 4; i++) {
            const position = hitbox.box.position.offset(randFloat(0, 22), 2 * Math.PI * Math.random())
            createLeafParticle(position.x, position.y, 2 * Math.PI * Math.random() + randFloat(-1, 1), Math.random() < 0.5 ? LeafParticleSize.large : LeafParticleSize.small);
         }
         
         // Create leaf specks
         for (let i = 0; i < 7; i++) {
            createLeafSpeckParticle(hitbox.box.position.x, hitbox.box.position.y, randFloat(0, 16), LEAF_SPECK_COLOUR_LOW, LEAF_SPECK_COLOUR_HIGH);
         }
      }
      
      updateLeafRenderParts(spikesComponent);
   }
}