import { PathfindingSettings, Settings } from "battletribes-shared/settings";
import Tribe from "../../../Tribe";
import { getEntitiesInRange, stopEntity, willStopAtDesiredDistance } from "../../../ai-shared";
import { getVelocityX, getVelocityY, PhysicsComponentArray } from "../../../components/PhysicsComponent";
import { EntityRelationship, TribeComponentArray, getEntityRelationship } from "../../../components/TribeComponent";
import { TribesmanPathType, TribesmanAIComponentArray, TribesmanAIComponent } from "../../../components/TribesmanAIComponent";
import { entityCanBlockPathfinding, getEntityPathfindingGroupID, PathfindFailureDefault, getEntityFootprint, PathfindOptions, positionIsAccessible, replacePathfindingNodeGroupID, entityHasReachedNode, getAngleToNode, getClosestPathfindNode, getDistanceToNode, findClosestDropdownTile, findMultiLayerPath, Path } from "../../../pathfinding";
import { TRIBESMAN_TURN_SPEED } from "./tribesman-ai";
import { Entity, EntityType } from "battletribes-shared/entities";
import { distance, assert, randItem, getTileIndexIncludingEdges, getTileX, getTileY } from "battletribes-shared/utils";
import { doorIsClosed, toggleDoor } from "../../../components/DoorComponent";
import { InventoryUseComponentArray } from "../../../components/InventoryUseComponent";
import { TribesmanTitle } from "battletribes-shared/titles";
import { TRIBE_INFO_RECORD } from "battletribes-shared/tribes";
import { SpikesComponentArray } from "../../../components/SpikesComponent";
import { InventoryName, Inventory, ItemInfoRecord, ITEM_TYPE_RECORD, ITEM_INFO_RECORD, ToolItemInfo } from "battletribes-shared/items/items";
import { getEntityTile, TransformComponent, TransformComponentArray } from "../../../components/TransformComponent";
import { changeEntityLayer, getEntityAgeTicks, getEntityLayer, getEntityType, getGameTicks } from "../../../world";
import CircularBox from "../../../../../shared/src/boxes/CircularBox";
import Layer from "../../../Layer";
import { surfaceLayer } from "../../../layers";
import { TileType } from "../../../../../shared/src/tiles";
import { TribesmanAIType } from "../../../../../shared/src/components";
import { LocalBiome } from "../../../world-generation/terrain-generation-utils";
import { EntityHarvestingInfo } from "./tribesman-resource-gathering";
import { tribeMemberHasTitle, TribesmanComponentArray } from "../../../components/TribesmanComponent";

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
   const transformComponent = TransformComponentArray.getComponent(tribesman);
   const radius = getHumanoidRadius(transformComponent);
   return radius + 4;
}

/**
 * @param transformComponent The tribesman's transform component
 */
export function getHumanoidRadius(transformComponent: TransformComponent): number {
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
   const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman); // @Speed

   if (tribesmanComponent.paths.length === 0) {
      return true;
   }

   const currentPath = tribesmanComponent.paths[0];
   
   // @Speed
   // Recalculate if the tribesman isn't making any progress
   const physicsComponent = PhysicsComponentArray.getComponent(tribesman);

   const vx = getVelocityX(physicsComponent);
   const vy = getVelocityY(physicsComponent);
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
   const layer = getEntityLayer(tribesman);
   
   const offsetMagnitude = getHumanoidRadius(transformComponent) + 20;
   const checkX = transformComponent.position.x + offsetMagnitude * Math.sin(transformComponent.relativeRotation);
   const checkY = transformComponent.position.y + offsetMagnitude * Math.cos(transformComponent.relativeRotation);
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
   const tribesmanAIComponent = TribesmanAIComponentArray.getComponent(tribesman); // @Speed
   
   // If the entity is currently in position to change layers, do so
   const finalPath = tribesmanAIComponent.paths[tribesmanAIComponent.paths.length - 1];
   if (getEntityLayer(tribesman) !== finalPath.layer) {
      const transformComponent = TransformComponentArray.getComponent(tribesman);
      const currentTileIndex = getEntityTile(transformComponent);
      if (surfaceLayer.getTileType(currentTileIndex) === TileType.dropdown) {
         changeEntityLayer(tribesman, finalPath.layer);
      }
   }

   const path = tribesmanAIComponent.paths[0];
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
         physicsComponent.acceleration.x = acceleration * Math.sin(transformComponent.relativeRotation);
         physicsComponent.acceleration.y = acceleration * Math.cos(transformComponent.relativeRotation);
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

      tribesmanAIComponent.paths.shift();

      return true;
   }
}

export function clearTribesmanPath(tribesman: Entity): void {
   const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman); // @Speed
   tribesmanComponent.paths.splice(0, tribesmanComponent.paths.length);
}

export function getFinalPath(tribesmanAIComponent: TribesmanAIComponent): Path | null {
   if (tribesmanAIComponent.paths.length > 0) {
      return tribesmanAIComponent.paths[tribesmanAIComponent.paths.length - 1];
   }
   return null;
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
   // If moving to a new target node, recalculate path
   if (shouldRecalculatePath(tribesman, goalX, goalY, goalLayer, goalRadius)) {
      const transformComponent = TransformComponentArray.getComponent(tribesman); // @Speed
      const tribeComponent = TribeComponentArray.getComponent(tribesman); // @Speed
      const tribesmanAIComponent = TribesmanAIComponentArray.getComponent(tribesman); // @Speed
      
      const footprint = getEntityFootprint(getHumanoidRadius(transformComponent));
      const tribe = tribeComponent.tribe;
      const layer = getEntityLayer(tribesman);

      const blockingTribesmen = getPotentialBlockingTribesmen(tribesman);
      preparePathfinding(targetEntityID, tribe, blockingTribesmen);
      
      const options: PathfindOptions = {
         goalRadius: goalRadius,
         failureDefault: failureDefault
      };
      tribesmanAIComponent.paths = findMultiLayerPath(layer, goalLayer, transformComponent.position.x, transformComponent.position.y, goalX, goalY, tribe.pathfindingGroupID, footprint, options);

      cleanupPathfinding(targetEntityID, tribe, blockingTribesmen);

      // If the pathfinding failed, halt the entity
      if (tribesmanAIComponent.paths[0].isFailed) {
         const physicsComponent = PhysicsComponentArray.getComponent(tribesman);
         stopEntity(physicsComponent);
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
   const layer = getEntityLayer(entity);
   const isAccessible = positionIsAccessible(layer, transformComponent.position.x, transformComponent.position.y, tribe.pathfindingGroupID, getEntityFootprint(goalRadius));

   cleanupPathfinding(entity, tribe, blockingTribesmen);

   return isAccessible;
}

export function pathToEntityExists(tribesman: Entity, huntedEntity: Entity, goalRadius: number): boolean {
   const transformComponent = TransformComponentArray.getComponent(tribesman);
   const tribeComponent = TribeComponentArray.getComponent(tribesman);

   const huntedEntityTransformComponent = TransformComponentArray.getComponent(huntedEntity);
   
   const blockingTribesmen = getPotentialBlockingTribesmen(tribesman);
   preparePathfinding(huntedEntity, tribeComponent.tribe, blockingTribesmen);
   
   const options: PathfindOptions = {
      goalRadius: Math.floor(goalRadius / PathfindingSettings.NODE_SEPARATION),
      failureDefault: PathfindFailureDefault.none
   };
   const path = findMultiLayerPath(getEntityLayer(tribesman), getEntityLayer(huntedEntity), transformComponent.position.x, transformComponent.position.y, huntedEntityTransformComponent.position.x, huntedEntityTransformComponent.position.y, tribeComponent.tribe.pathfindingGroupID, getEntityFootprint(getHumanoidRadius(transformComponent)), options);

   cleanupPathfinding(huntedEntity, tribeComponent.tribe, blockingTribesmen);

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

const findClosestBiome = (tribesman: Entity, harvestingInfo: EntityHarvestingInfo): LocalBiome | null => {
   const transformComponent = TransformComponentArray.getComponent(tribesman);
   
   let minDist = Number.MAX_SAFE_INTEGER;
   let closestBiome: LocalBiome | null = null;
   for (const localBiome of harvestingInfo.layer.localBiomes) {
      if (localBiome.biome !== harvestingInfo.biome) {
         continue;
      }

      // Make sure the local biome has the required tiles
      let hasRequiredTiles = true;
      for (const tileRequirement of harvestingInfo.localBiomeRequiredTiles) {
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

export function moveTribesmanToBiome(tribesman: Entity, harvestingInfo: EntityHarvestingInfo): void {
   const tribesmanAIComponent = TribesmanAIComponentArray.getComponent(tribesman);

   // If the tribesman is already on way to the biome, continue
   const finalPath = getFinalPath(tribesmanAIComponent);
   if (finalPath !== null) {
      const targetTileX = Math.floor(finalPath.goalX / Settings.TILE_SIZE);
      const targetTileY = Math.floor(finalPath.goalY / Settings.TILE_SIZE);
      const tileIndex = getTileIndexIncludingEdges(targetTileX, targetTileY);
      if (finalPath.layer.getTileBiome(tileIndex) === harvestingInfo.biome) {
         continueCurrentPath(tribesman);
         return;
      }
   }
   
   const localBiome = findClosestBiome(tribesman, harvestingInfo);
   assert(localBiome !== null, "There should always be a valid biome for the tribesman to move to, probs a bug causing the biome to not generate?");
   
   const transformComponent = TransformComponentArray.getComponent(tribesman);
   
   // Try to find a close tile in the local biome to move to
   let targetX = 0;
   let targetY = 0;
   let minDist = Number.MAX_SAFE_INTEGER;
   for (let attempts = 0; attempts < 40; attempts++) {
      const targetTile = randItem(localBiome.tiles);
      const x = (getTileX(targetTile) + Math.random()) * Settings.TILE_SIZE;
      const y = (getTileY(targetTile) + Math.random()) * Settings.TILE_SIZE;

      const dist = distance(x, y, transformComponent.position.x, transformComponent.position.y);
      if (dist < minDist) {
         minDist = dist;
         targetX = x;
         targetY = y;
      }
   }
   
   pathfindTribesman(tribesman, targetX, targetY, harvestingInfo.layer, 0, TribesmanPathType.default, Math.floor(64 / PathfindingSettings.NODE_SEPARATION), PathfindFailureDefault.none);

   // @Incomplete: also note which layer the tribesman is moving to
   tribesmanAIComponent.currentAIType = TribesmanAIType.moveToBiome;
}