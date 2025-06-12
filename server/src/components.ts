import { ServerComponentType } from "battletribes-shared/components";
import { AmmoBoxComponent } from "./components/AmmoBoxComponent";
import { BerryBushComponent } from "./components/BerryBushComponent";
import { BlueprintComponent } from "./components/BlueprintComponent";
import { BuildingMaterialComponent } from "./components/BuildingMaterialComponent";
import { CactusComponent } from "./components/CactusComponent";
import { CookingComponent } from "./components/CookingComponent";
import { CowComponent } from "./components/CowComponent";
import { DoorComponent } from "./components/DoorComponent";
import { FenceComponent } from "./components/FenceComponent";
import { FenceGateComponent } from "./components/FenceGateComponent";
import { FishComponent } from "./components/FishComponent";
import { FrozenYetiComponent } from "./components/FrozenYetiComponent";
import { GolemComponent } from "./components/GolemComponent";
import { HealingTotemComponent } from "./components/HealingTotemComponent";
import { HealthComponent } from "./components/HealthComponent";
import { HutComponent } from "./components/HutComponent";
import { InventoryComponent } from "./components/InventoryComponent";
import { InventoryUseComponent } from "./components/InventoryUseComponent";
import { ItemComponent } from "./components/ItemComponent";
import { PhysicsComponent } from "./components/PhysicsComponent";
import { PlanterBoxComponent } from "./components/PlanterBoxComponent";
import { PlayerComponent } from "./components/PlayerComponent";
import { ResearchBenchComponent } from "./components/ResearchBenchComponent";
import { SlimeComponent } from "./components/SlimeComponent";
import { SlimeSpitComponent } from "./components/SlimeSpitComponent";
import { SnowballComponent } from "./components/SnowballComponent";
import { SpikesComponent } from "./components/SpikesComponent";
import { StatusEffectComponent } from "./components/StatusEffectComponent";
import { TombstoneComponent } from "./components/TombstoneComponent";
import { TotemBannerComponent } from "./components/TotemBannerComponent";
import { TreeComponent } from "./components/TreeComponent";
import { TribeComponent } from "./components/TribeComponent";
import { TribeMemberComponent } from "./components/TribeMemberComponent";
import { TribesmanAIComponent } from "./components/TribesmanAIComponent";
import { TunnelComponent } from "./components/TunnelComponent";
import { TurretComponent } from "./components/TurretComponent";
import { YetiComponent } from "./components/YetiComponent";
import { ZombieComponent } from "./components/ZombieComponent";
import { RockSpikeComponent } from "./components/RockSpikeComponent";
import { AIHelperComponent } from "./components/AIHelperComponent";
import { IceShardComponent } from "./components/IceShardComponent";
import { IceSpikesComponent } from "./components/IceSpikesComponent";
import { PebblumComponent } from "./components/PebblumComponent";
import { SlimewispComponent } from "./components/SlimewispComponent";
import { ThrowingProjectileComponent } from "./components/ThrowingProjectileComponent";
import { TribeWarriorComponent } from "./components/TribeWarriorComponent";
import { StructureComponent } from "./components/StructureComponent";
import { CraftingStationComponent } from "./components/CraftingStationComponent";
import { EntityAttachInfo, TransformComponent } from "./components/TransformComponent";
import { BoulderComponent } from "./components/BoulderComponent";
import { ProjectileComponent } from "./components/ProjectileComponent";
import { LayeredRodComponent } from "./components/LayeredRodComponent";
import { DecorationComponent } from "./components/DecorationComponent";
import { SpitPoisonAreaComponent } from "./components/SpitPoisonAreaComponent";
import { BattleaxeProjectileComponent } from "./components/BattleaxeProjectileComponent";
import { KrumblidComponent } from "./components/KrumblidComponent";
import { SpearProjectileComponent } from "./components/SpearProjectileComponent";
import { PunjiSticksComponent } from "./components/PunjiSticksComponent";
import { IceArrowComponent } from "./components/IceArrowComponent";
import { GuardianComponent } from "./components/GuardianComponent";
import { GuardianGemQuakeComponent } from "./components/GuardianGemQuakeComponent";
import { GuardianGemFragmentProjectileComponent } from "./components/GuardianGemFragmentProjectileComponent";
import { GuardianSpikyBallComponent } from "./components/GuardianSpikyBallComponent";
import { Entity, EntityType } from "battletribes-shared/entities";
import { BracingsComponent } from "./components/BracingsComponent";
import { BallistaComponent } from "./components/BallistaComponent";
import { SlingTurretComponent } from "./components/SlingTurretComponent";
import { BarrelComponent } from "./components/BarrelComponent";
import { CampfireComponent } from "./components/CampfireComponent";
import { FurnaceComponent } from "./components/FurnaceComponent";
import { FireTorchComponent } from "./components/FireTorchComponent";
import { SpikyBastardComponent } from "./components/SpikyBastardComponent";
import { GlurbHeadSegmentComponent } from "./components/GlurbHeadSegmentComponent";
import { SlurbTorchComponent } from "./components/SlurbTorchComponent";
import { AttackingEntitiesComponent } from "./components/AttackingEntitiesComponent";
import { TreeRootBaseComponent } from "./components/TreeRootBaseComponent";
import { TreeRootSegmentComponent } from "./components/TreeRootSegmentComponent";
import { AIAssignmentComponent } from "./components/AIAssignmentComponent";
import { PatrolAI } from "./ai/PatrolAI";
import { PlantedComponent } from "./components/PlantedComponent";
import { TreePlantedComponent } from "./components/TreePlantedComponent";
import { BerryBushPlantedComponent } from "./components/BerryBushPlantedComponent";
import { IceSpikesPlantedComponent } from "./components/IceSpikesPlantedComponent";
import { Light } from "./light-levels";
import { MithrilOreNodeComponent } from "./components/MithrilOreNodeComponent";
import { ScrappyComponent } from "./components/ScrappyComponent";
import { CogwalkerComponent } from "./components/CogwalkerComponent";
import { TribesmanComponent } from "./components/TribesmanComponent";
import { AutomatonAssemblerComponent } from "./components/AutomatonAssemblerComponent";
import { MithrilAnvilComponent } from "./components/MithrilAnvilComponent";
import { RideableComponent } from "./components/RideableComponent";
import { SwingAttackComponent } from "./components/SwingAttackComponent";
import { BlockAttackComponent } from "./components/BlockAttackComponent";
import { SlingTurretRockComponent } from "./components/SlingTurretRockComponent";
import { TamingComponent } from "./components/TamingComponent";
import { LootComponent } from "./components/LootComponent";
import { GlurbBodySegmentComponent } from "./components/GlurbBodySegmentComponent";
import { GlurbSegmentComponent } from "./components/GlurbSegmentComponent";
import { FleshSwordItemComponent } from "./components/FleshSwordItemComponent";
import { HitboxAngularTether, Hitbox } from "./hitboxes";
import { Point } from "../../shared/src/utils";
import { MossComponent } from "./components/MossComponent";
import { GlurbComponent } from "./components/GlurbComponent";
import { FloorSignComponent } from "./components/FloorSignComponent";
import { DesertBushLivelyComponent } from "./components/DesertBushLivelyComponent";
import { DesertBushSandyComponent } from "./components/DesertBushSandyComponent";
import { AutoSpawnedComponent } from "./components/AutoSpawnedComponent";
import { DesertSmallWeedComponent } from "./components/DesertSmallWeedComponent";
import { DesertShrubComponent } from "./components/DesertShrubComponent";
import { TumbleweedLiveComponent } from "./components/TumbleweedLiveComponent";
import { TumbleweedDeadComponent } from "./components/TumbleweedDeadComponent";
import { PalmTreeComponent } from "./components/PalmTreeComponent";
import { PricklyPearComponent } from "./components/PricklyPearComponent";
import { PricklyPearFragmentProjectileComponent } from "./components/PricklyPearFragmentComponent";
import { EnergyStomachComponent } from "./components/EnergyStomachComponent";
import { EnergyStoreComponent } from "./components/EnergyStoreComponent";
import { DustfleaComponent } from "./components/DustfleaComponent";
import { SandstoneRockComponent } from "./components/SandstoneRockComponent";
import { OkrenComponent } from "./components/OkrenComponent";
import { DustfleaMorphCocoonComponent } from "./components/DustfleaMorphCocoonComponent";
import { SandBallComponent } from "./components/SandBallComponent";
import { KrumblidMorphCocoonComponent } from "./components/KrumblidMorphCocoonComponent";
import { OkrenTongueSegmentComponent } from "./components/OkrenTongueSegmentComponent";
import { OkrenTongueTipComponent } from "./components/OkrenTongueTipComponent";
import { OkrenTongueComponent } from "./components/OkrenTongueComponent";
import { DustfleaEggComponent } from "./components/DustfleaEggComponent";
import { OkrenClawComponent } from "./components/OkrenClawComponent";

// @Cleanup @Robustness: find better way to do this
// @Cleanup: see if you can remove the arrow functions
const ComponentClassRecord = {
   [ServerComponentType.aiHelper]: () => AIHelperComponent,
   [ServerComponentType.cow]: () => CowComponent,
   [ServerComponentType.turret]: () => TurretComponent,
   [ServerComponentType.tribe]: () => TribeComponent,
   [ServerComponentType.inventory]: () => InventoryComponent,
   [ServerComponentType.ammoBox]: () => AmmoBoxComponent,
   [ServerComponentType.slime]: () => SlimeComponent,
   [ServerComponentType.golem]: () => GolemComponent,
   [ServerComponentType.statusEffect]: () => StatusEffectComponent,
   [ServerComponentType.cactus]: () => CactusComponent,
   [ServerComponentType.health]: () => HealthComponent,
   [ServerComponentType.physics]: () => PhysicsComponent,
   [ServerComponentType.researchBench]: () => ResearchBenchComponent,
   [ServerComponentType.berryBush]: () => BerryBushComponent,
   [ServerComponentType.inventoryUse]: () => InventoryUseComponent,
   [ServerComponentType.zombie]: () => ZombieComponent,
   [ServerComponentType.player]: () => PlayerComponent,
   [ServerComponentType.item]: () => ItemComponent,
   [ServerComponentType.fleshSwordItem]: () => FleshSwordItemComponent,
   [ServerComponentType.tombstone]: () => TombstoneComponent,
   [ServerComponentType.tree]: () => TreeComponent,
   [ServerComponentType.blueprint]: () => BlueprintComponent,
   [ServerComponentType.boulder]: () => BoulderComponent,
   [ServerComponentType.yeti]: () => YetiComponent,
   [ServerComponentType.frozenYeti]: () => FrozenYetiComponent,
   [ServerComponentType.totemBanner]: () => TotemBannerComponent,
   [ServerComponentType.cooking]: () => CookingComponent,
   [ServerComponentType.hut]: () => HutComponent,
   [ServerComponentType.snowball]: () => SnowballComponent,
   [ServerComponentType.fish]: () => FishComponent,
   [ServerComponentType.rockSpike]: () => RockSpikeComponent,
   [ServerComponentType.slimeSpit]: () => SlimeSpitComponent,
   [ServerComponentType.door]: () => DoorComponent,
   [ServerComponentType.tribesman]: () => TribesmanComponent,
   [ServerComponentType.tribesmanAI]: () => TribesmanAIComponent,
   [ServerComponentType.tunnel]: () => TunnelComponent,
   [ServerComponentType.buildingMaterial]: () => BuildingMaterialComponent,
   [ServerComponentType.spikes]: () => SpikesComponent,
   [ServerComponentType.punjiSticks]: () => PunjiSticksComponent,
   [ServerComponentType.tribeMember]: () => TribeMemberComponent,
   [ServerComponentType.healingTotem]: () => HealingTotemComponent,
   [ServerComponentType.planterBox]: () => PlanterBoxComponent,
   [ServerComponentType.planted]: () => PlantedComponent,
   [ServerComponentType.treePlanted]: () => TreePlantedComponent,
   [ServerComponentType.berryBushPlanted]: () => BerryBushPlantedComponent,
   [ServerComponentType.iceSpikesPlanted]: () => IceSpikesPlantedComponent,
   [ServerComponentType.structure]: () => StructureComponent,
   [ServerComponentType.fence]: () => FenceComponent,
   [ServerComponentType.fenceGate]: () => FenceGateComponent,
   [ServerComponentType.iceShard]: () => IceShardComponent,
   [ServerComponentType.iceSpikes]: () => IceSpikesComponent,
   [ServerComponentType.pebblum]: () => PebblumComponent,
   [ServerComponentType.slimewisp]: () => SlimewispComponent,
   [ServerComponentType.throwingProjectile]: () => ThrowingProjectileComponent,
   [ServerComponentType.tribeWarrior]: () => TribeWarriorComponent,
   [ServerComponentType.craftingStation]: () => CraftingStationComponent,
   [ServerComponentType.transform]: () => TransformComponent,
   [ServerComponentType.projectile]: () => ProjectileComponent,
   [ServerComponentType.iceArrow]: () => IceArrowComponent,
   [ServerComponentType.layeredRod]: () => LayeredRodComponent,
   [ServerComponentType.decoration]: () => DecorationComponent,
   [ServerComponentType.spitPoisonArea]: () => SpitPoisonAreaComponent,
   [ServerComponentType.battleaxeProjectile]: () => BattleaxeProjectileComponent,
   [ServerComponentType.spearProjectile]: () => SpearProjectileComponent,
   [ServerComponentType.krumblid]: () => KrumblidComponent,
   [ServerComponentType.guardian]: () => GuardianComponent,
   [ServerComponentType.guardianGemQuake]: () => GuardianGemQuakeComponent,
   [ServerComponentType.guardianGemFragmentProjectile]: () => GuardianGemFragmentProjectileComponent,
   [ServerComponentType.guardianSpikyBall]: () => GuardianSpikyBallComponent,
   [ServerComponentType.bracings]: () => BracingsComponent,
   [ServerComponentType.ballista]: () => BallistaComponent,
   [ServerComponentType.slingTurret]: () => SlingTurretComponent,
   [ServerComponentType.barrel]: () => BarrelComponent,
   [ServerComponentType.campfire]: () => CampfireComponent,
   [ServerComponentType.furnace]: () => FurnaceComponent,
   [ServerComponentType.fireTorch]: () => FireTorchComponent,
   [ServerComponentType.spikyBastard]: () => SpikyBastardComponent,
   [ServerComponentType.glurb]: () => GlurbComponent,
   [ServerComponentType.glurbSegment]: () => GlurbSegmentComponent,
   [ServerComponentType.glurbBodySegment]: () => GlurbBodySegmentComponent,
   [ServerComponentType.glurbHeadSegment]: () => GlurbHeadSegmentComponent,
   [ServerComponentType.slurbTorch]: () => SlurbTorchComponent,
   [ServerComponentType.attackingEntities]: () => AttackingEntitiesComponent,
   [ServerComponentType.aiAssignment]: () => AIAssignmentComponent,
   [ServerComponentType.treeRootBase]: () => TreeRootBaseComponent,
   [ServerComponentType.treeRootSegment]: () => TreeRootSegmentComponent,
   [ServerComponentType.mithrilOreNode]: () => MithrilOreNodeComponent,
   [ServerComponentType.scrappy]: () => ScrappyComponent,
   [ServerComponentType.cogwalker]: () => CogwalkerComponent,
   [ServerComponentType.automatonAssembler]: () => AutomatonAssemblerComponent,
   [ServerComponentType.mithrilAnvil]: () => MithrilAnvilComponent,
   [ServerComponentType.rideable]: () => RideableComponent,
   [ServerComponentType.swingAttack]: () => SwingAttackComponent,
   [ServerComponentType.blockAttack]: () => BlockAttackComponent,
   [ServerComponentType.slingTurretRock]: () => SlingTurretRockComponent,
   [ServerComponentType.taming]: () => TamingComponent,
   [ServerComponentType.loot]: () => LootComponent,
   [ServerComponentType.moss]: () => MossComponent,
   [ServerComponentType.floorSign]: () => FloorSignComponent,
   [ServerComponentType.desertBushLively]: () => DesertBushLivelyComponent,
   [ServerComponentType.desertBushSandy]: () => DesertBushSandyComponent,
   [ServerComponentType.autoSpawned]: () => AutoSpawnedComponent,
   [ServerComponentType.desertSmallWeed]: () => DesertSmallWeedComponent,
   [ServerComponentType.desertShrub]: () => DesertShrubComponent,
   [ServerComponentType.tumbleweedLive]: () => TumbleweedLiveComponent,
   [ServerComponentType.tumbleweedDead]: () => TumbleweedDeadComponent,
   [ServerComponentType.palmTree]: () => PalmTreeComponent,
   [ServerComponentType.pricklyPear]: () => PricklyPearComponent,
   [ServerComponentType.pricklyPearFragmentProjectile]: () => PricklyPearFragmentProjectileComponent,
   [ServerComponentType.energyStore]: () => EnergyStoreComponent,
   [ServerComponentType.energyStomach]: () => EnergyStomachComponent,
   [ServerComponentType.dustflea]: () => DustfleaComponent,
   [ServerComponentType.sandstoneRock]: () => SandstoneRockComponent,
   [ServerComponentType.okren]: () => OkrenComponent,
   [ServerComponentType.okrenClaw]: () => OkrenClawComponent,
   [ServerComponentType.dustfleaMorphCocoon]: () => DustfleaMorphCocoonComponent,
   [ServerComponentType.sandBall]: () => SandBallComponent,
   [ServerComponentType.krumblidMorphCocoon]: () => KrumblidMorphCocoonComponent,
   [ServerComponentType.okrenTongue]: () => OkrenTongueComponent,
   [ServerComponentType.okrenTongueSegment]: () => OkrenTongueSegmentComponent,
   [ServerComponentType.okrenTongueTip]: () => OkrenTongueTipComponent,
   [ServerComponentType.dustfleaEgg]: () => DustfleaEggComponent,
} satisfies {
   [T in ServerComponentType]: () => {
      new (...args: any): unknown;
   };
};

export interface LightCreationInfo {
   readonly light: Light;
   readonly attachedHitbox: Hitbox;
}

type EntityComponents = Partial<{
   [T in ServerComponentType]: InstanceType<ReturnType<typeof ComponentClassRecord[T]>>;
}>;

export interface EntityConfigAttachInfo {
   readonly parent: Entity;
   readonly parentHitbox: Hitbox | null;
   readonly destroyWhenParentIsDestroyed: boolean;
}

export interface EntityConfigAttachInfoWithTether {
   readonly parent: Entity;
   readonly parentHitbox: Hitbox | null;
   readonly destroyWhenParentIsDestroyed: boolean;
   readonly idealDistance: number;
   readonly springConstant: number;
   readonly damping: number;
   readonly affectsOriginHitbox: boolean;
   readonly angularTether?: HitboxAngularTether;
}

export interface EntityConfig {
   readonly entityType: EntityType;
   readonly components: EntityComponents;
   readonly lights: ReadonlyArray<LightCreationInfo>;
   /** If present, notes that upon being added to the world it should immediately be attached to an entity. */
   attachInfo?: EntityConfigAttachInfo | EntityConfigAttachInfoWithTether;
   /** Any child entities' configs. */
   childConfigs?: ReadonlyArray<EntityConfig>;
}

export function createEntityConfigAttachInfo(parent: Entity, parentHitbox: Hitbox | null, destroyWhenParentIsDestroyed: boolean): EntityConfigAttachInfo {
   return {
      parent: parent,
      parentHitbox: parentHitbox,
      destroyWhenParentIsDestroyed: destroyWhenParentIsDestroyed
   };
}

export function createEntityConfigAttachInfoWithTether(parent: Entity, parentHitbox: Hitbox | null, idealDistance: number, springConstant: number, damping: number, affectsOriginHitbox: boolean, destroyWhenParentIsDestroyed: boolean, angularTether?: HitboxAngularTether): EntityConfigAttachInfoWithTether {
   return {
      parent: parent,
      parentHitbox: parentHitbox,
      destroyWhenParentIsDestroyed: destroyWhenParentIsDestroyed,
      idealDistance: idealDistance,
      springConstant: springConstant,
      damping: damping,
      affectsOriginHitbox: affectsOriginHitbox,
      angularTether: angularTether
   };
}

export function entityConfigAttachInfoIsTethered(attachInfo: EntityConfigAttachInfo | EntityConfigAttachInfoWithTether): attachInfo is EntityConfigAttachInfoWithTether {
   return typeof (attachInfo as EntityConfigAttachInfoWithTether).angularTether !== "undefined";
}