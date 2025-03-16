import { CowSpecies, DamageSource, Entity, EntityType } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { angle, getAbsAngleDiff, lerp, Point, positionIsInWorld, randFloat, randInt, rotateXAroundOrigin, rotateYAroundOrigin, UtilVars } from "battletribes-shared/utils";
import { EntityTickEvent, EntityTickEventType } from "battletribes-shared/entity-events";
import { ServerComponentType } from "battletribes-shared/components";
import { CowVars } from "../entities/mobs/cow";
import { ComponentArray } from "./ComponentArray";
import { ItemType } from "battletribes-shared/items/items";
import { registerEntityTickEvent } from "../server/player-clients";
import { TransformComponentArray } from "./TransformComponent";
import { createItemEntityConfig } from "../entities/item-entity";
import { createEntity } from "../Entity";
import { Packet } from "battletribes-shared/packets";
import { cleanAngleNEW, findAngleAlignment, getDistanceFromPointToEntity, runHerdAI, turnAngle, willStopAtDesiredDistance } from "../ai-shared";
import { AIHelperComponentArray } from "./AIHelperComponent";
import { BerryBushComponentArray } from "./BerryBushComponent";
import { getEscapeTarget } from "./EscapeAIComponent";
import { FollowAIComponentArray, updateFollowAIComponent, followAISetFollowTarget, entityWantsToFollow, FollowAIComponent } from "./FollowAIComponent";
import { hitEntity, healEntity, HealthComponentArray, hitEntityWithoutDamage } from "./HealthComponent";
import { ItemComponentArray } from "./ItemComponent";
import { createGrassBlocker, positionHasGrassBlocker } from "../grass-blockers";
import { InventoryUseComponentArray } from "./InventoryUseComponent";
import { destroyEntity, entityExists, getEntityAgeTicks, getEntityLayer, getEntityType, getGameTicks } from "../world";
import { getEntitiesAtPosition } from "../layer-utils";
import { mountCarrySlot, RideableComponentArray } from "./RideableComponent";
import { AttackEffectiveness } from "../../../shared/src/entity-damage-types";
import { addSkillLearningProgress, getRiderTargetPosition, TamingComponentArray } from "./TamingComponent";
import { TamingSkillID } from "../../../shared/src/taming";
import CircularBox from "../../../shared/src/boxes/CircularBox";
import { CollisionVars, entitiesAreColliding } from "../collision-detection";
import { applyAcceleration, applyKnockback, Hitbox, setHitboxIdealAngle, stopHitboxTurning } from "../hitboxes";
import { translateHitbox } from "./PhysicsComponent";

const enum Vars {
   SLOW_ACCELERATION = 200,
   SLOWMEDIUM_ACCELERATION = 350,
   MEDIUM_ACCELERATION = 500,
   FAST_ACCELERATION = 1000,
   
   MIN_POOP_PRODUCTION_COOLDOWN = 5 * Settings.TPS,
   MAX_POOP_PRODUCTION_COOLDOWN = 15 * Settings.TPS,
   GRAZE_TIME_TICKS = 2.5 * Settings.TPS,
   BERRY_FULLNESS_VALUE = 0.15,
   MIN_POOP_PRODUCTION_FULLNESS = 0.4,
   BOWEL_EMPTY_TIME_TICKS = 45 * Settings.TPS,
   MAX_BERRY_CHASE_FULLNESS = 0.8,
   // @Hack
   TURN_SPEED = 3.14159265358979,
   // Herd AI constants
   TURN_RATE = 0.4,
   MIN_SEPARATION_DISTANCE = 150,
   SEPARATION_INFLUENCE = 0.7,
   ALIGNMENT_INFLUENCE = 0.5,
   COHESION_INFLUENCE = 0.3,
   /** Angle that the head can be offset relative to the body */
   HEAD_DIRECTION_LEEWAY = 0.3,
   HEAD_TURN_SPEED = 0.75 * UtilVars.PI,

   RAM_COOLDOWN_TICKS = Settings.TPS * 2,
   RAM_CHARGE_TICKS = Settings.TPS,
   RAM_REST_TICKS = Settings.TPS * 0.6
}

export class CowComponent {
   public readonly species: CowSpecies = randInt(0, 1);
   public grazeProgressTicks = 0;
   public grazeCooldownTicks = randInt(CowVars.MIN_GRAZE_COOLDOWN, CowVars.MAX_GRAZE_COOLDOWN);

   // For shaking berry bushes
   public targetBushID = 0;
   public bushShakeTimer = 0;

   /** Used when producing poop. */
   public bowelFullness = 1;
   public poopProductionCooldownTicks = 0;

   // @Temporary
   public targetMovePosition: Point | null = null;

   // @Temporary
   public attackTarget: Entity = 0;

   // @Hack
   public targetGrass: Entity = 0;

   public isRamming = false;
   public ramStartTicks = 0;
   /** Remaining amount of ticks for which the cow will nost start a ram attack */
   public ramCooldownTicks: number;
   /** Remaining amount of ticks that the cow's ram attack has to charge up */
   public ramRemainingChargeTicks: number;
   /** Remaining amount of ticks that the cow has to rest after doing a ram attack. */
   public ramRestTicks: number;

   constructor() {
      this.ramCooldownTicks = Vars.RAM_COOLDOWN_TICKS;
      this.ramRemainingChargeTicks = Vars.RAM_CHARGE_TICKS;
      this.ramRestTicks = Vars.RAM_REST_TICKS;
   }
}

export const CowComponentArray = new ComponentArray<CowComponent>(ServerComponentType.cow, true, getDataLength, addDataToPacket);
CowComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};
CowComponentArray.onHitboxCollision = onHitboxCollision;

const poop = (cow: Entity, cowComponent: CowComponent): void => {
   cowComponent.poopProductionCooldownTicks = randInt(Vars.MIN_POOP_PRODUCTION_COOLDOWN, Vars.MAX_POOP_PRODUCTION_COOLDOWN);

   // Shit it out
   const transformComponent = TransformComponentArray.getComponent(cow);
   const bodyHitbox = transformComponent.children[0] as Hitbox;
   const poopPosition = bodyHitbox.box.position.offset(randFloat(0, 16), 2 * Math.PI * Math.random());
   const config = createItemEntityConfig(poopPosition, 2 * Math.PI * Math.random(), ItemType.poop, 1, null);
   createEntity(config, getEntityLayer(cow), 0);

   // Let it out
   const event: EntityTickEvent<EntityTickEventType.cowFart> = {
      entityID: cow,
      type: EntityTickEventType.cowFart,
      data: 0
   };
   registerEntityTickEvent(cow, event);
}

const getTargetGrass = (cow: Entity): Entity | null => {
   const transformComponent = TransformComponentArray.getComponent(cow);
   const rootHitbox = transformComponent.children[0] as Hitbox;
   
   for (const chunk of transformComponent.chunks) {
      for (const entity of chunk.entities) {
         // @Hack: ignored pathfinding group id
         if (getEntityType(entity) === EntityType.grassStrand) {
            const grassTransformComponent = TransformComponentArray.getComponent(entity);
            const grassHitbox = grassTransformComponent.children[0] as Hitbox;
            
            const dist = rootHitbox.box.position.calculateDistanceBetween(grassHitbox.box.position);
            if (dist >= 50) {
               continue;
            }

            
            if (positionHasGrassBlocker(getEntityLayer(cow), grassHitbox.box.position.x, grassHitbox.box.position.y)) {
               continue;
            }
            
            if (entitiesAreColliding(cow, entity) !== CollisionVars.NO_COLLISION) {
               return entity;
            }
         }
      }
   }
   return null;
}

const graze = (cow: Entity, cowComponent: CowComponent, targetGrass: Entity): void => {
   // const cowTransformComponent = TransformComponentArray.getComponent(cow);
   const grassTransformComponent = TransformComponentArray.getComponent(targetGrass);
   const grassHitbox = grassTransformComponent.children[0] as Hitbox;
   // const targetX = grassTransformComponent.position.x;
   // const targetY = grassTransformComponent.position.y;
   // const targetDirection = cowTransformComponent.position.calculateAngleBetween(grassTransformComponent.position);
   
   // moveCow(cow, targetX, targetY, targetDirection, Vars.SLOW_ACCELERATION);

   // const dist = cowTransformComponent.position.calculateDistanceBetween(grassTransformComponent.position);
   // if (dist < 50) {
      if (++cowComponent.grazeProgressTicks >= Vars.GRAZE_TIME_TICKS) {
         // 
         // Eat grass
         // 
   
         for (let i = 0; i < 4; i++) {
            const blockAmount = randFloat(0.6, 0.9);
            const position = grassHitbox.box.position.offset(randFloat(0, 12), 2 * Math.PI * Math.random());

            const grassBlockerBox = new CircularBox(position, new Point(0, 0), 0, randFloat(12, 18));
            createGrassBlocker(grassBlockerBox, getEntityLayer(cow), blockAmount, blockAmount, 0);
         }
   
         healEntity(cow, 3, cow);
         cowComponent.grazeCooldownTicks = randInt(CowVars.MIN_GRAZE_COOLDOWN, CowVars.MAX_GRAZE_COOLDOWN);
         cowComponent.bowelFullness = 1;
         cowComponent.targetGrass = 0;
      }
   // }
      
   stopCow(cow);
}

const findHerdMembers = (cowComponent: CowComponent, visibleEntities: ReadonlyArray<Entity>): ReadonlyArray<Entity> => {
   const herdMembers = new Array<Entity>();
   for (let i = 0; i < visibleEntities.length; i++) {
      const entity = visibleEntities[i];
      if (getEntityType(entity) === EntityType.cow) {
         const otherCowComponent = CowComponentArray.getComponent(entity);
         if (otherCowComponent.species === cowComponent.species) {
            herdMembers.push(entity);
         }
      }
   }
   return herdMembers;
}

const stopCow = (cow: Entity): void => {
   const transformComponent = TransformComponentArray.getComponent(cow);
   const bodyHitbox = transformComponent.rootChildren[0] as Hitbox;
   const headHitbox = transformComponent.children[1] as Hitbox;

   stopHitboxTurning(bodyHitbox);
   stopHitboxTurning(headHitbox);
}

const moveCow = (cow: Entity, turnTargetX: number, turnTargetY: number, moveTargetDirection: number, acceleration: number): void => {
   const transformComponent = TransformComponentArray.getComponent(cow);
   const cowBodyHitbox = transformComponent.rootChildren[0] as Hitbox;

   // 
   // Move whole cow to the target
   // 
   
   const alignmentToTarget = findAngleAlignment(cowBodyHitbox.box.angle, moveTargetDirection);
   const accelerationMultiplier = lerp(0.3, 1, alignmentToTarget);
   const accelerationX = acceleration * accelerationMultiplier * Math.sin(moveTargetDirection);
   const accelerationY = acceleration * accelerationMultiplier * Math.cos(moveTargetDirection);
   applyAcceleration(cow, cowBodyHitbox, accelerationX, accelerationY);

   const targetFaceDirection = angle(turnTargetX - cowBodyHitbox.box.position.x, turnTargetY - cowBodyHitbox.box.position.y);
   const turnSpeed = getAbsAngleDiff(cowBodyHitbox.box.angle, targetFaceDirection) > 0.3 ? 1 : 0.15;
   setHitboxIdealAngle(cowBodyHitbox, targetFaceDirection, turnSpeed);
   
   // 
   // Move head to the target
   // 
   
   const headHitbox = transformComponent.children[1] as Hitbox;
   const headTargetDirection = angle(turnTargetX - headHitbox.box.position.x, turnTargetY - headHitbox.box.position.y);

   // @Hack
   const headForce = 30;
   const moveX = headForce * Settings.I_TPS * Math.sin(headTargetDirection);
   const moveY = headForce * Settings.I_TPS * Math.cos(headTargetDirection);
   translateHitbox(headHitbox, moveX, moveY);

   // Turn the head to face the target

   setHitboxIdealAngle(headHitbox, headTargetDirection, Vars.HEAD_TURN_SPEED);

   // Restrict how far the neck can turn
   headHitbox.box.relativeAngle = cleanAngleNEW(headHitbox.box.relativeAngle);
   if (headHitbox.box.relativeAngle < -0.5) {
      headHitbox.box.relativeAngle = -0.5;
   } else if (headHitbox.box.relativeAngle > 0.5) {
      headHitbox.box.relativeAngle = 0.5;
   }

   // 
   // Turn the body with the head
   // 
   // @Cleanup: A cleaner and better solution would be a spring on the rotational offset

   // let headOffsetDirection = angle(headHitbox.box.position.x - cowBodyHitbox.box.position.x, headHitbox.box.position.y - cowBodyHitbox.box.position.y);
   // headOffsetDirection = cleanAngleNEW(headOffsetDirection);

   // if (Math.abs(headOffsetDirection) > Vars.HEAD_DIRECTION_LEEWAY) {
   //    // Force is in the direction which will get head offset direction back towards 0
   //    const rotationForce = (headOffsetDirection - Vars.HEAD_DIRECTION_LEEWAY) * Math.sign(headOffsetDirection) * Settings.I_TPS;

   //    cowBodyHitbox.box.relativeAngle += rotationForce;

   //    const headOffsetX = headHitbox.box.offset.x;
   //    const headOffsetY = headHitbox.box.offset.y;
   //    headHitbox.box.offset.x = rotateXAroundOrigin(headOffsetX, headOffsetY, -rotationForce);
   //    headHitbox.box.offset.y = rotateYAroundOrigin(headOffsetX, headOffsetY, -rotationForce);
   // }
}

const chaseAndEatBerry = (cow: Entity, cowComponent: CowComponent, berryItemEntity: Entity): boolean => {
   if (entitiesAreColliding(cow, berryItemEntity) !== CollisionVars.NO_COLLISION) {
      eatBerry(cow, berryItemEntity, cowComponent);
      return true;
   }

   const cowTransformComponent = TransformComponentArray.getComponent(cow);
   const cowBodyHitbox = cowTransformComponent.rootChildren[0] as Hitbox;

   const berryTransformComponent = TransformComponentArray.getComponent(berryItemEntity);
   const berryHitbox = berryTransformComponent.children[0] as Hitbox;

   const targetX = berryHitbox.box.position.x;
   const targetY = berryHitbox.box.position.y;
   const targetDirection = angle(targetX - cowBodyHitbox.box.position.x, targetY - cowBodyHitbox.box.position.y);
   moveCow(cow, targetX, targetY, targetDirection, Vars.MEDIUM_ACCELERATION);

   return false;
}

const entityIsHoldingBerry = (entity: Entity): boolean => {
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(entity);

   for (let i = 0; i < inventoryUseComponent.limbInfos.length; i++) {
      const limbInfo = inventoryUseComponent.limbInfos[i];

      const heldItem = limbInfo.associatedInventory.itemSlots[limbInfo.selectedItemSlot];
      if (typeof heldItem !== "undefined" && heldItem.type === ItemType.berry) {
         return true;
      }
   }

   return false;
}

const getFollowTarget = (followAIComponent: FollowAIComponent, visibleEntities: ReadonlyArray<Entity>): [Entity | null, boolean] => {
   const wantsToFollow = entityWantsToFollow(followAIComponent);

   let currentTargetIsHoldingBerry = false;
   let target: Entity | null = null;
   for (let i = 0; i < visibleEntities.length; i++) {
      const entity = visibleEntities[i];

      if (!InventoryUseComponentArray.hasComponent(entity)) {
         continue;
      }

      const isHoldingBerry = entityIsHoldingBerry(entity);
      if (target === null && wantsToFollow && !isHoldingBerry) {
         target = entity;
      } else if (!currentTargetIsHoldingBerry && isHoldingBerry) {
         target = entity;
         currentTargetIsHoldingBerry = true;
      }
   }

   return [target, currentTargetIsHoldingBerry];
}

function onTick(cow: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(cow);
   const cowBodyHitbox = transformComponent.rootChildren[0] as Hitbox;
   
   const cowComponent = CowComponentArray.getComponent(cow);

   if (cowComponent.poopProductionCooldownTicks > 0) {
      cowComponent.poopProductionCooldownTicks--;
   } else if (cowComponent.bowelFullness >= Vars.MIN_POOP_PRODUCTION_FULLNESS) {
      // @Temporary
      if(1+1===3) {
         poop(cow, cowComponent);
      }
   }

   cowComponent.bowelFullness -= 1 / Vars.BOWEL_EMPTY_TIME_TICKS;
   if (cowComponent.bowelFullness < 0) {
      cowComponent.bowelFullness = 0;
   }

   if (cowComponent.grazeCooldownTicks > 0) {
      cowComponent.grazeCooldownTicks--;
   }

   if (cowComponent.bowelFullness === 0 && getEntityAgeTicks(cow) % (2 * Settings.TPS) === 0) {
      hitEntity(cow, null, 1, 0, AttackEffectiveness.effective, cowBodyHitbox.box.position.copy(), 0);
   }
   
   // If the cow is recovering after doing a ram, just stand still and do nothing else
   if (cowComponent.ramRestTicks > 0) {
      cowComponent.ramRestTicks--;
      stopCow(cow);
      return;
   }

   // - Copying the carried entities' acceleration is actually inaccurate in some cases if the carried
   //   entity isn't exactly on the thing being accelerated.
   // When something is riding the cow, that entity controls the cow's movement
   const rideableComponent = RideableComponentArray.getComponent(cow);
   const rider = rideableComponent.carrySlots[0].occupiedEntity;
   if (entityExists(rider)) {
      const targetPosition = getRiderTargetPosition(rider);
      if (targetPosition !== null) {
         const targetDirection = cowBodyHitbox.box.position.calculateAngleBetween(targetPosition);
         moveCow(cow, targetPosition.x, targetPosition.y, targetDirection, Vars.FAST_ACCELERATION);
         return;
      }
   }

   const aiHelperComponent = AIHelperComponentArray.getComponent(cow);

   const escapeTarget = getEscapeTarget(cow);
   if (escapeTarget !== null) {
      const escapeTargetTransformComponent = TransformComponentArray.getComponent(escapeTarget);
      const escapeTargetHitbox = escapeTargetTransformComponent.children[0] as Hitbox;
      
      const targetX = cowBodyHitbox.box.position.x * 2 - escapeTargetHitbox.box.position.x;
      const targetY = cowBodyHitbox.box.position.y * 2 - escapeTargetHitbox.box.position.y;
      const targetDirection = angle(targetX - cowBodyHitbox.box.position.x, targetY - cowBodyHitbox.box.position.y);
      moveCow(cow, targetX, targetY, targetDirection, Vars.FAST_ACCELERATION);
      return;
   }

   // Go to follow target if possible
   // @Copynpaste
   const tamingComponent = TamingComponentArray.getComponent(cow);
   if (entityExists(tamingComponent.followTarget)) {
      const targetTransformComponent = TransformComponentArray.getComponent(tamingComponent.followTarget);
      const targetHitbox = targetTransformComponent.children[0] as Hitbox;
      
      const targetDirection = angle(targetHitbox.box.position.x - cowBodyHitbox.box.position.x, targetHitbox.box.position.y - cowBodyHitbox.box.position.y);
      moveCow(cow, targetHitbox.box.position.x, targetHitbox.box.position.y, targetDirection, Vars.MEDIUM_ACCELERATION);
      if (getEntityAgeTicks(cow) % Settings.TPS === 0) {
         addSkillLearningProgress(tamingComponent, TamingSkillID.move, 1);
      }
      return;
   }

   // Go to move target
   if (cowComponent.targetMovePosition !== null) {
      const targetX = cowComponent.targetMovePosition.x;
      const targetY = cowComponent.targetMovePosition.y;
      const targetDirection = angle(targetX - cowBodyHitbox.box.position.x, targetY - cowBodyHitbox.box.position.y);
      moveCow(cow, targetX, targetY, targetDirection, Vars.MEDIUM_ACCELERATION);
      return;
   }

   // @Hack @Copynpaste
   // Pick up carry target
   if (entityExists(tamingComponent.carryTarget)) {
      const targetTransformComponent = TransformComponentArray.getComponent(tamingComponent.carryTarget);
      const targetHitbox = targetTransformComponent.children[0] as Hitbox;
      
      const targetDirection = cowBodyHitbox.box.position.calculateAngleBetween(targetHitbox.box.position);
      moveCow(cow, targetHitbox.box.position.x, targetHitbox.box.position.y, targetDirection, Vars.MEDIUM_ACCELERATION);

      // Force carry if colliding and head is looking at the carry target
      const headHitbox = transformComponent.children[1] as Hitbox;
      if (getAbsAngleDiff(headHitbox.box.angle, targetDirection) < 0.1 && entitiesAreColliding(cow, tamingComponent.carryTarget) !== CollisionVars.NO_COLLISION) {
         const rideableComponent = RideableComponentArray.getComponent(cow);
         const carrySlot = rideableComponent.carrySlots[0];
         mountCarrySlot(tamingComponent.carryTarget, cow, carrySlot);
         tamingComponent.carryTarget = 0;
      }
      return;
   }

   if (entityExists(cowComponent.attackTarget)) {
      const targetTransformComponent = TransformComponentArray.getComponent(cowComponent.attackTarget);
      const targetHitbox = targetTransformComponent.children[0] as Hitbox;

      // Do the ram attack
      if (cowComponent.isRamming) {
         if (cowComponent.ramRemainingChargeTicks > 0) {
            cowComponent.ramRemainingChargeTicks--;
            moveCow(cow, targetHitbox.box.position.x, targetHitbox.box.position.y, 0, 0);
         } else {
            // Continue charging on straight in the head's current direction
            const targetDirection = cowBodyHitbox.box.position.calculateAngleBetween(targetHitbox.box.position);
            moveCow(cow, targetHitbox.box.position.x, targetHitbox.box.position.y, targetDirection, Vars.FAST_ACCELERATION);
         }
      } else {
         if (cowComponent.ramCooldownTicks > 0) {
            cowComponent.ramCooldownTicks--;
         }
         
         const dist = getDistanceFromPointToEntity(cowBodyHitbox.box.position, targetTransformComponent);
         
         if (willStopAtDesiredDistance(cowBodyHitbox, 130, dist)) {
            // If the cow is too close, move away
            let targetDirection = cowBodyHitbox.box.position.calculateAngleBetween(targetHitbox.box.position);
            targetDirection += Math.PI;
            // @Hack: acceleration (to counteract acceleration multiplier)
            moveCow(cow, targetHitbox.box.position.x, targetHitbox.box.position.y, targetDirection, Vars.SLOWMEDIUM_ACCELERATION / 0.3);
         } else if (willStopAtDesiredDistance(cowBodyHitbox, 180, dist)) {
            // Within valid ram start range
            moveCow(cow, targetHitbox.box.position.x, targetHitbox.box.position.y, 0, 0);
            if (cowComponent.ramCooldownTicks === 0) {
               // If the ram attack isn't 
               const headHitbox = transformComponent.children[1] as Hitbox;
               const targetDirection = headHitbox.box.position.calculateAngleBetween(targetHitbox.box.position);
               if (getAbsAngleDiff(headHitbox.box.angle, targetDirection) < 0.1) {
                  // Start the ram attack
                  cowComponent.isRamming = true;
                  cowComponent.ramStartTicks = getGameTicks();
               }
            }
         } else {
            // If the cow isn't close enough, move towards the target
            const targetDirection = cowBodyHitbox.box.position.calculateAngleBetween(targetHitbox.box.position);
            moveCow(cow, targetHitbox.box.position.x, targetHitbox.box.position.y, targetDirection, Vars.MEDIUM_ACCELERATION);
         }
      }
      return;
   }

   // Graze dirt to recover health
   if (cowComponent.grazeCooldownTicks === 0) {
      if (!entityExists(cowComponent.targetGrass)) {
         const target = getTargetGrass(cow);
         if (target !== null && getEntityAgeTicks(cow) % Settings.TPS === 0) {
            cowComponent.targetGrass = target;
         }
      }

      if (entityExists(cowComponent.targetGrass)) {
         graze(cow, cowComponent, cowComponent.targetGrass);
         return;
      }
      // @Incomplete: Why is this here?
      cowComponent.grazeProgressTicks = 0;
   }

   const layer = getEntityLayer(cow);

   // Eat berries
   if (wantsToEatBerries(cowComponent)) {
      for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
         const itemEntity = aiHelperComponent.visibleEntities[i];
         if (getEntityType(itemEntity) === EntityType.itemEntity) {
            const itemComponent = ItemComponentArray.getComponent(itemEntity);
            if (itemComponent.itemType === ItemType.berry) {
               const wasEaten = chaseAndEatBerry(cow, cowComponent, itemEntity);
               if (wasEaten) {
                  healEntity(cow, 3, cow);
                  break;
               }
               return;
            }
         }
      }
   }

   // Shake berries off berry bushes
   const healthComponent = HealthComponentArray.getComponent(cow);
   if (healthComponent.health < healthComponent.maxHealth) {
      // Attempt to find a berry bush
      if (!entityExists(cowComponent.targetBushID)) {
         let target: Entity | null = null;
         let minDistance = Number.MAX_SAFE_INTEGER;
         for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
            const berryBush = aiHelperComponent.visibleEntities[i];
            if (getEntityType(berryBush) !== EntityType.berryBush) {
               continue;
            }

            // Don't shake bushes without berries
            const berryBushComponent = BerryBushComponentArray.getComponent(berryBush);
            if (berryBushComponent.numBerries === 0) {
               continue;
            }

            const berryBushTransformComponent = TransformComponentArray.getComponent(berryBush);
            const berryBushHitbox = berryBushTransformComponent.children[0] as Hitbox;
            
            const distance = cowBodyHitbox.box.position.calculateDistanceBetween(berryBushHitbox.box.position);
            if (distance < minDistance) {
               minDistance = distance;
               target = berryBush;
            }
         }

         if (target !== null) {
            cowComponent.targetBushID = target;
         }
      }

      if (entityExists(cowComponent.targetBushID)) {
         const targetTransformComponent = TransformComponentArray.getComponent(cowComponent.targetBushID);
         const targetHitbox = targetTransformComponent.children[0] as Hitbox;
         
         const targetDirection = cowBodyHitbox.box.position.calculateAngleBetween(targetHitbox.box.position);
         moveCow(cow, targetHitbox.box.position.x, targetHitbox.box.position.y, targetDirection, Vars.SLOW_ACCELERATION);

         // If the target entity is directly in front of the cow, start eatin it
         const eatPositionX = cowBodyHitbox.box.position.x + 60 * Math.sin(cowBodyHitbox.box.angle);
         const eatPositionY = cowBodyHitbox.box.position.y + 60 * Math.cos(cowBodyHitbox.box.angle);
         if (positionIsInWorld(eatPositionX, eatPositionY)) {
            // @Hack? The only place which uses this weird function
            const testEntities = getEntitiesAtPosition(layer, eatPositionX, eatPositionY);
            if (testEntities.indexOf(cowComponent.targetBushID) !== -1) {
               cowComponent.bushShakeTimer++;
               if (cowComponent.bushShakeTimer >= 1.5 * Settings.TPS) {
                  const hitPosition = new Point(eatPositionX, eatPositionY);
                  hitEntityWithoutDamage(cowComponent.targetBushID, cow, hitPosition, 1);
                  cowComponent.bushShakeTimer = 0;
                  cowComponent.targetBushID = 0;
               }
            } else {
               cowComponent.bushShakeTimer = 0;
            }
         } else {
            cowComponent.bushShakeTimer = 0;
         }

         return;
      }
   }

   // Follow AI
   const followAIComponent = FollowAIComponentArray.getComponent(cow);
   updateFollowAIComponent(cow, aiHelperComponent.visibleEntities, 7);

   if (entityExists(followAIComponent.followTargetID)) {
      const targetTransformComponent = TransformComponentArray.getComponent(followAIComponent.followTargetID);
      const targetHitbox = targetTransformComponent.children[0] as Hitbox;
      
      const targetDirection = cowBodyHitbox.box.position.calculateAngleBetween(targetHitbox.box.position);
      moveCow(cow, targetHitbox.box.position.x, targetHitbox.box.position.y, targetDirection, Vars.SLOW_ACCELERATION);
      return;
   } else {
      const [followTarget, isHoldingBerry] = getFollowTarget(followAIComponent, aiHelperComponent.visibleEntities);
      if (followTarget !== null) {
         // Follow the entity
         followAISetFollowTarget(cow, followTarget, randInt(CowVars.MIN_FOLLOW_COOLDOWN, CowVars.MAX_FOLLOW_COOLDOWN), !isHoldingBerry);
         return;
      }
   }

   // Herd AI
   // @Incomplete: Steer the herd away from non-plains biomes
   const herdMembers = findHerdMembers(cowComponent, aiHelperComponent.visibleEntities);
   if (herdMembers.length >= 2 && herdMembers.length <= 6) {
      runHerdAI(cow, herdMembers, aiHelperComponent.visionRange, Vars.TURN_RATE, Vars.MIN_SEPARATION_DISTANCE, Vars.SEPARATION_INFLUENCE, Vars.ALIGNMENT_INFLUENCE, Vars.COHESION_INFLUENCE);

      // @Incomplete: use new move func
      const accelerationX = 200 * Math.sin(cowBodyHitbox.box.angle);
      const accelerationY = 200 * Math.cos(cowBodyHitbox.box.angle);
      applyAcceleration(cow, cowBodyHitbox, accelerationX, accelerationY);
      stopCow(cow);
      return;
   }

   // Wander AI
   const wanderAI = aiHelperComponent.getWanderAI();
   wanderAI.update(cow);
   if (wanderAI.targetPositionX !== -1) {
      const targetDirection = angle(wanderAI.targetPositionX - cowBodyHitbox.box.position.x, wanderAI.targetPositionY - cowBodyHitbox.box.position.y);
      moveCow(cow, wanderAI.targetPositionX, wanderAI.targetPositionY, targetDirection, Vars.SLOW_ACCELERATION);
   } else {
      stopCow(cow);
   }
}

function getDataLength(): number {
   return 4 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const cowComponent = CowComponentArray.getComponent(entity);

   packet.addNumber(cowComponent.species);
   packet.addNumber(cowComponent.grazeProgressTicks > 0 ? cowComponent.grazeProgressTicks / Vars.GRAZE_TIME_TICKS : -1);

   packet.addBoolean(entityExists(cowComponent.attackTarget));
   packet.padOffset(3);

   packet.addBoolean(cowComponent.isRamming);
   packet.padOffset(3);
}

const eatBerry = (cow: Entity, berryItemEntity: Entity, cowComponent: CowComponent): void => {
   cowComponent.bowelFullness += Vars.BERRY_FULLNESS_VALUE;

   const itemComponent = ItemComponentArray.getComponent(berryItemEntity);
   if (itemComponent.throwingEntity !== null) {
      const tamingComponent = TamingComponentArray.getComponent(cow);
      tamingComponent.foodEatenInTier++;
   }

   destroyEntity(berryItemEntity);

   const tickEvent: EntityTickEvent = {
      entityID: cow,
      type: EntityTickEventType.cowEat,
      data: 0
   };
   registerEntityTickEvent(cow, tickEvent);
}

export function wantsToEatBerries(cowComponent: CowComponent): boolean {
   return cowComponent.bowelFullness <= Vars.MAX_BERRY_CHASE_FULLNESS;
}

const stopRamming = (cowComponent: CowComponent): void => {
   cowComponent.isRamming = false;
   cowComponent.ramCooldownTicks = Vars.RAM_COOLDOWN_TICKS;
   cowComponent.ramRemainingChargeTicks = Vars.RAM_CHARGE_TICKS;
   cowComponent.ramRestTicks = Vars.RAM_REST_TICKS;
}

function onHitboxCollision(cow: Entity, collidingEntity: Entity, affectedHitbox: Hitbox, collidingHitbox: Hitbox, collisionPoint: Point): void {
   const cowComponent = CowComponentArray.getComponent(cow);
   if (!cowComponent.isRamming) {
      return;
   }

   // @Hack to get the cow breaking down walls scene working
   if (getEntityType(collidingEntity) === EntityType.cow) {
      return;
   }

   if (!HealthComponentArray.hasComponent(collidingEntity)) {
      return;
   }

   if (affectedHitbox.velocity.length() <= 100) {
      // If the cow is being blocked, stop the ram
      const ticksSinceRamStart = getGameTicks() - cowComponent.ramStartTicks;
      if (ticksSinceRamStart >= 1 * Settings.TPS) {
         stopRamming(cowComponent);
      }
      return;
   }

   const hitDirection = affectedHitbox.box.position.calculateAngleBetween(collidingHitbox.box.position);
   
   hitEntity(collidingEntity, cow, 2, DamageSource.iceSpikes, AttackEffectiveness.effective, collisionPoint, 0);
   applyKnockback(collidingEntity, collidingHitbox, 180, hitDirection);

   stopRamming(cowComponent);
}