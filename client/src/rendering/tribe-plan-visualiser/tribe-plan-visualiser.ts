import { BlueprintType } from "../../../../shared/src/components";
import { Entity, EntityType } from "../../../../shared/src/entities";
import { CRAFTING_RECIPES, CraftingRecipe } from "../../../../shared/src/items/crafting-recipes";
import { ItemType } from "../../../../shared/src/items/items";
import { PacketReader } from "../../../../shared/src/packets";
import { StructureType } from "../../../../shared/src/structures";
import { getTechByID, TechID, Tech } from "../../../../shared/src/techs";
import { TribesmanPlanType } from "../../../../shared/src/utils";
import { TribePlanVisualiser_setPlan } from "../../components/game/tribe-plan-visualiser/TribePlanVisualiser";
import { addMenuCloseFunction } from "../../menus";

const enum Vars {
   NODE_DISPLAY_SIZE = 100
}

interface BasePlan {
   readonly type: TribesmanPlanType;
   readonly assignedTribesman: Entity | null;
   readonly isComplete: boolean;
   readonly childPlans: Array<TribesmanPlan>;

   // Stuff for displaying the plan node
   displayWidth: number;
   readonly depth: number;
   xOffset: number;
}

export interface RootPlan extends BasePlan {
   readonly type: TribesmanPlanType.root;
}

export interface CraftRecipePlan extends BasePlan {
   readonly type: TribesmanPlanType.craftRecipe;
   readonly recipe: CraftingRecipe;
   readonly productAmount: number;
}

export interface PlaceBuildingPlan extends BasePlan {
   readonly type: TribesmanPlanType.placeBuilding;
   readonly entityType: EntityType;
}

export interface UpgradeBuildingPlan extends BasePlan {
   readonly type: TribesmanPlanType.upgradeBuilding;
   readonly blueprintType: BlueprintType;
}

export interface TechStudyPlan extends BasePlan {
   readonly type: TribesmanPlanType.doTechStudy;
   readonly tech: Tech;
}

export interface TechItemPlan extends BasePlan {
   readonly type: TribesmanPlanType.doTechItems;
   readonly tech: Tech;
   readonly itemType: ItemType;
}

export interface TechCompletePlan extends BasePlan {
   readonly type: TribesmanPlanType.completeTech;
   readonly tech: Tech;
}

export interface GatherItemPlan extends BasePlan {
   readonly type: TribesmanPlanType.gatherItem;
   readonly itemType: ItemType;
   readonly amount: number;
}

export type TribesmanPlan = RootPlan | CraftRecipePlan | PlaceBuildingPlan | UpgradeBuildingPlan | TechStudyPlan | TechItemPlan | TechCompletePlan | GatherItemPlan;

let gl: WebGL2RenderingContext;

const tribePlanDataRecord: Record<number, TribesmanPlan> = {};

let renderedTribeID: number | null = null;

// @Cleanup: Copy and paste
export function createTribePlanVisualiserGLContext(): void {
   const canvas = document.getElementById("tribe-plan-visualiser-canvas") as HTMLCanvasElement;
   const glAttempt = canvas.getContext("webgl2", { alpha: false });

   if (glAttempt === null) {
      alert("Your browser does not support WebGL.");
      throw new Error("Your browser does not support WebGL.");
   }
   gl = glAttempt;

   gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
}

export function getTribePlanVisualiserGL(): WebGL2RenderingContext {
   return gl;
}

export function createTribePlanVisualiserShaders(): void {
   const vertexShaderText = `#version 300 es
   precision highp float;
   
   layout(location = 0) in vec2 a_position;

   void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);

      v_position = a_position;
   }
   `;
}

const readRootPlan = (reader: PacketReader, assignedTribesman: Entity | null, isComplete: boolean, depth: number): RootPlan => {
   return {
      type: TribesmanPlanType.root,
      assignedTribesman: assignedTribesman,
      isComplete: isComplete,
      childPlans: [],
      displayWidth: Vars.NODE_DISPLAY_SIZE,
      depth: depth,
      xOffset: 0
   };
}

const readCraftRecipePlan = (reader: PacketReader, assignedTribesman: Entity | null, isComplete: boolean, depth: number): CraftRecipePlan => {
   const recipeIdx = reader.readNumber();
   const productAmount = reader.readNumber();
   
   return {
      type: TribesmanPlanType.craftRecipe,
      assignedTribesman: assignedTribesman,
      isComplete: isComplete,
      childPlans: [],
      recipe: CRAFTING_RECIPES[recipeIdx],
      productAmount: productAmount,
      displayWidth: Vars.NODE_DISPLAY_SIZE,
      depth: depth,
      xOffset: 0
   };
}

const readPlaceBuildingPlan = (reader: PacketReader, assignedTribesman: Entity | null, isComplete: boolean, depth: number): PlaceBuildingPlan => {
   const entityType = reader.readNumber() as StructureType;
   
   return {
      type: TribesmanPlanType.placeBuilding,
      assignedTribesman: assignedTribesman,
      isComplete: isComplete,
      childPlans: [],
      entityType: entityType,
      displayWidth: Vars.NODE_DISPLAY_SIZE,
      depth: depth,
      xOffset: 0
   };
}

const readUpgradeBuildingPlan = (reader: PacketReader, assignedTribesman: Entity | null, isComplete: boolean, depth: number): UpgradeBuildingPlan => {
   const blueprintType = reader.readNumber() as BlueprintType;
   
   return {
      type: TribesmanPlanType.upgradeBuilding,
      assignedTribesman: assignedTribesman,
      isComplete: isComplete,
      childPlans: [],
      blueprintType: blueprintType,
      displayWidth: Vars.NODE_DISPLAY_SIZE,
      depth: depth,
      xOffset: 0
   };
}

const readTechStudyPlan = (reader: PacketReader, assignedTribesman: Entity | null, isComplete: boolean, depth: number): TechStudyPlan => {
   const techID = reader.readNumber() as TechID;
   
   return {
      type: TribesmanPlanType.doTechStudy,
      assignedTribesman: assignedTribesman,
      isComplete: isComplete,
      childPlans: [],
      tech: getTechByID(techID),
      displayWidth: Vars.NODE_DISPLAY_SIZE,
      depth: depth,
      xOffset: 0
   };
}

const readTechItemPlan = (reader: PacketReader, assignedTribesman: Entity | null, isComplete: boolean, depth: number): TechItemPlan => {
   const techID = reader.readNumber() as TechID;
   const itemType = reader.readNumber() as ItemType;

   return {
      type: TribesmanPlanType.doTechItems,
      assignedTribesman: assignedTribesman,
      isComplete: isComplete,
      childPlans: [],
      tech: getTechByID(techID),
      itemType: itemType,
      displayWidth: Vars.NODE_DISPLAY_SIZE,
      depth: depth,
      xOffset: 0
   };
}

const readTechCompletePlan = (reader: PacketReader, assignedTribesman: Entity | null, isComplete: boolean, depth: number): TechCompletePlan => {
   const techID = reader.readNumber() as TechID;
   
   return {
      type: TribesmanPlanType.completeTech,
      assignedTribesman: assignedTribesman,
      isComplete: isComplete,
      childPlans: [],
      tech: getTechByID(techID),
      displayWidth: Vars.NODE_DISPLAY_SIZE,
      depth: depth,
      xOffset: 0
   };
}

const readGatherItemPlan = (reader: PacketReader, assignedTribesman: Entity | null, isComplete: boolean, depth: number): GatherItemPlan => {
   const itemType = reader.readNumber() as ItemType;
   const amount = reader.readNumber();

   return {
      type: TribesmanPlanType.gatherItem,
      assignedTribesman: assignedTribesman,
      isComplete: isComplete,
      childPlans: [],
      itemType: itemType,
      amount: amount,
      displayWidth: Vars.NODE_DISPLAY_SIZE,
      depth: depth,
      xOffset: 0
   };
}

const readTribePlanData = (reader: PacketReader, depth: number): TribesmanPlan => {
   const planType = reader.readNumber() as TribesmanPlanType;
   let assignedTribesman: Entity | null = reader.readNumber();
   if (assignedTribesman === 0) {
      assignedTribesman = null;
   }

   const isComplete = reader.readBoolean();
   reader.padOffset(3);

   let plan: TribesmanPlan;
   switch (planType) {
      case TribesmanPlanType.root:            plan = readRootPlan(reader, assignedTribesman, isComplete, depth); break;
      case TribesmanPlanType.craftRecipe:     plan = readCraftRecipePlan(reader, assignedTribesman, isComplete, depth); break;
      case TribesmanPlanType.placeBuilding:   plan = readPlaceBuildingPlan(reader, assignedTribesman, isComplete, depth); break;
      case TribesmanPlanType.upgradeBuilding: plan = readUpgradeBuildingPlan(reader, assignedTribesman, isComplete, depth); break;
      case TribesmanPlanType.doTechStudy:     plan = readTechStudyPlan(reader, assignedTribesman, isComplete, depth); break;
      case TribesmanPlanType.doTechItems:     plan = readTechItemPlan(reader, assignedTribesman, isComplete, depth); break;
      case TribesmanPlanType.completeTech:    plan = readTechCompletePlan(reader, assignedTribesman, isComplete, depth); break;
      case TribesmanPlanType.gatherItem:      plan = readGatherItemPlan(reader, assignedTribesman, isComplete, depth); break;
   }

   const numChildren = reader.readNumber();
   for (let i = 0; i < numChildren; i++) {
      const childPlan = readTribePlanData(reader, depth + 1);
      plan.childPlans.push(childPlan);

      plan.displayWidth += childPlan.displayWidth;

      // spacing between children
      // if (i < numChildren - 1) {
      //    plan.displayWidth += Vars.NODE_DISPLAY_SIZE;
      // }
   }

   return plan;
}

const fillPlanChildrenXOffset = (plan: TribesmanPlan): void => {
   let widthCounter = 0;
   for (let i = 0; i < plan.childPlans.length; i++) {
      const childPlan = plan.childPlans[i];
      
      childPlan.xOffset = plan.xOffset - plan.displayWidth * 0.5;
      childPlan.xOffset += (widthCounter + childPlan.displayWidth * 0.5) + Vars.NODE_DISPLAY_SIZE * 0.5;

      fillPlanChildrenXOffset(childPlan);
      
      widthCounter += childPlan.displayWidth;
   }
}

export function updateTribePlanData(reader: PacketReader, tribeID: number): void {
   const rootPlan = readTribePlanData(reader, 0);
   fillPlanChildrenXOffset(rootPlan);

   tribePlanDataRecord[tribeID] = rootPlan;
}

export function setRenderedTribePlanID(id: number | null): void {
   if (renderedTribeID === null) {
      addMenuCloseFunction(() => {
         renderedTribeID = null;
      });
   }
   
   renderedTribeID = id;
}

export function renderTribePlans(): void {
   if (renderedTribeID === null) {
      document.getElementById("tribe-plan-visualiser-canvas")!.classList.add("hidden");
      TribePlanVisualiser_setPlan(null);
      return;
   }
   document.getElementById("tribe-plan-visualiser-canvas")!.classList.remove("hidden");

   gl.clearColor(0, 0,0, 1);
   gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
   
   const plan = tribePlanDataRecord[renderedTribeID];
   TribePlanVisualiser_setPlan(plan);
}