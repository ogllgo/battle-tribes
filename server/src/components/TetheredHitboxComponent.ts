import { Hitbox } from "../../../shared/src/boxes/boxes";
import { ServerComponentType } from "../../../shared/src/components";
import { Entity } from "../../../shared/src/entities";
import { Settings } from "../../../shared/src/settings";
import { ComponentArray } from "./ComponentArray";
import { PhysicsComponentArray } from "./PhysicsComponent";

export interface TetheredHitboxRestriction {
   readonly hitbox: Hitbox;
   
   readonly idealDistance: number;

   velocityX: number;
   velocityY: number;
}

export class TetheredHitboxComponent {
   public readonly springConstant: number;
   public readonly damping: number;

   public readonly restrictions = new Array<TetheredHitboxRestriction>();

   constructor(springConstant: number, damping: number) {
      this.springConstant = springConstant;
      this.damping = damping;
   }
}

export const TetheredHitboxComponentArray = new ComponentArray<TetheredHitboxComponent>(ServerComponentType.tetheredHitbox, true, {
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket,
   onTick: {
      func: onTick,
      tickInterval: 1
   }
});

export function addTetheredHitboxRestriction(tetheredHitboxComponent: TetheredHitboxComponent, restriction: TetheredHitboxRestriction): void {
   tetheredHitboxComponent.restrictions.push(restriction);
}

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(): void {}

function onTick(entity: Entity): void {
   const tetheredHitboxComponent = TetheredHitboxComponentArray.getComponent(entity);

   const springConstant = tetheredHitboxComponent.springConstant;
   
   // Apply the spring physics
   for (let i = 0; i < tetheredHitboxComponent.restrictions.length - 1; i++) {
      const segmentA = tetheredHitboxComponent.restrictions[i];
      const segmentB = tetheredHitboxComponent.restrictions[i + 1];

      const hitboxA = segmentA.hitbox;
      const hitboxB = segmentB.hitbox;

      const diffX = hitboxB.box.position.x - hitboxA.box.position.x;
      const diffY = hitboxB.box.position.y - hitboxA.box.position.y;
      const distance = Math.sqrt(diffX * diffX + diffY * diffY);

      const normalisedDiffX = diffX / distance;
      const normalisedDiffY = diffY / distance;

      const displacement = distance - segmentA.idealDistance;
      
      // Calculate spring force
      const springForceX = normalisedDiffX * springConstant * displacement * Settings.I_TPS;
      const springForceY = normalisedDiffY * springConstant * displacement * Settings.I_TPS;
      
      // Apply spring force
      segmentA.velocityX += springForceX;
      segmentA.velocityY += springForceY;
      segmentB.velocityX -= springForceX;
      segmentB.velocityY -= springForceY;

      const relativeVelocityX = segmentB.velocityX - segmentA.velocityX;
      const relativeVelocityY = segmentB.velocityY - segmentA.velocityY;

      // Calculate damping force
      const dampingForceX = relativeVelocityX * tetheredHitboxComponent.damping * Settings.I_TPS;
      const dampingForceY = relativeVelocityY * tetheredHitboxComponent.damping * Settings.I_TPS;
      
      // Apply damping
      segmentA.velocityX += dampingForceX;
      segmentA.velocityY += dampingForceY;
      segmentB.velocityX -= dampingForceX;
      segmentB.velocityY -= dampingForceY;
   }

   // Apply the velocity
   for (const restriction of tetheredHitboxComponent.restrictions) {
      restriction.hitbox.box.position.x += restriction.velocityX * Settings.I_TPS;
      restriction.hitbox.box.position.y += restriction.velocityY * Settings.I_TPS;
   }

   const physicsComponent = PhysicsComponentArray.getComponent(entity);
   physicsComponent.hitboxesAreDirty = true;
}