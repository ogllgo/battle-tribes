import { EntityType } from "battletribes-shared/entities";

interface ClientEntityInfo {
   readonly name: string;
   readonly internalName: string;
}

const CLIENT_ENTITY_INFO_RECORD: Record<EntityType, ClientEntityInfo> = {
   [EntityType.cow]: {
      name: "Cow",
      internalName: "cow"
   },
   [EntityType.zombie]: {
      name: "Zombie",
      internalName: "zombie"
   },
   [EntityType.tombstone]: {
      name: "Tombstone",
      internalName: "tombstone"
   },
   [EntityType.tree]: {
      name: "Tree",
      internalName: "tree"
   },
   [EntityType.workbench]: {
      name: "Workbench",
      internalName: "workbench"
   },
   [EntityType.boulder]: {
      name: "Boulder",
      internalName: "boulder"
   },
   [EntityType.berryBush]: {
      name: "Berry Bush",
      internalName: "berry-bush"
   },
   [EntityType.cactus]: {
      name: "Cactus",
      internalName: "cactus"
   },
   [EntityType.yeti]: {
      name: "Yeti",
      internalName: "yeti"
   },
   [EntityType.iceSpikes]: {
      name: "Ice Spikes",
      internalName: "ice-spikes"
   },
   [EntityType.slime]: {
      name: "Slime",
      internalName: "slime"
   },
   [EntityType.slimewisp]: {
      name: "Slimewisp",
      internalName: "slimewisp"
   },
   [EntityType.player]: {
      name: "Player",
      internalName: "player"
   },
   [EntityType.tribeWorker]: {
      name: "Tribe Worker",
      internalName: "tribe-worker"
   },
   [EntityType.tribeWarrior]: {
      name: "Tribe Warrior",
      internalName: "tribe-warrior"
   },
   [EntityType.tribeTotem]: {
      name: "Tribe Totem",
      internalName: "tribe-totem"
   },
   [EntityType.workerHut]: {
      name: "Worker Hut",
      internalName: "worker-hut"
   },
   [EntityType.warriorHut]: {
      name: "Warrior Hut",
      internalName: "warrior-hut"
   },
   [EntityType.barrel]: {
      name: "Barrel",
      internalName: "barrel"
   },
   [EntityType.campfire]: {
      name: "Campfire",
      internalName: "campfire"
   },
   [EntityType.furnace]: {
      name: "Furnace",
      internalName: "furnace"
   },
   [EntityType.snowball]: {
      name: "Snowball",
      internalName: "snowball"
   },
   [EntityType.krumblid]: {
      name: "Krumblid",
      internalName: "krumblid"
   },
   [EntityType.frozenYeti]: {
      name: "Frozen Yeti",
      internalName: "frozen-yeti"
   },
   [EntityType.fish]: {
      name: "Fish",
      internalName: "fish"
   },
   [EntityType.itemEntity]: {
      name: "Item Entity",
      internalName: "item-entity"
   },
   [EntityType.fleshSwordItemEntity]: {
      name: "Flesh Sword Item Entity",
      internalName: "flesh-sword-item-entity"
   },
   [EntityType.woodenArrow]: {
      name: "Wooden Arrow Projectile",
      internalName: "wooden-arrow-projectile"
   },
   [EntityType.ballistaFrostcicle]: {
      name: "Ballista Frostcicle Projectile",
      internalName: "ballista-frostcicle-projectile"
   },
   [EntityType.ballistaRock]: {
      name: "Ballista Rock Projectile",
      internalName: "ballista-rock-projectile"
   },
   [EntityType.ballistaSlimeball]: {
      name: "Ballista Slimeball Projectile",
      internalName: "ballista-slimeball-projectile"
   },
   [EntityType.ballistaWoodenBolt]: {
      name: "Ballista Wooden Bolt Projectile",
      internalName: "ballista-wooden-bolt-projectile"
   },
   [EntityType.slingTurretRock]: {
      name: "Sling Turret Rock Projectile",
      internalName: "sling-turret-rock-projectile"
   },
   [EntityType.iceShardProjectile]: {
      name: "Ice Shard Projectile",
      internalName: "ice-shard-projectile"
   },
   [EntityType.rockSpikeProjectile]: {
      name: "Rock Spike Projectile",
      internalName: "rock-spike-projectile"
   },
   [EntityType.spearProjectile]: {
      name: "Spear Projectile",
      internalName: "spear-projectile"
   },
   [EntityType.researchBench]: {
      name: "Research Bench",
      internalName: "research-bench"
   },
   [EntityType.wall]: {
      name: "Wall",
      internalName: "wall"
   },
   [EntityType.slimeSpit]: {
      name: "Slime Spit",
      internalName: "slime-spit"
   },
   [EntityType.spitPoisonArea]: {
      name: "Spit Poison Area",
      internalName: "spit-poison-area"
   },
   [EntityType.door]: {
      name: "Door",
      internalName: "door"
   },
   [EntityType.battleaxeProjectile]: {
      name: "Battleaxe Projectile",
      internalName: "battleaxe-projectile"
   },
   [EntityType.golem]: {
      name: "Golem",
      internalName: "golem"
   },
   [EntityType.planterBox]: {
      name: "Planter Box",
      internalName: "planter-box"
   },
   [EntityType.iceArrow]: {
      name: "Ice Arrow",
      internalName: "ice-arrow"
   },
   [EntityType.pebblum]: {
      name: "Pebblum",
      internalName: "pebblum"
   },
   [EntityType.embrasure]: {
      name: "Embrasure",
      internalName: "embrasure"
   },
   [EntityType.tunnel]: {
      name: "Tunnel",
      internalName: "tunnel"
   },
   [EntityType.floorSpikes]: {
      name: "Floor Spikes",
      internalName: "floor-spikes"
   },
   [EntityType.wallSpikes]: {
      name: "Wall Spikes",
      internalName: "wall-spikes"
   },
   [EntityType.floorPunjiSticks]: {
      name: "Floor Punji Sticks",
      internalName: "floor-punji-sticks"
   },
   [EntityType.wallPunjiSticks]: {
      name: "Wall Punji Sticks",
      internalName: "wall-punji-sticks"
   },
   [EntityType.blueprintEntity]: {
      name: "Blueprint Entity",
      internalName: "blueprint-entity"
   },
   [EntityType.ballista]: {
      name: "Ballista",
      internalName: "ballista"
   },
   [EntityType.slingTurret]: {
      name: "Sling Turret",
      internalName: "sling-turret"
   },
   [EntityType.healingTotem]: {
      name: "Healing Totem",
      internalName: "healing-totem"
   },
   [EntityType.treePlanted]: {
      name: "Planted Tree",
      internalName: "planted-tree"
   },
   [EntityType.berryBushPlanted]: {
      name: "Planted Berry Bush",
      internalName: "planted-berry-bush"
   },
   [EntityType.iceSpikesPlanted]: {
      name: "Planted Ice Spikes",
      internalName: "planted-ice-spikes"
   },
   [EntityType.fence]: {
      name: "Fence",
      internalName: "fence"
   },
   [EntityType.fenceGate]: {
      name: "Fence Gate",
      internalName: "fence-gate"
   },
   [EntityType.frostshaper]: {
      name: "Frostshaper",
      internalName: "frostshaper"
   },
   [EntityType.stonecarvingTable]: {
      name: "Stonecarving Table",
      internalName: "stonecarving-table"
   },
   [EntityType.grassStrand]: {
      name: "Grass Strand",
      internalName: "grass-strand"
   },
   [EntityType.decoration]: {
      name: "Decoration",
      internalName: "decoration"
   },
   [EntityType.reed]: {
      name: "Reed",
      internalName: "reed"
   },
   [EntityType.lilypad]: {
      name: "Lilypad",
      internalName: "lilypad"
   },
   [EntityType.fibrePlant]: {
      name: "Fibre Plant",
      internalName: "fibre-plant"
   },
   [EntityType.guardian]: {
      name: "Guardian",
      internalName: "guardian"
   },
   [EntityType.guardianGemQuake]: {
      name: "Guardian Gem Quake",
      internalName: "guardian-gem-quake"
   },
   [EntityType.guardianGemFragmentProjectile]: {
      name: "Guardian Gem Fragment Projectile",
      internalName: "guardian-gem-fragment-projectile"
   },
   [EntityType.guardianSpikyBall]: {
      name: "Guardian Spiky Ball",
      internalName: "guardian-spiky-ball"
   },
   [EntityType.bracings]: {
      name: "Bracings",
      internalName: "bracings"
   },
   [EntityType.fireTorch]: {
      name: "Fire Torch",
      internalName: "fire-torch"
   },
   [EntityType.spikyBastard]: {
      name: "Spiky Bastard",
      internalName: "spiky-bastard"
   },
   [EntityType.glurbBodySegment]: {
      name: "Glurb Body Segment",
      internalName: "glurb-body-segment"
   },
   [EntityType.glurbHeadSegment]: {
      name: "Glurb Head Segment",
      internalName: "glurb-head-segment"
   },
   [EntityType.glurb]: {
      name: "Glurb",
      internalName: "glurb"
   },
   [EntityType.slurbTorch]: {
      name: "Slurb Torch",
      internalName: "slurb-torch"
   },
   [EntityType.treeRootBase]: {
      name: "Tree Root Base",
      internalName: "tree-root-base"
   },
   [EntityType.treeRootSegment]: {
      name: "Tree Root Segment",
      internalName: "tree-root-segment"
   },
   [EntityType.mithrilOreNode]: {
      name: "Mithril Ore Node",
      internalName: "mithril-ore-node"
   },
   [EntityType.scrappy]: {
      name: "Scrappy",
      internalName: "scrappy"
   },
   [EntityType.cogwalker]: {
      name: "Cogwalker",
      internalName: "cogwalker"
   },
   [EntityType.automatonAssembler]: {
      name: "Automaton Assembler",
      internalName: "automaton-assembler"
   },
   [EntityType.mithrilAnvil]: {
      name: "Mithril Anvil",
      internalName: "mithril-anvil"
   },
   [EntityType.swingAttack]: {
      name: "Swing Attack",
      internalName: "swing-attack"
   },
   [EntityType.blockAttack]: {
      name: "Block Attack",
      internalName: "block-attack"
   },
   [EntityType.moss]: {
      name: "Moss",
      internalName: "moss"
   },
};

export default CLIENT_ENTITY_INFO_RECORD;