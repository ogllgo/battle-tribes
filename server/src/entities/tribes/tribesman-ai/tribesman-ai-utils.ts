import { PathfindingSettings, Settings } from "battletribes-shared/settings";
import Tribe from "../../../Tribe";
import { getEntitiesInRange, stopEntity, willStopAtDesiredDistance } from "../../../ai-shared";
import { PhysicsComponentArray } from "../../../components/PhysicsComponent";
import { EntityRelationship, TribeComponentArray, getEntityRelationship } from "../../../components/TribeComponent";
import { TribesmanPathType, TribesmanAIComponentArray } from "../../../components/TribesmanAIComponent";
import { entityCanBlockPathfinding, getEntityPathfindingGroupID, PathfindFailureDefault, getEntityFootprint, PathfindOptions, positionIsAccessible, replacePathfindingNodeGroupID, entityHasReachedNode, getAngleToNode, getClosestPathfindNode, getDistanceToNode, findClosestDropdownTile, findMultiLayerPath } from "../../../pathfinding";
import { TRIBESMAN_TURN_SPEED } from "./tribesman-ai";
import { Entity, EntityType } from "battletribes-shared/entities";
import { distance, assert } from "battletribes-shared/utils";
import { doorIsClosed, toggleDoor } from "../../../components/DoorComponent";
import { InventoryUseComponentArray } from "../../../components/InventoryUseComponent";
import { TribesmanTitle } from "battletribes-shared/titles";
import { TRIBE_INFO_RECORD } from "battletribes-shared/tribes";
import { TribeMemberComponentArray, tribeMemberHasTitle } from "../../../components/TribeMemberComponent";
import { SpikesComponentArray } from "../../../components/SpikesComponent";
import { InventoryName, Inventory, ItemInfoRecord, ITEM_TYPE_RECORD, ITEM_INFO_RECORD, ToolItemInfo } from "battletribes-shared/items/items";
import { getEntityTile, TransformComponent, TransformComponentArray } from "../../../components/TransformComponent";
import { changeEntityLayer, getEntityAgeTicks, getEntityLayer, getEntityType, getGameTicks } from "../../../world";
import { AIHelperComponentArray } from "../../../components/AIHelperComponent";
import CircularBox from "../../../../../shared/src/boxes/CircularBox";
import Layer, { getTileX, getTileY } from "../../../Layer";

import { surfaceLayer } from "../../../layers";
import { TileType } from "../../../../../shared/src/tiles";
import { TribesmanAIType } from "../../../../../shared/src/components";
import { LocalBiome } from "../../../world-generation/terrain-generation-utils";
import { MaterialInfo } from "./tribesman-resource-gathering";

const enum Vars {
   BLOCKING_TRIBESMAN_DISTANCE = 80,
   /** How far off the target the pathfinding can be before recalculating */
   PATH_RECALCULATE_DIST = 32,
   ACCELERATION = 700,
   SLOW_ACCELERATION = 400
}

/** How far away from the entity the attack is done */
export function getTribesmanAttackOffset(tribesman: Entity): number {
   if (getEntityType(tribesman) === EntityType.tribeWorker) {
      return 40;
   } else {
      return 50;
   }
}

/** Max distance from the attack position that the attack will be registered from */
export function getTribesmanAttackRadius(tribesman: Entity): number {
   if (getEntityType(tribesman) === EntityType.tribeWorker) {
      return 40;
   } else {
      return 50;
   }
}

/** How far the tribesman wants to be away from their target when attacking */
export function getTribesmanDesiredAttackRange(tribesman: Entity): number {
   // @Incomplete: these shouldn't be hardcoded, they should be per-swing.
   if (getEntityType(tribesman) === EntityType.tribeWorker) {
      return 28;
   } else {
      return 38;
   }
}

/**
 * @param transformComponent The tribesman's transform component
 */
export function getTribesmanRadius(transformComponent: TransformComponent): number {
   return (transformComponent.hitboxes[0].box as CircularBox).radius;
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

const getAccelerationMultiplier = (tribesman: Entity): number => {
   const tribeComponent = TribeComponentArray.getComponent(tribesman);
   const tribeMemberComponent = TribeMemberComponentArray.getComponent(tribesman);
   
   let multiplier = TRIBE_INFO_RECORD[tribeComponent.tribe.tribeType].moveSpeedMultiplier;

   // @Incomplete: only do when wearing the bush suit
   if (tribeMemberComponent.lastPlantCollisionTicks >= getGameTicks() - 1) {
      multiplier *= 0.5;
   }
   
   if (tribeMemberHasTitle(tribeMemberComponent, TribesmanTitle.sprinter)) {
      multiplier *= 1.2;
   }

   if (isCollidingWithCoveredSpikes(tribesman)) {
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
   const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman); // @Speed

   if (tribesmanComponent.paths.length === 0) {
      // Recalculate the path if the path's final node was reached but it wasn't at the goal
      const targetNode = getClosestPathfindNode(goalX, goalY);
      
      const transformComponent = TransformComponentArray.getComponent(tribesman);
      const currentNode = getClosestPathfindNode(transformComponent.position.x, transformComponent.position.y);
      
      return targetNode !== currentNode;
   } else {
      const currentPath = tribesmanComponent.paths[0];
      
      // @Speed
      // Recalculate if the tribesman isn't making any progress
      const physicsComponent = PhysicsComponentArray.getComponent(tribesman);

      const vx = physicsComponent.selfVelocity.x;
      const vy = physicsComponent.selfVelocity.y;
      const velocitySquare = vx * vx + vy * vy;
      
      const ageTicks = getEntityAgeTicks(tribesman);
      if (currentPath.rawPath.length > 2 && ageTicks % Settings.TPS === 0 && velocitySquare < 10 * 10) {
         return true;
      }

      const finalPath = tribesmanComponent.paths[tribesmanComponent.paths.length - 1];

      // Recalculate if the current path target is on the wrong layer
      if (finalPath.layer !== goalLayer) {
         return true;
      }
      
      // Recalculate if the goal has moved too far away from the path's final node

      const pathTargetNode = finalPath.smoothPath[finalPath.smoothPath.length - 1];
      
      const pathTargetX = (pathTargetNode % PathfindingSettings.NODES_IN_WORLD_WIDTH - 1) * PathfindingSettings.NODE_SEPARATION;
      const pathTargetY = (Math.floor(pathTargetNode / PathfindingSettings.NODES_IN_WORLD_WIDTH) - 1) * PathfindingSettings.NODE_SEPARATION;

      return distance(goalX, goalY, pathTargetX, pathTargetY) >= goalRadiusNodes * PathfindingSettings.NODE_SEPARATION + Vars.PATH_RECALCULATE_DIST;
   }
}

const openDoors = (tribesman: Entity, tribe: Tribe): void => {
   const transformComponent = TransformComponentArray.getComponent(tribesman);
   const layer = getEntityLayer(tribesman);
   
   const offsetMagnitude = getTribesmanRadius(transformComponent) + 20;
   const checkX = transformComponent.position.x + offsetMagnitude * Math.sin(transformComponent.rotation);
   const checkY = transformComponent.position.y + offsetMagnitude * Math.cos(transformComponent.rotation);
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

const continueCurrentPath = (tribesman: Entity): boolean => {
   const transformComponent = TransformComponentArray.getComponent(tribesman);
   const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman); // @Speed

   const path = tribesmanComponent.paths[0];
   const nodes = path.smoothPath;

   if (entityHasReachedNode(transformComponent, nodes[0])) {
      // If passed the next node, remove it
      nodes.shift();
   }

   if (nodes.length > 0) {
      const nextNode = nodes[0];
      const targetDirection = getAngleToNode(transformComponent, nextNode);

      const physicsComponent = PhysicsComponentArray.getComponent(tribesman);
      physicsComponent.targetRotation = targetDirection;
      physicsComponent.turnSpeed = TRIBESMAN_TURN_SPEED;

      // If the tribesman is close to the next node, slow down as to not overshoot it
      const distFromNode = getDistanceToNode(transformComponent, nextNode);
      if (willStopAtDesiredDistance(physicsComponent, -2, distFromNode)) {
         stopEntity(physicsComponent);
      } else {
         const acceleration = getTribesmanAcceleration(tribesman);
         physicsComponent.acceleration.x = acceleration * Math.sin(transformComponent.rotation);
         physicsComponent.acceleration.y = acceleration * Math.cos(transformComponent.rotation);
      }

      // @Speed: only do this if we know the path has a door in it
      // Open any doors in their way
      const ageTicks = getEntityAgeTicks(tribesman);
      if (ageTicks % ((Settings.TPS / 6) | 0) === 0) {
         const tribeComponent = TribeComponentArray.getComponent(tribesman); // @Speed?
         openDoors(tribesman, tribeComponent.tribe);
      }

      return false;
   } else {
      // Reached path!
      const physicsComponent = PhysicsComponentArray.getComponent(tribesman);
      stopEntity(physicsComponent);

      tribesmanComponent.paths.shift();

      return true;
   }
}

export function clearTribesmanPath(tribesman: Entity): void {
   const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman); // @Speed
   tribesmanComponent.paths.splice(0, tribesmanComponent.paths.length);
}

const getPotentialBlockingTribesmen = (tribesman: Entity): ReadonlyArray<Entity> => {
   const transformComponent = TransformComponentArray.getComponent(tribesman);
   const layer = getEntityLayer(tribesman);
   
   const minChunkX = Math.max(Math.min(Math.floor((transformComponent.position.x - Vars.BLOCKING_TRIBESMAN_DISTANCE/2) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
   const maxChunkX = Math.max(Math.min(Math.floor((transformComponent.position.x + Vars.BLOCKING_TRIBESMAN_DISTANCE/2) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
   const minChunkY = Math.max(Math.min(Math.floor((transformComponent.position.y - Vars.BLOCKING_TRIBESMAN_DISTANCE/2) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
   const maxChunkY = Math.max(Math.min(Math.floor((transformComponent.position.y + Vars.BLOCKING_TRIBESMAN_DISTANCE/2) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
   
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

const convertEntityPathfindingGroupID = (entity: Entity, oldGroupID: number, newGroupID: number): void => {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const layer = getEntityLayer(entity);
   for (const node of transformComponent.occupiedPathfindingNodes) {
      replacePathfindingNodeGroupID(layer, node, oldGroupID, newGroupID);
   }
}

const preparePathfinding = (targetEntity: Entity, tribe: Tribe, blockingTribesman: ReadonlyArray<Entity>): void => {
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
   const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman); // @Speed
   const layer = getEntityLayer(tribesman);
   
   // If the entity is currently in position to change layers, do so
   if (layer !== goalLayer) {
      const transformComponent = TransformComponentArray.getComponent(tribesman);
      const currentTileIndex = getEntityTile(transformComponent);
      if (surfaceLayer.getTileType(currentTileIndex) === TileType.dropdown) {
         changeEntityLayer(tribesman, goalLayer);
      }
   }

   // If moving to a new target node, recalculate path
   if (shouldRecalculatePath(tribesman, goalX, goalY, goalLayer, goalRadius)) {
      const transformComponent = TransformComponentArray.getComponent(tribesman); // @Speed
      const tribeComponent = TribeComponentArray.getComponent(tribesman); // @Speed
      
      const footprint = getEntityFootprint(getTribesmanRadius(transformComponent));
      const tribe = tribeComponent.tribe;
   
      const options: PathfindOptions = {
         goalRadius: goalRadius,
         failureDefault: failureDefault
      };

      const blockingTribesmen = getPotentialBlockingTribesmen(tribesman);
      preparePathfinding(targetEntityID, tribe, blockingTribesmen);
      
      const paths = findMultiLayerPath(layer, goalLayer, transformComponent.position.x, transformComponent.position.y, goalX, goalY, tribe.pathfindingGroupID, footprint, options);

      // @Incomplete: figure out why this happens
      // If the pathfinding failed, don't do anything
      if (paths[0].rawPath.length === 0) {
         const physicsComponent = PhysicsComponentArray.getComponent(tribesman);
         stopEntity(physicsComponent);
         
         cleanupPathfinding(targetEntityID, tribe, blockingTribesmen);
         return false;
      }

      tribesmanComponent.paths = paths;
      
      cleanupPathfinding(targetEntityID, tribe, blockingTribesmen);
   }

   return continueCurrentPath(tribesman);
}

// @Cleanup: these two functions do much the same thing. which one to keep?

export function entityIsAccessible(tribesman: Entity, entity: Entity, tribe: Tribe, goalRadius: number): boolean {
   const blockingTribesmen = getPotentialBlockingTribesmen(tribesman);
   preparePathfinding(entity, tribe, blockingTribesmen);

   const transformComponent = TransformComponentArray.getComponent(entity);
   const layer = getEntityLayer(entity);
   const isAccessible = positionIsAccessible(layer, transformComponent.position.x, transformComponent.position.y, tribe.pathfindingGroupID, getEntityFootprint(goalRadius));

   cleanupPathfinding(entity, tribe, blockingTribesmen);

   return isAccessible;
}

export function pathToEntityExists(tribesman: Entity, huntedEntity: Entity, tribe: Tribe, goalRadius: number): boolean {
   const transformComponent = TransformComponentArray.getComponent(tribesman);
   const huntedEntityTransformComponent = TransformComponentArray.getComponent(huntedEntity);
   
   const blockingTribesmen = getPotentialBlockingTribesmen(tribesman);
   preparePathfinding(huntedEntity, tribe, blockingTribesmen);
   
   const options: PathfindOptions = {
      goalRadius: Math.floor(goalRadius / PathfindingSettings.NODE_SEPARATION),
      failureDefault: PathfindFailureDefault.returnEmpty
   };
   const path = findMultiLayerPath(getEntityLayer(tribesman), getEntityLayer(huntedEntity), transformComponent.position.x, transformComponent.position.y, huntedEntityTransformComponent.position.x, huntedEntityTransformComponent.position.y, tribe.pathfindingGroupID, getEntityFootprint(getTribesmanRadius(transformComponent)), options);

   cleanupPathfinding(huntedEntity, tribe, blockingTribesmen);

   return path.length > 0;
}

/* INVENTORY UTILS */

/** Returns 0 if no tool is in the inventory */
export function getBestToolItemSlot(inventory: Inventory, toolCategory: keyof ItemInfoRecord): number | null {
   let bestLevel = 0;
   let bestItemSlot: number | null = null;

   for (let i = 0; i < inventory.items.length; i++) {
      const item = inventory.items[i];

      const itemCategory = ITEM_TYPE_RECORD[item.type];
      if (itemCategory === toolCategory) {
         const itemInfo = ITEM_INFO_RECORD[item.type] as ToolItemInfo;
         if (itemInfo.level > bestLevel) {
            bestLevel = itemInfo.level;
            bestItemSlot = inventory.getItemSlot(item);
         }
      }
   }

   return bestItemSlot;
}

const findClosestBiome = (tribesman: Entity, materialInfo: MaterialInfo): LocalBiome | null => {
   const transformComponent = TransformComponentArray.getComponent(tribesman);
   
   let minDist = Number.MAX_SAFE_INTEGER;
   let closestBiome: LocalBiome | null = null;
   for (const localBiome of materialInfo.layer.localBiomes) {
      if (localBiome.biome !== materialInfo.biome) {
         continue;
      }

      // Make sure the local biome has the required tiles
      let hasRequiredTiles = true;
      for (const tileRequirement of materialInfo.localBiomeRequiredTiles) {
         const amountInBiome = localBiome.tileCensus[tileRequirement.tileType];
         if (typeof amountInBiome === "undefined" || amountInBiome < tileRequirement.minAmount) {
            hasRequiredTiles = false;
            break;
         }
      }
      if (!hasRequiredTiles) {
         continue;
      }

      const dist = distance(transformComponent.position.x, transformComponent.position.y, localBiome.centerX, localBiome.centerY);
      if (dist < minDist) {
         minDist = dist;
         closestBiome = localBiome;
      }
   }

   return closestBiome;
}

export function moveTribesmanToBiome(tribesman: Entity, materialInfo: MaterialInfo): void {
   const tribesmanAIComponent = TribesmanAIComponentArray.getComponent(tribesman);

   const localBiome = findClosestBiome(tribesman, materialInfo);
   assert(localBiome !== null, "There should always be a valid biome for the tribesman to move to, probs a bug causing the biome to not generate?");

   // const targetTile = randItem(localBiome.tiles);
   const targetTile = localBiome.tilesInBorder[0];
   const targetX = (getTileX(targetTile) + 0.5) * Settings.TILE_SIZE;
   const targetY = (getTileY(targetTile) + 0.5) * Settings.TILE_SIZE;
   pathfindTribesman(tribesman, targetX, targetY, materialInfo.layer, 0, TribesmanPathType.default, Math.floor(64 / PathfindingSettings.NODE_SEPARATION), PathfindFailureDefault.throwError);

   // @Incomplete: also note which layer the tribesman is moving to
   tribesmanAIComponent.currentAIType = TribesmanAIType.moveToBiome;
}