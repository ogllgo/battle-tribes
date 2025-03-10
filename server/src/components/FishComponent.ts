import { Entity, EntityType, FishColour, DamageSource } from "battletribes-shared/entities";
import { ComponentArray } from "./ComponentArray";
import { ServerComponentType } from "battletribes-shared/components";
import { Packet } from "battletribes-shared/packets";
import { AttackEffectiveness } from "battletribes-shared/entity-damage-types";
import { InventoryName, ItemType } from "battletribes-shared/items/items";
import { Settings } from "battletribes-shared/settings";
import { TileType } from "battletribes-shared/tiles";
import { customTickIntervalHasPassed, Point, randFloat, randInt, UtilVars } from "battletribes-shared/utils";
import { runHerdAI, moveEntityToPosition } from "../ai-shared";
import { AIHelperComponentArray } from "./AIHelperComponent";
import { getEscapeTarget, runEscapeAI } from "./EscapeAIComponent";
import { hitEntity, HealthComponentArray, canDamageEntity, addLocalInvulnerabilityHash } from "./HealthComponent";
import { InventoryComponentArray, hasInventory, getInventory } from "./InventoryComponent";
import { PhysicsComponentArray } from "./PhysicsComponent";
import { TransformComponentArray, getRandomPositionInEntity } from "./TransformComponent";
import { entityExists, getEntityLayer, getEntityType } from "../world";
import { TribesmanComponentArray } from "./TribesmanComponent";
import { CollisionVars, entitiesAreColliding } from "../collision-detection";
import { applyAcceleration, applyKnockback, getHitboxTile, Hitbox, setHitboxIdealAngle } from "../hitboxes";

const enum Vars {
   TURN_SPEED = UtilVars.PI / 1.5,

   ACCELERATION = 40,
   
   TURN_RATE = 0.5,
   SEPARATION_INFLUENCE = 0.7,
   ALIGNMENT_INFLUENCE = 0.5,
   COHESION_INFLUENCE = 0.3,
   MIN_SEPARATION_DISTANCE = 40,

   LUNGE_FORCE = 200,
   LUNGE_INTERVAL = 1
}

export class FishComponent {
   public readonly colour: FishColour = randInt(0, 3);

   public flailTimer = 0;
   public secondsOutOfWater = 0;

   public leader: Entity | null = null;
   public attackTargetID = 0;
}

export const FishComponentArray = new ComponentArray<FishComponent>(ServerComponentType.fish, true, getDataLength, addDataToPacket);
FishComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};
FishComponentArray.onRemove = onRemove;

const move = (fish: Entity, direction: number): void => {
   const transformComponent = TransformComponentArray.getComponent(fish);
   const fishHitbox = transformComponent.children[0] as Hitbox;

   const layer = getEntityLayer(fish);
   
   const tileIndex = getHitboxTile(fishHitbox);
   if (layer.tileTypes[tileIndex] === TileType.water) {
      // Swim on water
      const accelerationX = 40 * Math.sin(direction);
      const accelerationY = 40 * Math.cos(direction);
      applyAcceleration(fish, fishHitbox, accelerationX, accelerationY);

      setHitboxIdealAngle(fishHitbox, direction, Vars.TURN_SPEED);
   } else {
      // 
      // Lunge on land
      // 

      const fishComponent = FishComponentArray.getComponent(fish);
      if (customTickIntervalHasPassed(fishComponent.secondsOutOfWater * Settings.TPS, Vars.LUNGE_INTERVAL)) {
         
         fishHitbox.velocity.x += Vars.LUNGE_FORCE * Math.sin(direction);
         fishHitbox.velocity.y += Vars.LUNGE_FORCE * Math.cos(direction);
         if (direction !== fishHitbox.box.angle) {
            fishHitbox.box.angle = direction;
            transformComponent.isDirty = true;
         }
      }
   }
}

const followLeader = (fish: Entity, leader: Entity): void => {
   const tribesmanComponent = TribesmanComponentArray.getComponent(leader);
   tribesmanComponent.fishFollowerIDs.push(fish);
}

const entityIsWearingFishlordSuit = (entityID: number): boolean => {
   if (!InventoryComponentArray.hasComponent(entityID)) {
      return false;
   }

   const inventoryComponent = InventoryComponentArray.getComponent(entityID);
   if (!hasInventory(inventoryComponent, InventoryName.armourSlot)) {
      return false;
   }
   
   const armourInventory = getInventory(inventoryComponent, InventoryName.armourSlot);

   const armour = armourInventory.itemSlots[1];
   return typeof armour !== "undefined" && armour.type === ItemType.fishlord_suit;
}

const unfollowLeader = (fish: Entity, leader: Entity): void => {
   const tribesmanComponent = TribesmanComponentArray.getComponent(leader);
   const idx = tribesmanComponent.fishFollowerIDs.indexOf(fish);
   if (idx !== -1) {
      tribesmanComponent.fishFollowerIDs.splice(idx, 1);
   }
}

function onTick(fish: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(fish);
   const fishHitbox = transformComponent.children[0] as Hitbox;
   
   const physicsComponent = PhysicsComponentArray.getComponent(fish);
   const fishComponent = FishComponentArray.getComponent(fish);

   const tileIndex = getHitboxTile(fishHitbox);
   const layer = getEntityLayer(fish)
   const tileType = layer.tileTypes[tileIndex];

   physicsComponent.overrideMoveSpeedMultiplier = tileType === TileType.water;

   if (tileType !== TileType.water) {
      fishComponent.secondsOutOfWater += Settings.I_TPS;
      if (fishComponent.secondsOutOfWater >= 5 && customTickIntervalHasPassed(fishComponent.secondsOutOfWater * Settings.TPS, 1.5)) {
         const hitPosition = getRandomPositionInEntity(transformComponent);
         hitEntity(fish, null, 1, DamageSource.lackOfOxygen, AttackEffectiveness.effective, hitPosition, 0);
      }
   } else {
      fishComponent.secondsOutOfWater = 0;
   }
   
   const aiHelperComponent = AIHelperComponentArray.getComponent(fish);

   // If the leader dies or is out of vision range, stop following them
   if (fishComponent.leader !== null && (!entityExists(fishComponent.leader) || !aiHelperComponent.visibleEntities.includes(fishComponent.leader))) {
      unfollowLeader(fish, fishComponent.leader);
      fishComponent.leader = null;
   }

   // Look for a leader
   if (fishComponent.leader === null) {
      for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
         const entity = aiHelperComponent.visibleEntities[i];
         if (entityIsWearingFishlordSuit(entity)) {
            // New leader
            fishComponent.leader = entity;
            followLeader(fish, entity);
            break;
         }
      }
   }

   // If a tribe member is wearing a fishlord suit, follow them
   if (fishComponent.leader !== null) {
      const target = fishComponent.attackTargetID;
      if (entityExists(target)) {
         const leaderTransformComponent = TransformComponentArray.getComponent(fishComponent.leader);
         const leaderHitbox = leaderTransformComponent.children[0] as Hitbox;
         
         // Follow leader
         move(fish, fishHitbox.box.position.calculateAngleBetween(leaderHitbox.box.position));
      } else {
         const targetTransformComponent = TransformComponentArray.getComponent(target);
         const targetHitbox = targetTransformComponent.children[0] as Hitbox;

         // Attack the target
         move(fish, fishHitbox.box.position.calculateAngleBetween(targetHitbox.box.position));

         if (entitiesAreColliding(fish, target) !== CollisionVars.NO_COLLISION) {
            const healthComponent = HealthComponentArray.getComponent(target);
            if (!canDamageEntity(healthComponent, "fish")) {
               return;
            }
            
            const hitDirection = fishHitbox.box.position.calculateAngleBetween(targetHitbox.box.position);

            // @Hack
            const collisionPoint = new Point((fishHitbox.box.position.x + targetHitbox.box.position.x) / 2, (fishHitbox.box.position.y + targetHitbox.box.position.y) / 2);
            
            hitEntity(target, fish, 2, DamageSource.fish, AttackEffectiveness.effective, collisionPoint, 0);
            applyKnockback(target, targetHitbox, 100, hitDirection);
            addLocalInvulnerabilityHash(target, "fish", 0.3);
         }
      }
      return;
   }
   
   // Flail on the ground when out of water
   if (tileType !== TileType.water) {
      fishComponent.flailTimer += Settings.I_TPS;
      if (fishComponent.flailTimer >= 0.75) {
         const flailDirection = 2 * Math.PI * Math.random();
         fishHitbox.box.relativeAngle = flailDirection + randFloat(-0.5, 0.5);
         transformComponent.isDirty = true;
         
         fishHitbox.velocity.x += 200 * Math.sin(flailDirection);
         fishHitbox.velocity.y += 200 * Math.cos(flailDirection);
   
         fishComponent.flailTimer = 0;
      }

      return;
   }

   // Escape AI
   const escapeTarget = getEscapeTarget(fish);
   if (escapeTarget !== null) {
      runEscapeAI(fish, escapeTarget);
      return;
   }

   // Herd AI
   // @Incomplete: Make fish steer away from land
   const herdMembers = new Array<Entity>();
   for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
      const entity = aiHelperComponent.visibleEntities[i];
      if (getEntityType(entity) === EntityType.fish) {
         herdMembers.push(entity);
      }
   }
   if (herdMembers.length >= 1) {
      runHerdAI(fish, herdMembers, aiHelperComponent.visionRange, Vars.TURN_RATE, Vars.MIN_SEPARATION_DISTANCE, Vars.SEPARATION_INFLUENCE, Vars.ALIGNMENT_INFLUENCE, Vars.COHESION_INFLUENCE);

      const accelerationX = 100 * Math.sin(fishHitbox.box.angle);
      const accelerationY = 100 * Math.cos(fishHitbox.box.angle);
      applyAcceleration(fish, fishHitbox, accelerationX, accelerationY);
      return;
   }

   // Wander AI
   const wanderAI = aiHelperComponent.getWanderAI();
   wanderAI.update(fish);
   if (wanderAI.targetPositionX !== -1) {
      moveEntityToPosition(fish, wanderAI.targetPositionX, wanderAI.targetPositionY, 200, Math.PI);
   }
}

function onRemove(entity: Entity): void {
   // Remove the fish from its leaders' follower array
   const fishComponent = FishComponentArray.getComponent(entity);
   if (fishComponent.leader !== null) {
      unfollowLeader(entity, fishComponent.leader);
   }
}

function getDataLength(): number {
   return 2 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const fishComponent = FishComponentArray.getComponent(entity);

   packet.addNumber(fishComponent.colour);
}