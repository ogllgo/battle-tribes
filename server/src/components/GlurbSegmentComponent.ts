import { ServerComponentType } from "../../../shared/src/components";
import { Hitbox } from "../hitboxes";
import { ComponentArray } from "./ComponentArray";

export class GlurbSegmentComponent {
   // @HACK
   public readonly nextHitbox: Hitbox;

   constructor(nextHitbox: Hitbox) {
      this.nextHitbox = nextHitbox;
   }
}

export const GlurbSegmentComponentArray = new ComponentArray<GlurbSegmentComponent>(ServerComponentType.glurbSegment, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}