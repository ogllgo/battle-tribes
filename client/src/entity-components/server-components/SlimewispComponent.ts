import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityID } from "../../../../shared/src/entities";
import { createSlimePoolParticle, createSlimeSpeckParticle } from "../../particles";
import { getEntityTile, TransformComponentArray } from "./TransformComponent";
import { TileType } from "../../../../shared/src/tiles";
import { getEntityLayer } from "../../world";
import { PhysicsComponentArray, resetIgnoredTileSpeedMultipliers } from "./PhysicsComponent";

export interface SlimewispComponentParams {}

interface RenderParts {}

export interface SlimewispComponent {}

const RADIUS = 16;

// @Cleanup @Memory: Same as slime's
const IGNORED_TILE_SPEED_MULTIPLIERS = [TileType.slime];

export const SlimewispComponentArray = new ServerComponentArray<SlimewispComponent, SlimewispComponentParams, RenderParts>(ServerComponentType.slimewisp, true, {
   createParamsFromData: createParamsFromData,
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   onTick: onTick,
   padData: padData,
   updateFromData: updateFromData,
   onHit: onHit,
   onDie: onDie
});

function createParamsFromData(): SlimewispComponentParams {
   return {};
}

function createRenderParts(renderInfo: EntityRenderInfo): RenderParts {
   const renderPart = new TexturedRenderPart(
      null,
      0,
      0,
      getTextureArrayIndex(`entities/slimewisp/slimewisp.png`)
   );
   renderPart.opacity = 0.8;
   renderInfo.attachRenderPart(renderPart);

   return {};
}

function createComponent(): SlimewispComponent {
   return {};
}

function onTick(entity: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   
   const layer = getEntityLayer(entity);

   // Slimes move at normal speed on slime tiles
   const tile = getEntityTile(layer, transformComponent);
   const physicsComponent = PhysicsComponentArray.getComponent(entity);
   if (tile.type === TileType.slime) {
      physicsComponent.ignoredTileSpeedMultipliers = IGNORED_TILE_SPEED_MULTIPLIERS;
   } else {
      resetIgnoredTileSpeedMultipliers(physicsComponent);
   }
}

function padData(): void {}

function updateFromData(): void {}

function onHit(entity: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(entity);

   createSlimePoolParticle(transformComponent.position.x, transformComponent.position.y, RADIUS);

   for (let i = 0; i < 2; i++) {
      createSlimeSpeckParticle(transformComponent.position.x, transformComponent.position.y, RADIUS * Math.random());
   }
}

function onDie(entity: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(entity);

   createSlimePoolParticle(transformComponent.position.x, transformComponent.position.y, RADIUS);

   for (let i = 0; i < 3; i++) {
      createSlimeSpeckParticle(transformComponent.position.x, transformComponent.position.y, RADIUS * Math.random());
   }
}