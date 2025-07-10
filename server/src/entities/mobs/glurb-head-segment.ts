import { HitboxCollisionType } from "../../../../shared/src/boxes/boxes";
import CircularBox from "../../../../shared/src/boxes/CircularBox";
import { DEFAULT_COLLISION_MASK, CollisionBit } from "../../../../shared/src/collision";
import { ServerComponentType } from "../../../../shared/src/components";
import { Entity, EntityType } from "../../../../shared/src/entities";
import { ItemType } from "../../../../shared/src/items/items";
import { Settings } from "../../../../shared/src/settings";
import { lerp, Point, polarVec2 } from "../../../../shared/src/utils";
import WanderAI from "../../ai/WanderAI";
import { EntityConfig, LightCreationInfo } from "../../components";
import { AIHelperComponent, AIType } from "../../components/AIHelperComponent";
import { FollowAI } from "../../ai/FollowAI";
import { GlurbHeadSegmentComponent, GlurbHeadSegmentComponentArray } from "../../components/GlurbHeadSegmentComponent";
import { GlurbSegmentComponent, GlurbSegmentComponentArray } from "../../components/GlurbSegmentComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { LootComponent, registerEntityLootOnDeath } from "../../components/LootComponent";
import { PhysicsComponent } from "../../components/PhysicsComponent";
import { addHitboxToTransformComponent, entityChildIsEntity, TransformComponent, TransformComponentArray } from "../../components/TransformComponent";
import { applyAccelerationFromGround, createHitbox, Hitbox, turnHitboxToAngle } from "../../hitboxes";
import Layer from "../../Layer";
import { createLight } from "../../lights";
import { getEntityAgeTicks } from "../../world";

const enum Vars {
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
   return true;
}

const getAcceleration = (glurb: Entity): number => {
   const age = getEntityAgeTicks(glurb);
   
   const u = (Math.sin(age * Settings.I_TPS * 6.5) + 1) * 0.5;
   return lerp(200, 450, u);
}

const moveFunc = (head: Entity, pos: Point): void => {
   const acceleration = getAcceleration(head);

   const headTransformComponent = TransformComponentArray.getComponent(head);

   const glurbTransformComponent = TransformComponentArray.getComponent(headTransformComponent.parentEntity);

   for (let i = 0; i < glurbTransformComponent.children.length; i++) {
      const child = glurbTransformComponent.children[i];
      if (!entityChildIsEntity(child)) {
         continue;
      }

      const glurbSegment = child.attachedEntity;
      if (!GlurbSegmentComponentArray.hasComponent(glurbSegment)) {
         continue;
      }

      const transformComponent = TransformComponentArray.getComponent(glurbSegment);
      const hitbox = transformComponent.children[0] as Hitbox;
   
      let targetDir: number;
      
      if (GlurbHeadSegmentComponentArray.hasComponent(glurbSegment)) {
         targetDir = hitbox.box.position.calculateAngleBetween(pos);
      } else {
         // Move to next hitbox in chain

         const lastChild = glurbTransformComponent.children[i - 1];
         if (!entityChildIsEntity(lastChild)) {
            throw new Error();
         }
         const lastSegmentTransformComponent = TransformComponentArray.getComponent(lastChild.attachedEntity);
         const lastSegmentHitbox = lastSegmentTransformComponent.children[0] as Hitbox;
         
         targetDir = hitbox.box.position.calculateAngleBetween(lastSegmentHitbox.box.position);
      }
      
      applyAccelerationFromGround(glurbSegment, hitbox, polarVec2(acceleration, targetDir));
   }
}

const turnFunc = (head: Entity, pos: Point, turnSpeed: number, turnDamping: number): void => {
   const headTransformComponent = TransformComponentArray.getComponent(head);

   const glurbTransformComponent = TransformComponentArray.getComponent(headTransformComponent.parentEntity);

   for (let i = 0; i < glurbTransformComponent.children.length; i++) {
      const child = glurbTransformComponent.children[i];
      if (!entityChildIsEntity(child)) {
         continue;
      }

      const glurbSegment = child.attachedEntity;
      if (!GlurbSegmentComponentArray.hasComponent(glurbSegment)) {
         continue;
      }

      const transformComponent = TransformComponentArray.getComponent(glurbSegment);
      const hitbox = transformComponent.children[0] as Hitbox;
   
      if (GlurbHeadSegmentComponentArray.hasComponent(glurbSegment)) {
         const targetDirection = hitbox.box.position.calculateAngleBetween(pos);

         turnHitboxToAngle(hitbox, targetDirection, Math.PI, 0.5, false);
      }
   }
}

export function createGlurbHeadSegmentConfig(position: Point, rotation: number): EntityConfig {
   const transformComponent = new TransformComponent();
   
   const hitbox = createHitbox(transformComponent, null, new CircularBox(position, new Point(0, 0), rotation, 24), 0.6, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   addHitboxToTransformComponent(transformComponent, hitbox);

   const physicsComponent = new PhysicsComponent();

   const healthComponent = new HealthComponent(5);
   
   const aiHelperComponent = new AIHelperComponent(hitbox, 350, moveFunc, turnFunc);
   aiHelperComponent.ais[AIType.wander] = new WanderAI(200, 2 * Math.PI, 0.5, 0.25, positionIsValidCallback);
   aiHelperComponent.ais[AIType.follow] = new FollowAI(Vars.MIN_FOLLOW_COOLDOWN, Vars.MAX_FOLLOW_COOLDOWN, 0.2, 35);

   // @HACK @TEMPORARY
   const glurbSegmentComponent = new GlurbSegmentComponent();

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
         [ServerComponentType.glurbSegment]: glurbSegmentComponent,
         [ServerComponentType.glurbHeadSegment]: glurbHeadSegmentComponent,
         [ServerComponentType.loot]: lootComponent
      },
      lights: lights
   };
}