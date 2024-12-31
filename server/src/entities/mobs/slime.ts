import { DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { SlimeSize, EntityType, Entity } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { StatusEffect } from "battletribes-shared/status-effects";
import { Point, lerp } from "battletribes-shared/utils";
import { HealthComponent } from "../../components/HealthComponent";
import { SlimeComponent, SlimeComponentArray } from "../../components/SlimeComponent";
import { getEntitiesInRange } from "../../ai-shared";
import Layer from "../../Layer";
import { ServerComponentType } from "battletribes-shared/components";
import { CraftingStation } from "battletribes-shared/items/crafting-recipes";
import { EntityConfig } from "../../components";
import { TransformComponent } from "../../components/TransformComponent";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import { AIHelperComponent, AIType } from "../../components/AIHelperComponent";
import WanderAI from "../../ai/WanderAI";
import { Biome } from "battletribes-shared/biomes";
import { PhysicsComponent } from "../../components/PhysicsComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { CraftingStationComponent } from "../../components/CraftingStationComponent";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.aiHelper
   | ServerComponentType.slime
   | ServerComponentType.craftingStation;

export interface SlimeEntityAnger {
   angerAmount: number;
   readonly target: Entity;
}

export const SLIME_RADII: ReadonlyArray<number> = [32, 44, 60];
export const SLIME_MERGE_WEIGHTS: ReadonlyArray<number> = [2, 5, 11];
export const SLIME_MAX_MERGE_WANT: ReadonlyArray<number> = [15 * Settings.TPS, 40 * Settings.TPS, 75 * Settings.TPS];

export const SLIME_MERGE_TIME = 7.5;

export const SPIT_COOLDOWN_TICKS = 4 * Settings.TPS;
export const SPIT_CHARGE_TIME_TICKS = SPIT_COOLDOWN_TICKS + Math.floor(0.8 * Settings.TPS);

const MAX_HEALTH: ReadonlyArray<number> = [10, 20, 35];
export const SLIME_SPEED_MULTIPLIERS: ReadonlyArray<number> = [2.5, 1.75, 1];
const VISION_RANGES = [200, 250, 300];

function positionIsValidCallback(_entity: Entity, layer: Layer, x: number, y: number): boolean {
   return !layer.positionHasWall(x, y) && layer.getBiomeAtPosition(x, y) === Biome.swamp;
}

export function createSlimeConfig(size: SlimeSize): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent();
   const hitbox = createHitbox(new CircularBox(new Point(0, 0), 0, SLIME_RADII[size]), 1 + size * 0.5, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox, null);
   
   const physicsComponent = new PhysicsComponent();
   
   const healthComponent = new HealthComponent(MAX_HEALTH[size]);

   const statusEffectComponent = new StatusEffectComponent(StatusEffect.poisoned);
   
   const aiHelperComponent = new AIHelperComponent(VISION_RANGES[size])
   aiHelperComponent.ais[AIType.wander] = new WanderAI(150 * SLIME_SPEED_MULTIPLIERS[size], 2 * Math.PI, 0.5, positionIsValidCallback)
   
   const slimeComponent = new SlimeComponent(size);

   const craftingStationComponent = new CraftingStationComponent(CraftingStation.slime);
   
   return {
      entityType: EntityType.slime,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.aiHelper]: aiHelperComponent,
         [ServerComponentType.slime]: slimeComponent,
         [ServerComponentType.craftingStation]: craftingStationComponent
      },
      lights: []
   };
}