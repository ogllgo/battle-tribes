import { PacketReader } from "battletribes-shared/packets";
import { Settings } from "battletribes-shared/settings";
import Board from "../../Board";
import { createPoisonParticle } from "../../particles";
import { ServerComponentType } from "battletribes-shared/components";
import { Entity } from "../../../../shared/src/entities";
import { playSoundOnHitbox } from "../../sound";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityParams, getEntityRenderInfo } from "../../world";
import { TransformComponentArray } from "./TransformComponent";
import { Hitbox } from "../../hitboxes";
import { EntityRenderInfo } from "../../EntityRenderInfo";

export interface SlimeSpitComponentParams {}

interface IntermediateInfo {}

export interface SlimeSpitComponent {}

export const SlimeSpitComponentArray = new ServerComponentArray<SlimeSpitComponent, SlimeSpitComponentParams, IntermediateInfo>(ServerComponentType.slimeSpit, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   onLoad: onLoad,
   onTick: onTick,
   padData: padData,
   updateFromData: updateFromData,
   onDie: onDie
});

function createParamsFromData(reader: PacketReader): SlimeSpitComponentParams {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);

   return {};
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityParams: EntityParams): IntermediateInfo {
   // @Incomplete: SIZE DOESN'T ACTUALLY AFFECT ANYTHING

   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.hitboxes[0];

   const renderPart1 = new TexturedRenderPart(
      hitbox,
      1,
      0,
      getTextureArrayIndex("projectiles/slime-spit-medium.png")
   );
   renderPart1.opacity = 0.75;
   renderInfo.attachRenderPart(renderPart1);

   const renderPart2 = new TexturedRenderPart(
      hitbox,
      0,
      Math.PI/4,
      getTextureArrayIndex("projectiles/slime-spit-medium.png")
   );
   renderPart2.opacity = 0.75;
   renderInfo.attachRenderPart(renderPart2);

   return {};
}

function createComponent(): SlimeSpitComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 2;
}

function onLoad(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   playSoundOnHitbox("slime-spit.mp3", 0.5, 1, entity, hitbox, false);
}

function onTick(entity: Entity): void {
   const renderInfo = getEntityRenderInfo(entity);
   const rotatingRenderPart = renderInfo.renderPartsByZIndex[0];
   
   rotatingRenderPart.angle += 1.5 * Math.PI * Settings.DT_S;
   rotatingRenderPart.angle -= 1.5 * Math.PI * Settings.DT_S;

   if (Board.tickIntervalHasPassed(0.2)) {
      for (let i = 0; i < 5; i++) {
         createPoisonParticle(entity);
      }
   }
}

function padData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

function onDie(entity: Entity): void {
   for (let i = 0; i < 15; i++) {
      createPoisonParticle(entity);
   }
}