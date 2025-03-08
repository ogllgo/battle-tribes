import { HitboxCollisionType, HitboxFlag } from "../../../../shared/src/boxes/boxes";
import CircularBox from "../../../../shared/src/boxes/CircularBox";
import { DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "../../../../shared/src/collision";
import { ServerComponentType } from "../../../../shared/src/components";
import { Entity, EntityType } from "../../../../shared/src/entities";
import { ItemType } from "../../../../shared/src/items/items";
import { Point } from "../../../../shared/src/utils";
import { createEntityConfig, EntityConfig, LightCreationInfo } from "../../components";
import { GlurbBodySegmentComponent } from "../../components/GlurbBodySegmentComponent";
import { GlurbSegmentComponent } from "../../components/GlurbSegmentComponent";
import { LootComponent, registerEntityLootOnDeath } from "../../components/LootComponent";
import { PhysicsComponent } from "../../components/PhysicsComponent";
import { TransformComponent } from "../../components/TransformComponent";
import { createHitbox, Hitbox } from "../../hitboxes";
import { createLight } from "../../light-levels";

registerEntityLootOnDeath(EntityType.glurbBodySegment, [
   {
      itemType: ItemType.slurb,
      getAmount: () => 1
   }
]);

export function createGlurbBodySegmentConfig(position: Point, rotation: number, lastEntity: Entity, lastHitbox: Hitbox, isMiddleSegment: boolean): EntityConfig {
   // @Cleanup: should we split glurb body segment into middle segment and tail segment?
   let radius: number;
   let flags: Array<HitboxFlag>;
   let mass: number;
   let lightIntensity: number;
   let lightRadius: number;
   if (isMiddleSegment) {
      // Middle segment
      radius = 28;
      flags = [];
      mass = 0.8;
      lightIntensity = 0.4;
      lightRadius = 8;
   } else {
      // Tail segment
      radius = 20;
      flags = [HitboxFlag.GLURB_TAIL_SEGMENT];
      mass = 0.4;
      lightIntensity = 0.3;
      lightRadius = 4;
   }
   
   const transformComponent = new TransformComponent(0);
   
   const hitbox = createHitbox(transformComponent, null, new CircularBox(position, new Point(0, 0), rotation, radius), mass, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, flags);
   transformComponent.addHitbox(hitbox, null);

   const tetherIdealDistance = (hitbox.box as CircularBox).radius + (lastHitbox.box as CircularBox).radius - 18;
   transformComponent.addHitboxTether(hitbox, lastEntity, lastHitbox, tetherIdealDistance, 15, 0.5);

   const physicsComponent = new PhysicsComponent();

   // const healthComponent = new HealthComponent(5);

   const lootComponent = new LootComponent();
   
   const glurbSegmentComponent = new GlurbSegmentComponent(lastHitbox);

   const glurbBodySegmentComponent = new GlurbBodySegmentComponent();

   const light = createLight(new Point(0, 0), lightIntensity, 0.8, lightRadius, 1, 0.2, 0.9);
   const lights: Array<LightCreationInfo> = [{
      light: light,
      attachedHitbox: hitbox
   }];

   return createEntityConfig(
      EntityType.glurbBodySegment,
      {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         // [ServerComponentType.health]: healthComponent,
         [ServerComponentType.loot]: lootComponent,
         [ServerComponentType.glurbSegment]: glurbSegmentComponent,
         [ServerComponentType.glurbBodySegment]: glurbBodySegmentComponent
      },
      lights
   );
}