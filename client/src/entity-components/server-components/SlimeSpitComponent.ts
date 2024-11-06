import { PacketReader } from "battletribes-shared/packets";
import { VisualRenderPart } from "../../render-parts/render-parts";
import { Settings } from "battletribes-shared/settings";
import Board from "../../Board";
import { createPoisonParticle } from "../../particles";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityID } from "../../../../shared/src/entities";
import { TransformComponentArray } from "./TransformComponent";
import { playSound } from "../../sound";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityConfig } from "../ComponentArray";

export interface SlimeSpitComponentParams {}

export interface SlimeSpitComponent {
   readonly renderParts: ReadonlyArray<VisualRenderPart>;
}

export const SlimeSpitComponentArray = new ServerComponentArray<SlimeSpitComponent, SlimeSpitComponentParams, never>(ServerComponentType.slimeSpit, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   onLoad: onLoad,
   onTick: onTick,
   padData: padData,
   updateFromData: updateFromData,
   onDie: onDie
});

function createParamsFromData(): SlimeSpitComponentParams {
   return {};
}

function createComponent(entityConfig: EntityConfig<never, never>): SlimeSpitComponent {
   const renderParts = new Array<VisualRenderPart>();

   // @Incomplete: SIZE DOESN'T ACTUALLY AFFECT ANYTHING

   const renderPart1 = new TexturedRenderPart(
      null,
      1,
      0,
      getTextureArrayIndex("projectiles/slime-spit-medium.png")
   );
   renderPart1.opacity = 0.75;
   entityConfig.renderInfo.attachRenderPart(renderPart1);
   renderParts.push(renderPart1);

   const renderPart2 = new TexturedRenderPart(
      null,
      0,
      Math.PI/4,
      getTextureArrayIndex("projectiles/slime-spit-medium.png")
   );
   renderPart2.opacity = 0.75;
   entityConfig.renderInfo.attachRenderPart(renderPart2);
   renderParts.push(renderPart2);

   return {
      renderParts: []
   };
}

function onLoad(entity: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   playSound("slime-spit.mp3", 0.5, 1, transformComponent.position);
}

function onTick(entity: EntityID): void {
   const slimeSpitComponent = SlimeSpitComponentArray.getComponent(entity);
   slimeSpitComponent.renderParts[0].rotation += 1.5 * Math.PI / Settings.TPS;
   slimeSpitComponent.renderParts[1].rotation -= 1.5 * Math.PI / Settings.TPS;

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

function onDie(entity: EntityID): void {
   for (let i = 0; i < 15; i++) {
      createPoisonParticle(entity);
   }
}