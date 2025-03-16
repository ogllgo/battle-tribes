import { ServerComponentType } from "../../../shared/src/components";
import { Entity } from "../../../shared/src/entities";
import { Packet } from "../../../shared/src/packets";
import { Hitbox } from "../hitboxes";
import { ComponentArray } from "./ComponentArray";

export class GlurbSegmentComponent {
   // @HACK: won't be removed when the next hitboxes' entity is killed!
   public readonly nextHitbox: Hitbox;

   public mossBallCompleteness = 0;

   constructor(nextHitbox: Hitbox) {
      this.nextHitbox = nextHitbox;
   }
}

export const GlurbSegmentComponentArray = new ComponentArray<GlurbSegmentComponent>(ServerComponentType.glurbSegment, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const glurbSegmentComponent = GlurbSegmentComponentArray.getComponent(entity);
   packet.addNumber(glurbSegmentComponent.mossBallCompleteness);
}