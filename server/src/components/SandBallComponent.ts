import { ServerComponentType } from "../../../shared/src/components";
import { Entity } from "../../../shared/src/entities";
import { Packet } from "../../../shared/src/packets";
import { AIHelperComponentArray, AIType } from "./AIHelperComponent";
import { ComponentArray } from "./ComponentArray";
import { removeAttachedEntity, TransformComponentArray } from "./TransformComponent";

export class SandBallComponent {
   public size = 1;
}

export const SandBallComponentArray = new ComponentArray<SandBallComponent>(ServerComponentType.sandBall, true, getDataLength, addDataToPacket);
SandBallComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};
 
function onTick(sandBall: Entity): void {
   // @HACK @SPEED
   const transformComponent = TransformComponentArray.getComponent(sandBall);
   if (transformComponent.rootEntity !== sandBall) {
      const aiHelperComponent = AIHelperComponentArray.getComponent(transformComponent.rootEntity);
      if (aiHelperComponent.currentAIType !== AIType.sandBalling) {
         removeAttachedEntity(transformComponent.rootEntity, sandBall);
      }
   }
}

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const sandBallComponent = SandBallComponentArray.getComponent(entity);
   packet.addNumber(Math.floor(sandBallComponent.size));
}