import { TribesmanAIType } from "battletribes-shared/components";
import { Entity, EntityType, LimbAction } from "battletribes-shared/entities";
import { Settings, PathfindingSettings } from "battletribes-shared/settings";
import Tribe from "../../../Tribe";
import { turnEntityToEntity } from "../../../ai-shared";
import { recipeCraftingStationIsAvailable, InventoryComponentArray, craftRecipe, InventoryComponent, countItemType } from "../../../components/InventoryComponent";
import { InventoryUseComponentArray, setLimbActions } from "../../../components/InventoryUseComponent";
import { TribesmanPathType, TribesmanAIComponentArray } from "../../../components/TribesmanAIComponent";
import { PathfindFailureDefault } from "../../../pathfinding";
import { getAvailableCraftingStations } from "../tribe-member";
import { TRIBESMAN_TURN_SPEED } from "./tribesman-ai";
import { pathfindTribesman, clearTribesmanPath } from "./tribesman-ai-utils";
import { CraftingStation, CRAFTING_RECIPES, CRAFTING_STATION_ITEM_TYPE_RECORD } from "battletribes-shared/items/crafting-recipes";
import { InventoryName } from "battletribes-shared/items/items";
import { TransformComponentArray } from "../../../components/TransformComponent";
import { getEntityLayer, getEntityType, getGameTicks } from "../../../world";
import { AICraftRecipePlan, planToPlaceStructure } from "../../../tribesman-ai/tribesman-ai-planning";
import { addAssignmentPart, AIAssignmentComponentArray } from "../../../components/AIAssignmentComponent";
import { TribeComponentArray } from "../../../components/TribeComponent";
import { assert } from "../../../../../shared/src/utils";
import { Hitbox } from "../../../hitboxes";

const buildingMatchesCraftingStation = (building: Entity, craftingStation: CraftingStation): boolean => {
   return getEntityType(building) === EntityType.workbench && craftingStation === CraftingStation.workbench;
}

const getClosestCraftingStation = (tribesman: Entity, tribe: Tribe, craftingStation: CraftingStation): Entity | null => {
   // @Incomplete: slime

   const transformComponent = TransformComponentArray.getComponent(tribesman);
   const tribesmanHitbox = transformComponent.hitboxes[0];
   
   // @Speed
   let closestStation: Entity | undefined;
   let minDist = Number.MAX_SAFE_INTEGER;
   for (let i = 0; i < tribe.buildings.length; i++) {
      const building = tribe.buildings[i];

      if (buildingMatchesCraftingStation(building, craftingStation)) {
         const buildingTransformComponent = TransformComponentArray.getComponent(building);
         const buildingHitbox = buildingTransformComponent.hitboxes[0];
         
         const dist = tribesmanHitbox.box.position.calculateDistanceBetween(buildingHitbox.box.position);
         if (dist < minDist) {
            minDist = dist;
            closestStation = building;
         }
      }
   }

   if (typeof closestStation !== "undefined") {
      return closestStation;
   }
   return null;
}

export function goCraftItem(tribesman: Entity, plan: AICraftRecipePlan, tribe: Tribe): void {
   const recipe = plan.recipe;

   // If the recipe needs a crafting station but there are none, create a plan to place one

   
   // Move to a crafting station if necessary
   const availableCraftingStations = getAvailableCraftingStations(tribesman);
   if (typeof recipe.craftingStation !== "undefined") {
      const craftingStation = getClosestCraftingStation(tribesman, tribe, recipe.craftingStation);

      // If there are no crafting stations available, create a plan to do that
      if (craftingStation === null) {
         const tribeComponent = TribeComponentArray.getComponent(tribesman);
         const craftingStationItemType = CRAFTING_STATION_ITEM_TYPE_RECORD[recipe.craftingStation];
         // @Cleanup: shouldn't need an assert here...
         assert(typeof craftingStationItemType !== "undefined");
         const placeAssignment = planToPlaceStructure(tribeComponent.tribe, craftingStationItemType, null);

         const aiAssignmentComponent = AIAssignmentComponentArray.getComponent(tribesman);
         addAssignmentPart(aiAssignmentComponent, placeAssignment);
         
         // @Bug: The tribesman will do nothing for 1 tick
         return;
      }

      if (!recipeCraftingStationIsAvailable(availableCraftingStations, recipe)) {
         const craftingStationTransformComponent = TransformComponentArray.getComponent(craftingStation);
         const craftingStationHitbox = craftingStationTransformComponent.hitboxes[0];
         
         const isFinished = pathfindTribesman(tribesman, craftingStationHitbox.box.position.x, craftingStationHitbox.box.position.y, getEntityLayer(craftingStation), craftingStation, TribesmanPathType.default, Math.floor(Settings.MAX_CRAFTING_STATION_USE_DISTANCE / PathfindingSettings.NODE_SEPARATION), PathfindFailureDefault.none);
         if (!isFinished) {
            const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman);
            const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman);
   
            setLimbActions(inventoryUseComponent, LimbAction.none);
            tribesmanComponent.currentAIType = TribesmanAIType.crafting;
         }
         return;
      } else {
         turnEntityToEntity(tribesman, craftingStation, TRIBESMAN_TURN_SPEED, 1);
      }
   }

   // Continue crafting the item

   const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman);
   const recipeIdx = CRAFTING_RECIPES.indexOf(recipe);
   
   tribesmanComponent.currentAIType = TribesmanAIType.crafting;
   if (tribesmanComponent.currentCraftingRecipeIdx !== recipeIdx) {
      tribesmanComponent.currentCraftingRecipeIdx = recipeIdx;
      tribesmanComponent.currentCraftingTicks = 1;
   } else {
      tribesmanComponent.currentCraftingTicks++;
   }
   
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman);
   for (let i = 0; i < inventoryUseComponent.limbInfos.length; i++) {
      const limbInfo = inventoryUseComponent.limbInfos[i];
      if (limbInfo.action !== LimbAction.craft) {
         limbInfo.lastCraftTicks = getGameTicks();
      }
      limbInfo.action = LimbAction.craft;
   }
   
   if (tribesmanComponent.currentCraftingTicks >= recipe.aiCraftTimeTicks) {
      // Craft the item
      const inventoryComponent = InventoryComponentArray.getComponent(tribesman);
      craftRecipe(tribesman, inventoryComponent, recipe, InventoryName.hotbar);

      tribesmanComponent.currentCraftingTicks = 0;
   }

   clearTribesmanPath(tribesman);
}

export function craftGoalIsComplete(plan: AICraftRecipePlan, inventoryComponent: InventoryComponent): boolean {
   return countItemType(inventoryComponent, plan.recipe.product) >= plan.productAmount;
}