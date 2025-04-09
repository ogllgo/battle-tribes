import CircularBox from "../../../shared/src/boxes/CircularBox";
import { ServerComponentType } from "../../../shared/src/components";
import { Entity, EntityType } from "../../../shared/src/entities";
import { Settings } from "../../../shared/src/settings";
import { Point, randInt } from "../../../shared/src/utils";
import { createEntityConfigAttachInfoWithTether } from "../components";
import { AIHelperComponent, AIType } from "../components/AIHelperComponent";
import { HealthComponentArray } from "../components/HealthComponent";
import { SandBallComponentArray } from "../components/SandBallComponent";
import { entityChildIsEntity, removeAttachedEntity, TransformComponent, TransformComponentArray } from "../components/TransformComponent";
import { createSandBallConfig } from "../entities/desert/sand-ball";
import { createEntity } from "../Entity";
import { applyAccelerationFromGround, Hitbox, turnHitboxToAngle, AngularTetherInfo, addHitboxAngularAcceleration } from "../hitboxes";
import { getEntityAgeTicks, getEntityLayer, getEntityType } from "../world";

export class SandBallingAI {
   public readonly acceleration: number;
   public readonly turnSpeed: number;

   public ballingInterestCooldownTicks = randInt(MIN_BALLING_COOLDOWN_TICKS, MAX_BALLING_COOLDOWN_TICKS);

   public remainingBallTimeTicks = 0;

   public isTurningClockwise = true;
   
   constructor(acceleration: number, turnSpeed: number) {
      this.acceleration = acceleration;
      this.turnSpeed = turnSpeed;
   }
}

const MIN_BALLING_COOLDOWN_TICKS = 30 * Settings.TPS;
const MAX_BALLING_COOLDOWN_TICKS = 40 * Settings.TPS;

const MIN_BALL_TIME_TICKS = 6.5 * Settings.TPS;
const MAX_BALL_TIME_TICKS = 10 * Settings.TPS;

const SAND_BALL_GROW_RATE = 1;

export function updateSandBallingAI(sandBallingAI: SandBallingAI): void {
   if (sandBallingAI.ballingInterestCooldownTicks > 0) {
      sandBallingAI.ballingInterestCooldownTicks--;
   }
}

export function shouldRunSandBallingAI(sandBallingAI: SandBallingAI): boolean {
   return sandBallingAI.ballingInterestCooldownTicks === 0;
}

export function getSandBallMass(sizeInteger: number): number {
   return 0.2 * sizeInteger;
}

const getCurrentSandBall = (transformComponent: TransformComponent): Entity | null => {
   for (const child of transformComponent.children) {
      if (entityChildIsEntity(child) && getEntityType(child.attachedEntity) === EntityType.sandBall) {
         return child.attachedEntity;
      }
   }
   return null;
}

export function runSandBallingAI(entity: Entity, aiHelperComponent: AIHelperComponent, sandBallingAI: SandBallingAI): void {
   aiHelperComponent.currentAIType = AIType.sandBalling;

   const entityTransformComponent = TransformComponentArray.getComponent(entity);
   const entityHitbox = entityTransformComponent.children[0] as Hitbox;

   const currentSandBall = getCurrentSandBall(entityTransformComponent);
   if (currentSandBall !== null) {
      // Continue ballin in the lords name

      const sandBall = currentSandBall;

      const sandBallTransformComponent = TransformComponentArray.getComponent(sandBall);
      const sandBallHitbox = sandBallTransformComponent.children[0] as Hitbox;

      if ((getEntityAgeTicks(entity) % Math.floor(Settings.TPS / 2)) === 0 && Math.random() < 0.5 / (Settings.TPS / 2)) {
         sandBallingAI.isTurningClockwise = !sandBallingAI.isTurningClockwise;
      }

      // switche
      if (sandBallingAI.isTurningClockwise) {
         addHitboxAngularAcceleration(entityHitbox, 1);
         addHitboxAngularAcceleration(sandBallHitbox, 1);
      } else {
         addHitboxAngularAcceleration(entityHitbox, -1);
         addHitboxAngularAcceleration(sandBallHitbox, -1);
      }

      // move forwards
      const accelerationX = sandBallingAI.acceleration * Math.sin(entityHitbox.box.angle);
      const accelerationY = sandBallingAI.acceleration * Math.cos(entityHitbox.box.angle);
      applyAccelerationFromGround(entity, entityHitbox, accelerationX, accelerationY);

      const sandBallComponent = SandBallComponentArray.getComponent(sandBall);

      const previousSizeCategory = Math.floor(sandBallComponent.size);
      
      // grow balls
      sandBallComponent.size += SAND_BALL_GROW_RATE / Settings.TPS / sandBallComponent.size;
      if (sandBallComponent.size > 6) {
         sandBallComponent.size = 6;
         removeAttachedEntity(entity, currentSandBall);
      }

      const newSizeCategory = Math.floor(sandBallComponent.size);
      if (newSizeCategory !== previousSizeCategory) {
         const healthComponent = HealthComponentArray.getComponent(sandBall);
         healthComponent.maxHealth++;
         healthComponent.health++;
         (sandBallHitbox.box as CircularBox).radius += 2;
         sandBallHitbox.mass = getSandBallMass(newSizeCategory);
         sandBallTransformComponent.isDirty = true;
      }

      // Wiggle mandibles
      for (let i = 0; i < 2; i++) {
         // @Hack
         const mandibleHitbox = entityTransformComponent.children[i + 1] as Hitbox;
         const idealAngle = ((getEntityAgeTicks(entity) * 3.2 + (i === 0 ? Settings.TPS * 0.35 : 0)) % Settings.TPS) / Settings.TPS < 0.5 ? -Math.PI * 0.3 : Math.PI * 0.1;
         turnHitboxToAngle(mandibleHitbox, idealAngle, 3 * Math.PI, 0.5, true);
      }
   } else {
      // Start a new ball

      const offsetMagnitude = 32;
      const x = entityHitbox.box.position.x + offsetMagnitude * Math.sin(entityHitbox.box.angle);
      const y = entityHitbox.box.position.y + offsetMagnitude * Math.cos(entityHitbox.box.angle);
      
      const ballConfig = createSandBallConfig(new Point(x, y), entityHitbox.box.angle);

      const ballHitbox = ballConfig.components[ServerComponentType.transform]!.children[0] as Hitbox;
      const angularTether: AngularTetherInfo = {
         originHitbox: entityHitbox,
         springConstant: 10,
         angularDamping: 0.4,
         padding: 0
      };
      ballHitbox.angularTethers.push(angularTether);

      ballConfig.attachInfo = createEntityConfigAttachInfoWithTether(entity, entityHitbox, 32, 10, 0.4, false, false);
      
      createEntity(ballConfig, getEntityLayer(entity), 0);
   }
}