import { Hitbox } from "../../../shared/src/boxes/boxes";
import { ServerComponentType } from "../../../shared/src/components";
import { Entity, EntityType, DamageSource } from "../../../shared/src/entities";
import { AttackEffectiveness } from "../../../shared/src/entity-damage-types";
import { Point } from "../../../shared/src/utils";
import { getEntityType, validateEntity, destroyEntity } from "../world";
import { ComponentArray } from "./ComponentArray";
import { HealthComponentArray, damageEntity } from "./HealthComponent";
import { applyKnockback } from "./PhysicsComponent";
import { ProjectileComponentArray } from "./ProjectileComponent";
import { TransformComponentArray } from "./TransformComponent";
import { getEntityRelationship, EntityRelationship, TribeComponentArray } from "./TribeComponent";

export class SlingTurretRockComponent {}

export const SlingTurretRockComponentArray = new ComponentArray<SlingTurretRockComponent>(ServerComponentType.slingTurretRock, true, getDataLength, addDataToPacket);
SlingTurretRockComponentArray.onHitboxCollision = onHitboxCollision;

function getDataLength(): number {
   return 1 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(): void {}

// @Cleanup: Copy and paste
function onHitboxCollision(slingTurretRock: Entity, collidingEntity: Entity, _affectedHitbox: Hitbox, _collidingHitbox: Hitbox, collisionPoint: Point): void {
   // Ignore friendlies, and friendly buildings if the ignoreFriendlyBuildings flag is set
   const relationship = getEntityRelationship(slingTurretRock, collidingEntity);
   if (relationship === EntityRelationship.friendly) {
      return;
   }

   const projectileComponent = ProjectileComponentArray.getComponent(slingTurretRock);
   if (collidingEntity === projectileComponent.creator) {
      return;
   }
   
   const tribeComponent = TribeComponentArray.getComponent(slingTurretRock);
   const collidingEntityType = getEntityType(collidingEntity);

   // Collisions with embrasures are handled in the embrasures collision function
   if (collidingEntityType === EntityType.embrasure) {
      const collidingEntityTribeComponent = TribeComponentArray.getComponent(collidingEntity);
      if (tribeComponent.tribe === collidingEntityTribeComponent.tribe) {
         return;
      }
   }

   // @Hack: do with collision bits
   // Pass over friendly spikes
   if (collidingEntityType === EntityType.floorSpikes || collidingEntityType === EntityType.wallSpikes || collidingEntityType === EntityType.floorPunjiSticks || collidingEntityType === EntityType.wallPunjiSticks) {
      const collidingEntityTribeComponent = TribeComponentArray.getComponent(collidingEntity);
      if (tribeComponent.tribe === collidingEntityTribeComponent.tribe) {
         return;
      }
   }

   if (HealthComponentArray.hasComponent(collidingEntity)) {
      const transformComponent = TransformComponentArray.getComponent(slingTurretRock);
      const projectileComponent = ProjectileComponentArray.getComponent(slingTurretRock);

      const collidingEntityTransformComponent = TransformComponentArray.getComponent(collidingEntity);

      const owner = validateEntity(projectileComponent.creator);
      const hitDirection = transformComponent.position.calculateAngleBetween(collidingEntityTransformComponent.position);
      
      damageEntity(collidingEntity, owner, 2, DamageSource.arrow, AttackEffectiveness.effective, collisionPoint, 0);
      applyKnockback(collidingEntity, 75, hitDirection);

      destroyEntity(slingTurretRock);
   }
}