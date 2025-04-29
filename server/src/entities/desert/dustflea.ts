import { Biome } from "../../../../shared/src/biomes";
import { HitboxCollisionType } from "../../../../shared/src/boxes/boxes";
import CircularBox from "../../../../shared/src/boxes/CircularBox";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/src/collision";
import { ServerComponentType } from "../../../../shared/src/components";
import { Entity, EntityType } from "../../../../shared/src/entities";
import { Settings } from "../../../../shared/src/settings";
import { angle, getAbsAngleDiff, Point } from "../../../../shared/src/utils";
import { turnToPosition } from "../../ai-shared";
import { DustfleaHibernateAI } from "../../ai/DustfleaHibernateAI";
import { EscapeAI } from "../../ai/EscapeAI";
import { FollowAI } from "../../ai/FollowAI";
import WanderAI from "../../ai/WanderAI";
import { EntityConfig } from "../../components";
import { AIHelperComponent, AIType } from "../../components/AIHelperComponent";
import { AttackingEntitiesComponent } from "../../components/AttackingEntitiesComponent";
import { DustfleaComponent } from "../../components/DustfleaComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { PhysicsComponent } from "../../components/PhysicsComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { addHitboxToTransformComponent, TransformComponent, TransformComponentArray } from "../../components/TransformComponent";
import { applyAbsoluteKnockback, createHitbox, Hitbox } from "../../hitboxes";
import Layer from "../../Layer";
import { getEntityAgeTicks, getEntityType } from "../../world";

function wanderPositionIsValid(_entity: Entity, layer: Layer, x: number, y: number): boolean {
   const biome = layer.getBiomeAtPosition(x, y);
   return biome === Biome.desert || biome === Biome.desertOasis;
}

const move = (dustflea: Entity, acceleration: number, turnSpeed: number, x: number, y: number): void => {
   turnToPosition(dustflea, x, y, turnSpeed, 0.8);
   
   const ageTicks = getEntityAgeTicks(dustflea);
   if ((ageTicks + dustflea) % Math.floor(Settings.TPS / 2.3) === 0) {
      const transformComponent = TransformComponentArray.getComponent(dustflea);
      const hitbox = transformComponent.children[0] as Hitbox;
      
      const direction = angle(x - hitbox.box.position.x, y - hitbox.box.position.y);
      applyAbsoluteKnockback(dustflea, hitbox, 125, direction);
   }
}

const extraEscapeCondition = (dustflea: Entity, escapeTarget: Entity): boolean => {
   if (getEntityType(escapeTarget) !== EntityType.krumblid) {
      return false;
   }

   const dustfleaTransformComponent = TransformComponentArray.getComponent(dustflea);
   const dustfleaHitbox = dustfleaTransformComponent.children[0] as Hitbox;

   const escapeTargetTransformComponent = TransformComponentArray.getComponent(escapeTarget);
   const escapeTargetHitbox = escapeTargetTransformComponent.children[0] as Hitbox;

   const angleFromEscapeTarget = escapeTargetHitbox.box.position.calculateAngleBetween(dustfleaHitbox.box.position);

   return getAbsAngleDiff(angleFromEscapeTarget, escapeTargetHitbox.box.angle) < 0.4;
}

export function createDustfleaConfig(position: Point, angle: number): EntityConfig {
   const transformComponent = new TransformComponent();

   const hitbox = createHitbox(transformComponent, null, new CircularBox(position, new Point(0, 0), angle, 8), 0.2, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   addHitboxToTransformComponent(transformComponent, hitbox);
   
   const physicsComponent = new PhysicsComponent();

   const statusEffectComponent = new StatusEffectComponent(0);

   const healthComponent = new HealthComponent(2);

   const aiHelperComponent = new AIHelperComponent(hitbox, 180, move);
   aiHelperComponent.ais[AIType.wander] = new WanderAI(200, 4 * Math.PI, 99999, wanderPositionIsValid);
   aiHelperComponent.ais[AIType.follow] = new FollowAI(4 * Settings.TPS, 6 * Settings.TPS, 1, 80);
   aiHelperComponent.ais[AIType.escape] = new EscapeAI(200, 4 * Math.PI, 1, extraEscapeCondition);
   aiHelperComponent.ais[AIType.dustfleaHibernate] = new DustfleaHibernateAI(200, 4 * Math.PI);
   // aiHelperComponent.ais[AIType.hoppingMovementAI] = new HoppingMovementAI();
   
   const attackingEntitiesComponent = new AttackingEntitiesComponent(3 * Settings.TPS);
   
   const dustfleaComponent = new DustfleaComponent();
   
   return {
      entityType: EntityType.dustflea,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.aiHelper]: aiHelperComponent,
         [ServerComponentType.attackingEntities]: attackingEntitiesComponent,
         [ServerComponentType.dustflea]: dustfleaComponent
      },
      lights: []
   };
}