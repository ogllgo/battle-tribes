import { EntityRelationship, getEntityRelationship, TribeComponentArray } from "../../../components/TribeComponent";
import { Entity, EntityType } from "battletribes-shared/entities";
import { distance, assert, polarVec2 } from "battletribes-shared/utils";
import { doorIsClosed, toggleDoor } from "../../../components/DoorComponent";
import { InventoryUseComponentArray } from "../../../components/InventoryUseComponent";
import { TribesmanTitle } from "battletribes-shared/titles";
import { TRIBE_INFO_RECORD } from "battletribes-shared/tribes";
import { SpikesComponentArray } from "../../../components/SpikesComponent";
import { InventoryName, Inventory, ITEM_TYPE_RECORD, ITEM_INFO_RECORD, HammerItemInfo } from "battletribes-shared/items/items";
import { changeEntityLayer, TransformComponent, TransformComponentArray } from "../../../components/TransformComponent";
import { getEntityAgeTicks, getEntityLayer, getEntityType, getGameTicks } from "../../../world";
import CircularBox from "../../../../../shared/src/boxes/CircularBox";
import { tribeMemberHasTitle, TribesmanComponentArray } from "../../../components/TribesmanComponent";
import { Settings, PathfindingSettings } from "../../../../../shared/src/settings";
import { TileType } from "../../../../../shared/src/tiles";
import { getEntitiesInRange, willStopAtDesiredDistance } from "../../../ai-shared";
import { TribesmanAIComponentArray, TribesmanAIComponent, TribesmanPathType } from "../../../components/TribesmanAIComponent";
import { getHitboxVelocity, getHitboxTile, turnHitboxToAngle, applyAccelerationFromGround } from "../../../hitboxes";
import Layer from "../../../Layer";
import { surfaceLayer } from "../../../layers";
import { entityHasReachedNode, getAngleToNode, getDistanceToNode, Path, entityCanBlockPathfinding, getEntityPathfindingGroupID, convertEntityPathfindingGroupID, getEntityFootprint, findMultiLayerPath, positionIsAccessible, PathfindFailureDefault, PathfindOptions } from "../../../pathfinding";
import Tribe from "../../../Tribe";
import { TRIBESMAN_TURN_SPEED } from "./tribesman-ai";
import { AIPathfindingComponent, AIPathfindingComponentArray } from "../../../components/AIPathfindingComponent";

const enum Vars {
   BLOCKING_TRIBESMAN_DISTANCE = 80,
   /** How far off the target the pathfinding can be before recalculating */
   PATH_RECALCULATE_DIST = 32,
   ACCELERATION = 700,
   SLOW_ACCELERATION = 400
}

/** Max distance from the attack position that the attack will be registered from */
export function getTribesmanAttackRadius(tribesman: Entity): number {
   if (getEntityType(tribesman) === EntityType.tribeWorker) {
      return 35;
   } else {
      return 45;
   }
}

/** How far the tribesman wants to be away from their target when attacking */
export function getTribesmanDesiredAttackRange(tribesman: Entity): number {
   // @Incomplete: these shouldn't be hardcoded, they should be per-swing.
   const transformComponent = TransformComponentArray.getComponent(tribesman);
   const radius = getHumanoidRadius(transformComponent);
   return radius + 0;
}

/**
 * @param transformComponent The tribesman's transform component
 */
export function getHumanoidRadius(transformComponent: TransformComponent): number {
   return ((transformComponent.hitboxes[0]).box as CircularBox).radius;
}

const isCollidingWithCoveredSpikes = (tribesman: Entity): boolean => {
   const layer = getEntityLayer(tribesman);
   const collisionPairs = layer.getEntityCollisionPairs(tribesman);

   for (let i = 0; i < collisionPairs.length; i++) {
      const entityID = collisionPairs[i].collidingEntity;

      if (SpikesComponentArray.hasComponent(entityID)) {
         const spikesComponent = SpikesComponentArray.getComponent(entityID);
         if (spikesComponent.isCovered) {
            return true;
         }
      }
   }

   return false;
}

const getAccelerationMultiplier = (tribeMember: Entity): number => {
   const tribeComponent = TribeComponentArray.getComponent(tribeMember);
   
   let multiplier = TRIBE_INFO_RECORD[tribeComponent.tribe.tribeType].moveSpeedMultiplier;

   if (TribesmanComponentArray.hasComponent(tribeMember)) {
      const tribesmanComponent = TribesmanComponentArray.getComponent(tribeMember);
      
      // @Incomplete: only do when wearing the bush suit
      if (tribesmanComponent.lastPlantCollisionTicks >= getGameTicks() - 1) {
         multiplier *= 0.5;
      }
      
      if (tribeMemberHasTitle(tribesmanComponent, TribesmanTitle.sprinter)) {
         multiplier *= 1.2;
      }
   }

   if (isCollidingWithCoveredSpikes(tribeMember)) {
      multiplier *= 0.5;
   }

   return multiplier;
}

export function getTribesmanSlowAcceleration(tribesmanID: number): number {
   return Vars.SLOW_ACCELERATION * getAccelerationMultiplier(tribesmanID);
}

export function getTribesmanAcceleration(tribesmanID: number): number {
   return Vars.ACCELERATION * getAccelerationMultiplier(tribesmanID);
}

const shouldRecalculatePath = (tribesman: Entity, goalX: number, goalY: number, goalLayer: Layer, goalRadiusNodes: number): boolean => {
   const aiPathfindingComponent = AIPathfindingComponentArray.getComponent(tribesman);

   if (aiPathfindingComponent.paths.length === 0) {
      return true;
   }

   const currentPath = aiPathfindingComponent.paths[0];
   
   // @Speed
   // Recalculate if the tribesman isn't making any progress
   const transformComponent = TransformComponentArray.getComponent(tribesman);
   const tribesmanHitbox = transformComponent.hitboxes[0];

   const tribesmanVelocity = getHitboxVelocity(tribesmanHitbox);
   const vx = tribesmanVelocity.x;
   const vy = tribesmanVelocity.y;
   const velocitySquare = vx * vx + vy * vy;
   
   const ageTicks = getEntityAgeTicks(tribesman);
   if (currentPath.rawPath.length > 2 && ageTicks % Settings.TICK_RATE === 0 && velocitySquare < 10 * 10) {
      return true;
   }

   const finalPath = aiPathfindingComponent.paths[aiPathfindingComponent.paths.length - 1];

   // Recalculate if the current path target is on the wrong layer
   if (finalPath.layer !== goalLayer) {
      return true;
   }
   
   // Recalculate if the goal has moved too far away from the path's final node

   const pathTargetNode = finalPath.smoothPath[finalPath.smoothPath.length - 1];
   
   // @Hack: probs better to have a failed/succeeded boolean on the path
   // If there is no path, always recalculate
   if (typeof pathTargetNode === "undefined") {
      return true;
   }
   
   const pathTargetX = (pathTargetNode % PathfindingSettings.NODES_IN_WORLD_WIDTH - 1) * PathfindingSettings.NODE_SEPARATION;
   const pathTargetY = (Math.floor(pathTargetNode / PathfindingSettings.NODES_IN_WORLD_WIDTH) - 1) * PathfindingSettings.NODE_SEPARATION;

   return distance(goalX, goalY, pathTargetX, pathTargetY) >= goalRadiusNodes * PathfindingSettings.NODE_SEPARATION + Vars.PATH_RECALCULATE_DIST;
}

const openDoors = (tribesman: Entity, tribe: Tribe): void => {
   const transformComponent = TransformComponentArray.getComponent(tribesman);
   const tribesmanHitbox = transformComponent.hitboxes[0];
   
   const layer = getEntityLayer(tribesman);
   
   const offsetMagnitude = getHumanoidRadius(transformComponent) + 20;
   const checkX = tribesmanHitbox.box.position.x + offsetMagnitude * Math.sin(tribesmanHitbox.box.angle);
   const checkY = tribesmanHitbox.box.position.y + offsetMagnitude * Math.cos(tribesmanHitbox.box.angle);
   const entitiesInFront = getEntitiesInRange(layer, checkX, checkY, 40);
   for (let i = 0; i < entitiesInFront.length; i++) {
      const entity = entitiesInFront[i];
      if (getEntityType(entity) !== EntityType.door) {
         continue;
      }

      // Only open friendly doors
      const tribeComponent = TribeComponentArray.getComponent(entity);
      if (tribeComponent.tribe !== tribe) {
         continue;
      }

      if (doorIsClosed(entity)) {
         toggleDoor(entity);

         const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman);
         const useInfo = inventoryUseComponent.getLimbInfo(InventoryName.hotbar);
         useInfo.lastAttackTicks = getGameTicks();
      }
   }
}

export function continueCurrentPath(tribesman: Entity): boolean {
   const transformComponent = TransformComponentArray.getComponent(tribesman);
   const aiPathfindingComponent = AIPathfindingComponentArray.getComponent(tribesman);
   
   // If the entity is currently in position to change layers, do so
   const finalPath = aiPathfindingComponent.paths[aiPathfindingComponent.paths.length - 1];
   if (getEntityLayer(tribesman) !== finalPath.layer) {
      const transformComponent = TransformComponentArray.getComponent(tribesman);
      const hitbox = transformComponent.hitboxes[0];
      const currentTileIndex = getHitboxTile(hitbox);
      if (surfaceLayer.getTileType(currentTileIndex) === TileType.dropdown) {
         changeEntityLayer(tribesman, finalPath.layer);
      }
   }

   const path = aiPathfindingComponent.paths[0];
   const nodes = path.smoothPath;

   if (entityHasReachedNode(transformComponent, nodes[0])) {
      // If passed the next node, remove it
      nodes.shift();
   }

   if (nodes.length > 0) {
      const nextNode = nodes[0];
      const targetDirection = getAngleToNode(transformComponent, nextNode);

      const tribesmanHitbox = transformComponent.hitboxes[0];

      turnHitboxToAngle(tribesmanHitbox, targetDirection, TRIBESMAN_TURN_SPEED, 2, false);

      // If the tribesman is close to the next node, slow down as to not overshoot it
      const distFromNode = getDistanceToNode(transformComponent, nextNode);
      if (!willStopAtDesiredDistance(tribesmanHitbox, -16, distFromNode)) {
         const accelerationMagnitude = getTribesmanAcceleration(tribesman);
         // applyAccelerationFromGround(tribesman, tribesmanHitbox, polarVec2(accelerationMagnitude, tribesmanHitbox.box.angle));
         applyAccelerationFromGround(tribesmanHitbox, polarVec2(accelerationMagnitude, targetDirection));
      }

      // @Speed: only do this if we know the path has a door in it
      // Open any doors in their way
      const ageTicks = getEntityAgeTicks(tribesman);
      if (ageTicks % ((Settings.TICK_RATE / 6) | 0) === 0) {
         const tribeComponent = TribeComponentArray.getComponent(tribesman); // @Speed?
         openDoors(tribesman, tribeComponent.tribe);
      }

      return false;
   } else {
      // Reached path!
      aiPathfindingComponent.paths.shift();
      return true;
   }
}

export function clearTribesmanPath(tribesman: Entity): void {
   const aiPathfindingComponent = AIPathfindingComponentArray.getComponent(tribesman);
   aiPathfindingComponent.paths.splice(0, aiPathfindingComponent.paths.length);
}

export function getFinalPath(aiPathfindingComponent: AIPathfindingComponent): Path | null {
   if (aiPathfindingComponent.paths.length > 0) {
      return aiPathfindingComponent.paths[aiPathfindingComponent.paths.length - 1];
   }
   return null;
}

const getPotentialBlockingTribesmen = (tribesman: Entity): ReadonlyArray<Entity> => {
   const transformComponent = TransformComponentArray.getComponent(tribesman);
   const tribesmanHitbox = transformComponent.hitboxes[0];
   
   const layer = getEntityLayer(tribesman);
   
   const minChunkX = Math.max(Math.min(Math.floor((tribesmanHitbox.box.position.x - Vars.BLOCKING_TRIBESMAN_DISTANCE/2) / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1), 0);
   const maxChunkX = Math.max(Math.min(Math.floor((tribesmanHitbox.box.position.x + Vars.BLOCKING_TRIBESMAN_DISTANCE/2) / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1), 0);
   const minChunkY = Math.max(Math.min(Math.floor((tribesmanHitbox.box.position.y - Vars.BLOCKING_TRIBESMAN_DISTANCE/2) / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1), 0);
   const maxChunkY = Math.max(Math.min(Math.floor((tribesmanHitbox.box.position.y + Vars.BLOCKING_TRIBESMAN_DISTANCE/2) / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1), 0);
   
   const blockingTribesmen = new Array<Entity>();
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = layer.getChunk(chunkX, chunkY);

         for (let i = 0; i < chunk.entities.length; i++) {
            const entity = chunk.entities[i];
            if (blockingTribesmen.indexOf(entity) !== -1 || entity === tribesman) {
               continue;
            }

            const relationship = getEntityRelationship(tribesman, entity);
            if (relationship === EntityRelationship.friendly) {
               blockingTribesmen.push(entity);
            }
         }
      }
   }
   return blockingTribesmen;
}

const preparePathfinding = (targetEntity: Entity, tribe: Tribe, blockingTribesman: ReadonlyArray<Entity>): void => {
   // @Cleanup: why don't we just convert all the entities to 0?
   
   // Ignore the target
   if (targetEntity !== 0) {
      if (entityCanBlockPathfinding(targetEntity)) {
         const oldGroupID = getEntityPathfindingGroupID(targetEntity);
         convertEntityPathfindingGroupID(targetEntity, oldGroupID, tribe.pathfindingGroupID);
      }
   }

   // Take into account all blocking tribesmen
   for (let i = 0; i < blockingTribesman.length; i++) {
      const tribesman = blockingTribesman[i];
      convertEntityPathfindingGroupID(tribesman, tribe.pathfindingGroupID, 0);
   }
}

const cleanupPathfinding = (targetEntity: Entity | 0, tribe: Tribe, blockingTribesman: ReadonlyArray<Entity>): void => {
   // Reset the target
   if (targetEntity !== 0) {
      // @Speed: Some places which call this have access to the entity already
      if (entityCanBlockPathfinding(targetEntity)) {
         const oldGroupID = getEntityPathfindingGroupID(targetEntity);
         convertEntityPathfindingGroupID(targetEntity, tribe.pathfindingGroupID, oldGroupID);
      }
   }

   // Re-ignore all blocking tribesmen
   for (let i = 0; i < blockingTribesman.length; i++) {
      const tribesman = blockingTribesman[i];
      convertEntityPathfindingGroupID(tribesman, 0, tribe.pathfindingGroupID);
   }
}

export function pathfindTribesman(tribesman: Entity, goalX: number, goalY: number, goalLayer: Layer, targetEntityID: number, pathType: TribesmanPathType, goalRadius: number, failureDefault: PathfindFailureDefault): boolean {
   assert(goalX >= 0 && goalX < Settings.WORLD_UNITS && goalY >= 0 && goalY < Settings.WORLD_UNITS);
   
   // If moving to a new target node, recalculate path
   if (shouldRecalculatePath(tribesman, goalX, goalY, goalLayer, goalRadius)) {
      const transformComponent = TransformComponentArray.getComponent(tribesman); // @Speed
      const tribesmanHitbox = transformComponent.hitboxes[0];
      
      const tribeComponent = TribeComponentArray.getComponent(tribesman); // @Speed
      const aiPathfindingComponent = AIPathfindingComponentArray.getComponent(tribesman);
      
      const footprint = getEntityFootprint(getHumanoidRadius(transformComponent));
      const tribe = tribeComponent.tribe;
      const layer = getEntityLayer(tribesman);

      const blockingTribesmen = getPotentialBlockingTribesmen(tribesman);
      preparePathfinding(targetEntityID, tribe, blockingTribesmen);
      
      const options: PathfindOptions = {
         goalRadius: goalRadius,
         failureDefault: failureDefault
      };
      aiPathfindingComponent.paths = findMultiLayerPath(layer, goalLayer, tribesmanHitbox.box.position.x, tribesmanHitbox.box.position.y, goalX, goalY, tribe.pathfindingGroupID, footprint, options);

      cleanupPathfinding(targetEntityID, tribe, blockingTribesmen);

      if (aiPathfindingComponent.paths[0].isFailed) {
         return false;
      }
   }

   return continueCurrentPath(tribesman);
}

// @Cleanup: these two functions do much the same thing. which one to keep?

export function entityIsAccessible(tribesman: Entity, entity: Entity, tribe: Tribe, goalRadius: number): boolean {
   const blockingTribesmen = getPotentialBlockingTribesmen(tribesman);
   preparePathfinding(entity, tribe, blockingTribesmen);

   const transformComponent = TransformComponentArray.getComponent(entity);
   const entityHitbox = transformComponent.hitboxes[0];
   
   const layer = getEntityLayer(entity);
   const isAccessible = positionIsAccessible(layer, entityHitbox.box.position.x, entityHitbox.box.position.y, tribe.pathfindingGroupID, getEntityFootprint(goalRadius));

   cleanupPathfinding(entity, tribe, blockingTribesmen);

   return isAccessible;
}

export function pathToEntityExists(tribesman: Entity, huntedEntity: Entity, goalRadius: number): boolean {
   const transformComponent = TransformComponentArray.getComponent(tribesman);
   const tribesmanHitbox = transformComponent.hitboxes[0];
   
   const tribeComponent = TribeComponentArray.getComponent(tribesman);

   const huntedEntityTransformComponent = TransformComponentArray.getComponent(huntedEntity);
   const targetHitbox = huntedEntityTransformComponent.hitboxes[0];
   
   const blockingTribesmen = getPotentialBlockingTribesmen(tribesman);
   preparePathfinding(huntedEntity, tribeComponent.tribe, blockingTribesmen);
   
   const options: PathfindOptions = {
      goalRadius: Math.floor(goalRadius / PathfindingSettings.NODE_SEPARATION),
      failureDefault: PathfindFailureDefault.none
   };
   const path = findMultiLayerPath(getEntityLayer(tribesman), getEntityLayer(huntedEntity), tribesmanHitbox.box.position.x, tribesmanHitbox.box.position.y, targetHitbox.box.position.x, targetHitbox.box.position.y, tribeComponent.tribe.pathfindingGroupID, getEntityFootprint(getHumanoidRadius(transformComponent)), options);

   cleanupPathfinding(huntedEntity, tribeComponent.tribe, blockingTribesmen);

   return path.length > 0;
}

/* INVENTORY UTILS */

/** Returns 0 if no hammer is in the inventory */
export function getBestHammerItemSlot(inventory: Inventory): number | null {
   let bestRepairAmount = 0;
   let bestItemSlot: number | null = null;

   for (let i = 0; i < inventory.items.length; i++) {
      const item = inventory.items[i];

      const itemCategory = ITEM_TYPE_RECORD[item.type];
      if (itemCategory === "hammer") {
         const itemInfo = ITEM_INFO_RECORD[item.type] as HammerItemInfo;
         if (itemInfo.repairAmount > bestRepairAmount) {
            bestRepairAmount = itemInfo.repairAmount;
            bestItemSlot = inventory.getItemSlot(item);
         }
      }
   }

   return bestItemSlot;
}