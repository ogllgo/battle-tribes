import CircularBox from "../../../shared/src/boxes/CircularBox";
import { Entity } from "../../../shared/src/entities";
import { Settings } from "../../../shared/src/settings";
import { Point, randInt } from "../../../shared/src/utils";
import { getDistanceFromPointToEntity, moveEntityToEntity } from "../ai-shared";
import { HealthComponentArray } from "../components/HealthComponent";
import { SandBallComponentArray } from "../components/SandBallComponent";
import { AngularTetherInfo, attachEntityWithTether, entityIsTethered, TransformComponentArray } from "../components/TransformComponent";
import { createSandBallConfig } from "../entities/desert/sand-ball";
import { createEntity } from "../Entity";
import { applyAcceleration, Hitbox, setHitboxAngularVelocity, setHitboxIdealAngle } from "../hitboxes";
import { entityExists, getEntityAgeTicks, getEntityLayer } from "../world";

export class SandBallingAI {
   public readonly acceleration: number;
   public readonly turnSpeed: number;

   public ballingInterestCooldownTicks = randInt(MIN_BALLING_COOLDOWN_TICKS, MAX_BALLING_COOLDOWN_TICKS);

   public currentSandBall: Entity = 0;

   public isTurningClockwise = true;
   
   constructor(acceleration: number, turnSpeed: number) {
      this.acceleration = acceleration;
      this.turnSpeed = turnSpeed;
   }
}

const MIN_BALLING_COOLDOWN_TICKS = 6.5 * Settings.TPS;
const MAX_BALLING_COOLDOWN_TICKS = 10 * Settings.TPS;

const SAND_BALL_GROW_RATE = 1;

export function updateSandBallingAI(sandBallingAI: SandBallingAI): void {
   if (sandBallingAI.ballingInterestCooldownTicks > 0) {
      sandBallingAI.ballingInterestCooldownTicks--;
   }
}

export function shouldRunSandBallingAI(sandBallingAI: SandBallingAI): boolean {
   return sandBallingAI.ballingInterestCooldownTicks === 0;
}

const sandBallIsInvalid = (entity: Entity, sandBall: Entity): boolean => {
   const entityTransformComponent = TransformComponentArray.getComponent(entity);
   const entityHitbox = entityTransformComponent.children[0] as Hitbox;

   const sandBallTransformComponent = TransformComponentArray.getComponent(sandBall);

   const distance = getDistanceFromPointToEntity(entityHitbox.box.position, sandBallTransformComponent);
   return distance > 50;
}

export function getSandBallMass(sizeInteger: number): number {
   return 0.2 * sizeInteger;
}

export function runSandBallingAI(entity: Entity, sandBallingAI: SandBallingAI): void {
   // Clear invalid sand balls
   if (entityExists(sandBallingAI.currentSandBall) && sandBallIsInvalid(entity, sandBallingAI.currentSandBall)) {
      sandBallingAI.currentSandBall = 0;
   }

   const entityTransformComponent = TransformComponentArray.getComponent(entity);
   const entityHitbox = entityTransformComponent.children[0] as Hitbox;

   if (entityExists(sandBallingAI.currentSandBall)) {
      // Continue ballin in the lords name

      const sandBall = sandBallingAI.currentSandBall;

      const sandBallTransformComponent = TransformComponentArray.getComponent(sandBall);
      const sandBallHitbox = sandBallTransformComponent.children[0] as Hitbox;

      // If the ball isn't tethered, tether it
      if (!entityIsTethered(sandBall)) {
         const angularTether: AngularTetherInfo = {
            springConstant: 10,
            angularDamping: 0.4,
            padding: 0
         };
         attachEntityWithTether(sandBall, entity, entityHitbox, 32, 10, 0.4, false, false, angularTether);
      }

      if ((getEntityAgeTicks(entity) % Math.floor(Settings.TPS / 2)) === 0 && Math.random() < 0.5 / (Settings.TPS / 2)) {
         sandBallingAI.isTurningClockwise = !sandBallingAI.isTurningClockwise;
      }

      // switche
      if (sandBallingAI.isTurningClockwise) {
         setHitboxAngularVelocity(entityHitbox, 1);
         setHitboxAngularVelocity(sandBallHitbox, 0.5);
      } else {
         setHitboxAngularVelocity(entityHitbox, -1);
         setHitboxAngularVelocity(sandBallHitbox, -0.5);
      }

      // move forwards
      const accelerationX = sandBallingAI.acceleration * Math.sin(entityHitbox.box.angle);
      const accelerationY = sandBallingAI.acceleration * Math.cos(entityHitbox.box.angle);
      applyAcceleration(entity, entityHitbox, accelerationX, accelerationY);

      const sandBallComponent = SandBallComponentArray.getComponent(sandBall);

      const previousSizeCategory = Math.floor(sandBallComponent.size);
      
      // grow balls
      sandBallComponent.size += SAND_BALL_GROW_RATE / Settings.TPS / sandBallComponent.size;
      if (sandBallComponent.size > 6) {
         sandBallComponent.size = 6;
         sandBallingAI.currentSandBall = 0;
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
         const idealAngle = ((getEntityAgeTicks(entity) * 2 + (i === 0 ? Settings.TPS * 0.25 : 0)) % Settings.TPS) / Settings.TPS < 0.5 ? -Math.PI * 0.3 : Math.PI * 0.1;
         setHitboxIdealAngle(mandibleHitbox, idealAngle, 1.5 * Math.PI, true);
      }
   } else {
      // Start a new ball

      const offsetMagnitude = 32;
      const x = entityHitbox.box.position.x + offsetMagnitude * Math.sin(entityHitbox.box.angle);
      const y = entityHitbox.box.position.y + offsetMagnitude * Math.cos(entityHitbox.box.angle);
      
      const ballConfig = createSandBallConfig(new Point(x, y), entityHitbox.box.angle);
      const sandBall = createEntity(ballConfig, getEntityLayer(entity), 0);

      sandBallingAI.currentSandBall = sandBall;
   }
}