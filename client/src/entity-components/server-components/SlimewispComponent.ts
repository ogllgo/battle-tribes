import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { Entity } from "../../../../shared/src/entities";
import { createSlimePoolParticle, createSlimeSpeckParticle } from "../../particles";
import { getEntityTile, TransformComponentArray } from "./TransformComponent";
import { TileType } from "../../../../shared/src/tiles";
import { EntityIntermediateInfo, EntityParams, getEntityLayer } from "../../world";
import { PhysicsComponentArray, resetIgnoredTileSpeedMultipliers } from "./PhysicsComponent";

export interface SlimewispComponentParams {}

interface IntermediateInfo {}

export interface SlimewispComponent {}

const RADIUS = 16;

// @Cleanup @Memory: Same as slime's
const IGNORED_TILE_SPEED_MULTIPLIERS = [TileType.slime];

export const SlimewispComponentArray = new ServerComponentArray<SlimewispComponent, SlimewispComponentParams, IntermediateInfo>(ServerComponentType.slimewisp, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   onTick: onTick,
   padData: padData,
   updateFromData: updateFromData,
   onHit: onHit,
   onDie: onDie
});

function createParamsFromData(): SlimewispComponentParams {
   return {};
}

function populateIntermediateInfo(entityIntermediateInfo: EntityIntermediateInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.hitboxes[0];
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      getTextureArrayIndex(`entities/slimewisp/slimewisp.png`)
   );
   renderPart.opacity = 0.8;
   entityIntermediateInfo.renderInfo.attachRenderPart(renderPart);

   return {};
}

function createComponent(): SlimewispComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}

function onTick(entity: Entity): void {
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

function onHit(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];

   createSlimePoolParticle(hitbox.box.position.x, hitbox.box.position.y, RADIUS);

   for (let i = 0; i < 2; i++) {
      createSlimeSpeckParticle(hitbox.box.position.x, hitbox.box.position.y, RADIUS * Math.random());
   }
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];

   createSlimePoolParticle(hitbox.box.position.x, hitbox.box.position.y, RADIUS);

   for (let i = 0; i < 3; i++) {
      createSlimeSpeckParticle(hitbox.box.position.x, hitbox.box.position.y, RADIUS * Math.random());
   }
}