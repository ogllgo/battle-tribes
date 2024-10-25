import { Point } from "battletribes-shared/utils";
import { EntityType } from "battletribes-shared/entities";
import { StructureType } from "battletribes-shared/structures";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { renderEntities } from "./entity-rendering";

// @Cleanup @Robustness: a lot of these are just mirrors of entity textures. Is there some way to utilise the existing render part definitions?
export enum GhostType {
   deconstructMarker,
   recallMarker,
   coverLeaves,
   treeSeed,
   berryBushSeed,
   iceSpikesSeed,
   fertiliser,
   campfire,
   furnace,
   tribeTotem,
   workbench,
   barrel,
   workerHut,
   warriorHut,
   researchBench,
   planterBox,
   woodenFloorSpikes,
   woodenWallSpikes,
   floorPunjiSticks,
   wallPunjiSticks,
   woodenDoor,
   stoneDoor,
   stoneDoorUpgrade,
   woodenEmbrasure,
   stoneEmbrasure,
   stoneEmbrasureUpgrade,
   woodenWall,
   stoneWall,
   woodenTunnel,
   stoneTunnel,
   stoneTunnelUpgrade,
   tunnelDoor,
   ballista,
   slingTurret,
   stoneFloorSpikes,
   stoneWallSpikes,
   healingTotem,
   fence,
   fenceGate,
   frostshaper,
   stonecarvingTable
}

export interface GhostInfo {
   readonly position: Readonly<Point>;
   readonly rotation: number;
   readonly ghostType: GhostType;
   readonly tint: [number, number, number];
   readonly opacity: number;
}

export const PARTIAL_OPACITY = 0.5;

let ghostRenderInfo: EntityRenderInfo | null = null;

// @Cleanup: is this used? or the right spot for this?
export const ENTITY_TYPE_TO_GHOST_TYPE_MAP: Record<StructureType, GhostType> = {
   [EntityType.campfire]: GhostType.campfire,
   [EntityType.furnace]: GhostType.furnace,
   [EntityType.tribeTotem]: GhostType.tribeTotem,
   [EntityType.workbench]: GhostType.workbench,
   [EntityType.barrel]: GhostType.barrel,
   [EntityType.workerHut]: GhostType.workerHut,
   [EntityType.warriorHut]: GhostType.warriorHut,
   [EntityType.researchBench]: GhostType.researchBench,
   [EntityType.planterBox]: GhostType.planterBox,
   [EntityType.floorSpikes]: GhostType.woodenFloorSpikes,
   [EntityType.wallSpikes]: GhostType.woodenWallSpikes,
   [EntityType.floorPunjiSticks]: GhostType.floorPunjiSticks,
   [EntityType.wallPunjiSticks]: GhostType.wallPunjiSticks,
   [EntityType.door]: GhostType.woodenDoor,
   [EntityType.embrasure]: GhostType.woodenEmbrasure,
   [EntityType.wall]: GhostType.woodenWall,
   [EntityType.tunnel]: GhostType.woodenTunnel,
   [EntityType.ballista]: GhostType.ballista,
   [EntityType.slingTurret]: GhostType.slingTurret,
   [EntityType.healingTotem]: GhostType.healingTotem,
   [EntityType.fence]: GhostType.fence,
   [EntityType.fenceGate]: GhostType.fenceGate,
   [EntityType.frostshaper]: GhostType.frostshaper,
   [EntityType.stonecarvingTable]: GhostType.stonecarvingTable,
   // @Hack
   [EntityType.bracings]: GhostType.stonecarvingTable
};

export function setGhostRenderInfo(renderInfo: EntityRenderInfo | null): void {
   ghostRenderInfo = renderInfo;
}

export function renderGhostEntities(): void {
   const renderInfos = new Array<EntityRenderInfo>();

   if (ghostRenderInfo !== null) {
      renderInfos.push(ghostRenderInfo);
   }

   // @INCOMPLETE
   // // Building plans
   // if (OPTIONS.showBuildingPlans) {
   //    const buildingPlans = getVisibleBuildingPlans();
   //    for (let i = 0; i < buildingPlans.length; i++) {
   //       const plan = buildingPlans[i];
         
   //       ghostInfos.push({
   //          position: new Point(plan.x, plan.y),
   //          rotation: plan.rotation,
   //          ghostType: ENTITY_TYPE_TO_GHOST_TYPE_MAP[plan.entityType],
   //          opacity: 0.5,
   //          tint: [0.9, 1.5, 0.8]
   //       });
   //    }

   //    // Potential building plans
   //    const hoveredBuildingPlan = getHoveredBuildingPlan();
   //    if (hoveredBuildingPlan !== null && hoveredBuildingPlan.potentialBuildingPlans.length > 0) {
   //       const plan = hoveredBuildingPlan;
   
   //       const firstPlan = plan.potentialBuildingPlans[0];
   //       let minPlanSafety = firstPlan.safety;
   //       let maxPlanSafety = firstPlan.safety;
   //       for (let i = 1; i < plan.potentialBuildingPlans.length; i++) {
   //          const potentialPlan = plan.potentialBuildingPlans[i];
   //          if (potentialPlan.safety < minPlanSafety) {
   //             minPlanSafety = potentialPlan.safety;
   //          } else if (potentialPlan.safety > maxPlanSafety) {
   //             maxPlanSafety = potentialPlan.safety;
   //          }
   //       }
   
   //       const potentialPlans = plan.potentialBuildingPlans;
   //       const stats = getPotentialPlanStats(potentialPlans);
   //       for (let i = 0; i < plan.potentialBuildingPlans.length; i++) {
   //          const potentialPlan = plan.potentialBuildingPlans[i];
   
   //          const idealness = calculatePotentialPlanIdealness(potentialPlan, stats);
   
   //          ghostInfos.push({
   //             position: new Point(potentialPlan.x, potentialPlan.y),
   //             rotation: potentialPlan.rotation,
   //             ghostType: ENTITY_TYPE_TO_GHOST_TYPE_MAP[potentialPlan.buildingType],
   //             opacity: lerp(0.15, 0.6, idealness),
   //             tint: [1.2, 1.4, 0.8]
   //          });
   //       }
   //    }
   // }

   renderEntities(renderInfos);
}