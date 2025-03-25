import { ServerComponentType } from "../../../shared/src/components";
import { DamageSource, Entity, EntityType } from "../../../shared/src/entities";
import { AttackEffectiveness } from "../../../shared/src/entity-damage-types";
import { EntityTickEvent, EntityTickEventType } from "../../../shared/src/entity-events";
import { ItemType } from "../../../shared/src/items/items";
import { Settings } from "../../../shared/src/settings";
import { angle, assert, lerp, Point, randInt } from "../../../shared/src/utils";
import { CollisionVars, entitiesAreColliding } from "../collision-detection";
import { createEntityConfigAttachInfo, EntityConfig } from "../components";
import { createItemEntityConfig } from "../entities/item-entity";
import { createGlurbBodySegmentConfig } from "../entities/mobs/glurb-body-segment";
import { GlurbHeadVars } from "../entities/mobs/glurb-head-segment";
import { createGlurbTailSegmentConfig } from "../entities/mobs/glurb-tail-segment";
import { createEntity } from "../Entity";
import { applyAcceleration, Hitbox, setHitboxIdealAngle } from "../hitboxes";
import { undergroundLayer } from "../layers";
import { registerEntityTickEvent } from "../server/player-clients";
import { destroyEntity, entityExists, getEntityAgeTicks, getEntityLayer, getEntityType } from "../world";
import { AIHelperComponentArray } from "./AIHelperComponent";
import { AttackingEntitiesComponentArray } from "./AttackingEntitiesComponent";
import { ComponentArray } from "./ComponentArray";
import { FollowAIComponentArray, updateFollowAIComponent, followAISetFollowTarget, FollowAIComponent, entityWantsToFollow } from "./FollowAIComponent";
import { GlurbComponentArray } from "./GlurbComponent";
import { GlurbSegmentComponentArray } from "./GlurbSegmentComponent";
import { InventoryUseComponentArray } from "./InventoryUseComponent";
import { ItemComponentArray } from "./ItemComponent";
import { TamingComponentArray } from "./TamingComponent";
import { EntityAttachInfo, entityChildIsEntity, getFirstComponent, TransformComponentArray } from "./TransformComponent";

const enum Vars {
   // @Temporary
   // STOMACH_EMPTY_TIME_SECONDS = 25
   STOMACH_EMPTY_TIME_SECONDS = 10
}

export class GlurbHeadSegmentComponent {
   public food = 1;
}

export const GlurbHeadSegmentComponentArray = new ComponentArray<GlurbHeadSegmentComponent>(ServerComponentType.glurbHeadSegment, true, getDataLength, addDataToPacket);
GlurbHeadSegmentComponentArray.onTick = {
   func: onTick,
   tickInterval: 1
};

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}

const getAcceleration = (glurb: Entity): number => {
   const age = getEntityAgeTicks(glurb);
   
   const u = (Math.sin(age * Settings.I_TPS * 6.5) + 1) * 0.5;
   return lerp(200, 450, u);
}

const move = (head: Entity, targetPosition: Point): void => {
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
   
      let targetDirection: number;
      
      if (GlurbHeadSegmentComponentArray.hasComponent(glurbSegment)) {
         targetDirection = angle(targetPosition.x - hitbox.box.position.x, targetPosition.y - hitbox.box.position.y);

         setHitboxIdealAngle(hitbox, targetDirection, Math.PI);
      } else {
         // Move to next hitbox in chain

         const lastChild = glurbTransformComponent.children[i - 1];
         if (!entityChildIsEntity(lastChild)) {
            throw new Error();
         }
         const lastSegmentTransformComponent = TransformComponentArray.getComponent(lastChild.attachedEntity);
         const lastSegmentHitbox = lastSegmentTransformComponent.children[0] as Hitbox;
         
         targetDirection = hitbox.box.position.calculateAngleBetween(lastSegmentHitbox.box.position);
      }
      
      const accelerationX = acceleration * Math.sin(targetDirection);
      const accelerationY = acceleration * Math.cos(targetDirection);
      applyAcceleration(glurbSegment, hitbox, accelerationX, accelerationY);
   }
}

const moveToEntity = (glurb: Entity, targetEntity: Entity): void => {
   const targetTransformComponent = TransformComponentArray.getComponent(targetEntity);
   const targetHitbox = targetTransformComponent.children[0] as Hitbox;
   move(glurb, targetHitbox.box.position);
}

const getFollowTarget = (followAIComponent: FollowAIComponent, visibleEntities: ReadonlyArray<Entity>): Entity | null => {
   const wantsToFollow = entityWantsToFollow(followAIComponent);

   let target: Entity | null = null;
   for (let i = 0; i < visibleEntities.length; i++) {
      const entity = visibleEntities[i];

      if (!InventoryUseComponentArray.hasComponent(entity)) {
         continue;
      }

      if (wantsToFollow) {
         target = entity;
         break;
      }
   }

   return target;
}

const getFoodTarget = (glurbHeadHitbox: Hitbox, visibleEntities: ReadonlyArray<Entity>): Entity | null => {
   let minDist = Number.MAX_SAFE_INTEGER;
   let target: Entity | null = null;
   for (let i = 0; i < visibleEntities.length; i++) {
      const moss = visibleEntities[i];
      if (getEntityType(moss) !== EntityType.moss) {
         continue;
      }

      const transformComponent = TransformComponentArray.getComponent(moss);
      const mossHitbox = transformComponent.children[0] as Hitbox;
      const dist = mossHitbox.box.position.calculateDistanceBetween(glurbHeadHitbox.box.position);
      if (dist < minDist) {
         minDist = dist;
         target = moss;
      }
   }

   return target;
}

function onTick(glurbHead: Entity): void {
   const glurbHeadTransformComponent = TransformComponentArray.getComponent(glurbHead);
   const headHitbox = glurbHeadTransformComponent.children[0] as Hitbox;
   
   const glurbHeadSegmentComponent = GlurbHeadSegmentComponentArray.getComponent(glurbHead);
   glurbHeadSegmentComponent.food -= 1 / (Vars.STOMACH_EMPTY_TIME_SECONDS * Settings.TPS);
   if (glurbHeadSegmentComponent.food < 0) {
      // @Temporary @Hack: glurbs are kinda shite right now at both spawning on moss and finding moss, so this is temp hack
      // if (getEntityAgeTicks(glurbHead) % (Settings.TPS * 5) === 0) {
      //    hitEntity(glurbHead, null, 1, DamageSource.arrow, AttackEffectiveness.effective, getRandomPositionInBox(headHitbox.box), 0);
      // }
      
      glurbHeadSegmentComponent.food = 0;
   }
   
   // Go to follow target if possible
   // @Copynpaste
   const tamingComponent = getFirstComponent(TamingComponentArray, glurbHead);
   if (entityExists(tamingComponent.followTarget)) {
      moveToEntity(glurbHead, tamingComponent.followTarget);
      return;
   }
   
   const attackingEntitiesComponent = getFirstComponent(AttackingEntitiesComponentArray, glurbHead);
   for (const pair of attackingEntitiesComponent.attackingEntities) {
      const attacker = pair[0];
      const attackerTransformComponent = TransformComponentArray.getComponent(attacker);
      const attackerHitbox = attackerTransformComponent.children[0] as Hitbox;

      // Run away!!
      const targetX = headHitbox.box.position.x * 2 - attackerHitbox.box.position.x;
      const targetY = headHitbox.box.position.y * 2 - attackerHitbox.box.position.y;
      move(glurbHead, new Point(targetX, targetY));
      return;
   }
   
   const aiHelperComponent = AIHelperComponentArray.getComponent(glurbHead);

   for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
      const entity = aiHelperComponent.visibleEntities[i];
      if (getEntityType(entity) === EntityType.itemEntity) {
         const itemEntityComponent = ItemComponentArray.getComponent(entity);
         if (itemEntityComponent.itemType === ItemType.slurb){
            continue;
         }
         
         moveToEntity(glurbHead, entity);

         if (entitiesAreColliding(glurbHead, entity) !== CollisionVars.NO_COLLISION) {
            destroyEntity(entity);
         }
         
         return;
      }
   }

   // Consoom moss when hungry
   if (glurbHeadSegmentComponent.food < 0.6) {
      const targetMoss = getFoodTarget(headHitbox, aiHelperComponent.visibleEntities);
      if (targetMoss !== null) {
         moveToEntity(glurbHead, targetMoss);
         if (entitiesAreColliding(glurbHead, targetMoss) !== CollisionVars.NO_COLLISION) {
            destroyEntity(targetMoss);
            glurbHeadSegmentComponent.food += 0.5;

            const tickEvent: EntityTickEvent = {
               entityID: glurbHead,
               // @Hack
               type: EntityTickEventType.cowEat,
               data: 0
            };
            registerEntityTickEvent(glurbHead, tickEvent);

            const glurb = glurbHeadTransformComponent.parentEntity;
            assert(glurb !== glurbHead);
            assert(entityExists(glurb));

            const glurbTransformComponent = TransformComponentArray.getComponent(glurb);
            // @Hack: shite shite shite. what if an entity gets attached to the glurb?
            const finalChildAttachInfo = glurbTransformComponent.children[glurbTransformComponent.children.length - 1] as EntityAttachInfo;
            const finalChild = finalChildAttachInfo.attachedEntity;
            if (getEntityType(finalChild) === EntityType.glurbBodySegment) {
               const glurbSegmentComponent = GlurbSegmentComponentArray.getComponent(finalChild);
               glurbSegmentComponent.mossBallCompleteness++;

               if (glurbSegmentComponent.mossBallCompleteness === 7) {
                  // Grow new segment

                  glurbSegmentComponent.mossBallCompleteness = 0;

                  const glurbComponent = GlurbComponentArray.getComponent(glurb);
                  // @Hack: it isn't guaranteed that children will only be glurb segments...
                  const currentNumComponents = glurbTransformComponent.children.length;
                  assert(currentNumComponents < glurbComponent.numSegments);

                  const finalSegmentTransformComponent = TransformComponentArray.getComponent(finalChild);
                  const finalSegmentHitbox = finalSegmentTransformComponent.children[0] as Hitbox;

                  const spawnOffsetDirection = headHitbox.box.position.calculateAngleBetween(finalSegmentHitbox.box.position);
                  const spawnOffsetMagnitude = 30;
                  const x = finalSegmentHitbox.box.position.x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
                  const y = finalSegmentHitbox.box.position.y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);
                  
                  let config: EntityConfig;
                  if (currentNumComponents + 1 === glurbComponent.numSegments) {
                     // Tail segment
                     config = createGlurbTailSegmentConfig(new Point(x, y), 2 * Math.PI * Math.random(), finalSegmentHitbox);
                  } else {
                     // Body segment
                     config = createGlurbBodySegmentConfig(new Point(x, y), 2 * Math.PI * Math.random(), finalSegmentHitbox);
                  }
                  config.attachInfo = createEntityConfigAttachInfo(glurb, null, new Point(0, 0), true);
                  createEntity(config, getEntityLayer(glurb), 0);
               }
            }
         }
         return;
      }
   }

   // Follow AI
   const followAIComponent = FollowAIComponentArray.getComponent(glurbHead);
   updateFollowAIComponent(glurbHead, aiHelperComponent.visibleEntities, 7);

   if (entityExists(followAIComponent.followTargetID)) {
      moveToEntity(glurbHead, followAIComponent.followTargetID);
      return;
   } else {
      const followTarget = getFollowTarget(followAIComponent, aiHelperComponent.visibleEntities);
      if (followTarget !== null) {
         // Follow the entity
         followAISetFollowTarget(glurbHead, followTarget, randInt(GlurbHeadVars.MIN_FOLLOW_COOLDOWN, GlurbHeadVars.MAX_FOLLOW_COOLDOWN), true);
         return;
      }
   }
   
   // Wander AI
   const wanderAI = aiHelperComponent.getWanderAI();
   wanderAI.update(glurbHead);
   if (wanderAI.targetPositionX !== -1) {
      move(glurbHead, new Point(wanderAI.targetPositionX, wanderAI.targetPositionY));
   }
}