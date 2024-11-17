import { ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";
import { Entity } from "battletribes-shared/entities";
import { moveEntityToPosition, stopEntity } from "../ai-shared";
import { PhysicsComponentArray } from "./PhysicsComponent";
import { TransformComponentArray } from "./TransformComponent";
import { UtilVars } from "battletribes-shared/utils";
import { entityExists } from "../world";

const enum Vars {
   TURN_SPEED = UtilVars.PI * 2
}

export class PebblumComponent {
   public targetEntityID: number;
   
   constructor(targetEntity: Entity) {
      this.targetEntityID = targetEntity;
   }
}

export const PebblumComponentArray = new ComponentArray<PebblumComponent>(ServerComponentType.pebblum, true, getDataLength, addDataToPacket);
PebblumComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};

function onTick(pebblum: Entity): void {
   const pebblumComponent = PebblumComponentArray.getComponent(pebblum);
   
   const target = pebblumComponent.targetEntityID;
   if (entityExists(target)) {
      const targetTransformComponent = TransformComponentArray.getComponent(target);

      moveEntityToPosition(pebblum, targetTransformComponent.position.x, targetTransformComponent.position.y, 850, Vars.TURN_SPEED);
   } else {
      const physicsComponent = PhysicsComponentArray.getComponent(pebblum);
      stopEntity(physicsComponent);
   }
}

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(): void {}