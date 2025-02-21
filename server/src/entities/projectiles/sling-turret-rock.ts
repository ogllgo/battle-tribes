import { DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import {ServerComponentType } from "battletribes-shared/components";
import { EntityType, Entity } from "battletribes-shared/entities";
import { Point } from "battletribes-shared/utils";
import { PhysicsComponent } from "../../components/PhysicsComponent";
import { TribeComponent, TribeComponentArray } from "../../components/TribeComponent";
import { EntityConfig } from "../../components";
import { TransformComponent } from "../../components/TransformComponent";
import { ProjectileComponent } from "../../components/ProjectileComponent";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import RectangularBox from "battletribes-shared/boxes/RectangularBox";
import { SlingTurretRockComponent } from "../../components/SlingTurretRockComponent";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.tribe
   | ServerComponentType.projectile
   | ServerComponentType.slingTurretRock;

export function createSlingTurretRockConfig(owner: Entity): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent(0);
   const hitbox = createHitbox(new RectangularBox(null, new Point(0, 0), 12, 64, 0), 0.5, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK & ~HitboxCollisionBit.ARROW_PASSABLE, []);
   transformComponent.addHitbox(hitbox, null);
   
   const physicsComponent = new PhysicsComponent();
   physicsComponent.isAffectedByGroundFriction = false;
   physicsComponent.isImmovable = true;
   
   const ownerTribeComponent = TribeComponentArray.getComponent(owner);
   const tribeComponent = new TribeComponent(ownerTribeComponent.tribe);
   
   const projectileComponent = new ProjectileComponent(owner);
   
   const slingTurretRockComponent = new SlingTurretRockComponent();
   
   return {
      entityType: EntityType.slingTurretRock,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.tribe]: tribeComponent,
         [ServerComponentType.projectile]: projectileComponent,
         [ServerComponentType.slingTurretRock]: slingTurretRockComponent
      },
      lights: []
   };
}