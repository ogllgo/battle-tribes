/** Unique identifier for each entity */
export type Entity = number;

export const enum EntityType {
   cow,
   zombie,
   tombstone,
   tree,
   workbench,
   boulder,
   berryBush,
   cactus,
   yeti,
   iceSpikes,
   slime,
   slimewisp,
   player,
   tribeWorker,
   tribeWarrior,
   tribeTotem,
   workerHut,
   warriorHut,
   barrel,
   campfire,
   furnace,
   snowball,
   krumblid,
   frozenYeti,
   fish,
   itemEntity,
   woodenArrow,
   ballistaWoodenBolt,
   ballistaRock,
   ballistaSlimeball,
   ballistaFrostcicle,
   slingTurretRock,
   iceShardProjectile,
   rockSpikeProjectile,
   spearProjectile,
   researchBench,
   wall,
   slimeSpit,
   spitPoisonArea,
   door,
   battleaxeProjectile,
   golem,
   planterBox,
   iceArrow,
   pebblum,
   embrasure,
   tunnel,
   floorSpikes,
   wallSpikes,
   floorPunjiSticks,
   wallPunjiSticks,
   blueprintEntity,
   ballista,
   slingTurret,
   healingTotem,
   treePlanted,
   berryBushPlanted,
   iceSpikesPlanted,
   fence,
   fenceGate,
   frostshaper,
   stonecarvingTable,
   grassStrand,
   decoration,
   reed,
   lilypad,
   fibrePlant,
   guardian,
   guardianGemQuake,
   guardianGemFragmentProjectile,
   guardianSpikyBall,
   bracings,
   fireTorch,
   spikyBastard,
   glurb,
   slurbTorch,
   treeRootBase,
   treeRootSegment,
   mithrilOreNode,
   rootTap
}

export const EntityTypeString: Record<EntityType, string> = {
   [EntityType.cow]: "cow",
   [EntityType.zombie]: "zombie",
   [EntityType.tombstone]: "tombstone",
   [EntityType.tree]: "tree",
   [EntityType.workbench]: "workbench",
   [EntityType.boulder]: "boulder",
   [EntityType.berryBush]: "berryBush",
   [EntityType.cactus]: "cactus",
   [EntityType.yeti]: "yeti",
   [EntityType.iceSpikes]: "iceSpikes",
   [EntityType.slime]: "slime",
   [EntityType.slimewisp]: "slimewisp",
   [EntityType.player]: "player",
   [EntityType.tribeWorker]: "tribeWorker",
   [EntityType.tribeWarrior]: "tribeWarrior",
   [EntityType.tribeTotem]: "tribeTotem",
   [EntityType.workerHut]: "workerHut",
   [EntityType.warriorHut]: "warriorHut",
   [EntityType.barrel]: "barrel",
   [EntityType.campfire]: "campfire",
   [EntityType.furnace]: "furnace",
   [EntityType.snowball]: "snowball",
   [EntityType.krumblid]: "krumblid",
   [EntityType.frozenYeti]: "frozenYeti",
   [EntityType.fish]: "fish",
   [EntityType.itemEntity]: "itemEntity",
   [EntityType.woodenArrow]: "woodenArrow",
   [EntityType.ballistaWoodenBolt]: "ballistaWoodenBolt",
   [EntityType.ballistaRock]: "ballistaRock",
   [EntityType.ballistaSlimeball]: "ballistaSlimeball",
   [EntityType.ballistaFrostcicle]: "ballistaFrostcicle",
   [EntityType.slingTurretRock]: "slingTurretRock",
   [EntityType.iceShardProjectile]: "iceShardProjectile",
   [EntityType.rockSpikeProjectile]: "rockSpikeProjectile",
   [EntityType.spearProjectile]: "spearProjectile",
   [EntityType.researchBench]: "researchBench",
   [EntityType.wall]: "wall",
   [EntityType.slimeSpit]: "slimeSpit",
   [EntityType.spitPoisonArea]: "spitPoisonArea",
   [EntityType.door]: "door",
   [EntityType.battleaxeProjectile]: "battleaxeProjectile",
   [EntityType.golem]: "golem",
   [EntityType.planterBox]: "planterBox",
   [EntityType.iceArrow]: "iceArrow",
   [EntityType.pebblum]: "pebblum",
   [EntityType.embrasure]: "embrasure",
   [EntityType.tunnel]: "tunnel",
   [EntityType.floorSpikes]: "floorSpikes",
   [EntityType.wallSpikes]: "wallSpikes",
   [EntityType.floorPunjiSticks]: "floorPunjiSticks",
   [EntityType.wallPunjiSticks]: "wallPunjiSticks",
   [EntityType.blueprintEntity]: "blueprintEntity",
   [EntityType.ballista]: "ballista",
   [EntityType.slingTurret]: "slingTurret",
   [EntityType.healingTotem]: "healingTotem",
   [EntityType.treePlanted]: "treePlanted",
   [EntityType.berryBushPlanted]: "berryBushPlanted",
   [EntityType.iceSpikesPlanted]: "iceSpikesPlanted",
   [EntityType.fence]: "fence",
   [EntityType.fenceGate]: "fenceGate",
   [EntityType.frostshaper]: "frostshaper",
   [EntityType.stonecarvingTable]: "stonecarvingTable",
   [EntityType.grassStrand]: "grassStrand",
   [EntityType.decoration]: "decoration",
   [EntityType.reed]: "reed",
   [EntityType.lilypad]: "lilypad",
   [EntityType.fibrePlant]: "fibrePlant",
   [EntityType.guardian]: "guardian",
   [EntityType.guardianGemQuake]: "guardianGemQuake",
   [EntityType.guardianGemFragmentProjectile]: "guardianGemFragmentProjectile",
   [EntityType.guardianSpikyBall]: "guardianSpikyBall",
   [EntityType.bracings]: "bracings",
   [EntityType.fireTorch]: "fireTorch",
   [EntityType.spikyBastard]: "spikyBastard",
   [EntityType.glurb]: "glurb",
   [EntityType.slurbTorch]: "slurbTorch",
   [EntityType.treeRootBase]: "treeRootBase",
   [EntityType.treeRootSegment]: "treeRootSegment",
   [EntityType.mithrilOreNode]: "Mithril Ore Node",
   [EntityType.rootTap]: "Root Tap",
};

export const NUM_ENTITY_TYPES = Object.keys(EntityTypeString).length;

export function getEntityTypeFromString(entityTypeString: string): EntityType | null {
   for (let entityType: EntityType = 0; entityType < NUM_ENTITY_TYPES; entityType++) {
      if (EntityTypeString[entityType] === entityTypeString) {
         return entityType;
      }
   }

   return null;
}
   
export const RESOURCE_ENTITY_TYPES: ReadonlyArray<EntityType> = [EntityType.tree, EntityType.berryBush, EntityType.iceSpikes, EntityType.cactus, EntityType.boulder];
export const MOB_ENTITY_TYPES: ReadonlyArray<EntityType> = [EntityType.cow, EntityType.zombie, EntityType.yeti, EntityType.slime, EntityType.slimewisp, EntityType.krumblid, EntityType.frozenYeti];

// @Cleanup: move all of this

export enum CowSpecies {
   brown,
   black
}

export enum TreeSize {
   small,
   large
}

export enum CactusFlowerSize {
   small = 0,
   large = 1
}

export interface CactusFlowerData {
   readonly type: number;
   readonly height: number;
   readonly rotation: number;
}

export interface CactusBodyFlowerData extends CactusFlowerData {
   readonly size: CactusFlowerSize
   readonly column: number;
}

export interface CactusLimbFlowerData extends CactusFlowerData {
   readonly direction: number;
}

export interface CactusLimbData {
   readonly direction: number;
   readonly flower?: CactusLimbFlowerData;
}

export enum SlimeSize {
   small = 0,
   medium = 1,
   large = 2
}

export interface TribeTotemBanner {
   readonly hutNum: number;
   /** The ring layer in the totem which the banner is on */
   readonly layer: number;
   readonly direction: number;
}

export enum SnowballSize {
   small,
   large
}

export const SNOWBALL_SIZES: Record<SnowballSize, number> = {
   [SnowballSize.small]: 44,
   [SnowballSize.large]: 60
};

export enum DamageSource {
   yeti,
   zombie,
   poison,
   fire,
   tribeMember,
   arrow,
   iceSpikes,
   iceShards,
   cactus,
   snowball,
   slime,
   god,
   frozenYeti,
   bloodloss,
   rockSpike,
   lackOfOxygen,
   fish,
   spear
}

export interface DeathInfo {
   readonly username: string;
   readonly damageSource: DamageSource;
}

// @Refactor: It might be easier to send the animation info instead of whichever action which the client has to infer
export enum LimbAction {
   none,
   chargeBow,
   chargeSpear,
   chargeBattleaxe,
   loadCrossbow,
   researching,
   useMedicine,
   eat,
   craft,
   windAttack,
   attack,
   returnAttackToRest,
   engageBlock,
   block,
   returnBlockToRest,
   feignAttack,
   windShieldBash,
   pushShieldBash,
   returnShieldBashToRest
}

export enum FrozenYetiAttackType {
   snowThrow,
   roar,
   stomp,
   bite,
   none
}

export enum FishColour {
   blue,
   gold,
   red,
   lime
}

export enum RockSpikeProjectileSize {
   small,
   medium,
   large
}

export enum DoorToggleType {
   none,
   close,
   open
}

export type PlantedEntityType = EntityType.treePlanted | EntityType.berryBushPlanted | EntityType.iceSpikesPlanted;