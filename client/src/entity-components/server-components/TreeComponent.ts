import { Entity, TreeSize } from "battletribes-shared/entities";
import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { HitData, HitFlags } from "../../../../shared/src/client-server-types";
import { randFloat, angle, randItem, randInt } from "../../../../shared/src/utils";
import { createLeafParticle, LeafParticleSize, createLeafSpeckParticle, createWoodSpeckParticle, LEAF_SPECK_COLOUR_HIGH, LEAF_SPECK_COLOUR_LOW } from "../../particles";
import { playSoundOnHitbox } from "../../sound";
import { TransformComponentArray } from "./TransformComponent";
import { EntityIntermediateInfo, EntityParams } from "../../world";

export interface TreeComponentParams {
   readonly treeSize: TreeSize;
}

interface IntermediateInfo {}

export interface TreeComponent {
   readonly treeSize: TreeSize;
}

const treeTextures: { [T in TreeSize]: string } = {
   [TreeSize.small]: "entities/tree/tree-small.png",
   [TreeSize.large]: "entities/tree/tree-large.png"
};

export const TREE_HIT_SOUNDS: ReadonlyArray<string> = ["tree-hit-1.mp3", "tree-hit-2.mp3", "tree-hit-3.mp3", "tree-hit-4.mp3"];
export const TREE_DESTROY_SOUNDS: ReadonlyArray<string> = ["tree-destroy-1.mp3", "tree-destroy-2.mp3", "tree-destroy-3.mp3", "tree-destroy-4.mp3"];

const getRadius = (treeSize: TreeSize): number => {
   return 40 + treeSize * 10;
}

export const TreeComponentArray = new ServerComponentArray<TreeComponent, TreeComponentParams, IntermediateInfo>(ServerComponentType.tree, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData,
   onHit: onHit,
   onDie: onDie
});

function createParamsFromData(reader: PacketReader): TreeComponentParams {
   const treeSize = reader.readNumber();
   return {
      treeSize: treeSize
   };
}

function populateIntermediateInfo(entityIntermediateInfo: EntityIntermediateInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.hitboxes[0];

   const treeComponentParams = entityParams.serverComponentParams[ServerComponentType.tree]!;
   
   entityIntermediateInfo.renderInfo.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         getTextureArrayIndex(treeTextures[treeComponentParams.treeSize])
      )
   );

   return {};
}

function createComponent(entityParams: EntityParams): TreeComponent {
   return {
      treeSize: entityParams.serverComponentParams[ServerComponentType.tree]!.treeSize
   };
}

function getMaxRenderParts(): number {
   return 1;
}
   
function padData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

function onHit(entity: Entity, hitData: HitData): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];

   const treeComponent = TreeComponentArray.getComponent(entity);

   const radius = getRadius(treeComponent.treeSize);

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
   const numSpecks = treeComponent.treeSize === TreeSize.small ? 4 : 7;
   for (let i = 0; i < numSpecks; i++) {
      createLeafSpeckParticle(hitbox.box.position.x, hitbox.box.position.y, radius, LEAF_SPECK_COLOUR_LOW, LEAF_SPECK_COLOUR_HIGH);
   }

   if (isDamagingHit) {
      // Create wood specks at the point of hit
      const spawnOffsetDirection = angle(hitData.hitPosition[0] - hitbox.box.position.x, hitData.hitPosition[1] - hitbox.box.position.y);
      const spawnPositionX = hitbox.box.position.x + (radius + 2) * Math.sin(spawnOffsetDirection);
      const spawnPositionY = hitbox.box.position.y + (radius + 2) * Math.cos(spawnOffsetDirection);
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

   const treeComponent = TreeComponentArray.getComponent(entity);

   const radius = getRadius(treeComponent.treeSize);

   let numLeaves: number;
   if (treeComponent.treeSize === TreeSize.small) {
      numLeaves = randInt(2, 3);
   } else {
      numLeaves = randInt(4, 5);
   }
   for (let i = 0; i < numLeaves; i++) {
      const spawnOffsetMagnitude = radius * Math.random();
      const spawnOffsetDirection = 2 * Math.PI * Math.random();
      const spawnPositionX = hitbox.box.position.x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
      const spawnPositionY = hitbox.box.position.y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

      createLeafParticle(spawnPositionX, spawnPositionY, Math.random(), Math.random() < 0.5 ? LeafParticleSize.large : LeafParticleSize.small);
   }
   
   // Create leaf specks
   const numSpecks = treeComponent.treeSize === TreeSize.small ? 4 : 7;
   for (let i = 0; i < numSpecks; i++) {
      createLeafSpeckParticle(hitbox.box.position.x, hitbox.box.position.y, radius, LEAF_SPECK_COLOUR_LOW, LEAF_SPECK_COLOUR_HIGH);
   }

   for (let i = 0; i < 10; i++) {
      createWoodSpeckParticle(hitbox.box.position.x, hitbox.box.position.y, radius * Math.random());
   }

   playSoundOnHitbox(randItem(TREE_DESTROY_SOUNDS), 0.5, 1, hitbox, false);
}