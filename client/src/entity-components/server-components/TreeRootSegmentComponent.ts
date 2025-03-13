import { ServerComponentType } from "../../../../shared/src/components";
import { Entity } from "../../../../shared/src/entities";
import { PacketReader } from "../../../../shared/src/packets";
import { randFloat } from "../../../../shared/src/utils";
import { Hitbox } from "../../hitboxes";
import { createWoodSpeckParticle } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playSoundOnHitbox } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityIntermediateInfo, EntityParams } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";

export interface TreeRootSegmentComponentParams {
   readonly variant: number;
}

interface IntermediateInfo {}

export interface TreeRootSegmentComponent {
   readonly variant: number;
}

export const TreeRootSegmentComponentArray = new ServerComponentArray<TreeRootSegmentComponent, TreeRootSegmentComponentParams, IntermediateInfo>(ServerComponentType.treeRootSegment, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData,
   onDie: onDie,
   onHit: onHit
});

function createParamsFromData(reader: PacketReader): TreeRootSegmentComponentParams {
   const variant = reader.readNumber();
   
   return {
      variant: variant
   };
}

function populateIntermediateInfo(entityIntermediateInfo: EntityIntermediateInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.children[0] as Hitbox;

   const treeRootSegmentComponentParams = entityParams.serverComponentParams[ServerComponentType.treeRootSegment]!;
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      getTextureArrayIndex("entities/tree-root-segment/tree-root-segment-" + (treeRootSegmentComponentParams.variant + 1) + ".png")
   );
   if (Math.random() < 0.5) {
      renderPart.setFlipX(true);
   }
   entityIntermediateInfo.renderInfo.attachRenderPart(renderPart);

   return {};
}

function createComponent(entityParams: EntityParams): TreeRootSegmentComponent {
   return {
      variant: entityParams.serverComponentParams[ServerComponentType.treeRootSegment]!.variant
   };
}

function getMaxRenderParts(): number {
   return 1;
}

function padData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader): void {
   padData(reader);
}

function onHit(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.children[0] as Hitbox;

   for (let i = 0; i < 6; i++) {
      createWoodSpeckParticle(hitbox.box.position.x, hitbox.box.position.y, 16 * Math.random());
   }

   playSoundOnHitbox("tree-root-segment-hit.mp3", randFloat(0.47, 0.53), randFloat(0.9, 1.1), entity, hitbox, false);
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.children[0] as Hitbox;

   for (let i = 0; i < 10; i++) {
      createWoodSpeckParticle(hitbox.box.position.x, hitbox.box.position.y, 16 * Math.random());
   }

   const treeRootSegmentComponent = TreeRootSegmentComponentArray.getComponent(entity);
   playSoundOnHitbox("tree-root-segment-death-" + (treeRootSegmentComponent.variant % 3 + 1) + ".mp3", 0.5, 1, entity, hitbox, false);
}