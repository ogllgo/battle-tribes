import { ServerComponentType } from "../../../shared/src/components";
import { AIAssignmentComponentArray, AIAssignmentComponentParams } from "./server-components/AIAssignmentComponent";
import { AIHelperComponentArray, AIHelperComponentParams } from "./server-components/AIHelperComponent";
import { AmmoBoxComponentArray, AmmoBoxComponentParams } from "./server-components/AmmoBoxComponent";
import { ProjectileComponentArray, ProjectileComponentParams } from "./server-components/ArrowComponent";
import { AttackingEntitiesComponentArray, AttackingEntitiesComponentParams } from "./server-components/AttackingEntitiesComponent";
import { BallistaComponentArray, BallistaComponentParams } from "./server-components/BallistaComponent";
import { BarrelComponentArray, BarrelComponentParams } from "./server-components/BarrelComponent";
import { BattleaxeProjectileComponentArray, BattleaxeProjectileComponentParams } from "./server-components/BattleaxeProjectileComponent";
import { BerryBushComponentArray, BerryBushComponentParams } from "./server-components/BerryBushComponent";
import { BerryBushPlantedComponentArray, BerryBushPlantedComponentParams } from "./server-components/BerryBushPlantedComponent";
import { BlueprintComponentArray, BlueprintComponentParams } from "./server-components/BlueprintComponent";
import { BoulderComponentArray, BoulderComponentParams } from "./server-components/BoulderComponent";
import { BracingsComponentArray, BracingsComponentParams } from "./server-components/BracingsComponent";
import { BuildingMaterialComponentArray, BuildingMaterialComponentParams } from "./server-components/BuildingMaterialComponent";
import { CactusComponentArray, CactusComponentParams } from "./server-components/CactusComponent";
import { CampfireComponentArray, CampfireComponentParams } from "./server-components/CampfireComponent";
import { CogwalkerComponentArray, CogwalkerComponentParams } from "./server-components/CogwalkerComponent";
import { CookingComponentArray, CookingComponentParams } from "./server-components/CookingComponent";
import { CowComponentArray, CowComponentParams } from "./server-components/CowComponent";
import { CraftingStationComponentArray, CraftingStationComponentParams } from "./server-components/CraftingStationComponent";
import { DamageBoxComponentArray, DamageBoxComponentParams } from "./server-components/DamageBoxComponent";
import { DecorationComponentArray, DecorationComponentParams } from "./server-components/DecorationComponent";
import { DoorComponentArray, DoorComponentParams } from "./server-components/DoorComponent";
import { EscapeAIComponentArray, EscapeAIComponentParams } from "./server-components/EscapeAIComponent";
import { FenceComponentArray, FenceComponentParams } from "./server-components/FenceComponent";
import { FenceGateComponentArray, FenceGateComponentParams } from "./server-components/FenceGateComponent";
import { FireTorchComponentArray, FireTorchComponentParams } from "./server-components/FireTorchComponent";
import { FishComponentArray, FishComponentParams } from "./server-components/FishComponent";
import { FollowAIComponentArray, FollowAIComponentParams } from "./server-components/FollowAIComponent";
import { FrozenYetiComponentArray, FrozenYetiComponentParams } from "./server-components/FrozenYetiComponent";
import { FurnaceComponentArray, FurnaceComponentParams } from "./server-components/FurnaceComponent";
import { GlurbComponentArray, GlurbComponentParams } from "./server-components/GlurbComponent";
import { GolemComponentArray, GolemComponentParams } from "./server-components/GolemComponent";
import { GuardianComponentArray, GuardianComponentParams } from "./server-components/GuardianComponent";
import { GuardianGemFragmentProjectileComponentArray, GuardianGemFragmentProjectileComponentParams } from "./server-components/GuardianGemFragmentProjectileComponent";
import { GuardianGemQuakeComponentArray, GuardianGemQuakeComponentParams } from "./server-components/GuardianGemQuakeComponent";
import { GuardianSpikyBallComponentArray, GuardianSpikyBallComponentParams } from "./server-components/GuardianSpikyBallComponent";
import { HealingTotemComponentArray, HealingTotemComponentParams } from "./server-components/HealingTotemComponent";
import { HealthComponentArray, HealthComponentParams } from "./server-components/HealthComponent";
import { HutComponentArray, HutComponentParams } from "./server-components/HutComponent";
import { IceArrowComponentArray, IceArrowComponentParams } from "./server-components/IceArrowComponent";
import { IceShardComponentArray, IceShardComponentParams } from "./server-components/IceShardComponent";
import { IceSpikesComponentArray, IceSpikesComponentParams } from "./server-components/IceSpikesComponent";
import { IceSpikesPlantedComponentArray, IceSpikesPlantedComponentParams } from "./server-components/IceSpikesPlantedComponent";
import { InventoryComponentArray, InventoryComponentParams } from "./server-components/InventoryComponent";
import { InventoryUseComponentArray, InventoryUseComponentParams } from "./server-components/InventoryUseComponent";
import { ItemComponentArray, ItemComponentParams } from "./server-components/ItemComponent";
import { KrumblidComponentArray, KrumblidComponentParams } from "./server-components/KrumblidComponent";
import { LayeredRodComponentArray, LayeredRodComponentParams } from "./server-components/LayeredRodComponent";
import { MithrilOreNodeComponentArray, MithrilOreNodeComponentParams } from "./server-components/MithrilOreNodeComponent";
import { PatrolAIComponentArray, PatrolAIComponentParams } from "./server-components/PatrolAIComponent";
import { PebblumComponentArray, PebblumComponentParams } from "./server-components/PebblumComponent";
import { PhysicsComponentArray, PhysicsComponentParams } from "./server-components/PhysicsComponent";
import { PlantedComponentArray, PlantedComponentParams } from "./server-components/PlantedComponent";
import { PlanterBoxComponentArray, PlanterBoxComponentParams } from "./server-components/PlanterBoxComponent";
import { PlayerComponentArray, PlayerComponentParams } from "./server-components/PlayerComponent";
import { PunjiSticksComponentArray, PunjiSticksComponentParams } from "./server-components/PunjiSticksComponent";
import { ResearchBenchComponentArray, ResearchBenchComponentParams } from "./server-components/ResearchBenchComponent";
import { RockSpikeComponentArray, RockSpikeComponentParams } from "./server-components/RockSpikeComponent";
import { ScrappyComponentArray, ScrappyComponentParams } from "./server-components/ScrappyComponent";
import { SlimeComponentArray, SlimeComponentParams } from "./server-components/SlimeComponent";
import { SlimeSpitComponentArray, SlimeSpitComponentParams } from "./server-components/SlimeSpitComponent";
import { SlimewispComponentArray, SlimewispComponentParams } from "./server-components/SlimewispComponent";
import { SlingTurretComponentArray, SlingTurretComponentParams } from "./server-components/SlingTurretComponent";
import { SlurbTorchComponentArray, SlurbTorchComponentParams } from "./server-components/SlurbTorchComponent";
import { SnowballComponentArray, SnowballComponentParams } from "./server-components/SnowballComponent";
import { SpearProjectileComponentArray, SpearProjectileComponentParams } from "./server-components/SpearProjectileComponent";
import { SpikesComponentArray, SpikesComponentParams } from "./server-components/SpikesComponent";
import { SpikyBastardComponentArray, SpikyBastardComponentParams } from "./server-components/SpikyBastardComponent";
import { SpitPoisonAreaComponentArray, SpitPoisonAreaComponentParams } from "./server-components/SpitPoisonAreaComponent";
import { StatusEffectComponentArray, StatusEffectComponentParams } from "./server-components/StatusEffectComponent";
import { StructureComponentArray, StructureComponentParams } from "./server-components/StructureComponent";
import { ThrowingProjectileComponentArray, ThrowingProjectileComponentParams } from "./server-components/ThrowingProjectileComponent";
import { TombstoneComponentArray, TombstoneComponentParams } from "./server-components/TombstoneComponent";
import { TotemBannerComponentArray, TotemBannerComponentParams } from "./server-components/TotemBannerComponent";
import { TransformComponentArray, TransformComponentParams } from "./server-components/TransformComponent";
import { TreeComponentArray, TreeComponentParams } from "./server-components/TreeComponent";
import { TreePlantedComponentArray, TreePlantedComponentParams } from "./server-components/TreePlantedComponent";
import { TreeRootBaseComponentArray, TreeRootBaseComponentParams } from "./server-components/TreeRootBaseComponent";
import { TreeRootSegmentComponentArray, TreeRootSegmentComponentParams } from "./server-components/TreeRootSegmentComponent";
import { TribeComponentArray, TribeComponentParams } from "./server-components/TribeComponent";
import { TribesmanComponentArray, TribesmanComponentParams } from "./server-components/TribesmanComponent";
import { TribesmanAIComponentArray, TribesmanAIComponentParams } from "./server-components/TribesmanAIComponent";
import { TribeWarriorComponentArray, TribeWarriorComponentParams } from "./server-components/TribeWarriorComponent";
import { TunnelComponentArray, TunnelComponentParams } from "./server-components/TunnelComponent";
import { TurretComponentArray, TurretComponentParams } from "./server-components/TurretComponent";
import { YetiComponentArray, YetiComponentParams } from "./server-components/YetiComponent";
import { ZombieComponentArray, ZombieComponentParams } from "./server-components/ZombieComponent";
import { TribeMemberComponentArray, TribeMemberComponentParams } from "./server-components/TribeMemberComponent";
import { AutomatonAssemblerComponentArray, AutomatonAssemblerComponentParams } from "./server-components/AutomatonAssemblerComponent";
import { MithrilAnvilComponentArray, MithrilAnvilComponentParams } from "./server-components/MithrilAnvilComponent";
import { RideableComponentArray, RideableComponentParams } from "./server-components/RideableComponent";

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
   [ServerComponentType.escapeAI]: EscapeAIComponentArray,
   [ServerComponentType.followAI]: FollowAIComponentArray,
   [ServerComponentType.tribeWarrior]: TribeWarriorComponentArray,
   [ServerComponentType.layeredRod]: LayeredRodComponentArray,
   [ServerComponentType.decoration]: DecorationComponentArray,
   [ServerComponentType.spitPoisonArea]: SpitPoisonAreaComponentArray,
   [ServerComponentType.battleaxeProjectile]: BattleaxeProjectileComponentArray,
   [ServerComponentType.spearProjectile]: SpearProjectileComponentArray,
   [ServerComponentType.krumblid]: KrumblidComponentArray,
   [ServerComponentType.damageBox]: DamageBoxComponentArray,
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
   [ServerComponentType.slurbTorch]: SlurbTorchComponentArray,
   [ServerComponentType.attackingEntities]: AttackingEntitiesComponentArray,
   [ServerComponentType.patrolAI]: PatrolAIComponentArray,
   [ServerComponentType.aiAssignment]: AIAssignmentComponentArray,
   [ServerComponentType.treeRootBase]: TreeRootBaseComponentArray,
   [ServerComponentType.treeRootSegment]: TreeRootSegmentComponentArray,
   [ServerComponentType.mithrilOreNode]: MithrilOreNodeComponentArray,
   [ServerComponentType.scrappy]: ScrappyComponentArray,
   [ServerComponentType.cogwalker]: CogwalkerComponentArray,
   [ServerComponentType.automatonAssembler]: AutomatonAssemblerComponentArray,
   [ServerComponentType.mithrilAnvil]: MithrilAnvilComponentArray,
   [ServerComponentType.rideable]: RideableComponentArray,
};

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
   [ServerComponentType.escapeAI]: (): EscapeAIComponentParams => 0 as any,
   [ServerComponentType.followAI]: (): FollowAIComponentParams => 0 as any,
   [ServerComponentType.tribeWarrior]: (): TribeWarriorComponentParams => 0 as any,
   [ServerComponentType.layeredRod]: (): LayeredRodComponentParams => 0 as any,
   [ServerComponentType.decoration]: (): DecorationComponentParams => 0 as any,
   [ServerComponentType.spitPoisonArea]: (): SpitPoisonAreaComponentParams => 0 as any,
   [ServerComponentType.battleaxeProjectile]: (): BattleaxeProjectileComponentParams => 0 as any,
   [ServerComponentType.spearProjectile]: (): SpearProjectileComponentParams => 0 as any,
   [ServerComponentType.krumblid]: (): KrumblidComponentParams => 0 as any,
   [ServerComponentType.damageBox]: (): DamageBoxComponentParams => 0 as any,
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
   [ServerComponentType.slurbTorch]: (): SlurbTorchComponentParams => 0 as any,
   [ServerComponentType.attackingEntities]: (): AttackingEntitiesComponentParams => 0 as any,
   [ServerComponentType.patrolAI]: (): PatrolAIComponentParams => 0 as any,
   [ServerComponentType.aiAssignment]: (): AIAssignmentComponentParams => 0 as any,
   [ServerComponentType.treeRootBase]: (): TreeRootBaseComponentParams => 0 as any,
   [ServerComponentType.treeRootSegment]: (): TreeRootSegmentComponentParams => 0 as any,
   [ServerComponentType.mithrilOreNode]: (): MithrilOreNodeComponentParams => 0 as any,
   [ServerComponentType.scrappy]: (): ScrappyComponentParams => 0 as any,
   [ServerComponentType.cogwalker]: (): CogwalkerComponentParams => 0 as any,
   [ServerComponentType.automatonAssembler]: (): AutomatonAssemblerComponentParams => 0 as any,
   [ServerComponentType.mithrilAnvil]: (): MithrilAnvilComponentParams => 0 as any,
   [ServerComponentType.rideable]: (): RideableComponentParams => 0 as any,
} satisfies Record<ServerComponentType, object>;

export type ServerComponentParams<T extends ServerComponentType> = ReturnType<typeof ServerComponentParamsRecord[T]>;