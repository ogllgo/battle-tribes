import { PotentialBuildingPlanData } from "../../../shared/src/ai-building-types";
import { BlueprintType } from "../../../shared/src/components";
import { Entity, EntityType } from "../../../shared/src/entities";
import { CRAFTING_STATION_ITEM_TYPE_RECORD, CraftingRecipe, CraftingStation, getItemRecipe } from "../../../shared/src/items/crafting-recipes";
import { ITEM_INFO_RECORD, ItemType, PlaceableItemInfo, PlaceableItemType } from "../../../shared/src/items/items";
import { StructureType } from "../../../shared/src/structures";
import { getSubtileX, getSubtileY } from "../../../shared/src/subtiles";
import { getTechRequiredForItem, Tech } from "../../../shared/src/techs";
import { TribesmanPlanType } from "../../../shared/src/utils";
import { boxIsCollidingWithSubtile } from "../collision";
import { TribeComponentArray } from "../components/TribeComponent";
import { TribesmanAIComponentArray } from "../components/TribesmanAIComponent";
import Tribe from "../Tribe";
import { areaHasOutsideDoor, getOutsideDoorPlacePlan } from "./ai-building-areas";
import { tribeIsVulnerable } from "./ai-building-heuristics";
import { findIdealWallPlacePosition } from "./ai-building-plans";
import { generateBuildingCandidate } from "./building-plans/ai-building-utils";
import { createVirtualBuilding, VirtualBuilding } from "./building-plans/TribeBuildingLayer";

/*
This file contains the logic for planning what AI tribes should do.
*/

interface BasePlan {
   readonly type: TribesmanPlanType;
   potentialPlans: ReadonlyArray<PotentialBuildingPlanData>;
   /** Whether or not the plan has been completed by the assigned tribesman. */
   isComplete: boolean;
   assignedTribesman: Entity | null;
   readonly childPlans: Array<TribesmanPlan>;
}

export interface RootPlan extends BasePlan {
   readonly type: TribesmanPlanType.root;
}

export interface CraftRecipePlan extends BasePlan {
   readonly type: TribesmanPlanType.craftRecipe;
   readonly recipe: CraftingRecipe;
   /** Amount of the product required for the plan to be fulfilled */
   readonly productAmount: number;
}

export interface PlaceBuildingPlan extends BasePlan {
   readonly type: TribesmanPlanType.placeBuilding;
   readonly virtualBuilding: VirtualBuilding;
}

export interface UpgradeBuildingPlan extends BasePlan {
   readonly type: TribesmanPlanType.upgradeBuilding;
   readonly baseBuildingID: number;
   readonly rotation: number;
   // @Cleanup: can't one be deduced from the other?
   readonly blueprintType: BlueprintType;
   readonly entityType: StructureType;
}

/** Directs the tribesman to study a tech. */
export interface TechStudyPlan extends BasePlan {
   readonly type: TribesmanPlanType.doTechStudy;
   readonly tech: Tech;
}

/** Directs the tribesman to contribute gathered items to a tech. */
export interface TechItemPlan extends BasePlan {
   readonly type: TribesmanPlanType.doTechItems;
   readonly tech: Tech;
   readonly itemType: ItemType;
}

/** Directs the tribesman to complete the tech. */
export interface TechCompletePlan extends BasePlan {
   readonly type: TribesmanPlanType.completeTech;
   readonly tech: Tech;
}

export interface GatherItemPlan extends BasePlan {
   readonly type: TribesmanPlanType.gatherItem;
   readonly itemType: ItemType;
   /** Amount of the item type to gather */
   readonly amount: number;
}

/** Represents an individual unit of work that a tribesman can do in order to advance their tribe. */
export type TribesmanPlan = RootPlan | CraftRecipePlan | PlaceBuildingPlan | UpgradeBuildingPlan | TechStudyPlan | TechItemPlan | TechCompletePlan | GatherItemPlan;

export function createRootPlan(): RootPlan {
   return {
      type: TribesmanPlanType.root,
      potentialPlans: [],
      assignedTribesman: null,
      isComplete: false,
      childPlans: []
   };
}

export function createCraftRecipePlan(recipe: CraftingRecipe, productAmount: number): CraftRecipePlan {
   return {
      type: TribesmanPlanType.craftRecipe,
      potentialPlans: [],
      assignedTribesman: null,
      isComplete: false,
      childPlans: [],
      recipe: recipe,
      productAmount: productAmount
   };
}

export function createPlaceBuildingPlan(virtualBuilding: VirtualBuilding): PlaceBuildingPlan {
   return {
      type: TribesmanPlanType.placeBuilding,
      potentialPlans: [],
      assignedTribesman: null,
      isComplete: false,
      childPlans: [],
      virtualBuilding: virtualBuilding
   };
}

export function createUpgradeBuildingPlan(baseBuildingID: number, rotation: number, blueprintType: BlueprintType, entityType: StructureType): UpgradeBuildingPlan {
   return {
      type: TribesmanPlanType.upgradeBuilding,
      potentialPlans: [],
      assignedTribesman: null,
      isComplete: false,
      childPlans: [],
      baseBuildingID: baseBuildingID,
      rotation: rotation,
      blueprintType: blueprintType,
      entityType: entityType
   };
}

export function createTechStudyPlan(tech: Tech): TechStudyPlan {
   return {
      type: TribesmanPlanType.doTechStudy,
      potentialPlans: [],
      assignedTribesman: null,
      isComplete: false,
      childPlans: [],
      tech: tech
   };
}

export function createTechItemPlan(tech: Tech, itemType: ItemType): TechItemPlan {
   return {
      type: TribesmanPlanType.doTechItems,
      potentialPlans: [],
      assignedTribesman: null,
      isComplete: false,
      childPlans: [],
      tech: tech,
      itemType: itemType
   };
}

export function createTechCompletePlan(tech: Tech): TechCompletePlan {
   return {
      type: TribesmanPlanType.completeTech,
      potentialPlans: [],
      assignedTribesman: null,
      isComplete: false,
      childPlans: [],
      tech: tech
   };
}

export function createGatherItemPlan(itemType: ItemType, amount: number): GatherItemPlan {
   return {
      type: TribesmanPlanType.gatherItem,
      potentialPlans: [],
      assignedTribesman: null,
      isComplete: false,
      childPlans: [],
      itemType: itemType,
      amount: amount
   };
}

const craftingStationExists = (tribe: Tribe, craftingStation: CraftingStation): boolean => {
   let entityType: EntityType;
   switch (craftingStation) {
      case CraftingStation.workbench: {
         entityType = EntityType.workbench;
         break;
      }
      // @Robustness
      default: {
         throw new Error();
      }
   }
   
   return tribe.virtualBuildingsByEntityType[entityType].length > 0;
}

const planToCraftItem = (tribe: Tribe, recipe: CraftingRecipe, productAmount: number): CraftRecipePlan => {
   const plan = createCraftRecipePlan(recipe, productAmount);

   // First plan to gather any necessary resources
   for (const entry of recipe.ingredients.getEntries()) {
      plan.childPlans.push(
         planToGetItem(tribe, entry.itemType, entry.count * productAmount)
      );
   }
   
   // If there is no crafting station which can craft the recipe, first place that crafting station.
   if (typeof recipe.craftingStation !== "undefined" && !craftingStationExists(tribe, recipe.craftingStation)) {
      const craftingStationItemType = CRAFTING_STATION_ITEM_TYPE_RECORD[recipe.craftingStation]!;
      plan.childPlans.push(
         planToPlaceBuildingRandomly(tribe, craftingStationItemType)
      );
   }

   // If a tech is required for the recipe, plan to research that tech first
   const requiredTech = getTechRequiredForItem(recipe.product);
   if (requiredTech !== null) {
      plan.childPlans.push(
         planToResearchTech(tribe, requiredTech)
      );
   }

   return plan;
}

/** Creates a goal to obtain an item by any means necessary */
const planToGetItem = (tribe: Tribe, itemType: ItemType, amount: number): CraftRecipePlan | GatherItemPlan => {
   const recipe = getItemRecipe(itemType);
   if (recipe !== null) {
      return planToCraftItem(tribe, recipe, amount);
   } else {
      return createGatherItemPlan(itemType, amount);
   }
}

const tribeHasResearchBench = (tribe: Tribe): boolean => {
   return tribe.virtualBuildingsByEntityType[EntityType.researchBench].length > 0;
}

const planToResearchTech = (tribe: Tribe, tech: Tech): TechCompletePlan => {
   const plan = createTechCompletePlan(tech);

   // If the tech has any precursor techs which aren't researched, research them first


   // Add all required items to the tech
   for (const entry of tech.researchItemRequirements.getEntries()) {
      const requiredItemType = entry.itemType;
      const amountRequired = entry.count;

      // Skip items which have already been donated
      if (typeof tribe.techTreeUnlockProgress[tech.id] !== "undefined" && typeof tribe.techTreeUnlockProgress[tech.id]!.itemProgress[requiredItemType] !== "undefined" && tribe.techTreeUnlockProgress[tech.id]!.itemProgress[requiredItemType]! >= amountRequired) {
         continue;
      }

      plan.childPlans.push(
         planToGetItem(tribe, requiredItemType, amountRequired)
      );

      plan.childPlans.push(
         createTechItemPlan(tech, requiredItemType)
      );
   }

   // If there is no bench to research at, go place one
   if (tech.researchStudyRequirements > 0 && !tribeHasResearchBench(tribe)) {
      plan.childPlans.push(
         planToPlaceBuildingRandomly(tribe, ItemType.research_bench)
      );
   }

   if (tech.researchStudyRequirements > 0) {
      plan.childPlans.push(
         createTechStudyPlan(tech)
      );
   }

   return plan;
}

const planToPlaceBuilding = (tribe: Tribe, placeableItemType: PlaceableItemType, virtualBuilding: VirtualBuilding): PlaceBuildingPlan => {
   const plan = createPlaceBuildingPlan(virtualBuilding);
   
   plan.childPlans.push(
      planToGetItem(tribe, placeableItemType, 1)
   );
   
   // Place the virtual building
   const buildingLayer = tribe.buildingLayers[virtualBuilding.layer.depth];
   buildingLayer.addVirtualBuilding(virtualBuilding);

   return plan;
}

const planToPlaceBuildingRandomly = (tribe: Tribe, itemType: PlaceableItemType): PlaceBuildingPlan => {
   // @Hack
   const buildingLayer = tribe.buildingLayers[tribe.homeLayer.depth];
   const entityType = (ITEM_INFO_RECORD[itemType] as PlaceableItemInfo).entityType;
   
   // @Cleanup: shouldn't have to define both entity type and placeable item type
   const candidate = generateBuildingCandidate(buildingLayer, entityType);
   // @Temporary
   for (const hitbox of candidate.hitboxes) {
      const box = hitbox.box;

      const minSubtileX = getSubtileX(box.calculateBoundsMinX());
      const maxSubtileX = getSubtileX(box.calculateBoundsMaxX());
      const minSubtileY = getSubtileY(box.calculateBoundsMinY());
      const maxSubtileY = getSubtileY(box.calculateBoundsMaxY());

      for (let subtileX = minSubtileX; subtileX <= maxSubtileX; subtileX++) {
         for (let subtileY = minSubtileY; subtileY <= maxSubtileY; subtileY++) {
            if (boxIsCollidingWithSubtile(box, subtileX, subtileY)) {
               throw new Error();
            }
         }
      }
   }
   const virtualBuilding = createVirtualBuilding(buildingLayer, candidate.position, candidate.rotation, entityType);

   return planToPlaceBuilding(tribe, itemType, virtualBuilding);
}

const getNumDesiredBarrels = (tribe: Tribe): number => {
   // Want a barrel every 20 buildings
   return Math.floor(tribe.virtualBuildings.length / 20);
}

const getNumBarrels = (tribe: Tribe): number => {
   return tribe.virtualBuildingsByEntityType[EntityType.barrel].length;
}

/** Returns the first leaf from the plan */
const getIncompleteLeafNodePlan = (plan: TribesmanPlan): TribesmanPlan | null => {
   // If the plan is unable to be assigned to a tribesman, it can't be a leaf
   if (plan.assignedTribesman !== null || plan.isComplete) {
      return null;
   }

   for (const childPlan of plan.childPlans) {
      const plan = getIncompleteLeafNodePlan(childPlan);
      if (plan !== null) {
         return plan;
      }
   }
   
   return plan;
}

/** Gets the plans of a tribe in order of which should be done first */
export function updateTribePlans(tribe: Tribe): void {
   const previousVirtualBuildings = tribe.virtualBuildings.slice();
   
   // @Incomplete: place huts for other tribesman
   // @Incomplete: simulate placing each plan actually happening, and then undo/revert them at the end

   const rootPlan = createRootPlan();

   // If the tribe doesn't have a totem, place one
   if (!tribe.hasTotem()) {
      rootPlan.childPlans.push(
         planToPlaceBuildingRandomly(tribe, ItemType.tribe_totem)
      );
   }

   // Place a hut so the first tribesman can respawn
   if (tribe.getNumHuts() === 0) {
      rootPlan.childPlans.push(
         planToPlaceBuildingRandomly(tribe, ItemType.worker_hut)
      );
   }

   // Make sure all rooms which can have doors leading outside do have them
   for (const buildingLayer of tribe.buildingLayers) {
      for (const room of buildingLayer.rooms) {
         if (!areaHasOutsideDoor(room)) {
            const plan = getOutsideDoorPlacePlan(buildingLayer, room);
            if (plan !== null) {
               rootPlan.childPlans.push(plan);
            }
         }
      }
   }

   for (let i = 0; i < tribe.getNumHuts(); i++) {
      const numDesiredBarrels = getNumDesiredBarrels(tribe);
      if (getNumBarrels(tribe) < numDesiredBarrels) {
         rootPlan.childPlans.push(
            planToPlaceBuildingRandomly(tribe, ItemType.barrel)
         );
         continue;
      }

      // Protect buildings if vulnerable
      if (tribeIsVulnerable(tribe)) {
         // @Incomplete: not just walls!
         // Find the place for a wall that would maximise the building's safety
         const virtualBuilding = findIdealWallPlacePosition(tribe);
         if (virtualBuilding !== null) {
            rootPlan.childPlans.push(
               // @Hack: item type
               planToPlaceBuilding(tribe, ItemType.wooden_wall, virtualBuilding)
            );
            continue;
         }
      }

      break;
   }

   // @Hack @Speed @Garbage
   for (let i = 0; i < tribe.virtualBuildings.length; i++) {
      const virtualBuilding = tribe.virtualBuildings[i];
      if (!previousVirtualBuildings.includes(virtualBuilding)) {
         const buildingLayer = tribe.buildingLayers[virtualBuilding.layer.depth];
         buildingLayer.removeVirtualBuilding(virtualBuilding);
      }
   }

   // @Incomplete: this could result in some very chaotic behaviour, where as soon as 1 building
   // is finished, tribesmen working on something completely unrelated have their plans destroyed.
   // So i will need to have some kind of away of having temporal coherence
   
   // Immediately assign the plans to all tribesman, overriding their existing plans
   tribe.rootPlan = rootPlan;
   for (const tribesman of tribe.tribesmanIDs) {
      if (!TribesmanAIComponentArray.hasComponent(tribesman)) {
         continue;
      }

      const tribesmanAIComponent = TribesmanAIComponentArray.getComponent(tribesman);

      const plan = getIncompleteLeafNodePlan(rootPlan);
      if (plan === null) {
         // No plans left to be assigned!
         tribesmanAIComponent.assignedPlan = null;
         break;
      }

      // Assign the plan to the tribesman
      plan.assignedTribesman = tribesman;
      tribesmanAIComponent.assignedPlan = plan;
   }
}

export function completeTribesmanPlan(tribesman: Entity, plan: TribesmanPlan): void {
   plan.isComplete = true;

   // The tribesman has completed the plan, so it must look for a new one
   // @Copynpaste

   const tribesmanAIComponent = TribesmanAIComponentArray.getComponent(tribesman);
   const tribeComponent = TribeComponentArray.getComponent(tribesman);
   
   const newPlan = getIncompleteLeafNodePlan(tribeComponent.tribe.rootPlan);
   if (newPlan === null) {
      // No plans left to be assigned!
      tribesmanAIComponent.assignedPlan = null;
      return;
   }

   // Assign the plan to the tribesman
   newPlan.assignedTribesman = tribesman;
   tribesmanAIComponent.assignedPlan = newPlan;
}