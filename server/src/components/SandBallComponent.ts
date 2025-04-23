import { ServerComponentType } from "../../../shared/src/components";
import { Entity, EntityType } from "../../../shared/src/entities";
import { Packet } from "../../../shared/src/packets";
import { assert } from "../../../shared/src/utils";
import { getEntityType } from "../world";
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
      // @temporary @Hack. I think this is caused if a krumblid starts balling up sand, creating a new sandBall entity, the exact tick it is killed??
      
      assert(getEntityType(transformComponent.rootEntity) === EntityType.krumblid);

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