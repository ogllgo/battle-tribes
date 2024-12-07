import { TribesmanAIType } from "battletribes-shared/components";
import { Entity, EntityType, LimbAction } from "battletribes-shared/entities";
import { Settings, PathfindingSettings } from "battletribes-shared/settings";
import Tribe from "../../../Tribe";
import { stopEntity, turnEntityToEntity } from "../../../ai-shared";
import { recipeCraftingStationIsAvailable, InventoryComponentArray, craftRecipe } from "../../../components/InventoryComponent";
import { InventoryUseComponentArray, setLimbActions } from "../../../components/InventoryUseComponent";
import { PhysicsComponentArray } from "../../../components/PhysicsComponent";
import { TribesmanPathType, TribesmanAIComponentArray } from "../../../components/TribesmanAIComponent";
import { PathfindFailureDefault } from "../../../pathfinding";
import { getAvailableCraftingStations } from "../tribe-member";
import { TRIBESMAN_TURN_SPEED } from "./tribesman-ai";
import { pathfindTribesman, clearTribesmanPath } from "./tribesman-ai-utils";
import { CraftingStation, CraftingRecipe, CRAFTING_RECIPES } from "battletribes-shared/items/crafting-recipes";
import { InventoryName } from "battletribes-shared/items/items";
import { TransformComponentArray } from "../../../components/TransformComponent";
import { getEntityLayer, getEntityType, getGameTicks } from "../../../world";

const buildingMatchesCraftingStation = (building: Entity, craftingStation: CraftingStation): boolean => {
   return getEntityType(building) === EntityType.workbench && craftingStation === CraftingStation.workbench;
}

const getClosestCraftingStation = (tribesman: Entity, tribe: Tribe, craftingStation: CraftingStation): Entity => {
   // @Incomplete: slime

   const transformComponent = TransformComponentArray.getComponent(tribesman);
   
   // @Speed
   let closestStation: Entity | undefined;
   let minDist = Number.MAX_SAFE_INTEGER;
   for (let i = 0; i < tribe.buildings.length; i++) {
      const building = tribe.buildings[i];

      if (buildingMatchesCraftingStation(building, craftingStation)) {
         const buildingTransformComponent = TransformComponentArray.getComponent(building);
         
         const dist = transformComponent.position.calculateDistanceBetween(buildingTransformComponent.position);
         if (dist < minDist) {
            minDist = dist;
            closestStation = building;
         }
      }
   }

   if (typeof closestStation !== "undefined") {
      return closestStation;
   }
   throw new Error();
}

export function goCraftItem(tribesman: Entity, recipe: CraftingRecipe, tribe: Tribe): boolean {
   const availableCraftingStations = getAvailableCraftingStations(tribesman);
   if (!recipeCraftingStationIsAvailable(availableCraftingStations, recipe)) {
      // Move to the crafting station
      const craftingStation = getClosestCraftingStation(tribesman, tribe, recipe.craftingStation!);

      const craftingStationTransformComponent = TransformComponentArray.getComponent(craftingStation);
      
      const isFinished = pathfindTribesman(tribesman, craftingStationTransformComponent.position.x, craftingStationTransformComponent.position.y, getEntityLayer(craftingStation), craftingStation, TribesmanPathType.default, Math.floor(Settings.MAX_CRAFTING_STATION_USE_DISTANCE / PathfindingSettings.NODE_SEPARATION), PathfindFailureDefault.throwError);
      if (!isFinished) {
         const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman);
         const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman);

         setLimbActions(inventoryUseComponent, LimbAction.none);
         tribesmanComponent.currentAIType = TribesmanAIType.crafting;
         return true;
      } else {
         return false;
      }
   } else {
      // Continue crafting the item

      const physicsComponent = PhysicsComponentArray.getComponent(tribesman);
      stopEntity(physicsComponent);
      
      if (typeof recipe.craftingStation !== "undefined") {
         const craftingStation = getClosestCraftingStation(tribesman, tribe, recipe.craftingStation);
         turnEntityToEntity(tribesman, craftingStation, TRIBESMAN_TURN_SPEED);
      }

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
      return true;
   }
}