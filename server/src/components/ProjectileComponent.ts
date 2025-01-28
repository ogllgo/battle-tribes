import { ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";
import { Entity, EntityType } from "battletribes-shared/entities";
import { TransformComponentArray } from "./TransformComponent";
import { Settings } from "battletribes-shared/settings";
import { destroyEntity, getEntityAgeTicks, getEntityType } from "../world";
import { Hitbox } from "../../../shared/src/boxes/boxes";
import { onWoodenArrowCollision } from "../entities/projectiles/wooden-arrow";
import { Point } from "../../../shared/src/utils";

const ARROW_WIDTH = 12;
const ARROW_HEIGHT = 64;
// @Incomplete: Use width and height from generic arrow info
const ARROW_DESTROY_DISTANCE = Math.sqrt(Math.pow(ARROW_WIDTH / 2, 2) + Math.pow(ARROW_HEIGHT, 2));

/** Add to projectiles to make them not damage their owner and be able to be blocked. */
export class ProjectileComponent {
   public readonly creator: Entity;
   public isBlocked = false;

   constructor(creator: Entity) {
      this.creator = creator;
   }
}

export const ProjectileComponentArray = new ComponentArray<ProjectileComponent>(ServerComponentType.projectile, true, getDataLength, addDataToPacket);
ProjectileComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};
ProjectileComponentArray.onHitboxCollision = onHitboxCollision;

function onTick(projectile: Entity): void {
   // @Hack
   const entityType = getEntityType(projectile);
   if (entityType !== EntityType.guardianSpikyBall) {
      const ageTicks = getEntityAgeTicks(projectile);
      if (ageTicks >= 1.5 * Settings.TPS) {
         destroyEntity(projectile);
         return;
      }
   }
   
   // @Hack
   // Destroy the arrow if it reaches the border
   const transformComponent = TransformComponentArray.getComponent(projectile);
   if (transformComponent.position.x <= ARROW_DESTROY_DISTANCE || transformComponent.position.x >= Settings.BOARD_DIMENSIONS * Settings.TILE_SIZE - ARROW_DESTROY_DISTANCE || transformComponent.position.y <= ARROW_DESTROY_DISTANCE || transformComponent.position.y >= Settings.BOARD_DIMENSIONS * Settings.TILE_SIZE - ARROW_DESTROY_DISTANCE) {
      destroyEntity(projectile);
      return;
   }
}

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(): void {}

function onHitboxCollision(entity: Entity, collidingEntity: Entity, _pushedHitbox: Hitbox, _pushingHitbox: Hitbox, collisionPoint: Point): void {
   // @Hack
   switch (getEntityType(entity)) {
      case EntityType.woodenArrow: {
         onWoodenArrowCollision(entity, collidingEntity, collisionPoint);
         break;
      }
   }
}