import { ServerComponentType } from "../../../shared/src/components";
import { AIAssignmentComponent, AIAssignmentComponentArray, AIAssignmentComponentParams } from "./server-components/AIAssignmentComponent";
import { AIHelperComponent, AIHelperComponentArray, AIHelperComponentParams } from "./server-components/AIHelperComponent";
import { AmmoBoxComponent, AmmoBoxComponentArray, AmmoBoxComponentParams } from "./server-components/AmmoBoxComponent";
import { ProjectileComponent, ProjectileComponentArray, ProjectileComponentParams } from "./server-components/ProjectileComponent";
import { AttackingEntitiesComponent, AttackingEntitiesComponentArray, AttackingEntitiesComponentParams } from "./server-components/AttackingEntitiesComponent";
import { BallistaComponent, BallistaComponentArray, BallistaComponentParams } from "./server-components/BallistaComponent";
import { BarrelComponent, BarrelComponentArray, BarrelComponentParams } from "./server-components/BarrelComponent";
import { BattleaxeProjectileComponent, BattleaxeProjectileComponentArray, BattleaxeProjectileComponentParams } from "./server-components/BattleaxeProjectileComponent";
import { BerryBushComponent, BerryBushComponentArray, BerryBushComponentParams } from "./server-components/BerryBushComponent";
import { BerryBushPlantedComponent, BerryBushPlantedComponentArray, BerryBushPlantedComponentParams } from "./server-components/BerryBushPlantedComponent";
import { BlueprintComponent, BlueprintComponentArray, BlueprintComponentParams } from "./server-components/BlueprintComponent";
import { BoulderComponent, BoulderComponentArray, BoulderComponentParams } from "./server-components/BoulderComponent";
import { BracingsComponent, BracingsComponentArray, BracingsComponentParams } from "./server-components/BracingsComponent";
import { BuildingMaterialComponent, BuildingMaterialComponentArray, BuildingMaterialComponentParams } from "./server-components/BuildingMaterialComponent";
import { CactusComponent, CactusComponentArray, CactusComponentParams } from "./server-components/CactusComponent";
import { CampfireComponent, CampfireComponentArray, CampfireComponentParams } from "./server-components/CampfireComponent";
import { CogwalkerComponent, CogwalkerComponentArray, CogwalkerComponentParams } from "./server-components/CogwalkerComponent";
import { CookingComponent, CookingComponentArray, CookingComponentParams } from "./server-components/CookingComponent";
import { CowComponent, CowComponentArray, CowComponentParams } from "./server-components/CowComponent";
import { CraftingStationComponent, CraftingStationComponentArray, CraftingStationComponentParams } from "./server-components/CraftingStationComponent";
import { DecorationComponent, DecorationComponentArray, DecorationComponentParams } from "./server-components/DecorationComponent";
import { DoorComponent, DoorComponentArray, DoorComponentParams } from "./server-components/DoorComponent";
import { FenceComponent, FenceComponentArray, FenceComponentParams } from "./server-components/FenceComponent";
import { FenceGateComponent, FenceGateComponentArray, FenceGateComponentParams } from "./server-components/FenceGateComponent";
import { FireTorchComponent, FireTorchComponentArray, FireTorchComponentParams } from "./server-components/FireTorchComponent";
import { FishComponent, FishComponentArray, FishComponentParams } from "./server-components/FishComponent";
import { FrozenYetiComponent, FrozenYetiComponentArray, FrozenYetiComponentParams } from "./server-components/FrozenYetiComponent";
import { FurnaceComponent, FurnaceComponentArray, FurnaceComponentParams } from "./server-components/FurnaceComponent";
import { GlurbHeadSegmentComponent, GlurbHeadSegmentComponentArray, GlurbHeadSegmentComponentParams } from "./server-components/GlurbHeadSegmentComponent";
import { GolemComponent, GolemComponentArray, GolemComponentParams } from "./server-components/GolemComponent";
import { GuardianComponent, GuardianComponentArray, GuardianComponentParams } from "./server-components/GuardianComponent";
import { GuardianGemFragmentProjectileComponent, GuardianGemFragmentProjectileComponentArray, GuardianGemFragmentProjectileComponentParams } from "./server-components/GuardianGemFragmentProjectileComponent";
import { GuardianGemQuakeComponent, GuardianGemQuakeComponentArray, GuardianGemQuakeComponentParams } from "./server-components/GuardianGemQuakeComponent";
import { GuardianSpikyBallComponent, GuardianSpikyBallComponentArray, GuardianSpikyBallComponentParams } from "./server-components/GuardianSpikyBallComponent";
import { HealingTotemComponent, HealingTotemComponentArray, HealingTotemComponentParams } from "./server-components/HealingTotemComponent";
import { HealthComponent, HealthComponentArray, HealthComponentParams } from "./server-components/HealthComponent";
import { HutComponent, HutComponentArray, HutComponentParams } from "./server-components/HutComponent";
import { IceArrowComponent, IceArrowComponentArray, IceArrowComponentParams } from "./server-components/IceArrowComponent";
import { IceShardComponent, IceShardComponentArray, IceShardComponentParams } from "./server-components/IceShardComponent";
import { IceSpikesComponent, IceSpikesComponentArray, IceSpikesComponentParams } from "./server-components/IceSpikesComponent";
import { IceSpikesPlantedComponent, IceSpikesPlantedComponentArray, IceSpikesPlantedComponentParams } from "./server-components/IceSpikesPlantedComponent";
import { InventoryComponent, InventoryComponentArray, InventoryComponentParams } from "./server-components/InventoryComponent";
import { InventoryUseComponent, InventoryUseComponentArray, InventoryUseComponentParams } from "./server-components/InventoryUseComponent";
import { ItemComponent, ItemComponentArray, ItemComponentParams } from "./server-components/ItemComponent";
import { KrumblidComponent, KrumblidComponentArray, KrumblidComponentParams } from "./server-components/KrumblidComponent";
import { LayeredRodComponent, LayeredRodComponentArray, LayeredRodComponentParams } from "./server-components/LayeredRodComponent";
import { MithrilOreNodeComponent, MithrilOreNodeComponentArray, MithrilOreNodeComponentParams } from "./server-components/MithrilOreNodeComponent";
import { PebblumComponent, PebblumComponentArray, PebblumComponentParams } from "./server-components/PebblumComponent";
import { PhysicsComponent, PhysicsComponentArray, PhysicsComponentParams } from "./server-components/PhysicsComponent";
import { PlantedComponent, PlantedComponentArray, PlantedComponentParams } from "./server-components/PlantedComponent";
import { PlanterBoxComponent, PlanterBoxComponentArray, PlanterBoxComponentParams } from "./server-components/PlanterBoxComponent";
import { PlayerComponent, PlayerComponentArray, PlayerComponentParams } from "./server-components/PlayerComponent";
import { PunjiSticksComponent, PunjiSticksComponentArray, PunjiSticksComponentParams } from "./server-components/PunjiSticksComponent";
import { ResearchBenchComponent, ResearchBenchComponentArray, ResearchBenchComponentParams } from "./server-components/ResearchBenchComponent";
import { RockSpikeComponent, RockSpikeComponentArray, RockSpikeComponentParams } from "./server-components/RockSpikeComponent";
import { ScrappyComponent, ScrappyComponentArray, ScrappyComponentParams } from "./server-components/ScrappyComponent";
import { SlimeComponent, SlimeComponentArray, SlimeComponentParams } from "./server-components/SlimeComponent";
import { SlimeSpitComponent, SlimeSpitComponentArray, SlimeSpitComponentParams } from "./server-components/SlimeSpitComponent";
import { SlimewispComponent, SlimewispComponentArray, SlimewispComponentParams } from "./server-components/SlimewispComponent";
import { SlingTurretComponent, SlingTurretComponentArray, SlingTurretComponentParams } from "./server-components/SlingTurretComponent";
import { SlurbTorchComponent, SlurbTorchComponentArray, SlurbTorchComponentParams } from "./server-components/SlurbTorchComponent";
import { SnowballComponent, SnowballComponentArray, SnowballComponentParams } from "./server-components/SnowballComponent";
import { SpearProjectileComponent, SpearProjectileComponentArray, SpearProjectileComponentParams } from "./server-components/SpearProjectileComponent";
import { SpikesComponent, SpikesComponentArray, SpikesComponentParams } from "./server-components/SpikesComponent";
import { SpikyBastardComponent, SpikyBastardComponentArray, SpikyBastardComponentParams } from "./server-components/SpikyBastardComponent";
import { SpitPoisonAreaComponent, SpitPoisonAreaComponentArray, SpitPoisonAreaComponentParams } from "./server-components/SpitPoisonAreaComponent";
import { StatusEffectComponent, StatusEffectComponentArray, StatusEffectComponentParams } from "./server-components/StatusEffectComponent";
import { StructureComponent, StructureComponentArray, StructureComponentParams } from "./server-components/StructureComponent";
import { ThrowingProjectileComponent, ThrowingProjectileComponentArray, ThrowingProjectileComponentParams } from "./server-components/ThrowingProjectileComponent";
import { TombstoneComponent, TombstoneComponentArray, TombstoneComponentParams } from "./server-components/TombstoneComponent";
import { TotemBannerComponent, TotemBannerComponentArray, TotemBannerComponentParams } from "./server-components/TotemBannerComponent";
import { TransformComponent, TransformComponentArray, TransformComponentParams } from "./server-components/TransformComponent";
import { TreeComponent, TreeComponentArray, TreeComponentParams } from "./server-components/TreeComponent";
import { TreePlantedComponent, TreePlantedComponentArray, TreePlantedComponentParams } from "./server-components/TreePlantedComponent";
import { TreeRootBaseComponent, TreeRootBaseComponentArray, TreeRootBaseComponentParams } from "./server-components/TreeRootBaseComponent";
import { TreeRootSegmentComponent, TreeRootSegmentComponentArray, TreeRootSegmentComponentParams } from "./server-components/TreeRootSegmentComponent";
import { TribeComponent, TribeComponentArray, TribeComponentParams } from "./server-components/TribeComponent";
import { TribesmanComponent, TribesmanComponentArray, TribesmanComponentParams } from "./server-components/TribesmanComponent";
import { TribesmanAIComponent, TribesmanAIComponentArray, TribesmanAIComponentParams } from "./server-components/TribesmanAIComponent";
import { TribeWarriorComponent, TribeWarriorComponentArray, TribeWarriorComponentParams } from "./server-components/TribeWarriorComponent";
import { TunnelComponent, TunnelComponentArray, TunnelComponentParams } from "./server-components/TunnelComponent";
import { TurretComponent, TurretComponentArray, TurretComponentParams } from "./server-components/TurretComponent";
import { YetiComponent, YetiComponentArray, YetiComponentParams } from "./server-components/YetiComponent";
import { ZombieComponent, ZombieComponentArray, ZombieComponentParams } from "./server-components/ZombieComponent";
import { TribeMemberComponent, TribeMemberComponentArray, TribeMemberComponentParams } from "./server-components/TribeMemberComponent";
import { AutomatonAssemblerComponent, AutomatonAssemblerComponentArray, AutomatonAssemblerComponentParams } from "./server-components/AutomatonAssemblerComponent";
import { MithrilAnvilComponent, MithrilAnvilComponentArray, MithrilAnvilComponentParams } from "./server-components/MithrilAnvilComponent";
import { RideableComponent, RideableComponentArray, RideableComponentParams } from "./server-components/RideableComponent";
import { SwingAttackComponent, SwingAttackComponentArray, SwingAttackComponentParams } from "./server-components/SwingAttackComponent";
import { BlockAttackComponent, BlockAttackComponentArray, BlockAttackComponentParams } from "./server-components/BlockAttackComponent";
import { SlingTurretRockComponent, SlingTurretRockComponentArray, SlingTurretRockComponentParams } from "./server-components/SlingTurretRockComponent";
import { TamingComponent, TamingComponentArray, TamingComponentParams } from "./server-components/TamingComponent";
import { LootComponent, LootComponentArray, LootComponentParams } from "./server-components/LootComponent";
import { GlurbSegmentComponent, GlurbSegmentComponentArray, GlurbSegmentComponentParams } from "./server-components/GlurbSegmentComponent";
import { GlurbBodySegmentComponent, GlurbBodySegmentComponentArray, GlurbBodySegmentComponentParams } from "./server-components/GlurbBodySegmentComponent";
import { FleshSwordComponent, FleshSwordComponentArray, FleshSwordComponentParams } from "./server-components/FleshSwordComponent";
import { MossComponent, MossComponentArray, MossComponentParams } from "./server-components/MossComponent";
import { ClientComponentType } from "./client-component-types";
import { BallistaFrostcicleComponentArray } from "./client-components/BallistaFrostcicleComponent";
import { BallistaRockComponentArray } from "./client-components/BallistaRockComponent";
import { BallistaSlimeballComponentArray } from "./client-components/BallistaSlimeballComponent";
import { BallistaWoodenBoltComponentArray } from "./client-components/BallistaWoodenBoltComponent";
import { EmbrasureComponentArray } from "./client-components/EmbrasureComponent";
import { EquipmentComponentArray } from "./client-components/EquipmentComponent";
import { FootprintComponentArray } from "./client-components/FootprintComponent";
import { FrostshaperComponentArray } from "./client-components/FrostshaperComponent";
import { GlurbTailSegmentComponentArray } from "./client-components/GlurbTailSegmentComponent";
import { LilypadComponentArray } from "./client-components/LilypadComponent";
import { RandomSoundComponentArray } from "./client-components/RandomSoundComponent";
import { RegularSpikesComponentArray } from "./client-components/RegularSpikesComponent";
import { StonecarvingTableComponentArray } from "./client-components/StonecarvingTableComponent";
import { ThrownBattleaxeComponentArray } from "./client-components/ThrownBattleaxeComponent";
import { WallComponentArray } from "./client-components/WallComponent";
import { WarriorHutComponentArray } from "./client-components/WarriorHutComponent";
import { WoodenArrowComponentArray } from "./client-components/WoodenArrowComponent";
import { WorkbenchComponentArray } from "./client-components/WorkbenchComponent";
import { WorkerHutComponentArray } from "./client-components/WorkerHutComponent";
import { GlurbComponent, GlurbComponentArray, GlurbComponentParams } from "./server-components/GlurbComponent";
import { FloorSignComponent, FloorSignComponentArray, FloorSignComponentParams } from "./server-components/FloorSignComponent";
import { DesertBushLivelyComponent, DesertBushLivelyComponentArray, DesertBushLivelyComponentParams } from "./server-components/DesertBushLivelyComponent";
import { DesertBushSandyComponent, DesertBushSandyComponentArray, DesertBushSandyComponentParams } from "./server-components/DesertBushSandyComponent";
import { AutoSpawnedComponent, AutoSpawnedComponentArray, AutoSpawnedComponentParams } from "./server-components/AutoSpawnedComponent";
import { DesertSmallWeedComponent, DesertSmallWeedComponentArray, DesertSmallWeedComponentParams } from "./server-components/DesertSmallWeedComponent";
import { DesertShrubComponent, DesertShrubComponentArray, DesertShrubComponentParams } from "./server-components/DesertShrubComponent";
import { TumbleweedLiveComponent, TumbleweedLiveComponentArray, TumbleweedLiveComponentParams } from "./server-components/TumbleweedLiveComponent";
import { TumbleweedDeadComponent, TumbleweedDeadComponentArray, TumbleweedDeadComponentParams } from "./server-components/TumbleweedDeadComponent";
import { PalmTreeComponent, PalmTreeComponentArray, PalmTreeComponentParams } from "./server-components/PalmTreeComponent";
import { PricklyPearComponent, PricklyPearComponentArray, PricklyPearComponentParams } from "./server-components/PricklyPearComponent";
import { PricklyPearFragmentProjectileComponent, PricklyPearFragmentProjectileComponentArray, PricklyPearFragmentProjectileComponentParams } from "./server-components/PricklyPearFragmentProjectileComponent";
import { HungerComponent, HungerComponentArray, HungerComponentParams } from "./server-components/HungerComponent";
import { EnergyStoreComponent, EnergyStoreComponentArray, EnergyStoreComponentParams } from "./server-components/EnergyStoreComponent";
import { DustfleaComponent, DustfleaComponentArray, DustfleaComponentParams } from "./server-components/DustfleaComponent";
import { SandstoneRockComponent, SandstoneRockComponentArray, SandstoneRockComponentParams } from "./server-components/SandstoneRockComponent";
import { OkrenComponent, OkrenComponentArray, OkrenComponentParams } from "./server-components/OkrenComponent";
import { DustfleaMorphCocoonComponent, DustfleaMorphCocoonComponentArray, DustfleaMorphCocoonComponentParams } from "./server-components/DustfleaMorphCocoonComponent";

// @cleanup: same as below
const ClientComponentArrayRecord: Record<ClientComponentType, object> = {
   [ClientComponentType.equipment]: EquipmentComponentArray,
   [ClientComponentType.footprint]: FootprintComponentArray,
   [ClientComponentType.randomSound]: RandomSoundComponentArray,
   [ClientComponentType.embrasure]: EmbrasureComponentArray,
   [ClientComponentType.frostshaper]: FrostshaperComponentArray,
   [ClientComponentType.lilypad]: LilypadComponentArray,
   [ClientComponentType.regularSpikes]: RegularSpikesComponentArray,
   [ClientComponentType.stonecarvingTable]: StonecarvingTableComponentArray,
   [ClientComponentType.wall]: WallComponentArray,
   [ClientComponentType.warriorHut]: WarriorHutComponentArray,
   [ClientComponentType.workbench]: WorkbenchComponentArray,
   [ClientComponentType.workerHut]: WorkerHutComponentArray,
   [ClientComponentType.ballistaFrostcicle]: BallistaFrostcicleComponentArray,
   [ClientComponentType.ballistaRock]: BallistaRockComponentArray,
   [ClientComponentType.ballistaSlimeball]: BallistaSlimeballComponentArray,
   [ClientComponentType.ballistaWoodenBolt]: BallistaWoodenBoltComponentArray,
   [ClientComponentType.thrownBattleaxe]: ThrownBattleaxeComponentArray,
   [ClientComponentType.woodenArrow]: WoodenArrowComponentArray,
   [ClientComponentType.glurbTailSegment]: GlurbTailSegmentComponentArray,
}

// @Cleanup: make this use ServerComponentArray instead 
// Just used to make sure all the components are properly imported (so they aren't removed by webpack)
const ServerComponentArrayRecord: Record<ServerComponentType, object> = {
   [ServerComponentType.transform]: TransformComponentArray,
   [ServerComponentType.cow]: CowComponentArray,
   [ServerComponentType.turret]: TurretComponentArray,
   [ServerComponentType.tribe]: TribeComponentArray,
   [ServerComponentType.inventory]: InventoryComponentArray,
   [ServerComponentType.ammoBox]: AmmoBoxComponentArray,
   [ServerComponentType.slime]: SlimeComponentArray,
   [ServerComponentType.golem]: GolemComponentArray,
   [ServerComponentType.statusEffect]: StatusEffectComponentArray,
   [ServerComponentType.cactus]: CactusComponentArray,
   [ServerComponentType.health]: HealthComponentArray,
   [ServerComponentType.physics]: PhysicsComponentArray,
   [ServerComponentType.researchBench]: ResearchBenchComponentArray,
   [ServerComponentType.berryBush]: BerryBushComponentArray,
   [ServerComponentType.inventoryUse]: InventoryUseComponentArray,
   [ServerComponentType.zombie]: ZombieComponentArray,
   [ServerComponentType.player]: PlayerComponentArray,
   [ServerComponentType.item]: ItemComponentArray,
   [ServerComponentType.fleshSwordItem]: FleshSwordComponentArray,
   [ServerComponentType.tombstone]: TombstoneComponentArray,
   [ServerComponentType.tree]: TreeComponentArray,
   [ServerComponentType.blueprint]: BlueprintComponentArray,
   [ServerComponentType.projectile]: ProjectileComponentArray,
   [ServerComponentType.iceArrow]: IceArrowComponentArray,
   [ServerComponentType.yeti]: YetiComponentArray,
   [ServerComponentType.frozenYeti]: FrozenYetiComponentArray,
   [ServerComponentType.totemBanner]: TotemBannerComponentArray,
   [ServerComponentType.cooking]: CookingComponentArray,
   [ServerComponentType.hut]: HutComponentArray,
   [ServerComponentType.snowball]: SnowballComponentArray,
   [ServerComponentType.fish]: FishComponentArray,
   [ServerComponentType.rockSpike]: RockSpikeComponentArray,
   [ServerComponentType.slimeSpit]: SlimeSpitComponentArray,
   [ServerComponentType.door]: DoorComponentArray,
   [ServerComponentType.tribesman]: TribesmanComponentArray,
   [ServerComponentType.tribesmanAI]: TribesmanAIComponentArray,
   [ServerComponentType.tunnel]: TunnelComponentArray,
   [ServerComponentType.buildingMaterial]: BuildingMaterialComponentArray,
   [ServerComponentType.spikes]: SpikesComponentArray,
   [ServerComponentType.punjiSticks]: PunjiSticksComponentArray,
   [ServerComponentType.tribeMember]: TribeMemberComponentArray,
   [ServerComponentType.healingTotem]: HealingTotemComponentArray,
   [ServerComponentType.planterBox]: PlanterBoxComponentArray,
   [ServerComponentType.planted]: PlantedComponentArray,
   [ServerComponentType.treePlanted]: TreePlantedComponentArray,
   [ServerComponentType.berryBushPlanted]: BerryBushPlantedComponentArray,
   [ServerComponentType.iceSpikesPlanted]: IceSpikesPlantedComponentArray,
   [ServerComponentType.structure]: StructureComponentArray,
   [ServerComponentType.fence]: FenceComponentArray,
   [ServerComponentType.fenceGate]: FenceGateComponentArray,
   [ServerComponentType.craftingStation]: CraftingStationComponentArray,
   [ServerComponentType.aiHelper]: AIHelperComponentArray,
   [ServerComponentType.boulder]: BoulderComponentArray,
   [ServerComponentType.iceShard]: IceShardComponentArray,
   [ServerComponentType.iceSpikes]: IceSpikesComponentArray,
   [ServerComponentType.pebblum]: PebblumComponentArray,
   [ServerComponentType.slimewisp]: SlimewispComponentArray,
   [ServerComponentType.throwingProjectile]: ThrowingProjectileComponentArray,
   [ServerComponentType.tribeWarrior]: TribeWarriorComponentArray,
   [ServerComponentType.layeredRod]: LayeredRodComponentArray,
   [ServerComponentType.decoration]: DecorationComponentArray,
   [ServerComponentType.spitPoisonArea]: SpitPoisonAreaComponentArray,
   [ServerComponentType.battleaxeProjectile]: BattleaxeProjectileComponentArray,
   [ServerComponentType.spearProjectile]: SpearProjectileComponentArray,
   [ServerComponentType.krumblid]: KrumblidComponentArray,
   [ServerComponentType.guardian]: GuardianComponentArray,
   [ServerComponentType.guardianGemQuake]: GuardianGemQuakeComponentArray,
   [ServerComponentType.guardianGemFragmentProjectile]: GuardianGemFragmentProjectileComponentArray,
   [ServerComponentType.guardianSpikyBall]: GuardianSpikyBallComponentArray,
   [ServerComponentType.bracings]: BracingsComponentArray,
   [ServerComponentType.ballista]: BallistaComponentArray,
   [ServerComponentType.slingTurret]: SlingTurretComponentArray,
   [ServerComponentType.barrel]: BarrelComponentArray,
   [ServerComponentType.campfire]: CampfireComponentArray,
   [ServerComponentType.furnace]: FurnaceComponentArray,
   [ServerComponentType.fireTorch]: FireTorchComponentArray,
   [ServerComponentType.spikyBastard]: SpikyBastardComponentArray,
   [ServerComponentType.glurb]: GlurbComponentArray,
   [ServerComponentType.glurbSegment]: GlurbSegmentComponentArray,
   [ServerComponentType.glurbBodySegment]: GlurbBodySegmentComponentArray,
   [ServerComponentType.glurbHeadSegment]: GlurbHeadSegmentComponentArray,
   [ServerComponentType.slurbTorch]: SlurbTorchComponentArray,
   [ServerComponentType.attackingEntities]: AttackingEntitiesComponentArray,
   [ServerComponentType.aiAssignment]: AIAssignmentComponentArray,
   [ServerComponentType.treeRootBase]: TreeRootBaseComponentArray,
   [ServerComponentType.treeRootSegment]: TreeRootSegmentComponentArray,
   [ServerComponentType.mithrilOreNode]: MithrilOreNodeComponentArray,
   [ServerComponentType.scrappy]: ScrappyComponentArray,
   [ServerComponentType.cogwalker]: CogwalkerComponentArray,
   [ServerComponentType.automatonAssembler]: AutomatonAssemblerComponentArray,
   [ServerComponentType.mithrilAnvil]: MithrilAnvilComponentArray,
   [ServerComponentType.rideable]: RideableComponentArray,
   [ServerComponentType.swingAttack]: SwingAttackComponentArray,
   [ServerComponentType.blockAttack]: BlockAttackComponentArray,
   [ServerComponentType.slingTurretRock]: SlingTurretRockComponentArray,
   [ServerComponentType.taming]: TamingComponentArray,
   [ServerComponentType.loot]: LootComponentArray,
   [ServerComponentType.moss]: MossComponentArray,
   [ServerComponentType.floorSign]: FloorSignComponentArray,
   [ServerComponentType.desertBushLively]: DesertBushLivelyComponentArray,
   [ServerComponentType.desertBushSandy]: DesertBushSandyComponentArray,
   [ServerComponentType.autoSpawned]: AutoSpawnedComponentArray,
   [ServerComponentType.desertSmallWeed]: DesertSmallWeedComponentArray,
   [ServerComponentType.desertShrub]: DesertShrubComponentArray,
   [ServerComponentType.tumbleweedLive]: TumbleweedLiveComponentArray,
   [ServerComponentType.tumbleweedDead]: TumbleweedDeadComponentArray,
   [ServerComponentType.palmTree]: PalmTreeComponentArray,
   [ServerComponentType.pricklyPear]: PricklyPearComponentArray,
   [ServerComponentType.pricklyPearFragmentProjectile]: PricklyPearFragmentProjectileComponentArray,
   [ServerComponentType.hunger]: HungerComponentArray,
   [ServerComponentType.energyStore]: EnergyStoreComponentArray,
   [ServerComponentType.dustflea]: DustfleaComponentArray,
   [ServerComponentType.sandstoneRock]: SandstoneRockComponentArray,
   [ServerComponentType.okren]: OkrenComponentArray,
   [ServerComponentType.dustfleaMorphCocoon]: DustfleaMorphCocoonComponentArray,
};

const ServerComponentRecord = {
   [ServerComponentType.transform]: (): TransformComponent => 0 as any,
   [ServerComponentType.cow]: (): CowComponent => 0 as any,
   [ServerComponentType.turret]: (): TurretComponent => 0 as any,
   [ServerComponentType.tribe]: (): TribeComponent => 0 as any,
   [ServerComponentType.inventory]: (): InventoryComponent => 0 as any,
   [ServerComponentType.ammoBox]: (): AmmoBoxComponent => 0 as any,
   [ServerComponentType.slime]: (): SlimeComponent => 0 as any,
   [ServerComponentType.golem]: (): GolemComponent => 0 as any,
   [ServerComponentType.statusEffect]: (): StatusEffectComponent => 0 as any,
   [ServerComponentType.cactus]: (): CactusComponent => 0 as any,
   [ServerComponentType.health]: (): HealthComponent => 0 as any,
   [ServerComponentType.physics]: (): PhysicsComponent => 0 as any,
   [ServerComponentType.researchBench]: (): ResearchBenchComponent => 0 as any,
   [ServerComponentType.berryBush]: (): BerryBushComponent => 0 as any,
   [ServerComponentType.inventoryUse]: (): InventoryUseComponent => 0 as any,
   [ServerComponentType.zombie]: (): ZombieComponent => 0 as any,
   [ServerComponentType.player]: (): PlayerComponent => 0 as any,
   [ServerComponentType.item]: (): ItemComponent => 0 as any,
   [ServerComponentType.fleshSwordItem]: (): FleshSwordComponent => 0 as any,
   [ServerComponentType.tombstone]: (): TombstoneComponent => 0 as any,
   [ServerComponentType.tree]: (): TreeComponent => 0 as any,
   [ServerComponentType.blueprint]: (): BlueprintComponent => 0 as any,
   [ServerComponentType.projectile]: (): ProjectileComponent => 0 as any,
   [ServerComponentType.iceArrow]: (): IceArrowComponent => 0 as any,
   [ServerComponentType.yeti]: (): YetiComponent => 0 as any,
   [ServerComponentType.frozenYeti]: (): FrozenYetiComponent => 0 as any,
   [ServerComponentType.totemBanner]: (): TotemBannerComponent => 0 as any,
   [ServerComponentType.cooking]: (): CookingComponent => 0 as any,
   [ServerComponentType.hut]: (): HutComponent => 0 as any,
   [ServerComponentType.snowball]: (): SnowballComponent => 0 as any,
   [ServerComponentType.fish]: (): FishComponent => 0 as any,
   [ServerComponentType.rockSpike]: (): RockSpikeComponent => 0 as any,
   [ServerComponentType.slimeSpit]: (): SlimeSpitComponent => 0 as any,
   [ServerComponentType.door]: (): DoorComponent => 0 as any,
   [ServerComponentType.tribesman]: (): TribesmanComponent => 0 as any,
   [ServerComponentType.tribesmanAI]: (): TribesmanAIComponent => 0 as any,
   [ServerComponentType.tunnel]: (): TunnelComponent => 0 as any,
   [ServerComponentType.buildingMaterial]: (): BuildingMaterialComponent => 0 as any,
   [ServerComponentType.spikes]: (): SpikesComponent => 0 as any,
   [ServerComponentType.punjiSticks]: (): PunjiSticksComponent => 0 as any,
   [ServerComponentType.tribeMember]: (): TribeMemberComponent => 0 as any,
   [ServerComponentType.healingTotem]: (): HealingTotemComponent => 0 as any,
   [ServerComponentType.planterBox]: (): PlanterBoxComponent => 0 as any,
   [ServerComponentType.planted]: (): PlantedComponent => 0 as any,
   [ServerComponentType.treePlanted]: (): TreePlantedComponent => 0 as any,
   [ServerComponentType.berryBushPlanted]: (): BerryBushPlantedComponent => 0 as any,
   [ServerComponentType.iceSpikesPlanted]: (): IceSpikesPlantedComponent => 0 as any,
   [ServerComponentType.structure]: (): StructureComponent => 0 as any,
   [ServerComponentType.fence]: (): FenceComponent => 0 as any,
   [ServerComponentType.fenceGate]: (): FenceGateComponent => 0 as any,
   [ServerComponentType.craftingStation]: (): CraftingStationComponent => 0 as any,
   [ServerComponentType.aiHelper]: (): AIHelperComponent => 0 as any,
   [ServerComponentType.boulder]: (): BoulderComponent => 0 as any,
   [ServerComponentType.iceShard]: (): IceShardComponent => 0 as any,
   [ServerComponentType.iceSpikes]: (): IceSpikesComponent => 0 as any,
   [ServerComponentType.pebblum]: (): PebblumComponent => 0 as any,
   [ServerComponentType.slimewisp]: (): SlimewispComponent => 0 as any,
   [ServerComponentType.throwingProjectile]: (): ThrowingProjectileComponent => 0 as any,
   [ServerComponentType.tribeWarrior]: (): TribeWarriorComponent => 0 as any,
   [ServerComponentType.layeredRod]: (): LayeredRodComponent => 0 as any,
   [ServerComponentType.decoration]: (): DecorationComponent => 0 as any,
   [ServerComponentType.spitPoisonArea]: (): SpitPoisonAreaComponent => 0 as any,
   [ServerComponentType.battleaxeProjectile]: (): BattleaxeProjectileComponent => 0 as any,
   [ServerComponentType.spearProjectile]: (): SpearProjectileComponent => 0 as any,
   [ServerComponentType.krumblid]: (): KrumblidComponent => 0 as any,
   [ServerComponentType.guardian]: (): GuardianComponent => 0 as any,
   [ServerComponentType.guardianGemQuake]: (): GuardianGemQuakeComponent => 0 as any,
   [ServerComponentType.guardianGemFragmentProjectile]: (): GuardianGemFragmentProjectileComponent => 0 as any,
   [ServerComponentType.guardianSpikyBall]: (): GuardianSpikyBallComponent => 0 as any,
   [ServerComponentType.bracings]: (): BracingsComponent => 0 as any,
   [ServerComponentType.ballista]: (): BallistaComponent => 0 as any,
   [ServerComponentType.slingTurret]: (): SlingTurretComponent => 0 as any,
   [ServerComponentType.barrel]: (): BarrelComponent => 0 as any,
   [ServerComponentType.campfire]: (): CampfireComponent => 0 as any,
   [ServerComponentType.furnace]: (): FurnaceComponent => 0 as any,
   [ServerComponentType.fireTorch]: (): FireTorchComponent => 0 as any,
   [ServerComponentType.spikyBastard]: (): SpikyBastardComponent => 0 as any,
   [ServerComponentType.glurb]: (): GlurbComponent => 0 as any,
   [ServerComponentType.glurbSegment]: (): GlurbSegmentComponent => 0 as any,
   [ServerComponentType.glurbBodySegment]: (): GlurbBodySegmentComponent => 0 as any,
   [ServerComponentType.glurbHeadSegment]: (): GlurbHeadSegmentComponent => 0 as any,
   [ServerComponentType.slurbTorch]: (): SlurbTorchComponent => 0 as any,
   [ServerComponentType.attackingEntities]: (): AttackingEntitiesComponent => 0 as any,
   [ServerComponentType.aiAssignment]: (): AIAssignmentComponent => 0 as any,
   [ServerComponentType.treeRootBase]: (): TreeRootBaseComponent => 0 as any,
   [ServerComponentType.treeRootSegment]: (): TreeRootSegmentComponent => 0 as any,
   [ServerComponentType.mithrilOreNode]: (): MithrilOreNodeComponent => 0 as any,
   [ServerComponentType.scrappy]: (): ScrappyComponent => 0 as any,
   [ServerComponentType.cogwalker]: (): CogwalkerComponent => 0 as any,
   [ServerComponentType.automatonAssembler]: (): AutomatonAssemblerComponent => 0 as any,
   [ServerComponentType.mithrilAnvil]: (): MithrilAnvilComponent => 0 as any,
   [ServerComponentType.rideable]: (): RideableComponent => 0 as any,
   [ServerComponentType.swingAttack]: (): SwingAttackComponent => 0 as any,
   [ServerComponentType.blockAttack]: (): BlockAttackComponent => 0 as any,
   [ServerComponentType.slingTurretRock]: (): SlingTurretRockComponent => 0 as any,
   [ServerComponentType.taming]: (): TamingComponent => 0 as any,
   [ServerComponentType.loot]: (): LootComponent => 0 as any,
   [ServerComponentType.moss]: (): MossComponent => 0 as any,
   [ServerComponentType.floorSign]: (): FloorSignComponent => 0 as any,
   [ServerComponentType.desertBushLively]: (): DesertBushLivelyComponent => 0 as any,
   [ServerComponentType.desertBushSandy]: (): DesertBushSandyComponent => 0 as any,
   [ServerComponentType.autoSpawned]: (): AutoSpawnedComponent => 0 as any,
   [ServerComponentType.desertSmallWeed]: (): DesertSmallWeedComponent => 0 as any,
   [ServerComponentType.desertShrub]: (): DesertShrubComponent => 0 as any,
   [ServerComponentType.tumbleweedLive]: (): TumbleweedLiveComponent => 0 as any,
   [ServerComponentType.tumbleweedDead]: (): TumbleweedDeadComponent => 0 as any,
   [ServerComponentType.palmTree]: (): PalmTreeComponent => 0 as any,
   [ServerComponentType.pricklyPear]: (): PricklyPearComponent => 0 as any,
   [ServerComponentType.pricklyPearFragmentProjectile]: (): PricklyPearFragmentProjectileComponent => 0 as any,
   [ServerComponentType.hunger]: (): HungerComponent => 0 as any,
   [ServerComponentType.energyStore]: (): EnergyStoreComponent => 0 as any,
   [ServerComponentType.dustflea]: (): DustfleaComponent => 0 as any,
   [ServerComponentType.sandstoneRock]: (): SandstoneRockComponent => 0 as any,
   [ServerComponentType.okren]: (): OkrenComponent => 0 as any,
   [ServerComponentType.dustfleaMorphCocoon]: (): DustfleaMorphCocoonComponent => 0 as any,
} satisfies Record<ServerComponentType, () => unknown>;

export type ServerComponent<T extends ServerComponentType> = ReturnType<typeof ServerComponentRecord[T]>;

const ServerComponentParamsRecord = {
   [ServerComponentType.transform]: (): TransformComponentParams => 0 as any,
   [ServerComponentType.cow]: (): CowComponentParams => 0 as any,
   [ServerComponentType.turret]: (): TurretComponentParams => 0 as any,
   [ServerComponentType.tribe]: (): TribeComponentParams => 0 as any,
   [ServerComponentType.inventory]: (): InventoryComponentParams => 0 as any,
   [ServerComponentType.ammoBox]: (): AmmoBoxComponentParams => 0 as any,
   [ServerComponentType.slime]: (): SlimeComponentParams => 0 as any,
   [ServerComponentType.golem]: (): GolemComponentParams => 0 as any,
   [ServerComponentType.statusEffect]: (): StatusEffectComponentParams => 0 as any,
   [ServerComponentType.cactus]: (): CactusComponentParams => 0 as any,
   [ServerComponentType.health]: (): HealthComponentParams => 0 as any,
   [ServerComponentType.physics]: (): PhysicsComponentParams => 0 as any,
   [ServerComponentType.researchBench]: (): ResearchBenchComponentParams => 0 as any,
   [ServerComponentType.berryBush]: (): BerryBushComponentParams => 0 as any,
   [ServerComponentType.inventoryUse]: (): InventoryUseComponentParams => 0 as any,
   [ServerComponentType.zombie]: (): ZombieComponentParams => 0 as any,
   [ServerComponentType.player]: (): PlayerComponentParams => 0 as any,
   [ServerComponentType.item]: (): ItemComponentParams => 0 as any,
   [ServerComponentType.fleshSwordItem]: (): FleshSwordComponentParams => 0 as any,
   [ServerComponentType.tombstone]: (): TombstoneComponentParams => 0 as any,
   [ServerComponentType.tree]: (): TreeComponentParams => 0 as any,
   [ServerComponentType.blueprint]: (): BlueprintComponentParams => 0 as any,
   [ServerComponentType.projectile]: (): ProjectileComponentParams => 0 as any,
   [ServerComponentType.iceArrow]: (): IceArrowComponentParams => 0 as any,
   [ServerComponentType.yeti]: (): YetiComponentParams => 0 as any,
   [ServerComponentType.frozenYeti]: (): FrozenYetiComponentParams => 0 as any,
   [ServerComponentType.totemBanner]: (): TotemBannerComponentParams => 0 as any,
   [ServerComponentType.cooking]: (): CookingComponentParams => 0 as any,
   [ServerComponentType.hut]: (): HutComponentParams => 0 as any,
   [ServerComponentType.snowball]: (): SnowballComponentParams => 0 as any,
   [ServerComponentType.fish]: (): FishComponentParams => 0 as any,
   [ServerComponentType.rockSpike]: (): RockSpikeComponentParams => 0 as any,
   [ServerComponentType.slimeSpit]: (): SlimeSpitComponentParams => 0 as any,
   [ServerComponentType.door]: (): DoorComponentParams => 0 as any,
   [ServerComponentType.tribesman]: (): TribesmanComponentParams => 0 as any,
   [ServerComponentType.tribesmanAI]: (): TribesmanAIComponentParams => 0 as any,
   [ServerComponentType.tunnel]: (): TunnelComponentParams => 0 as any,
   [ServerComponentType.buildingMaterial]: (): BuildingMaterialComponentParams => 0 as any,
   [ServerComponentType.spikes]: (): SpikesComponentParams => 0 as any,
   [ServerComponentType.punjiSticks]: (): PunjiSticksComponentParams => 0 as any,
   [ServerComponentType.tribeMember]: (): TribeMemberComponentParams => 0 as any,
   [ServerComponentType.healingTotem]: (): HealingTotemComponentParams => 0 as any,
   [ServerComponentType.planterBox]: (): PlanterBoxComponentParams => 0 as any,
   [ServerComponentType.planted]: (): PlantedComponentParams => 0 as any,
   [ServerComponentType.treePlanted]: (): TreePlantedComponentParams => 0 as any,
   [ServerComponentType.berryBushPlanted]: (): BerryBushPlantedComponentParams => 0 as any,
   [ServerComponentType.iceSpikesPlanted]: (): IceSpikesPlantedComponentParams => 0 as any,
   [ServerComponentType.structure]: (): StructureComponentParams => 0 as any,
   [ServerComponentType.fence]: (): FenceComponentParams => 0 as any,
   [ServerComponentType.fenceGate]: (): FenceGateComponentParams => 0 as any,
   [ServerComponentType.craftingStation]: (): CraftingStationComponentParams => 0 as any,
   [ServerComponentType.aiHelper]: (): AIHelperComponentParams => 0 as any,
   [ServerComponentType.boulder]: (): BoulderComponentParams => 0 as any,
   [ServerComponentType.iceShard]: (): IceShardComponentParams => 0 as any,
   [ServerComponentType.iceSpikes]: (): IceSpikesComponentParams => 0 as any,
   [ServerComponentType.pebblum]: (): PebblumComponentParams => 0 as any,
   [ServerComponentType.slimewisp]: (): SlimewispComponentParams => 0 as any,
   [ServerComponentType.throwingProjectile]: (): ThrowingProjectileComponentParams => 0 as any,
   [ServerComponentType.tribeWarrior]: (): TribeWarriorComponentParams => 0 as any,
   [ServerComponentType.layeredRod]: (): LayeredRodComponentParams => 0 as any,
   [ServerComponentType.decoration]: (): DecorationComponentParams => 0 as any,
   [ServerComponentType.spitPoisonArea]: (): SpitPoisonAreaComponentParams => 0 as any,
   [ServerComponentType.battleaxeProjectile]: (): BattleaxeProjectileComponentParams => 0 as any,
   [ServerComponentType.spearProjectile]: (): SpearProjectileComponentParams => 0 as any,
   [ServerComponentType.krumblid]: (): KrumblidComponentParams => 0 as any,
   [ServerComponentType.guardian]: (): GuardianComponentParams => 0 as any,
   [ServerComponentType.guardianGemQuake]: (): GuardianGemQuakeComponentParams => 0 as any,
   [ServerComponentType.guardianGemFragmentProjectile]: (): GuardianGemFragmentProjectileComponentParams => 0 as any,
   [ServerComponentType.guardianSpikyBall]: (): GuardianSpikyBallComponentParams => 0 as any,
   [ServerComponentType.bracings]: (): BracingsComponentParams => 0 as any,
   [ServerComponentType.ballista]: (): BallistaComponentParams => 0 as any,
   [ServerComponentType.slingTurret]: (): SlingTurretComponentParams => 0 as any,
   [ServerComponentType.barrel]: (): BarrelComponentParams => 0 as any,
   [ServerComponentType.campfire]: (): CampfireComponentParams => 0 as any,
   [ServerComponentType.furnace]: (): FurnaceComponentParams => 0 as any,
   [ServerComponentType.fireTorch]: (): FireTorchComponentParams => 0 as any,
   [ServerComponentType.spikyBastard]: (): SpikyBastardComponentParams => 0 as any,
   [ServerComponentType.glurb]: (): GlurbComponentParams => 0 as any,
   [ServerComponentType.glurbSegment]: (): GlurbSegmentComponentParams => 0 as any,
   [ServerComponentType.glurbBodySegment]: (): GlurbBodySegmentComponentParams => 0 as any,
   [ServerComponentType.glurbHeadSegment]: (): GlurbHeadSegmentComponentParams => 0 as any,
   [ServerComponentType.slurbTorch]: (): SlurbTorchComponentParams => 0 as any,
   [ServerComponentType.attackingEntities]: (): AttackingEntitiesComponentParams => 0 as any,
   [ServerComponentType.aiAssignment]: (): AIAssignmentComponentParams => 0 as any,
   [ServerComponentType.treeRootBase]: (): TreeRootBaseComponentParams => 0 as any,
   [ServerComponentType.treeRootSegment]: (): TreeRootSegmentComponentParams => 0 as any,
   [ServerComponentType.mithrilOreNode]: (): MithrilOreNodeComponentParams => 0 as any,
   [ServerComponentType.scrappy]: (): ScrappyComponentParams => 0 as any,
   [ServerComponentType.cogwalker]: (): CogwalkerComponentParams => 0 as any,
   [ServerComponentType.automatonAssembler]: (): AutomatonAssemblerComponentParams => 0 as any,
   [ServerComponentType.mithrilAnvil]: (): MithrilAnvilComponentParams => 0 as any,
   [ServerComponentType.rideable]: (): RideableComponentParams => 0 as any,
   [ServerComponentType.swingAttack]: (): SwingAttackComponentParams => 0 as any,
   [ServerComponentType.blockAttack]: (): BlockAttackComponentParams => 0 as any,
   [ServerComponentType.slingTurretRock]: (): SlingTurretRockComponentParams => 0 as any,
   [ServerComponentType.taming]: (): TamingComponentParams => 0 as any,
   [ServerComponentType.loot]: (): LootComponentParams => 0 as any,
   [ServerComponentType.moss]: (): MossComponentParams => 0 as any,
   [ServerComponentType.floorSign]: (): FloorSignComponentParams => 0 as any,
   [ServerComponentType.desertBushLively]: (): DesertBushLivelyComponentParams => 0 as any,
   [ServerComponentType.desertBushSandy]: (): DesertBushSandyComponentParams => 0 as any,
   [ServerComponentType.autoSpawned]: (): AutoSpawnedComponentParams => 0 as any,
   [ServerComponentType.desertSmallWeed]: (): DesertSmallWeedComponentParams => 0 as any,
   [ServerComponentType.desertShrub]: (): DesertShrubComponentParams => 0 as any,
   [ServerComponentType.tumbleweedLive]: (): TumbleweedLiveComponentParams => 0 as any,
   [ServerComponentType.tumbleweedDead]: (): TumbleweedDeadComponentParams => 0 as any,
   [ServerComponentType.palmTree]: (): PalmTreeComponentParams => 0 as any,
   [ServerComponentType.pricklyPear]: (): PricklyPearComponentParams => 0 as any,
   [ServerComponentType.pricklyPearFragmentProjectile]: (): PricklyPearFragmentProjectileComponentParams => 0 as any,
   [ServerComponentType.hunger]: (): HungerComponentParams => 0 as any,
   [ServerComponentType.energyStore]: (): EnergyStoreComponentParams => 0 as any,
   [ServerComponentType.dustflea]: (): DustfleaComponentParams => 0 as any,
   [ServerComponentType.sandstoneRock]: (): SandstoneRockComponentParams => 0 as any,
   [ServerComponentType.okren]: (): OkrenComponentParams => 0 as any,
   [ServerComponentType.dustfleaMorphCocoon]: (): DustfleaMorphCocoonComponentParams => 0 as any,
} satisfies Record<ServerComponentType, object>;

export type ServerComponentParams<T extends ServerComponentType> = ReturnType<typeof ServerComponentParamsRecord[T]>;