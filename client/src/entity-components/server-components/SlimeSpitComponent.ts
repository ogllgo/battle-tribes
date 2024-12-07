import { PacketReader } from "battletribes-shared/packets";
import { Settings } from "battletribes-shared/settings";
import Board from "../../Board";
import { createPoisonParticle } from "../../particles";
import { ServerComponentType } from "battletribes-shared/components";
import { Entity } from "../../../../shared/src/entities";
import { playSoundOnEntity } from "../../sound";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityConfig } from "../ComponentArray";
import { getEntityRenderInfo } from "../../world";

export interface SlimeSpitComponentParams {}

export interface SlimeSpitComponent {}

export const SlimeSpitComponentArray = new ServerComponentArray<SlimeSpitComponent, SlimeSpitComponentParams, never>(ServerComponentType.slimeSpit, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
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

function createComponent(entityConfig: EntityConfig<never, never>): SlimeSpitComponent {
   // @Incomplete: SIZE DOESN'T ACTUALLY AFFECT ANYTHING

   const renderPart1 = new TexturedRenderPart(
      null,
      1,
      0,
      getTextureArrayIndex("projectiles/slime-spit-medium.png")
   );
   renderPart1.opacity = 0.75;
   entityConfig.renderInfo.attachRenderPart(renderPart1);

   const renderPart2 = new TexturedRenderPart(
      null,
      0,
      Math.PI/4,
      getTextureArrayIndex("projectiles/slime-spit-medium.png")
   );
   renderPart2.opacity = 0.75;
   entityConfig.renderInfo.attachRenderPart(renderPart2);

   return {};
}

function onLoad(entity: Entity): void {
   playSoundOnEntity("slime-spit.mp3", 0.5, 1, entity);
}

function onTick(entity: Entity): void {
   const renderInfo = getEntityRenderInfo(entity);
   const rotatingRenderPart = renderInfo.allRenderThings[0];
   
   rotatingRenderPart.rotation += 1.5 * Math.PI / Settings.TPS;
   rotatingRenderPart.rotation -= 1.5 * Math.PI / Settings.TPS;

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