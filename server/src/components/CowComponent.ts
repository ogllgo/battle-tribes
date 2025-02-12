import { CowSpecies, Entity, EntityType } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { angle, getAbsAngleDiff, lerp, positionIsInWorld, randFloat, randInt, rotateXAroundOrigin, rotateYAroundOrigin, UtilVars } from "battletribes-shared/utils";
import { EntityTickEvent, EntityTickEventType } from "battletribes-shared/entity-events";
import { ServerComponentType } from "battletribes-shared/components";
import { CowVars } from "../entities/mobs/cow";
import { ComponentArray } from "./ComponentArray";
import { ItemType } from "battletribes-shared/items/items";
import { registerEntityTickEvent } from "../server/player-clients";
import { getEntityTile, TransformComponentArray } from "./TransformComponent";
import { createItemEntityConfig, createItemsOverEntity } from "../entities/item-entity";
import { createEntity } from "../Entity";
import { Packet } from "battletribes-shared/packets";
import { TileType } from "battletribes-shared/tiles";
import { cleanAngleNEW, findAngleAlignment, moveEntityToPosition, runHerdAI, stopEntity, turnAngle } from "../ai-shared";
import { AIHelperComponentArray } from "./AIHelperComponent";
import { BerryBushComponentArray, dropBerry } from "./BerryBushComponent";
import { getEscapeTarget, runEscapeAI } from "./EscapeAIComponent";
import { FollowAIComponentArray, updateFollowAIComponent, startFollowingEntity, entityWantsToFollow, FollowAIComponent } from "./FollowAIComponent";
import { healEntity, HealthComponentArray } from "./HealthComponent";
import { ItemComponentArray } from "./ItemComponent";
import { PhysicsComponentArray } from "./PhysicsComponent";
import { GrassBlockerCircle } from "battletribes-shared/grass-blockers";
import { entitiesAreColliding, CollisionVars } from "../collision";
import { addGrassBlocker } from "../grass-blockers";
import { InventoryUseComponentArray } from "./InventoryUseComponent";
import { destroyEntity, entityExists, getEntityLayer, getEntityType } from "../world";
import { getEntitiesAtPosition } from "../layer-utils";
import { RideableComponentArray } from "./RideableComponent";

const enum Vars {
   MIN_POOP_PRODUCTION_COOLDOWN = 5 * Settings.TPS,
   MAX_POOP_PRODUCTION_COOLDOWN = 15 * Settings.TPS,
   GRAZE_TIME_TICKS = 5 * Settings.TPS,
   BERRY_FULLNESS_VALUE = 0.15,
   MIN_POOP_PRODUCTION_FULLNESS = 0.4,
   BOWEL_EMPTY_TIME_TICKS = 55 * Settings.TPS,
   MAX_BERRY_CHASE_FULLNESS = 0.8,
   // @Hack
   TURN_SPEED = 3.14159265358979,
   // Herd AI constants
   TURN_RATE = 0.4,
   MIN_SEPARATION_DISTANCE = 150,
   SEPARATION_INFLUENCE = 0.7,
   ALIGNMENT_INFLUENCE = 0.5,
   COHESION_INFLUENCE = 0.3,
   /** Amount of rotation the head can be offset relative to the body */
   HEAD_DIRECTION_LEEWAY = 0.3,
   HEAD_TURN_SPEED = 0.75 * UtilVars.PI
}

export class CowComponent {
   public readonly species: CowSpecies = randInt(0, 1);
   public grazeProgressTicks = 0;
   public grazeCooldownTicks = randInt(CowVars.MIN_GRAZE_COOLDOWN, CowVars.MAX_GRAZE_COOLDOWN);

   // For shaking berry bushes
   public targetBushID = 0;
   public bushShakeTimer = 0;

   /** Used when producing poop. */
   public bowelFullness = 0;
   public poopProductionCooldownTicks = 0;

   // @Temporary
   public followTarget: Entity = 0;
}

export const CowComponentArray = new ComponentArray<CowComponent>(ServerComponentType.cow, true, getDataLength, addDataToPacket);
CowComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};
CowComponentArray.preRemove = preRemove;

const poop = (cow: Entity, cowComponent: CowComponent): void => {
   cowComponent.poopProductionCooldownTicks = randInt(Vars.MIN_POOP_PRODUCTION_COOLDOWN, Vars.MAX_POOP_PRODUCTION_COOLDOWN);

   // Shit it out
   const transformComponent = TransformComponentArray.getComponent(cow);
   const poopPosition = transformComponent.position.offset(randFloat(0, 16), 2 * Math.PI * Math.random());
   const config = createItemEntityConfig(ItemType.poop, 1, null);
   config.components[ServerComponentType.transform].position.x = poopPosition.x;
   config.components[ServerComponentType.transform].position.y = poopPosition.y;
   config.components[ServerComponentType.transform].relativeRotation = 2 * Math.PI * Math.random();
   createEntity(config, getEntityLayer(cow), 0);

   // Let it out
   const event: EntityTickEvent<EntityTickEventType.cowFart> = {
      entityID: cow,
      type: EntityTickEventType.cowFart,
      data: 0
   };
   registerEntityTickEvent(cow, event);
}

export function updateCowComponent(cow: Entity, cowComponent: CowComponent): void {
   if (cowComponent.poopProductionCooldownTicks > 0) {
      cowComponent.poopProductionCooldownTicks--;
   } else if (cowComponent.bowelFullness >= Vars.MIN_POOP_PRODUCTION_FULLNESS) {
      poop(cow, cowComponent);
   }

   cowComponent.bowelFullness -= 1 / Vars.BOWEL_EMPTY_TIME_TICKS;
   if (cowComponent.bowelFullness < 0) {
      cowComponent.bowelFullness = 0;
   }

   if (cowComponent.grazeCooldownTicks > 0) {
      cowComponent.grazeCooldownTicks--;
   }
}

const graze = (cow: Entity, cowComponent: CowComponent): void => {
   const physicsComponent = PhysicsComponentArray.getComponent(cow);
   stopEntity(physicsComponent);

   if (++cowComponent.grazeProgressTicks >= Vars.GRAZE_TIME_TICKS) {
      const transformComponent = TransformComponentArray.getComponent(cow);

      // 
      // Eat grass
      // 

      for (let i = 0; i < 7; i++) {
         const blockAmount = randFloat(0.6, 0.9);

         const grassBlocker: GrassBlockerCircle = {
            radius: randFloat(10, 20),
            position: transformComponent.position.offset(randFloat(0, 55), 2 * Math.PI * Math.random()),
            blockAmount: blockAmount,
            maxBlockAmount: blockAmount
         };
         addGrassBlocker(grassBlocker, 0);
      }

      healEntity(cow, 3, cow);
      cowComponent.grazeCooldownTicks = randInt(CowVars.MIN_GRAZE_COOLDOWN, CowVars.MAX_GRAZE_COOLDOWN);
   }
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

const moveCow = (cow: Entity, targetX: number, targetY: number, isRunning: boolean): void => {
   const transformComponent = TransformComponentArray.getComponent(cow);

   // 
   // Move whole cow to the target
   // 
   
   const physicsComponent = PhysicsComponentArray.getComponent(cow);

   const targetDirection = angle(targetX - transformComponent.position.x, targetY - transformComponent.position.y);
   const acceleration = isRunning ? 1000 : 200;
   
   const alignmentToTarget = findAngleAlignment(transformComponent.relativeRotation, targetDirection);
   const accelerationMultiplier = lerp(0.3, 1, alignmentToTarget);
   physicsComponent.acceleration.x = acceleration * accelerationMultiplier * Math.sin(targetDirection);
   physicsComponent.acceleration.y = acceleration * accelerationMultiplier * Math.cos(targetDirection);

   physicsComponent.targetRotation = targetDirection;
   // Don't turn if it's within neck reach range
   if (getAbsAngleDiff(transformComponent.relativeRotation, targetDirection) > 0.3) {
      physicsComponent.turnSpeed = 1;
   } else {
      physicsComponent.turnSpeed = 0.15;
   }
   
   // 
   // Move head to the target
   // 
   
   const headHitbox = transformComponent.hitboxes[1];
   const headTargetDirection = angle(targetX - headHitbox.box.position.x, targetY - headHitbox.box.position.y);

   const parentRotation = headHitbox.box.parent!.rotation;
   
   const moveX = 40 * Settings.I_TPS * Math.sin(headTargetDirection);
   const moveY = 40 * Settings.I_TPS * Math.cos(headTargetDirection);

   // Counteract the cow's rotation
   const rotatedMoveX = rotateXAroundOrigin(moveX, moveY, -parentRotation);
   const rotatedMoveY = rotateYAroundOrigin(moveX, moveY, -parentRotation);
   
   headHitbox.box.offset.x += rotatedMoveX;
   headHitbox.box.offset.y += rotatedMoveY;

   // Turn the head to face the target
   headHitbox.box.relativeRotation = turnAngle(headHitbox.box.relativeRotation, headTargetDirection - parentRotation, Vars.HEAD_TURN_SPEED);
   // @Cleanup: should really be done in the turnAngle func
   headHitbox.box.relativeRotation = cleanAngleNEW(headHitbox.box.relativeRotation);
   // Clamp the head's relative rotation (purely for visuals)
   if (headHitbox.box.relativeRotation < -0.5) {
      headHitbox.box.relativeRotation = -0.5;
   } else if (headHitbox.box.relativeRotation > 0.5) {
      headHitbox.box.relativeRotation = 0.5;
   }

   // 
   // Turn the body with the head
   // 

   let headOffsetDirection = angle(headHitbox.box.offset.x, headHitbox.box.offset.y);
   headOffsetDirection = cleanAngleNEW(headOffsetDirection);

   if (Math.abs(headOffsetDirection) > Vars.HEAD_DIRECTION_LEEWAY) {
      // Force is in the direction which will get head offset direction back towards 0
      const rotationForce = (headOffsetDirection - Vars.HEAD_DIRECTION_LEEWAY * Math.sign(headOffsetDirection));

      transformComponent.relativeRotation += rotationForce;

      const headOffsetX = headHitbox.box.offset.x;
      const headOffsetY = headHitbox.box.offset.y;
      headHitbox.box.offset.x = rotateXAroundOrigin(headOffsetX, headOffsetY, -rotationForce);
      headHitbox.box.offset.y = rotateYAroundOrigin(headOffsetX, headOffsetY, -rotationForce);
   }
}

const chaseAndEatBerry = (cow: Entity, cowComponent: CowComponent, berryItemEntity: Entity): boolean => {
   if (entitiesAreColliding(cow, berryItemEntity) !== CollisionVars.NO_COLLISION) {
      eatBerry(berryItemEntity, cowComponent);
      return true;
   }

   const berryTransformComponent = TransformComponentArray.getComponent(berryItemEntity);
   moveCow(cow, berryTransformComponent.position.x, berryTransformComponent.position.y, false);

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
   const cowComponent = CowComponentArray.getComponent(cow);
   updateCowComponent(cow, cowComponent);

   // When something is riding the cow, that entity controls the cow's movement
   const rideableComponent = RideableComponentArray.getComponent(cow);
   const rider = rideableComponent.carrySlots[0].occupiedEntity;
   if (entityExists(rider)) {
      const riderPhysicsComponent = PhysicsComponentArray.getComponent(rider);
      const accelerationMagnitude = Math.sqrt(riderPhysicsComponent.acceleration.x * riderPhysicsComponent.acceleration.x + riderPhysicsComponent.acceleration.y * riderPhysicsComponent.acceleration.y);
      if (accelerationMagnitude > 0) {
         const normalisedAccelerationX = riderPhysicsComponent.acceleration.x / accelerationMagnitude;
         const normalisedAccelerationY = riderPhysicsComponent.acceleration.y / accelerationMagnitude;

         const targetX = transformComponent.position.x + 400 * normalisedAccelerationX;
         const targetY = transformComponent.position.y + 400 * normalisedAccelerationY;
         moveCow(cow, targetX, targetY, true);
         return;
      }
   }

   const aiHelperComponent = AIHelperComponentArray.getComponent(cow);

   const escapeTarget = getEscapeTarget(cow);
   if (escapeTarget !== null) {
      const escapeTargetTransformComponent = TransformComponentArray.getComponent(escapeTarget);
      const targetX = transformComponent.position.x * 2 - escapeTargetTransformComponent.position.x;
      const targetY = transformComponent.position.y * 2 - escapeTargetTransformComponent.position.y;
      moveCow(cow, targetX, targetY, true);
      return;
   }

   // Go to follow target if possible
   if (entityExists(cowComponent.followTarget)) {
      const targetTransformComponent = TransformComponentArray.getComponent(cowComponent.followTarget);
      moveCow(cow, targetTransformComponent.position.x, targetTransformComponent.position.y, false);
      return;
   }

   // Graze dirt to recover health
   const tileIndex = getEntityTile(transformComponent);
   const layer = getEntityLayer(cow);
   const tileType = layer.tileTypes[tileIndex];
   if (cowComponent.grazeCooldownTicks === 0 && tileType === TileType.grass) {
      graze(cow, cowComponent);
      return;
   } else {
      cowComponent.grazeProgressTicks = 0;
   }

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
            const distance = transformComponent.position.calculateDistanceBetween(berryBushTransformComponent.position);
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
         moveCow(cow, targetTransformComponent.position.x, targetTransformComponent.position.y, false);

         // If the target entity is directly in front of the cow, start eatin it
         const testPositionX = transformComponent.position.x + 60 * Math.sin(transformComponent.relativeRotation);
         const testPositionY = transformComponent.position.y + 60 * Math.cos(transformComponent.relativeRotation);
         if (positionIsInWorld(testPositionX, testPositionY)) {
            // @Hack? The only place which uses this weird function
            const testEntities = getEntitiesAtPosition(layer, testPositionX, testPositionY);
            if (testEntities.indexOf(cowComponent.targetBushID) !== -1) {
               cowComponent.bushShakeTimer++;
               if (cowComponent.bushShakeTimer >= 1.5 * Settings.TPS) {
                  dropBerry(cowComponent.targetBushID, 1);
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
      moveCow(cow, targetTransformComponent.position.x, targetTransformComponent.position.y, false);
      return;
   } else {
      const [followTarget, isHoldingBerry] = getFollowTarget(followAIComponent, aiHelperComponent.visibleEntities);
      if (followTarget !== null) {
         // Follow the entity
         startFollowingEntity(cow, followTarget, 200, Vars.TURN_SPEED, randInt(CowVars.MIN_FOLLOW_COOLDOWN, CowVars.MAX_FOLLOW_COOLDOWN), !isHoldingBerry);
         return;
      }
   }

   const physicsComponent = PhysicsComponentArray.getComponent(cow);

   // Herd AI
   // @Incomplete: Steer the herd away from non-grasslands biomes
   const herdMembers = findHerdMembers(cowComponent, aiHelperComponent.visibleEntities);
   if (herdMembers.length >= 2 && herdMembers.length <= 6) {
      runHerdAI(cow, herdMembers, aiHelperComponent.visionRange, Vars.TURN_RATE, Vars.MIN_SEPARATION_DISTANCE, Vars.SEPARATION_INFLUENCE, Vars.ALIGNMENT_INFLUENCE, Vars.COHESION_INFLUENCE);

      physicsComponent.acceleration.x = 200 * Math.sin(transformComponent.relativeRotation);
      physicsComponent.acceleration.y = 200 * Math.cos(transformComponent.relativeRotation);
      return;
   }

   // Wander AI
   const wanderAI = aiHelperComponent.getWanderAI();
   wanderAI.update(cow);
   if (wanderAI.targetPositionX !== -1) {
      moveCow(cow, wanderAI.targetPositionX, wanderAI.targetPositionY, false);
   } else {
      stopEntity(physicsComponent);
   }
}

function getDataLength(): number {
   return 4 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const cowComponent = CowComponentArray.getComponent(entity);

   packet.addNumber(cowComponent.species);
   packet.addNumber(cowComponent.grazeProgressTicks > 0 ? cowComponent.grazeProgressTicks / Vars.GRAZE_TIME_TICKS : -1);
   packet.addBoolean(entityExists(cowComponent.followTarget));
   packet.padOffset(3);
}

export function eatBerry(berryItemEntity: Entity, cowComponent: CowComponent): void {
   cowComponent.bowelFullness += Vars.BERRY_FULLNESS_VALUE;

   destroyEntity(berryItemEntity);
}

export function wantsToEatBerries(cowComponent: CowComponent): boolean {
   return cowComponent.bowelFullness <= Vars.MAX_BERRY_CHASE_FULLNESS;
}

function preRemove(cow: Entity): void {
   createItemsOverEntity(cow, ItemType.raw_beef, randInt(2, 3));
   createItemsOverEntity(cow, ItemType.leather, randInt(1, 2));
}