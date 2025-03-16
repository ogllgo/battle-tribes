import { ServerComponentType } from "../../../shared/src/components";
import { ComponentArray } from "./ComponentArray";

export class GlurbComponent {
   public readonly numSegments: number;

   constructor(numSegments: number) {
      this.numSegments = numSegments;
   }
}

export const GlurbComponentArray = new ComponentArray<GlurbComponent>(ServerComponentType.glurb, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}