import { HitboxCollisionType } from "../../../../shared/src/boxes/boxes";
import CircularBox from "../../../../shared/src/boxes/CircularBox";
import { DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "../../../../shared/src/collision";
import { ServerComponentType } from "../../../../shared/src/components";
import { EntityType } from "../../../../shared/src/entities";
import { ItemType } from "../../../../shared/src/items/items";
import { Settings } from "../../../../shared/src/settings";
import { Point } from "../../../../shared/src/utils";
import { createEntityConfig, EntityConfig, LightCreationInfo } from "../../components";
import { AIHelperComponent } from "../../components/AIHelperComponent";
import { AttackingEntitiesComponent } from "../../components/AttackingEntitiesComponent";
import { GlurbHeadSegmentComponent } from "../../components/GlurbHeadSegmentComponent";
import { GlurbSegmentComponent } from "../../components/GlurbSegmentComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { LootComponent, registerEntityLootOnDeath } from "../../components/LootComponent";
import { PhysicsComponent } from "../../components/PhysicsComponent";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { createHitbox } from "../../hitboxes";
import { createLight } from "../../light-levels";

registerEntityLootOnDeath(EntityType.glurbHeadSegment, [
   {
      itemType: ItemType.slurb,
      getAmount: () => 1
   }
]);

export function createGlurbHeadSegmentConfig(position: Point, rotation: number): EntityConfig {
   const transformComponent = new TransformComponent();
   
   const hitbox = createHitbox(transformComponent, null, new CircularBox(position, new Point(0, 0), rotation, 24), 0.6, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   addHitboxToTransformComponent(transformComponent, hitbox);

   const physicsComponent = new PhysicsComponent();

   const healthComponent = new HealthComponent(5);
   
   const aiHelperComponent = new AIHelperComponent(hitbox, 280);

   // @HACK @TEMPORARY
   const glurbSegmentComponent = new GlurbSegmentComponent(hitbox);

   const glurbHeadSegmentComponent = new GlurbHeadSegmentComponent();

   const lootComponent = new LootComponent();

   // @HACK DO ON PARENT GLURB
   const attackingEntitiesComponent = new AttackingEntitiesComponent(Settings.TPS * 5);

   const light = createLight(new Point(0, 0), 0.35, 0.8, 6, 1, 0.2, 0.9);
   const lights: Array<LightCreationInfo> = [{
      light: light,
      attachedHitbox: hitbox
   }];

   return createEntityConfig(
      EntityType.glurbHeadSegment,
      {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.aiHelper]: aiHelperComponent,
         [ServerComponentType.glurbSegment]: glurbSegmentComponent,
         [ServerComponentType.glurbHeadSegment]: glurbHeadSegmentComponent,
         [ServerComponentType.loot]: lootComponent,
         [ServerComponentType.attackingEntities]: attackingEntitiesComponent
      },
      lights
   );
}