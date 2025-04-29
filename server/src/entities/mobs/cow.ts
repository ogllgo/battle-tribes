import { DEFAULT_COLLISION_MASK, CollisionBit } from "battletribes-shared/collision";
import { CowSpecies, Entity, EntityType } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { angle, getAbsAngleDiff, lerp, Point, randInt, UtilVars } from "battletribes-shared/utils";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../../components";
import { HitboxCollisionType, HitboxFlag } from "battletribes-shared/boxes/boxes";
import RectangularBox from "battletribes-shared/boxes/RectangularBox";
import WanderAI from "../../ai/WanderAI";
import { AIHelperComponent, AIType } from "../../components/AIHelperComponent";
import { Biome } from "battletribes-shared/biomes";
import Layer from "../../Layer";
import { addHitboxToTransformComponent, TransformComponent, TransformComponentArray } from "../../components/TransformComponent";
import { PhysicsComponent } from "../../components/PhysicsComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { EscapeAI } from "../../ai/EscapeAI";
import { CowComponent } from "../../components/CowComponent";
import { FollowAI } from "../../ai/FollowAI";
import { AttackingEntitiesComponent } from "../../components/AttackingEntitiesComponent";
import CircularBox from "../../../../shared/src/boxes/CircularBox";
import { createCarrySlot, RideableComponent } from "../../components/RideableComponent";
import { TamingComponent } from "../../components/TamingComponent";
import { getTamingSkill, TamingSkillID } from "../../../../shared/src/taming";
import { ItemType } from "../../../../shared/src/items/items";
import { registerEntityTamingSpec } from "../../taming-specs";
import { LootComponent, registerEntityLootOnDeath } from "../../components/LootComponent";
import { applyAccelerationFromGround, createHitbox, createHitboxTether, Hitbox } from "../../hitboxes";
import { findAngleAlignment, cleanAngleNEW } from "../../ai-shared";

const enum Vars {
   HEAD_TURN_SPEED = 0.75 * UtilVars.PI
}

export const enum CowVars {
   MIN_GRAZE_COOLDOWN = 15 * Settings.TPS,
   MAX_GRAZE_COOLDOWN = 30 * Settings.TPS
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
   return layer.getBiomeAtPosition(x, y) === Biome.grasslands;
}

const move = (cow: Entity, acceleration: number, _turnSpeed: number, turnTargetX: number, turnTargetY: number): void => {
   throw new Error();
}

export function createCowConfig(position: Point, angle: number, species: CowSpecies): EntityConfig {
   const transformComponent = new TransformComponent();

   // Body hitbox
   const bodyHitbox = createHitbox(transformComponent, null, new RectangularBox(position, new Point(0, -20), angle, 50, 80), 1.2, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.COW_BODY]);
   addHitboxToTransformComponent(transformComponent, bodyHitbox);
 
   // Head hitbox
   const headHitbox = createHitbox(transformComponent, bodyHitbox, new CircularBox(new Point(0, 0), new Point(0, 30), 0, 30), 0.4, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.COW_HEAD]);
   addHitboxToTransformComponent(transformComponent, headHitbox);

   headHitbox.tethers.push(createHitboxTether(headHitbox, bodyHitbox, 50, 5/60, 0.4, true));
   headHitbox.angularTethers.push({
      originHitbox: bodyHitbox,
      springConstant: 5/60,
      damping: 0,
      padding: Math.PI * 0.1
   });

   const physicsComponent = new PhysicsComponent();

   const healthComponent = new HealthComponent(10);

   const statusEffectComponent = new StatusEffectComponent(0);

   const aiHelperComponent = new AIHelperComponent(headHitbox, 320, move);
   aiHelperComponent.ais[AIType.wander] = new WanderAI(200, Math.PI, 0.6, positionIsValidCallback)
   aiHelperComponent.ais[AIType.escape] = new EscapeAI(650, Math.PI, 1);
   aiHelperComponent.ais[AIType.follow] = new FollowAI(15 * Settings.TPS, 30 * Settings.TPS, 0.2, 60);
   
   const attackingEntitiesComponent = new AttackingEntitiesComponent(5 * Settings.TPS);
   
   const rideableComponent = new RideableComponent();
   rideableComponent.carrySlots.push(createCarrySlot(bodyHitbox, 0, -14, 48, 0));
   
   const lootComponent = new LootComponent();
   
   const tamingComponent = new TamingComponent();
   
   const cowComponent = new CowComponent(species);
   
   return {
      entityType: EntityType.cow,
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
         [ServerComponentType.cow]: cowComponent
      },
      lights: []
   };
}