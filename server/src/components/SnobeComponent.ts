import { Entity } from "../../../shared/src/entities";
import { runEscapeAI } from "../ai/EscapeAI";
import { AIHelperComponentArray } from "./AIHelperComponent";
import { ComponentArray } from "./ComponentArray";
import { ServerComponentType } from "battletribes-shared/components";

export class SnobeComponent {}

export const SnobeComponentArray = new ComponentArray<SnobeComponent>(ServerComponentType.snobe, true, getDataLength, addDataToPacket);
SnobeComponentArray.onTick = {
   func: onTick,
   tickInterval: 1
}

function onTick(snobe: Entity): void {
   const aiHelperComponent = AIHelperComponentArray.getComponent(snobe);

   const escapeAI = aiHelperComponent.getEscapeAI();
   if (runEscapeAI(snobe, aiHelperComponent, escapeAI)) {
      return;
   }
}

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}