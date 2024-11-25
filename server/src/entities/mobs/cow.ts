import { DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { Entity, EntityType } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { Point, randInt } from "battletribes-shared/utils";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../../components";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
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

export const enum CowVars {
   VISION_RANGE = 256,
   MIN_GRAZE_COOLDOWN = 30 * Settings.TPS,
   MAX_GRAZE_COOLDOWN = 60 * Settings.TPS,
   MAX_HEALTH = 10,
   MIN_FOLLOW_COOLDOWN = 15 * Settings.TPS,
   MAX_FOLLOW_COOLDOWN = 30 * Settings.TPS
}

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.aiHelper
   | ServerComponentType.attackingEntities
   | ServerComponentType.escapeAI
   | ServerComponentType.followAI
   | ServerComponentType.cow;


const FOLLOW_CHANCE_PER_SECOND = 0.2;

export const COW_GRAZE_TIME_TICKS = 5 * Settings.TPS;

function positionIsValidCallback(_entity: Entity, layer: Layer, x: number, y: number): boolean {
   return !layer.positionHasWall(x, y) && layer.getBiomeAtPosition(x, y) === Biome.grasslands;
}

export function createCowConfig(): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent();
   const hitbox = createHitbox(new RectangularBox(new Point(0, 0), 50, 100, 0), 1.2, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox, null);

   const physicsComponent = new PhysicsComponent();

   const healthComponent = new HealthComponent(CowVars.MAX_HEALTH);

   const statusEffectComponent = new StatusEffectComponent(0);

   const aiHelperComponent = new AIHelperComponent(CowVars.VISION_RANGE);
   aiHelperComponent.ais[AIType.wander] = new WanderAI(200, Math.PI, 0.6, positionIsValidCallback)
   
   const attackingEntitiesComponent = new AttackingEntitiesComponent(5 * Settings.TPS);
   
   const escapeAIComponent = new EscapeAIComponent(650, Math.PI);

   const followAIComponent = new FollowAIComponent(randInt(CowVars.MIN_FOLLOW_COOLDOWN, CowVars.MAX_FOLLOW_COOLDOWN), FOLLOW_CHANCE_PER_SECOND, 60);
   
   const cowComponent = new CowComponent();
   
   return {
      entityType: EntityType.cow,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.aiHelper]: aiHelperComponent,
         [ServerComponentType.attackingEntities]: attackingEntitiesComponent,
         [ServerComponentType.escapeAI]: escapeAIComponent,
         [ServerComponentType.followAI]: followAIComponent,
         [ServerComponentType.cow]: cowComponent
      }
   };
}