import { DEFAULT_COLLISION_MASK, CollisionBit } from "battletribes-shared/collision";
import { EntityType, Entity } from "battletribes-shared/entities";
import { getTileIndexIncludingEdges, Point, randInt, TileIndex } from "battletribes-shared/utils";
import { Settings } from "battletribes-shared/settings";
import { HealthComponent } from "../../components/HealthComponent";
import { YetiComponent, YetiComponentArray } from "../../components/YetiComponent";
import Layer from "../../Layer";
import { PhysicsComponent } from "../../components/PhysicsComponent";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../../components";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { HitboxCollisionType, HitboxFlag } from "battletribes-shared/boxes/boxes";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import WanderAI from "../../ai/WanderAI";
import { AIHelperComponent, AIType } from "../../components/AIHelperComponent";
import { Biome } from "battletribes-shared/biomes";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { AttackingEntitiesComponent } from "../../components/AttackingEntitiesComponent";
import { TamingComponent } from "../../components/TamingComponent";
import { getTamingSkill, TamingSkillID } from "../../../../shared/src/taming";
import { ItemType } from "../../../../shared/src/items/items";
import { registerEntityTamingSpec } from "../../taming-specs";
import { createCarrySlot, RideableComponent } from "../../components/RideableComponent";
import { LootComponent, registerEntityLootOnDeath } from "../../components/LootComponent";
import { createHitbox } from "../../hitboxes";
import { accelerateEntityToPosition, moveEntityToPosition, turnToPosition } from "../../ai-shared";

export const YETI_SNOW_THROW_COOLDOWN = 7;

export enum SnowThrowStage {
   windup,
   hold,
   return
}

registerEntityTamingSpec(EntityType.yeti, {
   maxTamingTier: 3,
   skillNodes: [
      {
         skill: getTamingSkill(TamingSkillID.follow),
         x: 0,
         y: 10,
         parent: null,
         requiredTamingTier: 1
      },
      {
         skill: getTamingSkill(TamingSkillID.riding),
         x: -18,
         y: 30,
         parent: TamingSkillID.follow,
         requiredTamingTier: 2
      },
      {
         skill: getTamingSkill(TamingSkillID.move),
         x: 18,
         y: 30,
         parent: TamingSkillID.follow,
         requiredTamingTier: 2
      },
      {
         skill: getTamingSkill(TamingSkillID.carry),
         x: -18,
         y: 50,
         parent: TamingSkillID.riding,
         requiredTamingTier: 3
      },
      {
         skill: getTamingSkill(TamingSkillID.attack),
         x: 18,
         y: 50,
         parent: TamingSkillID.move,
         requiredTamingTier: 3
      }
   ],
   foodItemType: ItemType.raw_beef,
   tierFoodRequirements: {
      0: 0,
      1: 10,
      2: 30,
      3: 70
   }
});

registerEntityLootOnDeath(EntityType.yeti, [
   {
      itemType: ItemType.rawYetiFlesh,
      getAmount: () => randInt(4, 7)
   },
   {
      itemType: ItemType.yeti_hide,
      getAmount: () => randInt(2, 3)
   },
   {
      itemType: ItemType.deepfrost_heart,
      getAmount: () => Math.random() < 0.5 ? 1 : 0
   }
]);

function wanderPositionIsValid(entity: Entity, layer: Layer, x: number, y: number): boolean {
   const tileX = Math.floor(x / Settings.TILE_SIZE);
   const tileY = Math.floor(y / Settings.TILE_SIZE);
   const tileIndex = getTileIndexIncludingEdges(tileX, tileY);

   const yetiComponent = YetiComponentArray.getComponent(entity);
   return layer.getTileBiome(tileIndex) === Biome.tundra && yetiComponent.territory.includes(tileIndex);
}

const moveFunc = (slimewisp: Entity, pos: Point, acceleration: number): void => {
   accelerateEntityToPosition(slimewisp, pos, acceleration);
}

const turnFunc = (slimewisp: Entity, pos: Point, turnSpeed: number, turnDamping: number): void => {
   turnToPosition(slimewisp, pos, turnSpeed, turnDamping);
}

export function createYetiConfig(position: Point, rotation: number, territory: ReadonlyArray<TileIndex>): EntityConfig {
   const transformComponent = new TransformComponent();

   const bodyHitbox = createHitbox(transformComponent, null, new CircularBox(position, new Point(0, 0), rotation, 64), 3, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.YETI_BODY]);
   addHitboxToTransformComponent(transformComponent, bodyHitbox);

   const headOffset = new Point(0, 36);
   const headPosition = position.copy();
   headPosition.add(headOffset);
   const headHitbox = createHitbox(transformComponent, bodyHitbox, new CircularBox(headPosition, headOffset, 0, 28), 3, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.YETI_HEAD]);
   addHitboxToTransformComponent(transformComponent, headHitbox);
   
   const physicsComponent = new PhysicsComponent();
   
   const healthComponent = new HealthComponent(100);
   
   const statusEffectComponent = new StatusEffectComponent(0);
   
   const aiHelperComponent = new AIHelperComponent(headHitbox, 500, moveFunc, turnFunc);
   aiHelperComponent.ais[AIType.wander] = new WanderAI(100, Math.PI * 1.5, 1, 0.6, wanderPositionIsValid);
   
   const attackingEntitiesComponent = new AttackingEntitiesComponent(5 * Settings.TPS);
   
   const rideableComponent = new RideableComponent();
   rideableComponent.carrySlots.push(createCarrySlot(bodyHitbox, 0, 0, 64, 0));
   
   const lootComponent = new LootComponent();
   
   const tamingComponent = new TamingComponent();
   
   const yetiComponent = new YetiComponent(territory);
   
   return {
      entityType: EntityType.yeti,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.aiHelper]: aiHelperComponent,
         [ServerComponentType.attackingEntities]: attackingEntitiesComponent,
         [ServerComponentType.rideable]: rideableComponent,
         [ServerComponentType.loot]: lootComponent,
         [ServerComponentType.taming]: tamingComponent,
         [ServerComponentType.yeti]: yetiComponent
      },
      lights: []
   };
}