import { Entity, EntityType, LimbAction } from "battletribes-shared/entities";
import { HealthComponent, HealthComponentArray } from "../../../components/HealthComponent";
import { VACUUM_RANGE, tribeMemberCanPickUpItem } from "../tribe-member";
import { InventoryComponentArray, getInventory, inventoryIsFull } from "../../../components/InventoryComponent";
import { PlanterBoxPlant, TribesmanAIType } from "battletribes-shared/components";
import { PlantComponentArray, plantIsFullyGrown } from "../../../components/PlantComponent";
import { tribesmanShouldEscape } from "./tribesman-escaping";
import { clearTribesmanPath, getTribesmanRadius, moveTribesmanToDifferentLayer, pathfindToPosition, positionIsSafeForTribesman } from "./tribesman-ai-utils";
import { ItemComponentArray } from "../../../components/ItemComponent";
import { PathfindingSettings } from "battletribes-shared/settings";
import { InventoryUseComponentArray, setLimbActions } from "../../../components/InventoryUseComponent";
import { TribesmanAIComponentArray, TribesmanPathType } from "../../../components/TribesmanAIComponent";
import { PathfindFailureDefault } from "../../../pathfinding";
import { ItemType, InventoryName } from "battletribes-shared/items/items";
import { AIHelperComponentArray } from "../../../components/AIHelperComponent";
import { huntEntity } from "./tribesman-combat-ai";
import { TransformComponentArray } from "../../../components/TransformComponent";
import { getEntityLayer, getEntityType } from "../../../world";
import Layer from "../../../Layer";
import { surfaceLayer } from "../../../layers";

interface MaterialInfo {
   readonly layer: Layer;
}

const MATERIAL_INFO_RECORD: Partial<Record<ItemType, MaterialInfo>> = {
   [ItemType.slimeball]: {
      layer: surfaceLayer
   }
};

const getResourceProducts = (entity: Entity): ReadonlyArray<ItemType> => {
   switch (getEntityType(entity)) {
      case EntityType.cow: return [ItemType.leather, ItemType.raw_beef];
      case EntityType.berryBush: return [ItemType.berry];
      case EntityType.tree: return [ItemType.wood, ItemType.seed];
      case EntityType.iceSpikes: return [ItemType.frostcicle];
      case EntityType.cactus: return [ItemType.cactus_spine];
      case EntityType.boulder: return [ItemType.rock];
      case EntityType.krumblid: return [ItemType.leather];
      case EntityType.yeti: return [ItemType.yeti_hide, ItemType.raw_beef];
      case EntityType.plant: {
         const plantComponent = PlantComponentArray.getComponent(entity);
         switch (plantComponent.plantType) {
            case PlanterBoxPlant.tree: return [ItemType.wood, ItemType.seed];
            case PlanterBoxPlant.berryBush: return [ItemType.berry];
            case PlanterBoxPlant.iceSpikes: return [ItemType.frostcicle];
            default: {
               const unreachable: never = plantComponent.plantType;
               return unreachable;
            }
         }
      }
      case EntityType.slime: return [ItemType.slimeball];
      default: return [];
   }
}

export function entityIsResource(entity: Entity): boolean {
   const resourceProducts = getResourceProducts(entity);
   return resourceProducts.length > 0;
}

const shouldGatherPlant = (plantID: number): boolean => {
   const plantComponent = PlantComponentArray.getComponent(plantID);

   switch (plantComponent.plantType) {
      // Harvest when fully grown
      case PlanterBoxPlant.tree:
      case PlanterBoxPlant.iceSpikes: {
         return plantIsFullyGrown(plantComponent);
      }
      // Harvest when they have fruit
      case PlanterBoxPlant.berryBush: {
         return plantComponent.numFruit > 0;
      }
   }
}

// @Incomplete: when the tribesman wants to gather a resource but there isn't enough space, should make space

const shouldGatherResource = (tribesman: Entity, healthComponent: HealthComponent, inventoryIsFull: boolean, resource: Entity, resourceProducts: ReadonlyArray<ItemType>): boolean => {
   if (resourceProducts.length === 0) {
      return false;
   }
   
   // If the tribesman is within the escape health threshold, make sure there wouldn't be any enemies visible while picking up the dropped item
   // @Hack: the accessibility check doesn't work for plants in planter boxes
   const resourceTransformComponent = TransformComponentArray.getComponent(resource);
   if (tribesmanShouldEscape(getEntityType(tribesman), healthComponent) || !positionIsSafeForTribesman(tribesman, resourceTransformComponent.position.x, resourceTransformComponent.position.y)) {
   // if (tribesmanShouldEscape(tribesman.type, healthComponent) || !positionIsSafeForTribesman(tribesman, resource.position.x, resource.position.y) || !entityIsAccessible(tribesman, resource, tribeComponent.tribe, getTribesmanAttackRadius(tribesman))) {
      return false;
   }

   // Only try to gather plants if they are fully grown
   if (getEntityType(resource) === EntityType.plant && !shouldGatherPlant(resource)) {
      return false;
   }

   // If the tribesman's inventory is full, make sure the tribesman would be able to pick up the products the resource would produce
   if (inventoryIsFull) {
      // If any of the resource products can't be picked up, don't try to gather.
      // This is so the tribesmen don't leave un-picked-up items laying around.
      for (const itemType of resourceProducts) {
         if (!tribeMemberCanPickUpItem(tribesman, itemType)) {
            return false;
         }
      }
   }

   return true;
}

const getGatherTarget = (tribesman: Entity, visibleEntities: ReadonlyArray<Entity>, gatheredItemTypes: ReadonlyArray<ItemType>): Entity | null => {
   const transformComponent = TransformComponentArray.getComponent(tribesman);
   const healthComponent = HealthComponentArray.getComponent(tribesman);
   const inventoryComponent = InventoryComponentArray.getComponent(tribesman);
   
   // @Incomplete: Doesn't account for room in backpack/other
   const hotbarInventory = getInventory(inventoryComponent, InventoryName.hotbar);
   const isFull = inventoryIsFull(hotbarInventory);
   
   let minDist = Number.MAX_SAFE_INTEGER;
   let closestResource: Entity | undefined;

   for (let i = 0; i < visibleEntities.length; i++) {
      const resource = visibleEntities[i];
      
      const resourceProducts = getResourceProducts(resource);
      if (!shouldGatherResource(tribesman, healthComponent, isFull, resource, resourceProducts)) {
         continue;
      }
      
      const resourceTransformComponent = TransformComponentArray.getComponent(resource);
      const dist = transformComponent.position.calculateDistanceBetween(resourceTransformComponent.position);
      if (resourceProducts.some(itemType => gatheredItemTypes.includes(itemType))) {
         if (dist < minDist) {
            closestResource = resource;
            minDist = dist;
         }
      }
   }
   
   return typeof closestResource !== "undefined" ? closestResource : null;
}

const tribesmanGetItemPickupTarget = (tribesman: Entity, visibleItemEntities: ReadonlyArray<Entity>, gatheredItemTypes: ReadonlyArray<ItemType>): Entity | null => {
   const transformComponent = TransformComponentArray.getComponent(tribesman);
   const healthComponent = HealthComponentArray.getComponent(tribesman);
   const shouldEscape = tribesmanShouldEscape(getEntityType(tribesman), healthComponent);
   
   // @Cleanup: unused?
   const goalRadius = getTribesmanRadius(transformComponent);
      
   let closestDroppedItem: Entity | null = null;
   let minDistance = Number.MAX_SAFE_INTEGER;
   for (const itemEntity of visibleItemEntities) {
      const itemEntityTransformComponent = TransformComponentArray.getComponent(itemEntity);
      // If the tribesman is within the escape health threshold, make sure there wouldn't be any enemies visible while picking up the dropped item
      if (shouldEscape && !positionIsSafeForTribesman(tribesman, itemEntityTransformComponent.position.x, itemEntityTransformComponent.position.y)) {
         continue;
      }

      // @Temporary @Bug @Incomplete: Will cause the tribesman to incorrectly skip items which are JUST inside a hitbox, but are still accessible via vacuum.
      // if (!entityIsAccessible(tribesman, itemEntity, tribeComponent.tribe, goalRadius)) {
      //    console.log("b");
      //    continue;
      // }

      const itemComponent = ItemComponentArray.getComponent(itemEntity);
      if (!gatheredItemTypes.includes(itemComponent.itemType) || !tribeMemberCanPickUpItem(tribesman, itemComponent.itemType)) {
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

export function tribesmanGoPickupItemEntity(tribesman: Entity, pickupTarget: Entity): void {
   const targetTransformComponent = TransformComponentArray.getComponent(pickupTarget);
   
   // @Temporary
   // pathfindToPosition(tribesman, closestDroppedItem.position.x, closestDroppedItem.position.y, closestDroppedItem.id, TribesmanPathType.default, Math.floor(32 / PathfindingSettings.NODE_SEPARATION), PathfindFailureDefault.throwError);
   pathfindToPosition(tribesman, targetTransformComponent.position.x, targetTransformComponent.position.y, pickupTarget, TribesmanPathType.default, Math.floor((32 + VACUUM_RANGE) / PathfindingSettings.NODE_SEPARATION), PathfindFailureDefault.returnClosest);

   clearTribesmanPath(tribesman);
   
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman);
   setLimbActions(inventoryUseComponent, LimbAction.none);
   
   const tribesmanAIComponent = TribesmanAIComponentArray.getComponent(tribesman);
   tribesmanAIComponent.currentAIType = TribesmanAIType.pickingUpDroppedItems;
}

/** Controls the tribesman to gather the specified item types. */
export function gatherResources(tribesman: Entity, gatheredItemTypes: ReadonlyArray<ItemType>, visibleItemEntities: ReadonlyArray<Entity>): boolean {
   const aiHelperComponent = AIHelperComponentArray.getComponent(tribesman);
   
   // First see if there are any items which match which we can pick up
   const itemPickupTarget = tribesmanGetItemPickupTarget(tribesman, visibleItemEntities, gatheredItemTypes);
   if (itemPickupTarget !== null) {
      tribesmanGoPickupItemEntity(tribesman, itemPickupTarget);
      return true;
   }
   
   // See if there are any entities they can harvest
   const harvestTarget = getGatherTarget(tribesman, aiHelperComponent.visibleEntities, gatheredItemTypes);
   if (harvestTarget !== null) {
      huntEntity(tribesman, harvestTarget, false);
      return true;
   }

   // If the entity isn't in the right layer to get the resources, go to the correct layer
   const layer = getEntityLayer(tribesman);
   for (const itemType of gatheredItemTypes) {
      const materialInfo = MATERIAL_INFO_RECORD[itemType];
      if (typeof materialInfo === "undefined") {
         continue;
      }

      if (layer !== materialInfo.layer) {
         // Go to the correct layer
         moveTribesmanToDifferentLayer(tribesman, materialInfo.layer);
         return true;
      }
   }

   return false;
}