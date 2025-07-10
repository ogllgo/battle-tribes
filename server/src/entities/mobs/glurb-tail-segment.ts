import { HitboxCollisionType, HitboxFlag } from "../../../../shared/src/boxes/boxes";
import CircularBox from "../../../../shared/src/boxes/CircularBox";
import { DEFAULT_COLLISION_MASK, CollisionBit } from "../../../../shared/src/collision";
import { ServerComponentType } from "../../../../shared/src/components";
import { EntityType } from "../../../../shared/src/entities";
import { ItemType } from "../../../../shared/src/items/items";
import { Point } from "../../../../shared/src/utils";
import { EntityConfig, LightCreationInfo } from "../../components";
import { GlurbSegmentComponent } from "../../components/GlurbSegmentComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { LootComponent, registerEntityLootOnDeath } from "../../components/LootComponent";
import { PhysicsComponent } from "../../components/PhysicsComponent";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { createHitbox, Hitbox } from "../../hitboxes";
import { createLight } from "../../lights";
import { tetherHitboxes } from "../../tethers";

registerEntityLootOnDeath(EntityType.glurbTailSegment, [
   {
      itemType: ItemType.slurb,
      getAmount: () => 1
   }
]);

export function createGlurbTailSegmentConfig(position: Point, rotation: number, lastHitbox: Hitbox, lastTransformComponent: TransformComponent): EntityConfig {
   const transformComponent = new TransformComponent();
   
   const hitbox = createHitbox(transformComponent, null, new CircularBox(position, new Point(0, 0), rotation, 20), 0.4, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.GLURB_TAIL_SEGMENT]);
   addHitboxToTransformComponent(transformComponent, hitbox);

   const tetherIdealDistance = (hitbox.box as CircularBox).radius + (lastHitbox.box as CircularBox).radius - 18;
   tetherHitboxes(hitbox, lastHitbox, transformComponent, lastTransformComponent, tetherIdealDistance, 15/60, 0.5);

   const physicsComponent = new PhysicsComponent();

   const healthComponent = new HealthComponent(5);

   const lootComponent = new LootComponent();
   
   const glurbSegmentComponent = new GlurbSegmentComponent();

   const light = createLight(new Point(0, 0), 0.3, 0.8, 4, 1, 0.2, 0.9);
   const lights: Array<LightCreationInfo> = [{
      light: light,
      attachedHitbox: hitbox
   }];

   return {
      entityType: EntityType.glurbTailSegment,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.loot]: lootComponent,
         [ServerComponentType.glurbSegment]: glurbSegmentComponent
      },
      lights: lights
   };
}