import { EntityType } from "../../../shared/src/entities";
import { ClientServerComponentParams } from "../world";
import { ClientComponentType } from "./client-component-types";
import { BallistaFrostcicleComponentParams, createBallistaFrostcicleComponentParams } from "./client-components/BallistaFrostcicleComponent";
import { BallistaRockComponentParams, createBallistaRockComponentParams } from "./client-components/BallistaRockComponent";
import { BallistaSlimeballComponentParams, createBallistaSlimeballComponentParams } from "./client-components/BallistaSlimeballComponent";
import { BallistaWoodenBoltComponentParams, createBallistaWoodenBoltComponentParams } from "./client-components/BallistaWoodenBoltComponent";
import { createEmbrasureComponentParams, EmbrasureComponentParams } from "./client-components/EmbrasureComponent";
import { createEquipmentComponentParams, EquipmentComponentParams } from "./client-components/EquipmentComponent";
import { createFootprintComponentParams, FootprintComponentParams } from "./client-components/FootprintComponent";
import { createFrostshaperComponentParams, FrostshaperComponentParams } from "./client-components/FrostshaperComponent";
import { GlurbTailSegmentComponentParams } from "./client-components/GlurbTailSegmentComponent";
import { createLilypadComponentParams, LilypadComponentParams } from "./client-components/LilypadComponent";
import { createRandomSoundComponentParams, RandomSoundComponentParams } from "./client-components/RandomSoundComponent";
import { createRegularSpikesComponentParams, RegularSpikesComponentParams } from "./client-components/RegularSpikesComponent";
import { createStonecarvingTableComponentParams, StonecarvingTableComponentParams } from "./client-components/StonecarvingTableComponent";
import { createThrownBattleaxeComponentParams, ThrownBattleaxeComponentParams } from "./client-components/ThrownBattleaxeComponent";
import { createWallComponentParams, WallComponentParams } from "./client-components/WallComponent";
import { createWarriorHutComponentParams, WarriorHutComponentParams } from "./client-components/WarriorHutComponent";
import { createWoodenArrowComponentParams, WoodenArrowComponentParams } from "./client-components/WoodenArrowComponent";
import { createWorkbenchComponentParams, WorkbenchComponentParams } from "./client-components/WorkbenchComponent";
import { createWorkerHutComponentParams, WorkerHutComponentParams } from "./client-components/WorkerHutComponent";

const ClientComponentParamsRecord = {
   [ClientComponentType.equipment]: (): EquipmentComponentParams => 0 as any,
   [ClientComponentType.footprint]: (): FootprintComponentParams => 0 as any,
   [ClientComponentType.randomSound]: (): RandomSoundComponentParams => 0 as any,
   [ClientComponentType.embrasure]: (): EmbrasureComponentParams => 0 as any,
   [ClientComponentType.frostshaper]: (): FrostshaperComponentParams => 0 as any,
   [ClientComponentType.lilypad]: (): LilypadComponentParams => 0 as any,
   [ClientComponentType.regularSpikes]: (): RegularSpikesComponentParams => 0 as any,
   [ClientComponentType.stonecarvingTable]: (): StonecarvingTableComponentParams => 0 as any,
   [ClientComponentType.wall]: (): WallComponentParams => 0 as any,
   [ClientComponentType.warriorHut]: (): WarriorHutComponentParams => 0 as any,
   [ClientComponentType.workbench]: (): WorkbenchComponentParams => 0 as any,
   [ClientComponentType.workerHut]: (): WorkerHutComponentParams => 0 as any,
   [ClientComponentType.ballistaFrostcicle]: (): BallistaFrostcicleComponentParams => 0 as any,
   [ClientComponentType.ballistaRock]: (): BallistaRockComponentParams => 0 as any,
   [ClientComponentType.ballistaSlimeball]: (): BallistaSlimeballComponentParams => 0 as any,
   [ClientComponentType.ballistaWoodenBolt]: (): BallistaWoodenBoltComponentParams => 0 as any,
   [ClientComponentType.thrownBattleaxe]: (): ThrownBattleaxeComponentParams => 0 as any,
   [ClientComponentType.woodenArrow]: (): WoodenArrowComponentParams => 0 as any,
   [ClientComponentType.glurbTailSegment]: (): GlurbTailSegmentComponentParams => 0 as any,
} satisfies Record<ClientComponentType, () => object>;

export type ClientComponentParams<T extends ClientComponentType> = ReturnType<typeof ClientComponentParamsRecord[T]>;

// @Cleanup: if this gets too large/unwieldy i should rework this
export function getEntityClientComponentConfigs(entityType: EntityType): ClientServerComponentParams {
   switch (entityType) {
      case EntityType.cow: {
         return {
            [ClientComponentType.footprint]: createFootprintComponentParams(0.3, 20, 64, 5, 40, false)
         };
      }
      case EntityType.player: {
         return {
            [ClientComponentType.footprint]: createFootprintComponentParams(0.2, 20, 64, 4, 64, false),
            [ClientComponentType.equipment]: createEquipmentComponentParams()
         };
      }
      case EntityType.tribeWorker: {
         return {
            [ClientComponentType.footprint]: createFootprintComponentParams(0.15, 20, 64, 4, 50, false),
            [ClientComponentType.equipment]: createEquipmentComponentParams()
         };
      }
      case EntityType.tribeWarrior: {
         return {
            [ClientComponentType.footprint]: createFootprintComponentParams(0.15, 20, 64, 4, 64, false),
            [ClientComponentType.equipment]: createEquipmentComponentParams()
         };
      }
      case EntityType.krumblid: {
         return {
            [ClientComponentType.footprint]: createFootprintComponentParams(0.3, 20, 64, 5, 50, false)
         };
      }
      case EntityType.lilypad: {
         return {
            [ClientComponentType.lilypad]: createLilypadComponentParams()
         };
      }
      case EntityType.frostshaper: {
         return {
            [ClientComponentType.frostshaper]: createFrostshaperComponentParams()
         };
      }
      case EntityType.embrasure: {
         return {
            [ClientComponentType.embrasure]: createEmbrasureComponentParams()
         };
      }
      case EntityType.pebblum: {
         return {
            [ClientComponentType.footprint]: createFootprintComponentParams(0.3, 20, 64, 5, 40, false)
         };
      }
      case EntityType.wallSpikes:
      case EntityType.floorSpikes: {
         return {
            [ClientComponentType.regularSpikes]: createRegularSpikesComponentParams()
         };
      }
      case EntityType.stonecarvingTable: {
         return {
            [ClientComponentType.stonecarvingTable]: createStonecarvingTableComponentParams()
         };
      }
      case EntityType.wall: {
         return {
            [ClientComponentType.wall]: createWallComponentParams()
         };
      }
      case EntityType.warriorHut: {
         return {
            [ClientComponentType.warriorHut]: createWarriorHutComponentParams()
         };
      }
      case EntityType.workbench: {
         return {
            [ClientComponentType.workbench]: createWorkbenchComponentParams()
         };
      }
      case EntityType.workerHut: {
         return {
            [ClientComponentType.workerHut]: createWorkerHutComponentParams()
         };
      }
      case EntityType.yeti: {
         return {
            [ClientComponentType.randomSound]: createRandomSoundComponentParams()
         };
      }
      case EntityType.ballistaFrostcicle: {
         return {
            [ClientComponentType.ballistaFrostcicle]: createBallistaFrostcicleComponentParams()
         };
      }
      case EntityType.ballistaRock: {
         return {
            [ClientComponentType.ballistaRock]: createBallistaRockComponentParams()
         };
      }
      case EntityType.ballistaSlimeball: {
         return {
            [ClientComponentType.ballistaSlimeball]: createBallistaSlimeballComponentParams()
         };
      }
      case EntityType.ballistaWoodenBolt: {
         return {
            [ClientComponentType.ballistaWoodenBolt]: createBallistaWoodenBoltComponentParams()
         };
      }
      case EntityType.battleaxeProjectile: {
         return {
            [ClientComponentType.thrownBattleaxe]: createThrownBattleaxeComponentParams()
         };
      }
      case EntityType.woodenArrow: {
         return {
            [ClientComponentType.woodenArrow]: createWoodenArrowComponentParams()
         };
      }
      case EntityType.glurbTailSegment: {
         return {
            [ClientComponentType.glurbTailSegment]: {}
         };
      }
      case EntityType.snobe: {
         return {
            [ClientComponentType.footprint]: createFootprintComponentParams(0.3, 20, 48, 5, 40, true),
            [ClientComponentType.randomSound]: createRandomSoundComponentParams()
         };
      }
      case EntityType.snobe: {
         return {
            [ClientComponentType.footprint]: createFootprintComponentParams(0.3, 20, 64, 5, 40, false),
         };
      }
   }

   return {};
}