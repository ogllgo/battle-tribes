import { Settings } from "battletribes-shared/settings";
import { randInt } from "battletribes-shared/utils";
import { TileType } from "battletribes-shared/tiles";
import { playSound } from "../../sound";
import Board from "../../Board";
import { createFootprintParticle } from "../../particles";
import { EntityParams, getEntityLayer } from "../../world";
import { entityIsInRiver, getHitboxTile, TransformComponentArray } from "../server-components/TransformComponent";
import { Entity } from "../../../../shared/src/entities";
import ClientComponentArray from "../ClientComponentArray";
import { ClientComponentType } from "../client-component-types";
import { getHitboxVelocity, Hitbox } from "../../hitboxes";

export interface FootprintComponentParams {
   readonly footstepParticleIntervalSeconds: number;
   readonly footstepOffset: number;
   readonly footstepSize: number;
   readonly footstepLifetime: number;
   readonly footstepSoundIntervalDist: number;
}

export interface FootprintComponent {
   readonly footstepParticleIntervalSeconds: number;
   readonly footstepOffset: number;
   readonly footstepSize: number;
   readonly footstepLifetime: number;
   readonly footstepSoundIntervalDist: number;
   
   numFootstepsTaken: number;
   distanceTracker: number;
}

export const FootprintComponentArray = new ClientComponentArray<FootprintComponent>(ClientComponentType.footprint, true, {
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   onTick: onTick
});

export function createFootprintComponentParams(footstepParticleIntervalSeconds: number, footstepOffset: number, footstepSize: number, footstepLifetime: number, footstepSoundIntervalDist: number): FootprintComponentParams {
   return {
      footstepParticleIntervalSeconds: footstepParticleIntervalSeconds,
      footstepOffset: footstepOffset,
      footstepSize: footstepSize,
      footstepLifetime: footstepLifetime,
      footstepSoundIntervalDist: footstepSoundIntervalDist
   };
}

function createComponent(entityParams: EntityParams): FootprintComponent {
   const footprintComponentParams = entityParams.clientComponentParams[ClientComponentType.footprint]!;
   
   return {
      footstepParticleIntervalSeconds: footprintComponentParams.footstepParticleIntervalSeconds,
      footstepOffset: footprintComponentParams.footstepOffset,
      footstepSize: footprintComponentParams.footstepSize,
      footstepLifetime: footprintComponentParams.footstepLifetime,
      footstepSoundIntervalDist: footprintComponentParams.footstepSoundIntervalDist,
      numFootstepsTaken: 0,
      distanceTracker: 0
   }
}

function getMaxRenderParts(): number {
   return 0;
}

const createFootstepSound = (entity: Entity): void => {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.children[0] as Hitbox;
   const layer = getEntityLayer(entity);
   
   const tile = getHitboxTile(layer, hitbox);
   switch (tile.type) {
      case TileType.grass:
      case TileType.sandyDirt: {
         playSound("grass-walk-" + randInt(1, 4) + ".mp3", 0.04, 1, hitbox.box.position, layer);
         break;
      }
      case TileType.sand: {
         playSound("sand-walk-" + randInt(1, 4) + ".mp3", 0.02, 1, hitbox.box.position, layer);
         break;
      }
      case TileType.snow: {
         playSound("snow-walk-" + randInt(1, 3) + ".mp3", 0.1, 1, hitbox.box.position, layer);
         break;
      }
      case TileType.rock: {
         playSound("rock-walk-" + randInt(1, 4) + ".mp3", 0.08, 1, hitbox.box.position, layer);
         break;
      }
      case TileType.water: {
         if (!entityIsInRiver(transformComponent, entity)) {
            playSound("rock-walk-" + randInt(1, 4) + ".mp3", 0.08, 1, hitbox.box.position, layer);
         }
         break;
      }
   }
}

function onTick(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const footprintComponent = FootprintComponentArray.getComponent(entity);

   if (transformComponent.rootEntity === entity) {
      const hitbox = transformComponent.children[0] as Hitbox;
      const velocity = getHitboxVelocity(hitbox);
      
      // Footsteps
      if (velocity.length() >= 50 && !entityIsInRiver(transformComponent, entity) && Board.tickIntervalHasPassed(footprintComponent.footstepParticleIntervalSeconds)) {
         createFootprintParticle(entity, footprintComponent.numFootstepsTaken, footprintComponent.footstepOffset, footprintComponent.footstepSize, footprintComponent.footstepLifetime);
         footprintComponent.numFootstepsTaken++;
      }
      footprintComponent.distanceTracker += velocity.length() / Settings.TPS;
      if (footprintComponent.distanceTracker > footprintComponent.footstepSoundIntervalDist) {
         footprintComponent.distanceTracker -= footprintComponent.footstepSoundIntervalDist;
         createFootstepSound(entity);
      }
   }
}