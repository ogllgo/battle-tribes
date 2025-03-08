import { DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { Entity, EntityType } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { Point, randInt } from "battletribes-shared/utils";
import { ServerComponentType } from "battletribes-shared/components";
import { createEntityConfig, EntityConfig } from "../../components";
import { HitboxCollisionType, HitboxFlag } from "battletribes-shared/boxes/boxes";
import RectangularBox from "battletribes-shared/boxes/RectangularBox";
import WanderAI from "../../ai/WanderAI";
import { AIHelperComponent, AIType } from "../../components/AIHelperComponent";
import { Biome } from "battletribes-shared/biomes";
import Layer from "../../Layer";
import { TransformComponent } from "../../components/TransformComponent";
import { PhysicsComponent } from "../../components/PhysicsComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { EscapeAIComponent } from "../../components/EscapeAIComponent";
import { CowComponent } from "../../components/CowComponent";
import { FollowAIComponent } from "../../components/FollowAIComponent";
import { AttackingEntitiesComponent } from "../../components/AttackingEntitiesComponent";
import CircularBox from "../../../../shared/src/boxes/CircularBox";
import { createCarrySlot, RideableComponent } from "../../components/RideableComponent";
import { TamingComponent } from "../../components/TamingComponent";
import { getTamingSkill, TamingSkillID } from "../../../../shared/src/taming";
import { ItemType } from "../../../../shared/src/items/items";
import { registerEntityTamingSpec } from "../../taming-specs";
import { LootComponent, registerEntityLootOnDeath } from "../../components/LootComponent";
import { createHitbox } from "../../hitboxes";

export const enum CowVars {
   MIN_GRAZE_COOLDOWN = 15 * Settings.TPS,
   MAX_GRAZE_COOLDOWN = 30 * Settings.TPS,
   MIN_FOLLOW_COOLDOWN = 15 * Settings.TPS,
   MAX_FOLLOW_COOLDOWN = 30 * Settings.TPS
}

registerEntityTamingSpec(EntityType.cow, {
   maxTamingTier: 3,
   skillNodes: [
      {
         skill: getTamingSkill(TamingSkillID.follow),
         x: 0,
         y: 10
      },
      {
         skill: getTamingSkill(TamingSkillID.riding),
         x: -18,
         y: 30
      },
      {
         skill: getTamingSkill(TamingSkillID.move),
         x: 18,
         y: 30
      },
      {
         skill: getTamingSkill(TamingSkillID.carry),
         x: -30,
         y: 50
      },
      {
         skill: getTamingSkill(TamingSkillID.attack),
         x: 6,
         y: 50
      },
      {
         skill: getTamingSkill(TamingSkillID.shatteredWill),
         x: 30,
         y: 50
      }
   ],
   foodItemType: ItemType.berry,
   tierFoodRequirements: {
      0: 0,
      1: 5,
      2: 20,
      3: 60
   }
});

registerEntityLootOnDeath(EntityType.cow, [
   {
      itemType: ItemType.raw_beef,
      getAmount: () => randInt(2, 3)
   },
   {
      itemType: ItemType.leather,
      getAmount: () => randInt(1, 2)
   }
]);

function positionIsValidCallback(_entity: Entity, layer: Layer, x: number, y: number): boolean {
   return !layer.positionHasWall(x, y) && layer.getBiomeAtPosition(x, y) === Biome.grasslands;
}

export function createCowConfig(position: Point, rotation: number): EntityConfig {
   const transformComponent = new TransformComponent(0);

   // Body hitbox
   const bodyHitbox = createHitbox(transformComponent, null, new RectangularBox(position, new Point(0, -20), rotation, 50, 80), 1.2, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, [HitboxFlag.COW_BODY]);
   transformComponent.addHitbox(bodyHitbox, null);
   
   // Head hitbox
   const headHitbox = createHitbox(transformComponent, bodyHitbox, new CircularBox(new Point(0, 0), new Point(0, 30), 0, 30), 0.4, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, [HitboxFlag.COW_HEAD]);
   transformComponent.addHitbox(headHitbox, null);
   transformComponent.addHitboxTether(headHitbox, null, bodyHitbox, 50, 5, 0.4);

   const physicsComponent = new PhysicsComponent();

   const healthComponent = new HealthComponent(10);

   const statusEffectComponent = new StatusEffectComponent(0);

   const aiHelperComponent = new AIHelperComponent(headHitbox, 320);
   aiHelperComponent.ais[AIType.wander] = new WanderAI(200, Math.PI, 0.6, positionIsValidCallback)
   
   const attackingEntitiesComponent = new AttackingEntitiesComponent(5 * Settings.TPS);
   
   const escapeAIComponent = new EscapeAIComponent(650, Math.PI);

   const followAIComponent = new FollowAIComponent(randInt(CowVars.MIN_FOLLOW_COOLDOWN, CowVars.MAX_FOLLOW_COOLDOWN), 0.2, 60);
   
   const rideableComponent = new RideableComponent();
   rideableComponent.carrySlots.push(createCarrySlot(0, -14, 48, 0));
   
   const lootComponent = new LootComponent();
   
   const tamingComponent = new TamingComponent();
   
   const cowComponent = new CowComponent();
   
   return createEntityConfig(
      EntityType.cow,
      {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.aiHelper]: aiHelperComponent,
         [ServerComponentType.attackingEntities]: attackingEntitiesComponent,
         [ServerComponentType.escapeAI]: escapeAIComponent,
         [ServerComponentType.followAI]: followAIComponent,
         [ServerComponentType.rideable]: rideableComponent,
         [ServerComponentType.loot]: lootComponent,
         [ServerComponentType.taming]: tamingComponent,
         [ServerComponentType.cow]: cowComponent
      },
      []
   );
}