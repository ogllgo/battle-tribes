import { DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { Entity, EntityType } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { Point, randInt } from "battletribes-shared/utils";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../../components";
import { createHitbox, HitboxCollisionType, HitboxFlag } from "battletribes-shared/boxes/boxes";
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

export const enum CowVars {
   MIN_GRAZE_COOLDOWN = 30 * Settings.TPS,
   MAX_GRAZE_COOLDOWN = 60 * Settings.TPS,
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

function positionIsValidCallback(_entity: Entity, layer: Layer, x: number, y: number): boolean {
   return !layer.positionHasWall(x, y) && layer.getBiomeAtPosition(x, y) === Biome.grasslands;
}

export function createCowConfig(): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent();
   // Body hitbox
   const bodyHitbox = createHitbox(new RectangularBox(new Point(0, -20), 50, 80, 0), 1.2, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, [HitboxFlag.COW_BODY]);
   transformComponent.addStaticHitbox(bodyHitbox, null);
   // Head hitbox
   const headHitbox = createHitbox(new CircularBox(new Point(0, 22), 0, 30), 0.4, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, [HitboxFlag.COW_HEAD]);
   transformComponent.addTetheredHitbox(headHitbox, bodyHitbox, 42, 15, 0.5, null);

   const physicsComponent = new PhysicsComponent();

   const healthComponent = new HealthComponent(10);

   const statusEffectComponent = new StatusEffectComponent(0);

   const aiHelperComponent = new AIHelperComponent(256);
   aiHelperComponent.ais[AIType.wander] = new WanderAI(200, Math.PI, 0.6, positionIsValidCallback)
   
   const attackingEntitiesComponent = new AttackingEntitiesComponent(5 * Settings.TPS);
   
   const escapeAIComponent = new EscapeAIComponent(650, Math.PI);

   const followAIComponent = new FollowAIComponent(randInt(CowVars.MIN_FOLLOW_COOLDOWN, CowVars.MAX_FOLLOW_COOLDOWN), 0.2, 60);
   
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
      },
      lights: []
   };
}