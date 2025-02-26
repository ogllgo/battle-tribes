import { Entity, EntityType } from "battletribes-shared/entities";
import { HealthComponentArray } from "../../../components/HealthComponent";
import { VACUUM_RANGE, tribeMemberCanPickUpItem } from "../tribe-member";
import { InventoryComponent, InventoryComponentArray, addItem, countItemType, getInventory, inventoryHasItemType, inventoryIsFull } from "../../../components/InventoryComponent";
import { TribesmanAIType } from "battletribes-shared/components";
import { tribeMemberShouldEscape } from "./tribesman-escaping";
import { getHumanoidRadius, moveTribesmanToBiome, pathfindTribesman, pathToEntityExists } from "./tribesman-ai-utils";
import { ItemComponentArray } from "../../../components/ItemComponent";
import { PathfindingSettings } from "battletribes-shared/settings";
import { TribesmanAIComponentArray, TribesmanPathType } from "../../../components/TribesmanAIComponent";
import { PathfindFailureDefault } from "../../../pathfinding";
import { ItemType, InventoryName } from "battletribes-shared/items/items";
import { AIHelperComponentArray } from "../../../components/AIHelperComponent";
import { goKillEntity } from "./tribesman-combat-ai";
import { getEntityTile, TransformComponentArray } from "../../../components/TransformComponent";
import { entityExists, getEntityLayer, getEntityType } from "../../../world";
import Layer from "../../../Layer";
import { surfaceLayer, undergroundLayer } from "../../../layers";
import { Biome } from "../../../../../shared/src/biomes";
import { TileType } from "../../../../../shared/src/tiles";
import { AIGatherItemPlan } from "../../../tribesman-ai/tribesman-ai-planning";
import { assert } from "../../../../../shared/src/utils";
import { runPatrolAI } from "../../../components/PatrolAIComponent";
import { plantedTreeIsFullyGrown } from "../../../components/TreePlantedComponent";
import { BerryBushPlantedComponentArray } from "../../../components/BerryBushPlantedComponent";
import { plantedIceSpikesIsFullyGrown } from "../../../components/IceSpikesPlantedComponent";
import { TribeComponentArray } from "../../../components/TribeComponent";

interface BiomeTileRequirement {
   readonly tileType: TileType;
   readonly minAmount: number;
}

export interface EntityHarvestingInfo {
   readonly layer: Layer;
   readonly biome: Biome;
   readonly localBiomeRequiredTiles: ReadonlyArray<BiomeTileRequirement>;
}

// @Robustness: when a new entity type is registered, this should automatically be populated with the appropriate information
/** Record of which entities produce which item types */
const MATERIAL_DROPPING_ENTITIES_RECORD = {
   [ItemType.wood]: [EntityType.tree, EntityType.treeRootBase, EntityType.treeRootSegment, EntityType.treePlanted],
   [ItemType.berry]: [EntityType.berryBush, EntityType.berryBushPlanted],
   [ItemType.slimeball]: [EntityType.slime],
   [ItemType.leather]: [EntityType.cow, EntityType.krumblid],
   [ItemType.raw_beef]: [EntityType.cow],
   [ItemType.rawYetiFlesh]: [EntityType.yeti, EntityType.frozenYeti],
   [ItemType.rock]: [EntityType.boulder],
   [ItemType.yeti_hide]: [EntityType.yeti, EntityType.frozenYeti],
   [ItemType.eyeball]: [EntityType.zombie],
   [ItemType.frostcicle]: [EntityType.iceSpikes, EntityType.iceSpikesPlanted],
   [ItemType.seed]: [EntityType.tree, EntityType.treePlanted]
} satisfies Partial<Record<ItemType, ReadonlyArray<EntityType>>>;

const ENTITY_HARVESTING_INFO_RECORD: Partial<Record<EntityType, EntityHarvestingInfo>> = {
   [EntityType.tree]: {
      layer: surfaceLayer,
      biome: Biome.grasslands,
      localBiomeRequiredTiles: []
   },
   [EntityType.treeRootBase]: {
      layer: undergroundLayer,
      biome: Biome.caves,
      localBiomeRequiredTiles: []
   },
   [EntityType.treeRootSegment]: {
      layer: undergroundLayer,
      biome: Biome.caves,
      localBiomeRequiredTiles: []
   },
   [EntityType.slime]: {
      layer: surfaceLayer,
      biome: Biome.swamp,
      localBiomeRequiredTiles: [
         {
            tileType: TileType.slime,
            minAmount: 10
         }
      ]
   }
};

// @Cleanup: unused?
const tribesmanIsElegibleToHarvestEntityType = (tribesman: Entity, entityType: EntityType): boolean => {
   switch (entityType) {
      case EntityType.tree: {
         // If the tribesman is underground, make sure they have enough items to take on the guardian
         // @Incomplete: this won't make them go get those items yet...

         const inventoryComponent = InventoryComponentArray.getComponent(tribesman);
         const hotbar = getInventory(inventoryComponent, InventoryName.hotbar);

         return inventoryHasItemType(hotbar, ItemType.stone_sword);
      }
      // @Temporary
      case EntityType.treePlanted: {
         return false;
      }
   }

   return true;
}

// @Incomplete: when the tribesman wants to gather a resource but there isn't enough space, should make space

// @Incomplete
// const shouldGatherResource = (tribesman: Entity, healthComponent: HealthComponent, inventoryIsFull: boolean, resource: Entity, resourceProducts: ReadonlyArray<ItemType>): boolean => {
//    if (resourceProducts.length === 0) {
//       return false;
//    }
   
//    // @Incomplete
//    // If the tribesman is within the escape health threshold, make sure there wouldn't be any enemies visible while picking up the dropped item
//    // @Hack: the accessibility check doesn't work for plants in planter boxes
//    // const resourceTransformComponent = TransformComponentArray.getComponent(resource);
//    // if (tribesmanShouldEscape(getEntityType(tribesman), healthComponent)) {
//    // // if (tribesmanShouldEscape(tribesman.type, healthComponent) || !positionIsSafeForTribesman(tribesman, resource.position.x, resource.position.y) || !entityIsAccessible(tribesman, resource, tribeComponent.tribe, getTribesmanAttackRadius(tribesman))) {
//    //    return false;
//    // }

//    // If the tribesman's inventory is full, make sure the tribesman would be able to pick up the products the resource would produce
//    if (inventoryIsFull) {
//       // If any of the resource products can't be picked up, don't try to gather.
//       // This is so the tribesmen don't leave un-picked-up items laying around.
//       for (const itemType of resourceProducts) {
//          if (!tribeMemberCanPickUpItem(tribesman, itemType)) {
//             return false;
//          }
//       }
//    }

//    return true;
// }

const resourceIsHarvestable = (resource: Entity, resourceEntityType: EntityType): boolean => {
   switch (resourceEntityType) {
      case EntityType.treePlanted: {
         return plantedTreeIsFullyGrown(resource);
      }
      case EntityType.berryBushPlanted: {
         const berryBushPlantedComponent = BerryBushPlantedComponentArray.getComponent(resource);
         return berryBushPlantedComponent.numFruit > 0;
      }
      case EntityType.iceSpikesPlanted: {
         return plantedIceSpikesIsFullyGrown(resource);
      }
      default: {
         return true;
      }
   }
}

const gatherTargetIsValid = (targetEntity: Entity, targetEntityTypes: ReadonlyArray<EntityType>): boolean => {
   const entityType = getEntityType(targetEntity);
   return (targetEntityTypes as any).includes(entityType) && resourceIsHarvestable(targetEntity, entityType);
}

const getGatherTarget = (tribesman: Entity, visibleEntities: ReadonlyArray<Entity>, gatheredItemType: ItemType): Entity | null => {
   const transformComponent = TransformComponentArray.getComponent(tribesman);
   
   const targetEntityTypes = MATERIAL_DROPPING_ENTITIES_RECORD[gatheredItemType as keyof typeof MATERIAL_DROPPING_ENTITIES_RECORD];
   assert(typeof targetEntityTypes !== "undefined");
   
   let minDist = Number.MAX_SAFE_INTEGER;
   let closestResource: Entity | undefined;

   for (let i = 0; i < visibleEntities.length; i++) {
      const resource = visibleEntities[i];
      if (!gatherTargetIsValid(resource, targetEntityTypes)) {
         continue;
      }

      // @Speed
      // @Incomplete: goal radius doesn't match up with the hunting
      if (!pathToEntityExists(tribesman, resource, 32)) {
         continue;
      }
      
      const resourceTransformComponent = TransformComponentArray.getComponent(resource);
      const dist = transformComponent.position.calculateDistanceBetween(resourceTransformComponent.position);
      if (dist < minDist) {
         closestResource = resource;
         minDist = dist;
      }
   }
   
   return typeof closestResource !== "undefined" ? closestResource : null;
}

const tribesmanGetItemPickupTarget = (tribesman: Entity, visibleItemEntities: ReadonlyArray<Entity>, gatheredItemType: ItemType): Entity | null => {
   const transformComponent = TransformComponentArray.getComponent(tribesman);
   const healthComponent = HealthComponentArray.getComponent(tribesman);
   const shouldEscape = tribeMemberShouldEscape(getEntityType(tribesman), healthComponent);
   
   // @Cleanup: unused?
   const goalRadius = getHumanoidRadius(transformComponent);
      
   let closestDroppedItem: Entity | null = null;
   let minDistance = Number.MAX_SAFE_INTEGER;
   for (const itemEntity of visibleItemEntities) {
      const itemEntityTransformComponent = TransformComponentArray.getComponent(itemEntity);
      // If the tribesman is within the escape health threshold, make sure there wouldn't be any enemies visible while picking up the dropped item
      // @Incomplete
      // if (shouldEscape && !positionIsSafeForTribesman(tribesman, itemEntityTransformComponent.position.x, itemEntityTransformComponent.position.y)) {
      //    continue;
      // }

      // @Temporary @Bug @Incomplete: Will cause the tribesman to incorrectly skip items which are JUST inside a hitbox, but are still accessible via vacuum.
      // if (!entityIsAccessible(tribesman, itemEntity, tribeComponent.tribe, goalRadius)) {
      //    console.log("b");
      //    continue;
      // }

      const itemComponent = ItemComponentArray.getComponent(itemEntity);
      if (itemComponent.itemType !== gatheredItemType || !tribeMemberCanPickUpItem(tribesman, itemComponent.itemType)) {
         continue;
      }

      const distance = transformComponent.position.calculateDistanceBetween(itemEntityTransformComponent.position);
      if (distance < minDistance) {
         closestDroppedItem = itemEntity;
         minDistance = distance;
      }
   }

   return closestDroppedItem;
}

const goPickupItemEntity = (tribesman: Entity, pickupTarget: Entity): void => {
   const targetTransformComponent = TransformComponentArray.getComponent(pickupTarget);
   
   pathfindTribesman(tribesman, targetTransformComponent.position.x, targetTransformComponent.position.y, getEntityLayer(pickupTarget), pickupTarget, TribesmanPathType.default, Math.floor(VACUUM_RANGE / PathfindingSettings.NODE_SEPARATION), PathfindFailureDefault.none);
   
   const tribesmanAIComponent = TribesmanAIComponentArray.getComponent(tribesman);
   tribesmanAIComponent.currentAIType = TribesmanAIType.pickingUpDroppedItems;
}

const getTargettedEntityType = <T extends keyof typeof MATERIAL_DROPPING_ENTITIES_RECORD>(tribesman: Entity, gatheredItemType: T): (typeof MATERIAL_DROPPING_ENTITIES_RECORD[T])[number] => {
   const layer = getEntityLayer(tribesman);
   
   // @Cleanup: why is this cast needed??
   switch (gatheredItemType as keyof typeof MATERIAL_DROPPING_ENTITIES_RECORD) {
      case ItemType.wood: {
         // If the tribesman is underground and they aren't powerful enough to take on a guardian (to get wood),
         // go for tree roots instead
         if (layer === undergroundLayer) {
            // @Incomplete: this won't make them go get those items yet...
   
            const inventoryComponent = InventoryComponentArray.getComponent(tribesman);
            const hotbar = getInventory(inventoryComponent, InventoryName.hotbar);
   
            if (!inventoryHasItemType(hotbar, ItemType.stone_sword)) {
               return EntityType.treeRootBase;
            }
         }
         
         return EntityType.tree;
      }
      // @Incomplete: EntityType.berryBushPlanted
      case ItemType.berry: return EntityType.berryBush;
      case ItemType.slimeball: return EntityType.slime;
      // @Incomplete: EntityType.krumblid
      case ItemType.leather: return EntityType.cow;
      case ItemType.raw_beef: return EntityType.cow;
      // @Incomplete: EntityType.frozenYeti
      case ItemType.rawYetiFlesh: return EntityType.yeti;
      case ItemType.rock: return EntityType.boulder;
      // @Incomplete: EntityType.frozenYeti
      case ItemType.yeti_hide: return EntityType.yeti;
      case ItemType.eyeball: return EntityType.zombie;
      // @Incomplete: EntityType.iceSpikesPlanted
      case ItemType.frostcicle: return EntityType.iceSpikes;
      // @Incomplete: EntityType.treePlanted
      case ItemType.seed: return EntityType.tree;
   }
}

/** Controls the tribesman to gather the specified item types. */
export function gatherResource(tribesman: Entity, gatherPlan: AIGatherItemPlan, visibleItemEntities: ReadonlyArray<Entity>): void {
   const gatheredItemType = gatherPlan.itemType;

   // If the tribe has autogiveBaseResources enabled, then just give all of the item required
   const tribeComponent = TribeComponentArray.getComponent(tribesman);
   if (tribeComponent.tribe.autogiveBaseResources) {
      const inventoryComponent = InventoryComponentArray.getComponent(tribesman);
      const numItemsInInventory = countItemType(inventoryComponent, gatheredItemType);

      const numToGive = gatherPlan.amount - numItemsInInventory;
      addItem(tribesman, inventoryComponent, gatheredItemType, numToGive);
      return;
   }
   
   const aiHelperComponent = AIHelperComponentArray.getComponent(tribesman);
   
   // First see if there are any items which match which we can pick up
   const itemPickupTarget = tribesmanGetItemPickupTarget(tribesman, visibleItemEntities, gatheredItemType);
   if (itemPickupTarget !== null) {
      goPickupItemEntity(tribesman, itemPickupTarget);
      return;
   }
   
   // @Speed: also in getGatherTarget
   const targetEntityTypes = MATERIAL_DROPPING_ENTITIES_RECORD[gatheredItemType as keyof typeof MATERIAL_DROPPING_ENTITIES_RECORD];
   assert(typeof targetEntityTypes !== "undefined");

   // Look for targets to gather
   const tribesmanAIComponent = TribesmanAIComponentArray.getComponent(tribesman);
   if (!entityExists(tribesmanAIComponent.targetEntity) || !gatherTargetIsValid(tribesmanAIComponent.targetEntity, targetEntityTypes)) {
      const target = getGatherTarget(tribesman, aiHelperComponent.visibleEntities, gatheredItemType);
      if (target !== null) {
         tribesmanAIComponent.targetEntity = target;
      } else {
         tribesmanAIComponent.targetEntity = 0;
      }
   }

   if (entityExists(tribesmanAIComponent.targetEntity) && gatherTargetIsValid(tribesmanAIComponent.targetEntity, targetEntityTypes)) {
      goKillEntity(tribesman, tribesmanAIComponent.targetEntity, false);
      return;
   }

   const layer = getEntityLayer(tribesman);
   
   // @Cleanup: cast
   const targettedEntityType = getTargettedEntityType(tribesman, gatheredItemType as keyof typeof MATERIAL_DROPPING_ENTITIES_RECORD);
   
   const harvestingInfo = ENTITY_HARVESTING_INFO_RECORD[targettedEntityType];
   assert(typeof harvestingInfo !== "undefined");

   // If the entity isn't in the right biome, go to the right biome
   const transformComponent = TransformComponentArray.getComponent(tribesman);
   const currentTile = getEntityTile(transformComponent);
   if (layer.getTileBiome(currentTile) !== harvestingInfo.biome) {
      moveTribesmanToBiome(tribesman, harvestingInfo);
      return;
   }

   // Explore the biome for things to harvest
   const localBiome = layer.getTileLocalBiome(currentTile);
   runPatrolAI(tribesman, localBiome.tilesInBorder);
}

export function gatherItemPlanIsComplete(inventoryComponent: InventoryComponent, plan: AIGatherItemPlan): boolean {
   return countItemType(inventoryComponent, plan.itemType) >= plan.amount;
}