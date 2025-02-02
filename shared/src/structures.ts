import { Chunks, EntityInfo, getChunk } from "./board-interface";
import { Entity, EntityType } from "./entities";
import { getBoxesCollidingEntities } from "./hitbox-collision";
import { createBracingHitboxes, createNormalStructureHitboxes } from "./boxes/entity-hitbox-creation";
import { boxIsCircular, Hitbox, updateBox } from "./boxes/boxes";
import { Settings } from "./settings";
import { Point, TileIndex, alignAngleToClosestAxis, distance, getAbsAngleDiff } from "./utils";
import { getSubtileIndex, getSubtileX, getSubtileY, subtileIsInWorld } from "./subtiles";
import { CollisionGroup, getEntityCollisionGroup } from "./collision-groups";
import { ITEM_INFO_RECORD, itemInfoIsPlaceable, ItemType, NUM_ITEM_TYPES, PlaceableItemType } from "./items/items";
import RectangularBox from "./boxes/RectangularBox";
import { boxIsCollidingWithSubtile } from "./collision";
import { SubtileType } from "./tiles";

/*
When snapping:
- By default, use the snap rotation rounded closest to the place direction.
   - e.g. walls
- Except when placing something which attaches onto the side of a structure, use the direction off that structure.
   - e.g. wall spikes
*/

const enum Vars {
   STRUCTURE_PLACE_DISTANCE = 60,
   MULTI_SNAP_POSITION_TOLERANCE = 0.1,
   MULTI_SNAP_ROTATION_TOLERANCE = 0.02,
   COLLISION_EPSILON = 0.01
}

export const STRUCTURE_TYPES = [EntityType.wall, EntityType.door, EntityType.embrasure, EntityType.floorSpikes, EntityType.wallSpikes, EntityType.floorPunjiSticks, EntityType.wallPunjiSticks, EntityType.ballista, EntityType.slingTurret, EntityType.tunnel, EntityType.tribeTotem, EntityType.workerHut, EntityType.warriorHut, EntityType.barrel, EntityType.workbench, EntityType.researchBench, EntityType.healingTotem, EntityType.planterBox, EntityType.furnace, EntityType.campfire, EntityType.fence, EntityType.fenceGate, EntityType.frostshaper, EntityType.stonecarvingTable, EntityType.bracings, EntityType.fireTorch, EntityType.slurbTorch, EntityType.automatonAssembler, EntityType.mithrilAnvil] as const;
export type StructureType = typeof STRUCTURE_TYPES[number];

interface SnapCandidate {
   readonly position: Point;
   readonly rotation: number;
   readonly connectedEntity: Entity;
   readonly hitboxes: ReadonlyArray<Hitbox>;
}

export interface StructureConnection {
   readonly entity: Entity;
}

export interface StructurePlaceInfo {
   readonly position: Point;
   readonly rotation: number;
   readonly entityType: EntityType;
   readonly connections: Array<StructureConnection>;
   readonly hitboxes: ReadonlyArray<Hitbox>;
   readonly isValid: boolean;
}

export interface WorldInfo {
   readonly chunks: Chunks;
   readonly wallSubtileTypes: Readonly<Float32Array>;
   getEntityCallback(entity: Entity): EntityInfo;
   subtileIsMined(subtileIndex: number): boolean;
   tileIsBuildingBlocking(tileIndex: TileIndex): boolean;
}

export const STRUCTURE_TYPE_TO_ENTITY_TYPE_RECORD = {} as Record<StructureType, PlaceableItemType>;
for (const structureType of STRUCTURE_TYPES) {
   for (let itemType: ItemType = 0; itemType < NUM_ITEM_TYPES; itemType++) {
      const itemInfo = ITEM_INFO_RECORD[itemType];
      if (itemInfoIsPlaceable(itemType, itemInfo)) {
         if (itemInfo.entityType === structureType) {
            STRUCTURE_TYPE_TO_ENTITY_TYPE_RECORD[structureType] = itemType as PlaceableItemType;
         }
      }
   }
}

export function entityIsStructure(entityType: EntityType): entityType is StructureType {
   return STRUCTURE_TYPES.indexOf(entityType as StructureType) !== -1;
}

export function createStructureConnection(entity: Entity): StructureConnection {
   return {
      entity: entity
   };
}

// @Hack @Copynpaste
const getTileIndexIncludingEdges = (tileX: number, tileY: number): TileIndex => {
   return (tileY + Settings.EDGE_GENERATION_DISTANCE) * Settings.FULL_BOARD_DIMENSIONS + tileX + Settings.EDGE_GENERATION_DISTANCE;
}

const structureIntersectsWithBuildingBlockingTiles = (hitboxes: ReadonlyArray<Hitbox>, worldInfo: WorldInfo): boolean => {
   for (const hitbox of hitboxes) {
      const box = hitbox.box;

      const minTileX = Math.floor(box.calculateBoundsMinX() / Settings.TILE_SIZE);
      const maxTileX = Math.floor(box.calculateBoundsMaxX() / Settings.TILE_SIZE);
      const minTileY = Math.floor(box.calculateBoundsMinY() / Settings.TILE_SIZE);
      const maxTileY = Math.floor(box.calculateBoundsMaxY() / Settings.TILE_SIZE);

      for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
         for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
            const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
            if (!worldInfo.tileIsBuildingBlocking(tileIndex)) {
               continue;
            }
            
            // @Speed
            const tileBox = new RectangularBox(null, new Point(0, 0), Settings.TILE_SIZE, Settings.TILE_SIZE, 0);
            updateBox(tileBox, (tileX + 0.5) * Settings.TILE_SIZE, (tileY + 0.5) * Settings.TILE_SIZE, 0);

            if (box.isColliding(tileBox)) {
               return true;
            }
         }
      }
   }

   return false;
}

const structurePlaceIsValid = (entityType: EntityType, x: number, y: number, rotation: number, worldInfo: WorldInfo): boolean => {
   // @Speed @Copynpaste: already done for candidates
   const testHitboxes = createNormalStructureHitboxes(entityType);
   for (let i = 0; i < testHitboxes.length; i++) {
      const hitbox = testHitboxes[i];
      updateBox(hitbox.box, x, y, rotation);
   }
   
   if (structureIntersectsWithBuildingBlockingTiles(testHitboxes, worldInfo)) {
      return false;
   }

   // Make sure the structure wouldn't be in any walls
   for (const hitbox of testHitboxes) {
      const box = hitbox.box;

      const minSubtileX = Math.floor(box.calculateBoundsMinX() / Settings.SUBTILE_SIZE);
      const maxSubtileX = Math.floor(box.calculateBoundsMaxX() / Settings.SUBTILE_SIZE);
      const minSubtileY = Math.floor(box.calculateBoundsMinY() / Settings.SUBTILE_SIZE);
      const maxSubtileY = Math.floor(box.calculateBoundsMaxY() / Settings.SUBTILE_SIZE);

      for (let subtileX = minSubtileX; subtileX <= maxSubtileX; subtileX++) {
         for (let subtileY = minSubtileY; subtileY <= maxSubtileY; subtileY++) {
            const subtileIndex = getSubtileIndex(subtileX, subtileY);
            const subtileType = worldInfo.wallSubtileTypes[subtileIndex] as SubtileType;
            if (subtileType !== SubtileType.none && boxIsCollidingWithSubtile(box, subtileX, subtileY)) {
               return false;
            }
         }
      }
   }
   
   const collidingEntities = getBoxesCollidingEntities(worldInfo, testHitboxes, Vars.COLLISION_EPSILON);

   for (let i = 0; i < collidingEntities.length; i++) {
      const entityID = collidingEntities[i];
      const entity = worldInfo.getEntityCallback(entityID);

      // Disregard decorations
      // @Speed @Cleanup: ideally we would just exclude this collision type from the search in estimateCollidingEntities
      const collisionGroup = getEntityCollisionGroup(entity.type);
      if (collisionGroup === CollisionGroup.decoration) {
         continue;
      }
      
      if (entity.type !== EntityType.itemEntity) {
         return false;
      }
   }

   return true;
}

const calculateRegularPlacePosition = (placeOrigin: Point, placingEntityRotation: number, entityType: EntityType): Point => {
   // @Hack?
   if (entityType === EntityType.bracings) {
      const placePosition = Point.fromVectorForm(Vars.STRUCTURE_PLACE_DISTANCE + Settings.TILE_SIZE * 0.5, placingEntityRotation);
      placePosition.add(placeOrigin);
      return placePosition;
   }
   
   const hitboxes = createNormalStructureHitboxes(entityType);

   let entityMinX = Number.MAX_SAFE_INTEGER;
   let entityMaxX = Number.MIN_SAFE_INTEGER;
   let entityMinY = Number.MAX_SAFE_INTEGER;
   let entityMaxY = Number.MIN_SAFE_INTEGER;
   
   for (let i = 0; i < hitboxes.length; i++) {
      const hitbox = hitboxes[i];
      const box = hitbox.box;

      const minX = box.calculateBoundsMinX();
      const maxX = box.calculateBoundsMaxX();
      const minY = box.calculateBoundsMinY();
      const maxY = box.calculateBoundsMaxY();
      
      if (minX < entityMinX) {
         entityMinX = minX;
      }
      if (maxX > entityMaxX) {
         entityMaxX = maxX;
      }
      if (minY < entityMinY) {
         entityMinY = minY;
      }
      if (maxY > entityMaxY) {
         entityMaxY = maxY;
      }
   }

   const boundingAreaHeight = entityMaxY - entityMinY;
   const placeOffsetY = boundingAreaHeight * 0.5;
   
   const placePosition = Point.fromVectorForm(Vars.STRUCTURE_PLACE_DISTANCE + placeOffsetY, placingEntityRotation);
   placePosition.add(placeOrigin);
   return placePosition;
}

const getNearbyEntities = (regularPlacePosition: Point, worldInfo: WorldInfo): ReadonlyArray<EntityInfo> => {
   const minChunkX = Math.max(Math.floor((regularPlacePosition.x - Settings.STRUCTURE_SNAP_RANGE) / Settings.CHUNK_UNITS), 0);
   const maxChunkX = Math.min(Math.floor((regularPlacePosition.x + Settings.STRUCTURE_SNAP_RANGE) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);
   const minChunkY = Math.max(Math.floor((regularPlacePosition.y - Settings.STRUCTURE_SNAP_RANGE) / Settings.CHUNK_UNITS), 0);
   const maxChunkY = Math.min(Math.floor((regularPlacePosition.y + Settings.STRUCTURE_SNAP_RANGE) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);
   
   const seenEntityIDs = new Set<number>();
   
   const nearbyEntities = new Array<EntityInfo>();
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = getChunk(worldInfo.chunks, chunkX, chunkY);
         for (const entityID of chunk.entities) {
            const entity = worldInfo.getEntityCallback(entityID);
            
            if (seenEntityIDs.has(entityID)) {
               continue;
            }
            seenEntityIDs.add(entityID);
            
            const distance = regularPlacePosition.calculateDistanceBetween(entity.position);
            if (distance > Settings.STRUCTURE_SNAP_RANGE) {
               continue;
            }
            
            nearbyEntities.push(entity);
         }
      }
   }

   return nearbyEntities;
}

export function getStructureSnapOrigin(structure: EntityInfo): Point {
   const snapOrigin = structure.position.copy();
   if (structure.type === EntityType.embrasure) {
      snapOrigin.x -= 22 * Math.sin(structure.rotation);
      snapOrigin.y -= 22 * Math.cos(structure.rotation);
   }
   return snapOrigin;
}

const getSnapCandidatesOffConnectingEntity = (connectingEntity: EntityInfo<StructureType>, desiredPlacePosition: Point, desiredPlaceRotation: number, entityType: EntityType, worldInfo: WorldInfo): ReadonlyArray<SnapCandidate> => {
   const placingEntityHitboxes = createNormalStructureHitboxes(entityType);
   const snapOrigin = getStructureSnapOrigin(connectingEntity);
   
   const snapPositions = new Array<SnapCandidate>();

   for (const placingEntityHitbox of placingEntityHitboxes) {
      const box = placingEntityHitbox.box;

      // @Cleanup: copy and paste
      let placingEntityHitboxHalfWidth: number;
      let placingEntityHitboxHalfHeight: number;
      if (boxIsCircular(box)) {
         placingEntityHitboxHalfWidth = box.radius;
         placingEntityHitboxHalfHeight = box.radius;
      } else {
         placingEntityHitboxHalfWidth = box.width * 0.5;
         placingEntityHitboxHalfHeight = box.height * 0.5;
      }
      
      for (const hitbox of connectingEntity.hitboxes) {
         const box = hitbox.box;
      
         let hitboxHalfWidth: number;
         let hitboxHalfHeight: number;
         if (boxIsCircular(box)) {
            hitboxHalfWidth = box.radius;
            hitboxHalfHeight = box.radius;
         } else {
            hitboxHalfWidth = box.width * 0.5;
            hitboxHalfHeight = box.height * 0.5;
         }

         // Add snap positions for each direction off the connecting entity hitbox
         for (let k = 0; k < 4; k++) {
            const offsetDirection = connectingEntity.rotation + k * Math.PI / 2;
      
            const connectingEntityOffset = k % 2 === 0 ? hitboxHalfHeight : hitboxHalfWidth;
   
            const placingEntityRotation = alignAngleToClosestAxis(desiredPlaceRotation, connectingEntity.rotation);
            
            let placingEntityOffset: number;
            // Direction to the snapping entity is opposite of the offset from the snapping entity
            const angleDiff = getAbsAngleDiff(offsetDirection + Math.PI, placingEntityRotation);
            if (angleDiff < Math.PI * 0.5) {
               // Top or bottom is bing connected
               placingEntityOffset = placingEntityHitboxHalfHeight;
            } else {
               // Left or right is being connected
               placingEntityOffset = placingEntityHitboxHalfWidth;
            }
      
            const position = Point.fromVectorForm(connectingEntityOffset + placingEntityOffset, offsetDirection);
            position.add(snapOrigin);

            const hitboxes = createNormalStructureHitboxes(entityType);
            for (const hitbox of hitboxes) {
               updateBox(hitbox.box, position.x, position.y, placingEntityRotation);
            }
            
            // Don't add the position if it would be colliding with the connecting entity
            let isValid = true;
            const collidingEntities = getBoxesCollidingEntities(worldInfo, hitboxes, Vars.COLLISION_EPSILON);
            for (let l = 0; l < collidingEntities.length; l++) {
               const collidingEntityID = collidingEntities[l];
               if (collidingEntityID === connectingEntity.id) {
                  isValid = false;
                  break;
               }
            }
      
            if (isValid) {
               snapPositions.push({
                  position: position,
                  rotation: placingEntityRotation,
                  connectedEntity: connectingEntity.id,
                  hitboxes: hitboxes
               });
            }

            // // If the hitbox is circular, add the free position
            // if (hitboxIsCircular(hitbox)) {
            //    const offsetDirection = connectingEntity.position.calculateAngleBetween(desiredPlacePosition);
            //    // @Copynpaste
   
               
            //    const placingEntityRotation = of
               
            //    let placingEntityOffset: number;
            //    let placingEntityRotation: number;
            //    // Direction to the snapping entity is opposite of the offset from the snapping entity
            //    const angleDiff = getAbsAngleDiff(offsetDirection + Math.PI, placeRotation);
            //    if (angleDiff < Math.PI * 0.5) {
            //       // Top or bottom is bing connected
            //       placingEntityOffset = placingEntityHitboxHalfHeight;
            //       placingEntityRotation = connectingEntity.rotation;
            //    } else {
            //       // Left or right is being connected
            //       placingEntityOffset = placingEntityHitboxHalfWidth;
            //       placingEntityRotation = connectingEntity.rotation + Math.PI * 0.5;
            //    }
               
            //    const position = Point.fromVectorForm(connectingEntityOffset + placingEntityOffset, offsetDirection);
            //    position.add(snapOrigin);

            //    // Don't add the position if it would be colliding with the connecting entity
            //    let isValid = true;
            //    const collidingEntities = estimateCollidingEntities(worldInfo, structureType, position.x, position.y, placingEntityRotation, Vars.COLLISION_EPSILON);
            //    for (let l = 0; l < collidingEntities.length; l++) {
            //       const collidingEntityID = collidingEntities[l];
            //       if (collidingEntityID === connectingEntity.id) {
            //          isValid = false;
            //          break;
            //       }
            //    }
      
            //    if (isValid) {
            //       snapPositions.push({
            //          position: position,
            //          rotation: placingEntityRotation,
            //          connectedEntityID: connectingEntity.id
            //       });
            //    }
            // }
         }
      }
   }

   return snapPositions;
}

const findCandidatePlacePositions = (entityType: EntityType, desiredPlacePosition: Point, desiredPlaceRotation: number, worldInfo: WorldInfo): Array<SnapCandidate> => {
   const candidatePositions = new Array<SnapCandidate>();
   
   const structuresInSnapRange = getNearbyEntities(desiredPlacePosition, worldInfo).filter(entityInfo => entityIsStructure(entityInfo.type)) as Array<EntityInfo<StructureType>>;
   for (const entity of structuresInSnapRange) {
      const positionsOffEntity = getSnapCandidatesOffConnectingEntity(entity, desiredPlacePosition, desiredPlaceRotation, entityType, worldInfo);

      for (let i = 0; i < positionsOffEntity.length; i++) {
         const position = positionsOffEntity[i];
         
         candidatePositions.push(position);
      }
   }

   return candidatePositions;
}

const transformsFormGroup = (transform1: SnapCandidate, transform2: SnapCandidate): boolean => {
   const dist = distance(transform1.position.x, transform1.position.y, transform2.position.x, transform2.position.y);
   if (dist > Vars.MULTI_SNAP_POSITION_TOLERANCE) {
      return false;
   }

   if (Math.abs(transform1.rotation - transform2.rotation) > Vars.MULTI_SNAP_ROTATION_TOLERANCE) {
      return false;
   }

   return true;
}

const getExistingGroup = (transform: SnapCandidate, groups: ReadonlyArray<Array<SnapCandidate>>): Array<SnapCandidate> | null => {
   for (let i = 0; i < groups.length; i++) {
      const group = groups[i];

      // Just test with the first one in the group, it shouldn't matter
      const testTransform = group[0];
      if (transformsFormGroup(transform, testTransform)) {
         return group;
      }
   }

   return null;
}

const groupTransforms = (transforms: ReadonlyArray<SnapCandidate>, entityType: EntityType, worldInfo: WorldInfo): ReadonlyArray<StructurePlaceInfo> => {
   const groups = new Array<Array<SnapCandidate>>();
   
   for (let i = 0; i < transforms.length; i++) {
      const transform = transforms[i];

      const existingGroup = getExistingGroup(transform, groups);
      if (existingGroup !== null) {
         existingGroup.push(transform);
      } else {
         const group = [transform];
         groups.push(group);
      }
   }

   const placeInfos = new Array<StructurePlaceInfo>();
   for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      const firstTransform = group[0];
      
      const connections = new Array<StructureConnection>();
      for (const transform of group) {
         const connection = createStructureConnection(transform.connectedEntity);
         connections.push(connection);
      }

      const placeInfo: StructurePlaceInfo = {
         position: firstTransform.position,
         rotation: firstTransform.rotation,
         connections: connections,
         entityType: entityType,
         hitboxes: [],
         isValid: structurePlaceIsValid(entityType, firstTransform.position.x, firstTransform.position.y, firstTransform.rotation, worldInfo)
      };
      placeInfos.push(placeInfo);
   }

   return placeInfos;
}

const filterCandidatePositions = (candidates: Array<SnapCandidate>, regularPlacePosition: Readonly<Point>): void => {
   for (let i = 0; i < candidates.length; i++) {
      const transform = candidates[i];

      if (transform.position.calculateDistanceBetween(regularPlacePosition) > Settings.STRUCTURE_POSITION_SNAP) {
         candidates.splice(i, 1);
         i--;
      }
   }
}

const getNearbyTileCornerSubtiles = (regularPlacePosition: Point): ReadonlyArray<number> => {
   const minTileX = Math.floor(regularPlacePosition.x / Settings.TILE_SIZE);
   const maxTileX = Math.ceil(regularPlacePosition.x / Settings.TILE_SIZE);
   const minTileY = Math.floor(regularPlacePosition.y / Settings.TILE_SIZE);
   const maxTileY = Math.ceil(regularPlacePosition.y / Settings.TILE_SIZE);

   const tileCornerSubtiles = new Array<number>();
   for (let tileCornerX = minTileX; tileCornerX <= maxTileX; tileCornerX++) {
      for (let tileCornerY = minTileY; tileCornerY <= maxTileY; tileCornerY++) {
         const subtileX = tileCornerX * Settings.SUBTILES_IN_TILE;
         const subtileY = tileCornerY * Settings.SUBTILES_IN_TILE;
         tileCornerSubtiles.push(getSubtileIndex(subtileX, subtileY));
      }
   }
   return tileCornerSubtiles;
}

const checkSubtileForWall = (subtileX: number, subtileY: number, worldInfo: WorldInfo): boolean => {
   // A subtile can support bracings if it both:
   // - Is in the world
   // - Is mined out
   
   if (!subtileIsInWorld(subtileX, subtileY)) {
      return false;
   }

   const subtileIndex = getSubtileIndex(subtileX, subtileY);
   return worldInfo.subtileIsMined(subtileIndex);
}

const cornerIsPlaceable = (cornerSubtileX: number, cornerSubtileY: number, worldInfo: WorldInfo): boolean => {
   // Corners are valid if they have 1-3 wall subtiles connected to the corner

   let numConnected = 0;

   if (checkSubtileForWall(cornerSubtileX, cornerSubtileY, worldInfo)) {
      numConnected++;
   }
   if (checkSubtileForWall(cornerSubtileX - 1, cornerSubtileY, worldInfo)) {
      numConnected++;
   }
   if (checkSubtileForWall(cornerSubtileX, cornerSubtileY - 1, worldInfo)) {
      numConnected++;
   }
   if (checkSubtileForWall(cornerSubtileX - 1, cornerSubtileY - 1, worldInfo)) {
      numConnected++;
   }

   return numConnected >= 1 && numConnected <= 4;
}

const getBracingsPlaceInfo = (regularPlacePosition: Point, worldInfo: WorldInfo): StructurePlaceInfo => {
   // Note: for each subtile, the corner position refers to the bottom-left corner of the subtile
   const nearbyTileCornerSubtiles = getNearbyTileCornerSubtiles(regularPlacePosition);

   let closestTileCorner: number | undefined;
   let secondClosestTileCorner: number | undefined;

   let minDist = Number.MAX_SAFE_INTEGER;
   let secondMinDist = Number.MAX_SAFE_INTEGER;

   for (let i = 0; i < nearbyTileCornerSubtiles.length; i++) {
      const subtileIndex = nearbyTileCornerSubtiles[i];
      const subtileX = getSubtileX(subtileIndex);
      const subtileY = getSubtileY(subtileIndex);
      
      const x = subtileX * Settings.SUBTILE_SIZE;
      const y = subtileY * Settings.SUBTILE_SIZE;
      const dist = distance(x, y, regularPlacePosition.x, regularPlacePosition.y);

      if (dist < minDist) {
         secondClosestTileCorner = closestTileCorner;
         secondMinDist = minDist;
         
         closestTileCorner = subtileIndex;
         minDist = dist;
      } else if (dist < secondMinDist) {
         secondClosestTileCorner = subtileIndex;
         secondMinDist = dist;
      }
   }

   if (typeof closestTileCorner === "undefined" || typeof secondClosestTileCorner === "undefined") {
      throw new Error();
   }

   let isValid = true;
   
   const closestTileCornerSubtileX = getSubtileX(closestTileCorner);
   const closestTileCornerSubtileY = getSubtileY(closestTileCorner);
   if (!cornerIsPlaceable(closestTileCornerSubtileX, closestTileCornerSubtileY, worldInfo)) {
      isValid = false;
   }
   
   const secondClosestTileCornerSubtileX = getSubtileX(secondClosestTileCorner);
   const secondClosestTileCornerSubtileY = getSubtileY(secondClosestTileCorner);
   if (!cornerIsPlaceable(secondClosestTileCornerSubtileX, secondClosestTileCornerSubtileY, worldInfo)) {
      isValid = false;
   }

   const closestTileCornerX = Settings.SUBTILE_SIZE * closestTileCornerSubtileX;
   const closestTileCornerY = Settings.SUBTILE_SIZE * closestTileCornerSubtileY;

   const secondClosestTileCornerX = Settings.SUBTILE_SIZE * secondClosestTileCornerSubtileX;
   const secondClosestTileCornerY = Settings.SUBTILE_SIZE * secondClosestTileCornerSubtileY;

   // Place position is the average of the two corner's positions
   const x = (closestTileCornerX + secondClosestTileCornerX) * 0.5;
   const y = (closestTileCornerY + secondClosestTileCornerY) * 0.5;
   const position = new Point(x, y);

   // 0 rotation - vertical, 90 deg rotation - horizontal
   const rotation = closestTileCornerSubtileY === secondClosestTileCornerSubtileY ? Math.PI / 2 : 0;
   
   const hitboxes = createBracingHitboxes();
   for (const hitbox of hitboxes) {
      updateBox(hitbox.box, position.x, position.y, rotation);
   }
   
   if (structureIntersectsWithBuildingBlockingTiles(hitboxes, worldInfo)) {
      isValid = false;
   }
   
   return {
      position: position,
      rotation: rotation,
      connections: [],
      entityType: EntityType.bracings,
      hitboxes: hitboxes,
      isValid: isValid
   };
}

const calculatePlaceInfo = (desiredPlacePosition: Point, desiredPlaceRotation: number, entityType: EntityType, worldInfo: WorldInfo): StructurePlaceInfo => {
   // @Hack?
   if (entityType === EntityType.bracings) {
      return getBracingsPlaceInfo(desiredPlacePosition, worldInfo);
   }
   
   const snapCandidates = findCandidatePlacePositions(entityType, desiredPlacePosition, desiredPlaceRotation, worldInfo);
   filterCandidatePositions(snapCandidates, desiredPlacePosition);
   
   const placeInfos = groupTransforms(snapCandidates, entityType, worldInfo);
   if (placeInfos.length === 0) {
      // If no connections are found, use the regular place position
      return {
         position: desiredPlacePosition,
         rotation: desiredPlaceRotation,
         connections: [],
         entityType: entityType,
         hitboxes: [],
         isValid: structurePlaceIsValid(entityType, desiredPlacePosition.x, desiredPlacePosition.y, desiredPlaceRotation, worldInfo)
      };
   } else {
      // @Incomplete:
      // - First filter by num snaps
      // - Then filter by proximity to regular place position

      return placeInfos[0];
   }
}

export function calculateEntityPlaceInfo(placeOrigin: Point, desiredPlaceRotation: number, entityType: EntityType, worldInfo: WorldInfo): StructurePlaceInfo {
   const regularPlacePosition = calculateRegularPlacePosition(placeOrigin, desiredPlaceRotation, entityType);
   return calculatePlaceInfo(regularPlacePosition, desiredPlaceRotation, entityType, worldInfo);
}