import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import RectangularBox from "battletribes-shared/boxes/RectangularBox";
import { HitboxCollisionBit, DEFAULT_HITBOX_COLLISION_MASK } from "battletribes-shared/collision";
import { ServerComponentType } from "battletribes-shared/components";
import { Entity, EntityType } from "battletribes-shared/entities";
import { Point } from "battletribes-shared/utils";
import { EntityConfig } from "../../components";
import { GuardianGemFragmentProjectileComponent } from "../../components/GuardianGemFragmentProjectileComponent";
import { PhysicsComponent } from "../../components/PhysicsComponent";
import { ProjectileComponent } from "../../components/ProjectileComponent";
import { TransformComponent } from "../../components/TransformComponent";
import { createHitbox } from "../../hitboxes";

export function createGuardianGemFragmentProjectileConfig(position: Point, rotation: number, creator: Entity): EntityConfig {
   const transformComponent = new TransformComponent(0);

   const hitbox = createHitbox(transformComponent, null, new RectangularBox(position, new Point(0, 0), rotation, 8, 16), 0.5, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox, null);
   
   const physicsComponent = new PhysicsComponent();
   physicsComponent.isAffectedByAirFriction = false;
   physicsComponent.isAffectedByGroundFriction = false;
   physicsComponent.isImmovable = false;
   
   const projectileComponent = new ProjectileComponent(creator);
   
   const guardianGemFragmentProjectileCompoennt = new GuardianGemFragmentProjectileComponent();
   
   return {
      entityType: EntityType.guardianGemFragmentProjectile,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.projectile]: projectileComponent,
         [ServerComponentType.guardianGemFragmentProjectile]: guardianGemFragmentProjectileCompoennt
      },
      lights: []
   };
}