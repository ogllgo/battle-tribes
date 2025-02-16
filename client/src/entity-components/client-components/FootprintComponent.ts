import { Settings } from "battletribes-shared/settings";
import { randInt } from "battletribes-shared/utils";
import { TileType } from "battletribes-shared/tiles";
import { playSound } from "../../sound";
import Board from "../../Board";
import { createFootprintParticle } from "../../particles";
import { getEntityLayer } from "../../world";
import { entityIsInRiver, getEntityTile, TransformComponentArray } from "../server-components/TransformComponent";
import { Entity } from "../../../../shared/src/entities";
import { PhysicsComponentArray } from "../server-components/PhysicsComponent";
import ClientComponentArray from "../ClientComponentArray";
import { EntityConfig } from "../ComponentArray";
import { ClientComponentType } from "../client-component-types";

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

function createComponent(entityConfig: EntityConfig<never, ClientComponentType.footprint>): FootprintComponent {
   const footprintComponentParams = entityConfig.clientComponents[ClientComponentType.footprint];
   
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

const createFootstepSound = (entity: Entity): void => {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const layer = getEntityLayer(entity);
   
   const tile = getEntityTile(layer, transformComponent);
   switch (tile.type) {
      case TileType.grass: {
         playSound("grass-walk-" + randInt(1, 4) + ".mp3", 0.04, 1, transformComponent.position, layer);
         break;
      }
      case TileType.sand: {
         playSound("sand-walk-" + randInt(1, 4) + ".mp3", 0.02, 1, transformComponent.position, layer);
         break;
      }
      case TileType.snow: {
         playSound("snow-walk-" + randInt(1, 3) + ".mp3", 0.1, 1, transformComponent.position, layer);
         break;
      }
      case TileType.rock: {
         playSound("rock-walk-" + randInt(1, 4) + ".mp3", 0.08, 1, transformComponent.position, layer);
         break;
      }
      case TileType.water: {
         if (!entityIsInRiver(transformComponent, entity)) {
            playSound("rock-walk-" + randInt(1, 4) + ".mp3", 0.08, 1, transformComponent.position, layer);
         }
         break;
      }
   }
}

function onTick(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const physicsComponent = PhysicsComponentArray.getComponent(entity);
   const footprintComponent = FootprintComponentArray.getComponent(entity);

   if (transformComponent.carryRoot === entity) {
      // Footsteps
      if (transformComponent.selfVelocity.lengthSquared() >= 2500 && !entityIsInRiver(transformComponent, entity) && Board.tickIntervalHasPassed(footprintComponent.footstepParticleIntervalSeconds)) {
         createFootprintParticle(entity, footprintComponent.numFootstepsTaken, footprintComponent.footstepOffset, footprintComponent.footstepSize, footprintComponent.footstepLifetime);
         footprintComponent.numFootstepsTaken++;
      }
      footprintComponent.distanceTracker += transformComponent.selfVelocity.length() / Settings.TPS;
      if (footprintComponent.distanceTracker > footprintComponent.footstepSoundIntervalDist) {
         footprintComponent.distanceTracker -= footprintComponent.footstepSoundIntervalDist;
         createFootstepSound(entity);
      }
   }
}