import { HitboxCollisionType } from "../../../../shared/src/boxes/boxes";
import CircularBox from "../../../../shared/src/boxes/CircularBox";
import { DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "../../../../shared/src/collision";
import { ServerComponentType } from "../../../../shared/src/components";
import { Entity, EntityType } from "../../../../shared/src/entities";
import { ItemType } from "../../../../shared/src/items/items";
import { Settings } from "../../../../shared/src/settings";
import { Point, randInt } from "../../../../shared/src/utils";
import WanderAI from "../../ai/WanderAI";
import { EntityConfig, LightCreationInfo } from "../../components";
import { AIHelperComponent, AIType } from "../../components/AIHelperComponent";
import { FollowAIComponent } from "../../components/FollowAIComponent";
import { GlurbHeadSegmentComponent } from "../../components/GlurbHeadSegmentComponent";
import { GlurbSegmentComponent } from "../../components/GlurbSegmentComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { LootComponent, registerEntityLootOnDeath } from "../../components/LootComponent";
import { PhysicsComponent } from "../../components/PhysicsComponent";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { createHitbox } from "../../hitboxes";
import Layer from "../../Layer";
import { createLight } from "../../light-levels";

export const enum GlurbHeadVars {
   // @Cleanup: these two should not be exposed in more than 1 file!
   MIN_FOLLOW_COOLDOWN = 10 * Settings.TPS,
   MAX_FOLLOW_COOLDOWN = 20 * Settings.TPS
}

registerEntityLootOnDeath(EntityType.glurbHeadSegment, [
   {
      itemType: ItemType.slurb,
      getAmount: () => 1
   }
]);

function positionIsValidCallback(_entity: Entity, layer: Layer, x: number, y: number): boolean {
   return !layer.positionHasWall(x, y);
}

export function createGlurbHeadSegmentConfig(position: Point, rotation: number): EntityConfig {
   const transformComponent = new TransformComponent();
   
   const hitbox = createHitbox(transformComponent, null, new CircularBox(position, new Point(0, 0), rotation, 24), 0.6, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   addHitboxToTransformComponent(transformComponent, hitbox);

   const physicsComponent = new PhysicsComponent();

   const healthComponent = new HealthComponent(5);
   
   const aiHelperComponent = new AIHelperComponent(hitbox, 280);
   aiHelperComponent.ais[AIType.wander] = new WanderAI(200, 2 * Math.PI, 0.25, positionIsValidCallback);

   const followAIComponent = new FollowAIComponent(randInt(GlurbHeadVars.MIN_FOLLOW_COOLDOWN, GlurbHeadVars.MAX_FOLLOW_COOLDOWN), 0.2, 35);

   // @HACK @TEMPORARY
   const glurbSegmentComponent = new GlurbSegmentComponent(hitbox);

   const glurbHeadSegmentComponent = new GlurbHeadSegmentComponent();

   const lootComponent = new LootComponent();

   const light = createLight(new Point(0, 0), 0.35, 0.8, 6, 1, 0.2, 0.9);
   const lights: Array<LightCreationInfo> = [{
      light: light,
      attachedHitbox: hitbox
   }];

   return {
      entityType: EntityType.glurbHeadSegment,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.aiHelper]: aiHelperComponent,
         [ServerComponentType.followAI]: followAIComponent,
         [ServerComponentType.glurbSegment]: glurbSegmentComponent,
         [ServerComponentType.glurbHeadSegment]: glurbHeadSegmentComponent,
         [ServerComponentType.loot]: lootComponent
      },
      lights: lights
   };
}