import { Entity } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { StructureType } from "battletribes-shared/structures";
import { ItemType, ToolType } from "battletribes-shared/items/items";
import { TransformComponentArray } from "../../../components/TransformComponent";
import { createNormalStructureHitboxes } from "battletribes-shared/boxes/entity-hitbox-creation";
import { updateBox } from "battletribes-shared/boxes/boxes";

// @Cleanup: can this be inferred from stuff like the entity->resource-dropped record?
const TOOL_TYPE_FOR_MATERIAL_RECORD: Record<ItemType, ToolType | null> = {
   [ItemType.wood]: "axe",
   [ItemType.workbench]: null,
   [ItemType.wooden_sword]: null,
   [ItemType.wooden_axe]: null,
   [ItemType.wooden_pickaxe]: null,
   [ItemType.wooden_hammer]: null,
   [ItemType.berry]: "sword",
   [ItemType.raw_beef]: "sword",
   [ItemType.cooked_beef]: null,
   [ItemType.rock]: "pickaxe",
   [ItemType.stone_sword]: null,
   [ItemType.stone_axe]: null,
   [ItemType.stone_pickaxe]: null,
   [ItemType.stone_hammer]: null,
   [ItemType.leather]: "sword",
   [ItemType.leather_backpack]: null,
   [ItemType.cactus_spine]: "sword",
   [ItemType.yeti_hide]: "sword",
   [ItemType.frostcicle]: "pickaxe",
   [ItemType.slimeball]: "sword",
   [ItemType.eyeball]: "sword",
   [ItemType.flesh_sword]: null,
   [ItemType.tribe_totem]: null,
   [ItemType.worker_hut]: null,
   [ItemType.barrel]: null,
   [ItemType.frost_armour]: null,
   [ItemType.campfire]: null,
   [ItemType.furnace]: null,
   [ItemType.wooden_bow]: null,
   [ItemType.meat_suit]: null,
   [ItemType.deepfrost_heart]: "sword",
   [ItemType.deepfrost_sword]: null,
   [ItemType.deepfrost_pickaxe]: null,
   [ItemType.deepfrost_axe]: null,
   [ItemType.deepfrost_armour]: null,
   [ItemType.raw_fish]: "sword",
   [ItemType.cooked_fish]: null,
   [ItemType.fishlord_suit]: null,
   [ItemType.gathering_gloves]: null,
   [ItemType.throngler]: null,
   [ItemType.leather_armour]: null,
   [ItemType.spear]: null,
   [ItemType.paper]: null,
   [ItemType.research_bench]: null,
   [ItemType.wooden_wall]: null,
   [ItemType.stone_battleaxe]: null,
   [ItemType.living_rock]: "pickaxe",
   [ItemType.planter_box]: null,
   [ItemType.reinforced_bow]: null,
   [ItemType.crossbow]: null,
   [ItemType.ice_bow]: null,
   [ItemType.poop]: null,
   [ItemType.wooden_spikes]: null,
   [ItemType.punji_sticks]: null,
   [ItemType.ballista]: null,
   [ItemType.sling_turret]: null,
   [ItemType.healing_totem]: null,
   // @Incomplete
   [ItemType.leaf]: null,
   [ItemType.herbal_medicine]: null,
   [ItemType.leaf_suit]: null,
   [ItemType.seed]: "axe",
   [ItemType.gardening_gloves]: null,
   [ItemType.wooden_fence]: null,
   [ItemType.fertiliser]: null,
   [ItemType.frostshaper]: null,
   [ItemType.stonecarvingTable]: null,
   [ItemType.woodenShield]: null,
   [ItemType.slingshot]: null,
   [ItemType.woodenBracings]: null,
   [ItemType.fireTorch]: null,
   [ItemType.slurb]: null,
   [ItemType.slurbTorch]: null,
};


// @Cleanup: unused?
// const shouldCraftHammer = (hotbarInventory: Inventory, tribe: Tribe): boolean => {
//    if (getBestHammerItemSlot(hotbarInventory) !== 0) {
//       return false;
//    }

//    for (let i = 0; i < tribe.buildings.length; i++) {
//       const building = tribe.buildings[i];
//       if (building.type === EntityType.wall) {
//          return true;
//       }
//    }

//    return false;
// }

// @Cleanup: needed?
// const canCraftPlannedBuilding = (hotbarInventory: Inventory, tribe: Tribe, workingPlan: NewBuildingPlan): boolean => {
//    // @Incomplete: also account for backpack

//    const hotbarInventorySlots = hotbarInventory.itemSlots;

//    // @Speed
//    const hotbarAvailableResources: Partial<Record<ItemType, number>> = {};
//    for (const item of Object.values(hotbarInventorySlots)) {
//       if (!hotbarAvailableResources.hasOwnProperty(item.type)) {
//          hotbarAvailableResources[item.type] = item.count;
//       } else {
//          hotbarAvailableResources[item.type]! += item.count;
//       }
//    }
   
//    // @Speed
//    for (const [ingredientType, ingredientCount] of Object.entries(workingPlan.buildingRecipe.ingredients).map(entry => [Number(entry[0]), entry[1]]) as ReadonlyArray<[ItemType, number]>) {
//       let availableCount = 0;

//       if (tribe.availableResources.hasOwnProperty(ingredientType)) {
//          availableCount += tribe.availableResources[ingredientType]!;
//       }
//       if (hotbarAvailableResources.hasOwnProperty(ingredientType)) {
//          availableCount += hotbarAvailableResources[ingredientType]!;
//       }

//       if (availableCount < ingredientCount) {
//          return false;
//       }
//    }

//    return true;
// }

// @Temporary?
// const hasMatchingPersonalPlan = (tribesmanComponent: TribesmanComponent, planType: BuildingPlanType): boolean => {
//    const personalPlan = tribesmanComponent.personalBuildingPlan;
   
//    if (personalPlan === null || personalPlan.type !== planType) {
//       return false;
//    }

//    return true;
// }

// @Cleanup: copy and paste from building-plans
interface BuildingPosition {
   readonly x: number;
   readonly y: number;
   readonly rotation: number;
}

// @Cleanup: large amount of copy and paste from building-plans
const generateRandomNearbyPosition = (tribesman: Entity, entityType: StructureType): BuildingPosition => {
   const transformComponent = TransformComponentArray.getComponent(tribesman);
   
   let attempts = 0;
   main:
   while (attempts++ < 999) {
      const offsetMagnitude = 200 * Math.random();
      const offsetDirection = 2 * Math.PI;
      const position = transformComponent.position.offset(offsetMagnitude, offsetDirection);
      
      const rotation = 2 * Math.PI * Math.random();

      // Make sure the hitboxes would be in a valid position
      const hitboxes = createNormalStructureHitboxes(entityType);
      for (let i = 0; i < hitboxes.length; i++) {
         const hitbox = hitboxes[i];
         const box = hitbox.box;

         updateBox(box, position.x, position.y, rotation);
         
         // @Incomplete: Make sure hitboxes aren't colliding with an entity
         
         // Make sure the hitboxes don't go outside the world
         const minX = box.calculateBoundsMinX();
         const maxX = box.calculateBoundsMaxX();
         const minY = box.calculateBoundsMinY();
         const maxY = box.calculateBoundsMaxY();
         if (minX < 0 || maxX >= Settings.BOARD_UNITS || minY < 0 || maxY >= Settings.BOARD_UNITS) {
            continue main;
         }
      }
      
      return {
         x: position.x,
         y: position.y,
         rotation: rotation
      };
   }

   return {
      x: transformComponent.position.x,
      y: transformComponent.position.y,
      rotation: 2 * Math.PI * Math.random()
   };
}