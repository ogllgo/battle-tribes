import { CircularHitboxData, RectangularHitboxData, StatusEffectData } from "./client-server-types";
import { CraftingStation } from "./items/crafting-recipes";
import { CactusBodyFlowerData, CactusLimbData, CowSpecies, DeathInfo, DoorToggleType, FishColour, FrozenYetiAttackType, RockSpikeProjectileSize, SlimeSize, SnowballSize, TreeSize, LimbAction, TribeTotemBanner, EntityType } from "./entities";
import { Inventory, InventoryName, ItemType } from "./items/items";
import { Settings } from "./settings";
import { StatusEffect } from "./status-effects";
import { TitleGenerationInfo } from "./titles";
import { Colour } from "./utils";

/*
data sent:
- Array of components (corresponding to the array of component types)

in server:
- 
*/

export enum ServerComponentType {
   aiHelper,
   berryBush,
   blueprint,
   boulder,
   cactus,
   cooking,
   cow,
   door,
   fish,
   frozenYeti,
   golem,
   health,
   hut,
   iceShard,
   iceSpikes,
   inventory,
   inventoryUse,
   item,
   pebblum,
   physics,
   player,
   rockSpike,
   slime,
   slimeSpit,
   slimewisp,
   snowball,
   statusEffect,
   throwingProjectile,
   tombstone,
   // Cleanup: rename to just "tribeTotem" (the client uses it for more than just its banners)
   totemBanner,
   tree,
   tribe,
   tribeMember,
   tribesman,
   tribesmanAI,
   turret,
   yeti,
   zombie,
   ammoBox,
   escapeAI,
   followAI,
   researchBench,
   tunnel,
   buildingMaterial,
   spikes,
   punjiSticks,
   tribeWarrior,
   healingTotem,
   planterBox,
   planted,
   treePlanted,
   berryBushPlanted,
   iceSpikesPlanted,
   structure,
   fence,
   fenceGate,
   craftingStation,
   transform,
   projectile,
   iceArrow,
   layeredRod,
   decoration,
   spitPoisonArea,
   battleaxeProjectile,
   spearProjectile,
   krumblid,
   damageBox,
   guardian,
   guardianGemQuake,
   guardianGemFragmentProjectile,
   guardianSpikyBall,
   bracings,
   ballista,
   slingTurret,
   barrel,
   campfire,
   furnace,
   fireTorch,
   spikyBastard,
   glurb,
   slurbTorch,
   attackingEntities,
   patrolAI,
   aiAssignment,
   treeRootBase,
   treeRootSegment,
   mithrilOreNode,
   scrappy,
   cogwalker,
   automatonAssembler,
   mithrilAnvil,
   rideable
}

export const ServerComponentTypeString: Record<ServerComponentType, string> = {
   [ServerComponentType.aiHelper]: "AI Helper Component",
   [ServerComponentType.berryBush]: "Berry Bush Component",
   [ServerComponentType.blueprint]: "Blueprint Component",
   [ServerComponentType.boulder]: "Boulder Component",
   [ServerComponentType.cactus]: "Cactus Component",
   [ServerComponentType.cooking]: "Cooking Component",
   [ServerComponentType.cow]: "Cow Component",
   [ServerComponentType.door]: "Foor Component",
   [ServerComponentType.fish]: "Fish Component",
   [ServerComponentType.frozenYeti]: "Frozen Yeti Component",
   [ServerComponentType.golem]: "Golem Component",
   [ServerComponentType.health]: "Health Component",
   [ServerComponentType.hut]: "Hut Component",
   [ServerComponentType.iceShard]: "Ice Shard Component",
   [ServerComponentType.iceSpikes]: "Ice Spikes Component",
   [ServerComponentType.inventory]: "Inventory Component",
   [ServerComponentType.inventoryUse]: "Inventory Use Component",
   [ServerComponentType.item]: "Item Component",
   [ServerComponentType.pebblum]: "Pebblum Component",
   [ServerComponentType.physics]: "Physics Component",
   [ServerComponentType.player]: "Player Component",
   [ServerComponentType.rockSpike]: "Rock Spike Component",
   [ServerComponentType.slime]: "Slime Component",
   [ServerComponentType.slimeSpit]: "Slime Spit Component",
   [ServerComponentType.slimewisp]: "Slimewisp Component",
   [ServerComponentType.snowball]: "Snowball Component",
   [ServerComponentType.statusEffect]: "Status Effect Component",
   [ServerComponentType.throwingProjectile]: "Throwing Projectile Component",
   [ServerComponentType.tombstone]: "Tombstone Component",
   [ServerComponentType.totemBanner]: "Totem Banner Component",
   [ServerComponentType.tree]: "Tree Component",
   [ServerComponentType.tribe]: "Tribe Component",
   [ServerComponentType.tribeMember]: "Tribe Member Component",
   [ServerComponentType.tribesman]: "Tribesman Component",
   [ServerComponentType.tribesmanAI]: "Tribesman AI Component",
   [ServerComponentType.turret]: "Turret Component",
   [ServerComponentType.yeti]: "Yeti Component",
   [ServerComponentType.zombie]: "Zombie Component",
   [ServerComponentType.ammoBox]: "Ammo Box Component",
   [ServerComponentType.escapeAI]: "Escape AI Component",
   [ServerComponentType.followAI]: "Follow AI Component",
   [ServerComponentType.researchBench]: "Research Bench Component",
   [ServerComponentType.tunnel]: "Tunnel Component",
   [ServerComponentType.buildingMaterial]: "Building Material Component",
   [ServerComponentType.spikes]: "Spikes Component",
   [ServerComponentType.punjiSticks]: "Punji Sticks Component",
   [ServerComponentType.tribeWarrior]: "Tribe Warrior Component",
   [ServerComponentType.healingTotem]: "Healing Totem Component",
   [ServerComponentType.planterBox]: "Planter Box Component",
   [ServerComponentType.planted]: "Planted Component",
   [ServerComponentType.treePlanted]: "Tree Planted Component",
   [ServerComponentType.berryBushPlanted]: "Berry Bush Planted Component",
   [ServerComponentType.iceSpikesPlanted]: "Ice Spikes Planted Component",
   [ServerComponentType.structure]: "Structure Component",
   [ServerComponentType.fence]: "Fence Component",
   [ServerComponentType.fenceGate]: "Fence Gate Component",
   [ServerComponentType.craftingStation]: "Crafting Station Component",
   [ServerComponentType.transform]: "Transform Component",
   [ServerComponentType.projectile]: "Projectile Component",
   [ServerComponentType.iceArrow]: "Ice Arrow Component",
   [ServerComponentType.layeredRod]: "Layered Rod Component",
   [ServerComponentType.decoration]: "Decoration Component",
   [ServerComponentType.spitPoisonArea]: "Spit Poison Area Component",
   [ServerComponentType.battleaxeProjectile]: "Battleaxe Projectile Component",
   [ServerComponentType.spearProjectile]: "Spear Projectile Component",
   [ServerComponentType.krumblid]: "Krumblid Component",
   [ServerComponentType.damageBox]: "Damage Box Component",
   [ServerComponentType.guardian]: "Guardian Component",
   [ServerComponentType.guardianGemQuake]: "Guardian Gem Quake Component",
   [ServerComponentType.guardianGemFragmentProjectile]: "Guardian Gem Fragment Projectile Component",
   [ServerComponentType.guardianSpikyBall]: "Guardian Spiky Ball Component",
   // @Cleanup: should probably be client component
   [ServerComponentType.bracings]: "Bracings Component",
   // @Cleanup: should probably be client component
   [ServerComponentType.ballista]: "Ballsita Component",
   // @Cleanup: should probably be client component
   [ServerComponentType.slingTurret]: "Sling Turret Component",
   // @Cleanup: should probably be client component
   [ServerComponentType.barrel]: "Barrel Component",
   // @Cleanup: should probably be client component
   [ServerComponentType.campfire]: "Campfire Component",
   // @Cleanup: should probably be client component
   [ServerComponentType.furnace]: "Furnace Component",
   [ServerComponentType.fireTorch]: "Fire Torch Component",
   [ServerComponentType.spikyBastard]: "Spiky Bastard Component",
   [ServerComponentType.glurb]: "Glurb Component",
   [ServerComponentType.slurbTorch]: "Slurb Torch Component",
   [ServerComponentType.attackingEntities]: "Attacking Entities Component",
   [ServerComponentType.patrolAI]: "Patrol AI Component",
   [ServerComponentType.aiAssignment]: "AI Assignment Component",
   [ServerComponentType.treeRootBase]: "Tree Root Base Component",
   [ServerComponentType.treeRootSegment]: "Tree Root Segment Component",
   [ServerComponentType.mithrilOreNode]: "Mithril Ore Node Component",
   [ServerComponentType.scrappy]: "Scrappy Component",
   [ServerComponentType.cogwalker]: "Cogwalker Component",
   [ServerComponentType.automatonAssembler]: "Automaton Assembler",
   [ServerComponentType.mithrilAnvil]: "Mithril Anvil",
   [ServerComponentType.rideable]: "Rideable",
};

export const NUM_COMPONENTS = Object.keys(ServerComponentTypeString).length;

// @Hack @Robustness: shouldn't be hardcoded
export const EntityComponents = {
   [EntityType.cow]: [ServerComponentType.transform, ServerComponentType.physics, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.aiHelper, ServerComponentType.escapeAI, ServerComponentType.followAI, ServerComponentType.cow] as const,
   [EntityType.zombie]: [ServerComponentType.transform, ServerComponentType.physics, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.zombie, ServerComponentType.aiHelper, ServerComponentType.inventory, ServerComponentType.inventoryUse] as const,
   [EntityType.tombstone]: [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tombstone] as const,
   [EntityType.tree]: [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tree] as const,
   [EntityType.workbench]: [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.structure, ServerComponentType.tribe] as const,
   [EntityType.boulder]: [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.boulder] as const,
   [EntityType.berryBush]: [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.berryBush] as const,
   [EntityType.cactus]: [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.cactus] as const,
   [EntityType.yeti]: [ServerComponentType.transform, ServerComponentType.physics, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.aiHelper, ServerComponentType.yeti] as const,
   [EntityType.iceSpikes]: [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.iceSpikes] as const,
   [EntityType.slime]: [ServerComponentType.transform, ServerComponentType.physics, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.slime, ServerComponentType.aiHelper] as const,
   [EntityType.slimewisp]: [ServerComponentType.transform, ServerComponentType.physics, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.slimewisp, ServerComponentType.aiHelper] as const,
   [EntityType.player]: [ServerComponentType.transform, ServerComponentType.physics, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.tribeMember, ServerComponentType.inventory, ServerComponentType.inventoryUse, ServerComponentType.player, ServerComponentType.damageBox] as const,
   [EntityType.tribeWorker]: [ServerComponentType.transform, ServerComponentType.physics, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.tribeMember, ServerComponentType.inventory, ServerComponentType.inventoryUse, ServerComponentType.tribesmanAI, ServerComponentType.damageBox] as const,
   [EntityType.tribeWarrior]: [ServerComponentType.transform, ServerComponentType.physics, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.tribeMember, ServerComponentType.inventory, ServerComponentType.inventoryUse, ServerComponentType.tribesmanAI, ServerComponentType.tribeWarrior, ServerComponentType.damageBox] as const,
   [EntityType.tribeTotem]: [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.structure, ServerComponentType.tribe, ServerComponentType.totemBanner] as const,
   [EntityType.workerHut]: [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.structure, ServerComponentType.tribe, ServerComponentType.hut] as const,
   [EntityType.warriorHut]: [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.structure, ServerComponentType.tribe, ServerComponentType.hut] as const,
   [EntityType.barrel]: [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.structure, ServerComponentType.tribe, ServerComponentType.inventory, ServerComponentType.barrel] as const,
   [EntityType.campfire]: [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.structure, ServerComponentType.tribe, ServerComponentType.inventory, ServerComponentType.cooking, ServerComponentType.campfire] as const,
   [EntityType.furnace]: [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.structure, ServerComponentType.tribe, ServerComponentType.inventory, ServerComponentType.cooking, ServerComponentType.furnace] as const,
   [EntityType.snowball]: [ServerComponentType.transform, ServerComponentType.physics, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.snowball] as const,
   [EntityType.krumblid]: [ServerComponentType.transform, ServerComponentType.physics, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.followAI, ServerComponentType.escapeAI, ServerComponentType.aiHelper, ServerComponentType.krumblid] as const,
   [EntityType.frozenYeti]: [ServerComponentType.transform, ServerComponentType.physics, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.frozenYeti, ServerComponentType.aiHelper] as const,
   [EntityType.fish]: [ServerComponentType.transform, ServerComponentType.physics, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.escapeAI, ServerComponentType.aiHelper, ServerComponentType.fish] as const,
   [EntityType.itemEntity]: [ServerComponentType.transform, ServerComponentType.physics, ServerComponentType.item] as const,
   [EntityType.woodenArrow]: [ServerComponentType.transform, ServerComponentType.physics, ServerComponentType.tribe] as const,
   [EntityType.ballistaWoodenBolt]: [ServerComponentType.transform, ServerComponentType.physics, ServerComponentType.tribe] as const,
   [EntityType.ballistaRock]: [ServerComponentType.transform, ServerComponentType.physics, ServerComponentType.tribe] as const,
   [EntityType.ballistaSlimeball]: [ServerComponentType.transform, ServerComponentType.physics, ServerComponentType.tribe] as const,
   [EntityType.ballistaFrostcicle]: [ServerComponentType.transform, ServerComponentType.physics, ServerComponentType.tribe] as const,
   [EntityType.slingTurretRock]: [ServerComponentType.transform, ServerComponentType.physics, ServerComponentType.tribe] as const,
   [EntityType.iceShardProjectile]: [ServerComponentType.transform, ServerComponentType.physics, ServerComponentType.iceShard] as const,
   [EntityType.rockSpikeProjectile]: [ServerComponentType.transform, ServerComponentType.rockSpike] as const,
   [EntityType.spearProjectile]: [ServerComponentType.transform, ServerComponentType.physics, ServerComponentType.throwingProjectile, ServerComponentType.spearProjectile] as const,
   [EntityType.researchBench]: [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.structure, ServerComponentType.tribe, ServerComponentType.researchBench] as const,
   [EntityType.wall]: [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.structure, ServerComponentType.tribe, ServerComponentType.buildingMaterial] as const,
   [EntityType.slimeSpit]: [ServerComponentType.transform, ServerComponentType.physics, ServerComponentType.slimeSpit] as const,
   [EntityType.spitPoisonArea]: [ServerComponentType.transform, ServerComponentType.spitPoisonArea] as const,
   [EntityType.door]: [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.door, ServerComponentType.structure, ServerComponentType.tribe, ServerComponentType.buildingMaterial] as const,
   [EntityType.battleaxeProjectile]: [ServerComponentType.transform, ServerComponentType.physics, ServerComponentType.throwingProjectile] as const,
   [EntityType.golem]: [ServerComponentType.transform, ServerComponentType.physics, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.golem] as const,
   [EntityType.planterBox]: [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.structure, ServerComponentType.tribe, ServerComponentType.planterBox] as const,
   [EntityType.iceArrow]: [ServerComponentType.transform, ServerComponentType.physics, ServerComponentType.tribe, ServerComponentType.iceArrow] as const,
   [EntityType.pebblum]: [ServerComponentType.transform, ServerComponentType.physics, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.pebblum] as const,
   [EntityType.embrasure]: [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.structure, ServerComponentType.tribe, ServerComponentType.buildingMaterial] as const,
   [EntityType.floorSpikes]: [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.structure, ServerComponentType.tribe, ServerComponentType.spikes, ServerComponentType.buildingMaterial] as const,
   [EntityType.wallSpikes]: [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.structure, ServerComponentType.tribe, ServerComponentType.spikes, ServerComponentType.buildingMaterial] as const,
   [EntityType.floorPunjiSticks]: [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.structure, ServerComponentType.tribe, ServerComponentType.spikes, ServerComponentType.punjiSticks] as const,
   [EntityType.wallPunjiSticks]: [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.structure, ServerComponentType.tribe, ServerComponentType.spikes, ServerComponentType.punjiSticks] as const,
   [EntityType.blueprintEntity]: [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.structure, ServerComponentType.blueprint, ServerComponentType.tribe] as const,
   [EntityType.ballista]: [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.structure, ServerComponentType.tribe, ServerComponentType.turret, ServerComponentType.aiHelper, ServerComponentType.ammoBox, ServerComponentType.inventory, ServerComponentType.ballista] as const,
   [EntityType.slingTurret]: [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.structure, ServerComponentType.tribe, ServerComponentType.turret, ServerComponentType.aiHelper, ServerComponentType.slingTurret] as const,
   [EntityType.tunnel]: [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.structure, ServerComponentType.tribe, ServerComponentType.tunnel, ServerComponentType.buildingMaterial] as const,
   [EntityType.healingTotem]: [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.structure, ServerComponentType.tribe, ServerComponentType.healingTotem] as const,
   [EntityType.treePlanted]: [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.planted, ServerComponentType.treePlanted] as const,
   [EntityType.berryBushPlanted]: [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.planted, ServerComponentType.berryBushPlanted] as const,
   [EntityType.iceSpikesPlanted]: [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.planted, ServerComponentType.iceSpikesPlanted] as const,
   [EntityType.fence]: [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.structure, ServerComponentType.tribe, ServerComponentType.fence] as const,
   [EntityType.fenceGate]: [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.structure, ServerComponentType.tribe, ServerComponentType.fenceGate] as const,
   [EntityType.frostshaper]: [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.structure, ServerComponentType.craftingStation] as const,
   [EntityType.stonecarvingTable]: [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.structure, ServerComponentType.craftingStation] as const,
   [EntityType.grassStrand]: [ServerComponentType.transform, ServerComponentType.layeredRod] as const,
   [EntityType.decoration]: [ServerComponentType.transform, ServerComponentType.decoration] as const,
   [EntityType.reed]: [ServerComponentType.transform, ServerComponentType.layeredRod] as const,
   [EntityType.lilypad]: [ServerComponentType.transform] as const,
   [EntityType.fibrePlant]: [ServerComponentType.transform, ServerComponentType.statusEffect, ServerComponentType.health] as const,
   [EntityType.guardian]: [ServerComponentType.transform, ServerComponentType.physics, ServerComponentType.statusEffect, ServerComponentType.health, ServerComponentType.aiHelper, ServerComponentType.guardian],
   [EntityType.guardianGemQuake]: [ServerComponentType.transform, ServerComponentType.guardianGemQuake],
   [EntityType.guardianGemFragmentProjectile]: [ServerComponentType.transform, ServerComponentType.physics, ServerComponentType.guardianGemFragmentProjectile],
   [EntityType.guardianSpikyBall]: [ServerComponentType.transform, ServerComponentType.physics, ServerComponentType.statusEffect, ServerComponentType.health, ServerComponentType.guardianSpikyBall],
   [EntityType.bracings]: [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.structure, ServerComponentType.tribe, ServerComponentType.buildingMaterial, ServerComponentType.bracings],
   [EntityType.fireTorch]: [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.structure, ServerComponentType.tribe, ServerComponentType.fireTorch],
   [EntityType.spikyBastard]: [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.spikyBastard],
   [EntityType.glurb]: [ServerComponentType.transform, ServerComponentType.physics, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.glurb],
   [EntityType.slurbTorch]: [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.structure, ServerComponentType.tribe, ServerComponentType.slurbTorch],
   [EntityType.treeRootBase]: [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.treeRootBase],
   [EntityType.treeRootSegment]: [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.treeRootSegment],
   [EntityType.mithrilOreNode]: [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.mithrilOreNode],
   [EntityType.scrappy]: [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.scrappy],
   [EntityType.cogwalker]: [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.cogwalker],
   [EntityType.automatonAssembler]: [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.structure, ServerComponentType.craftingStation, ServerComponentType.automatonAssembler],
   [EntityType.mithrilAnvil]: [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.structure, ServerComponentType.craftingStation, ServerComponentType.mithrilAnvil],
} satisfies Record<EntityType, ReadonlyArray<ServerComponentType>>;

export type EntityComponentTypes<T extends EntityType> = typeof EntityComponents[T];

interface BaseComponentData {
   readonly componentType: ServerComponentType;
}

/* AI Helper Component */
export interface AIHelperComponentData extends BaseComponentData {
   readonly componentType: ServerComponentType.aiHelper;
   readonly visionRange: number;
}

/* Berry Bush Component */

export interface BerryBushComponentData extends BaseComponentData {
   readonly componentType: ServerComponentType.berryBush;
   readonly numBerries: number;
}

/* Blueprint Component */

export enum BlueprintType {
   stoneWall,
   woodenDoor,
   stoneDoor,
   stoneDoorUpgrade,
   woodenEmbrasure,
   stoneEmbrasure,
   stoneEmbrasureUpgrade,
   woodenTunnel,
   stoneTunnel,
   stoneTunnelUpgrade,
   ballista,
   slingTurret,
   stoneFloorSpikes,
   stoneWallSpikes,
   warriorHutUpgrade,
   fenceGate,
   stoneBracings,
   scrappy,
   cogwalker
}

export interface BlueprintComponentData extends BaseComponentData {
   readonly componentType: ServerComponentType.blueprint;
   readonly blueprintType: BlueprintType;
   readonly buildProgress: number;
   readonly associatedEntityID: number;
}

/* Boulder Component */

export interface BoulderComponentData extends BaseComponentData {
   readonly componentType: ServerComponentType.boulder;
   readonly boulderType: number;
}

/* Cactus Component */

export interface CactusComponentData extends BaseComponentData {
   readonly componentType: ServerComponentType.cactus;
   readonly flowers: ReadonlyArray<CactusBodyFlowerData>;
   readonly limbs: ReadonlyArray<CactusLimbData>;
}

/* Cooking Component */

export interface CookingComponentData extends BaseComponentData {
   readonly componentType: ServerComponentType.cooking;
   readonly heatingProgress: number;
   readonly isCooking: boolean;
}

/* Cow Component */

export interface CowComponentData extends BaseComponentData {
   readonly componentType: ServerComponentType.cow;
   readonly species: CowSpecies;
   readonly grazeProgress: number;
}

/* Door Component */

export interface DoorComponentData extends BaseComponentData {
   readonly componentType: ServerComponentType.door;
   readonly toggleType: DoorToggleType;
   readonly openProgress: number;
}

/* Fish Component */

export interface FishComponentData extends BaseComponentData {
   readonly componentType: ServerComponentType.fish;
   readonly colour: FishColour;
}

/* Frozen Yeti Component */

export interface FrozenYetiComponentData extends BaseComponentData {
   readonly componentType: ServerComponentType.frozenYeti;
   readonly attackType: FrozenYetiAttackType;
   readonly attackStage: number;
   readonly stageProgress: number;
   readonly rockSpikePositions: Array<[number, number]>;
}

/* Golem Component */

export interface GolemComponentData extends BaseComponentData {
   readonly componentType: ServerComponentType.golem;
   readonly wakeProgress: number;
   readonly ticksAwake: number;
   readonly isAwake: boolean;
}

/* Health Component */

export interface HealthComponentData extends BaseComponentData {
   readonly componentType: ServerComponentType.health;
   readonly health: number;
   readonly maxHealth: number;
}

/* Hut Component */

export interface HutComponentData extends BaseComponentData {
   readonly componentType: ServerComponentType.hut;
   readonly lastDoorSwingTicks: number;
   readonly isRecalling: boolean;
}

// @Cleanup: don't send these

/* Ice Shard Component */

export interface IceShardComponentData extends BaseComponentData {
   readonly componentType: ServerComponentType.iceShard;
}

/* Ice Spikes Component */

export interface IceSpikesComponentData extends BaseComponentData {
   readonly componentType: ServerComponentType.iceSpikes;
}

/* Inventory Component */

export interface InventoryComponentData extends BaseComponentData {
   readonly componentType: ServerComponentType.inventory;
   readonly inventories: Partial<Record<InventoryName, Inventory>>;
}

/* Item Component */

export interface ItemComponentData extends BaseComponentData {
   readonly componentType: ServerComponentType.item;
   readonly itemType: ItemType;
}

/* Pebblum Component */

export interface PebblumComponentData extends BaseComponentData {
   readonly componentType: ServerComponentType.pebblum;
}

/* Physics Component */

export interface PhysicsComponentData extends BaseComponentData {
   readonly componentType: ServerComponentType.physics;
   readonly velocity: [number, number];
   readonly acceleration: [number, number];
}

/* Player Component */

export interface PlayerComponentData extends BaseComponentData {
   readonly componentType: ServerComponentType.player;
   readonly username: string;
}

/* Rock Spike Component */

export interface RockSpikeProjectileComponentData extends BaseComponentData {
   readonly componentType: ServerComponentType.rockSpike;
   readonly size: RockSpikeProjectileSize;
   readonly lifetime: number;
}

/* Slime Component */

export interface SlimeComponentData extends BaseComponentData {
   readonly componentType: ServerComponentType.slime;
   readonly size: SlimeSize;
   readonly eyeRotation: number;
   readonly orbSizes: ReadonlyArray<SlimeSize>;
   readonly anger: number;
   readonly spitChargeProgress: number;
}

/* Slime Spit Component */

export interface SlimeSpitComponentData extends BaseComponentData {
   readonly componentType: ServerComponentType.slimeSpit;
   readonly size: number;
}

/* Slimewisp Component */

export interface SlimewispComponentData extends BaseComponentData {
   readonly componentType: ServerComponentType.slimewisp;
}

/* Snowball Component */

export interface SnowballComponentData extends BaseComponentData {
   readonly componentType: ServerComponentType.snowball;
   readonly size: SnowballSize;
}

/* Status Effect Component */

export interface StatusEffectComponentData extends BaseComponentData {
   readonly componentType: ServerComponentType.statusEffect;
   readonly statusEffects: Array<StatusEffectData>;
}

// @Cleanup: remove
/* Throwing Projectile Component */

export interface ThrowingProjectileComponentData extends BaseComponentData {
   readonly componentType: ServerComponentType.throwingProjectile;
}

/* Tombstone Component */

export interface TombstoneComponentData extends BaseComponentData {
   readonly componentType: ServerComponentType.tombstone;
   readonly tombstoneType: number;
   readonly zombieSpawnProgress: number;
   readonly zombieSpawnX: number;
   readonly zombieSpawnY: number;
   readonly deathInfo: DeathInfo | null;
}

/* Totem Banner Component */

export interface TotemBannerComponentData extends BaseComponentData {
   readonly componentType: ServerComponentType.totemBanner;
   readonly banners: Array<TribeTotemBanner>;
}

/* Tree Component */

export interface TreeComponentData extends BaseComponentData {
   readonly componentType: ServerComponentType.tree;
   readonly treeSize: TreeSize;
}

/* Tribe Component */

export interface TribeComponentData extends BaseComponentData {
   readonly componentType: ServerComponentType.tribe;
   readonly tribeID: number;
}

/* Tribe Member Component */

export interface TribeMemberComponentData extends BaseComponentData {
   readonly componentType: ServerComponentType.tribeMember;
   readonly warPaintType: number | null;
   readonly titles: ReadonlyArray<TitleGenerationInfo>;
}

/* Tribesman Component */

export enum TribesmanAIType {
   escaping,
   attacking,
   harvestingResources,
   pickingUpDroppedItems,
   haulingResources,
   grabbingFood,
   patrolling,
   eating,
   repairing,
   assistingOtherTribesmen,
   building,
   crafting,
   researching,
   giftingItems,
   idle,
   recruiting,
   planting,
   changeLayers,
   moveToBiome
}

export interface TribesmanAIComponentData extends BaseComponentData {
   readonly componentType: ServerComponentType.tribesmanAI;
   // @Cleanup: just send a string.
   readonly name: number;
   readonly untitledDescriptor: number;
   readonly currentAIType: TribesmanAIType;
   readonly relationsWithPlayer: number;

   readonly craftingProgress: number;
   readonly craftingItemType: ItemType;
}

/* Turret Component */

// @Robustness
export type TurretEntityType = EntityType.slingTurret | EntityType.ballista;

export type TurretAmmoType = ItemType.wood | ItemType.rock | ItemType.slimeball | ItemType.frostcicle;
export const TURRET_AMMO_TYPES: Record<TurretEntityType, ReadonlyArray<TurretAmmoType>> = {
   [EntityType.slingTurret]: [ItemType.rock],
   [EntityType.ballista]: [ItemType.wood, ItemType.rock, ItemType.slimeball, ItemType.frostcicle]
};

/* Yeti Component */

export interface YetiComponentData extends BaseComponentData {
   readonly componentType: ServerComponentType.yeti;
   readonly attackProgress: number;
}

/* Zombie Component */

export interface ZombieComponentData extends BaseComponentData {
   readonly componentType: ServerComponentType.zombie;
   readonly zombieType: number;
}

/* Ammo Box Component */

export interface AmmoBoxComponentData extends BaseComponentData {
   readonly componentType: ServerComponentType.ammoBox;
   readonly ammoType: TurretAmmoType;
   readonly ammoRemaining: number;
}

/* Escape AI Component */

export interface EscapeAIComponentData extends BaseComponentData {
   readonly componentType: ServerComponentType.escapeAI;
   /** IDs of all entities attacking the entity */
   readonly attackingEntityIDs: Array<number>;
   readonly attackEntityTicksSinceLastAttack: Array<number>;
}

/* Follow AI Component */

export interface FollowAIComponentData extends BaseComponentData {
   readonly componentType: ServerComponentType.followAI;
   /** ID of the followed entity */
   readonly followTargetID: number;
   readonly followCooldownTicks: number;
   /** Keeps track of how long the mob has been interested in its target */
   readonly interestTimer: number;
}

/* Research Bench Component */

export interface ResearchBenchComponentData extends BaseComponentData {
   readonly componentType: ServerComponentType.researchBench;
   readonly isOccupied: boolean;
}

/* Spikes Component */

export interface SpikesComponentData extends BaseComponentData {
   readonly componentType: ServerComponentType.spikes;
   readonly isCovered: boolean;
}

/* Tunnel Component */

export const enum TunnelDoorSide {
   top = 0b01,
   bottom = 0b10
}

export type TunnelDoorSides = TunnelDoorSide.top | TunnelDoorSide.bottom;

export interface TunnelComponentData extends BaseComponentData {
   readonly componentType: ServerComponentType.tunnel;
   /** 1st bit = door at top, 2nd bit = door at bottom */
   readonly doorBitset: TunnelDoorSides;
   readonly topDoorOpenProgress: number;
   readonly bottomDoorOpenProgress: number;
}

/* Building Material Component Data */

export enum BuildingMaterial {
   wood,
   stone
}

export interface BuildingMaterialComponentData extends BaseComponentData {
   readonly componentType: ServerComponentType.buildingMaterial;
   readonly material: BuildingMaterial;
}

export const MATERIAL_TO_ITEM_MAP: Record<BuildingMaterial, ItemType> = {
   [BuildingMaterial.wood]: ItemType.wood,
   [BuildingMaterial.stone]: ItemType.rock
};

/* Tribe Warrior Component Data */

export interface ScarInfo {
   readonly offsetX: number;
   readonly offsetY: number;
   readonly rotation: number;
   readonly type: number;
}

export interface TribeWarriorComponentData extends BaseComponentData {
   readonly componentType: ServerComponentType.tribeWarrior;
   readonly scars: ReadonlyArray<ScarInfo>;
}

/* Healing Totem Component Data */

export interface HealingTotemTargetData {
   readonly entityID: number;
   readonly x: number;
   readonly y: number;
   readonly ticksHealed: number;
}

export interface HealingTotemComponentData extends BaseComponentData {
   readonly componentType: ServerComponentType.healingTotem;
   readonly healingTargetsData: ReadonlyArray<HealingTotemTargetData>;
}

/* Structure Component Data */

export interface StructureComponentData extends BaseComponentData {
   readonly componentType: ServerComponentType.structure;
   readonly hasActiveBlueprint: boolean;
   readonly connectedSidesBitset: number;
}

/* Fence Component Data */

export interface FenceComponentData extends BaseComponentData {
   readonly componentType: ServerComponentType.fence;
}

/* Fence Gate Component Data */

export interface FenceGateComponentData extends BaseComponentData {
   readonly componentType: ServerComponentType.fenceGate;
   readonly toggleType: DoorToggleType;
   readonly openProgress: number;
}

/* Crafting Station Component Data */

export interface CraftingStationComponentData extends BaseComponentData {
   readonly componentType: ServerComponentType.craftingStation;
   readonly craftingStation: CraftingStation;
}

/* Transform Component Data */

export interface TransformComponentData extends BaseComponentData {
   readonly componentType: ServerComponentType.transform;
   readonly position: [number, number];
   readonly rotation: number;
   readonly rectangularHitboxes: ReadonlyArray<RectangularHitboxData>;
   readonly circularHitboxes: ReadonlyArray<CircularHitboxData>;
   readonly ageTicks: number;
   readonly collisionBit: number;
   readonly collisionMask: number;
}

/* Projectile Component Data */

export interface ProjectileComponentData extends BaseComponentData {
   readonly componentType: ServerComponentType.projectile;
}

/* Layered Rod Component Data */

export interface LayeredRodComponentData extends BaseComponentData {
   readonly componentType: ServerComponentType.layeredRod;
   readonly numLayers: number;
   readonly bend: [number, number];
   readonly colour: Colour;
}

/* Decoration Component Data */

export enum DecorationType {
   pebble,
   rock,
   sandstoneRock,
   sandstoneRockBig1,
   sandstoneRockBig2,
   blackRockSmall,
   blackRock,
   snowPile,
   flower1,
   flower2,
   flower3,
   flower4
}

// @Cleanup: Should these be here?

// export const enum BallistaProjectileType {
//    woodenBolt,
//    rock,
//    slimeball,
//    frostcicle
// }

export interface ArrowStatusEffectInfo {
   readonly type: StatusEffect;
   readonly durationTicks: number;
}

export interface GenericAmmoInfo {
   // readonly projectileType: BallistaProjectileType;
   readonly damage: number;
   readonly knockback: number;
   readonly shotCooldownTicks: number;
   readonly reloadTimeTicks: number;
   readonly projectileSpeed: number;
   readonly hitboxWidth: number;
   readonly hitboxHeight: number;
   readonly ammoMultiplier: number;
   readonly statusEffect: ArrowStatusEffectInfo | null;
}

export const AMMO_INFO_RECORD: Record<TurretAmmoType, GenericAmmoInfo> = {
   [ItemType.wood]: {
      // projectileType: BallistaProjectileType.woodenBolt,
      damage: 5,
      knockback: 150,
      shotCooldownTicks: 2.5 * Settings.TPS,
      reloadTimeTicks: Math.floor(0.4 * Settings.TPS),
      projectileSpeed: 1100,
      hitboxWidth: 12,
      hitboxHeight: 80,
      ammoMultiplier: 3,
      statusEffect: null
   },
   [ItemType.rock]: {
      // projectileType: GenericArrowType.ballistaRock,
      damage: 8,
      knockback: 350,
      shotCooldownTicks: 3 * Settings.TPS,
      reloadTimeTicks: Math.floor(0.5 * Settings.TPS),
      projectileSpeed: 1000,
      hitboxWidth: 12,
      hitboxHeight: 80,
      ammoMultiplier: 3,
      statusEffect: null
   },
   [ItemType.slimeball]: {
      // projectileType: GenericArrowType.ballistaSlimeball,
      damage: 3,
      knockback: 0,
      shotCooldownTicks: 2 * Settings.TPS,
      reloadTimeTicks: Math.floor(0.4 * Settings.TPS),
      projectileSpeed: 800,
      hitboxWidth: 12,
      hitboxHeight: 80,
      ammoMultiplier: 4,
      statusEffect: {
         type: StatusEffect.poisoned,
         durationTicks: 2.5 * Settings.TPS
      }
   },
   [ItemType.frostcicle]: {
      // projectileType: GenericArrowType.ballistaFrostcicle,
      damage: 1,
      knockback: 50,
      shotCooldownTicks: 0.5 * Settings.TPS,
      reloadTimeTicks: Math.floor(0.15 * Settings.TPS),
      projectileSpeed: 1500,
      hitboxWidth: 12,
      hitboxHeight: 80,
      ammoMultiplier: 6,
      statusEffect: {
         type: StatusEffect.freezing,
         durationTicks: 1 * Settings.TPS
      }
   }
}
















// @Cleanup: Should be defined in server
export const enum GuardianAttackType {
   none,
   crystalSlam,
   crystalBurst,
   summonSpikyBalls
}

// @Cleanup: Should be defined in server
export const enum GuardianCrystalSlamStage {
   windup,
   slam,
   return
}

// @Cleanup: Should be defined in server
export const enum GuardianCrystalBurstStage {
   windup,
   burst,
   return
}

// @Cleanup: Should be defined in server
export const enum GuardianSpikyBallSummonStage {
   windup,
   focus,
   return
}