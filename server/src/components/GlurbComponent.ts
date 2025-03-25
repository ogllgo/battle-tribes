import { ServerComponentType } from "../../../shared/src/components";
import { Entity } from "../../../shared/src/entities";
import { TamingSkillID } from "../../../shared/src/taming";
import { ComponentArray } from "./ComponentArray";
import { addSkillLearningProgress, TamingComponentArray } from "./TamingComponent";

export class GlurbComponent {
   public readonly numSegments: number;

   constructor(numSegments: number) {
      this.numSegments = numSegments;
   }
}

export const GlurbComponentArray = new ComponentArray<GlurbComponent>(ServerComponentType.glurb, true, getDataLength, addDataToPacket);
GlurbComponentArray.onTakeDamage = onTakeDamage;

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}

function onTakeDamage(entity: Entity): void {
   const tamingComponent = TamingComponentArray.getComponent(entity);
   addSkillLearningProgress(tamingComponent, TamingSkillID.dulledPainReceptors, 1);
}