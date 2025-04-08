import { ServerComponentType } from "../../../shared/src/components";
import { Entity, EntityTypeString } from "../../../shared/src/entities";
import { getEntityType } from "../world";
import { AIHelperComponentArray } from "./AIHelperComponent";
import { ComponentArray } from "./ComponentArray";
import { OkrenComponentArray } from "./OkrenComponent";
import { TransformComponentArray } from "./TransformComponent";

export class OkrenTongueSegmentComponent {}

export const OkrenTongueSegmentComponentArray = new ComponentArray<OkrenTongueSegmentComponent>(ServerComponentType.okrenTongueSegment, true, getDataLength, addDataToPacket);
OkrenTongueSegmentComponentArray.onTakeDamage = onTakeDamage

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}

// @TEMPORARY @HACK bn  
function onTakeDamage(tongueSegment: Entity): void {
   const tongueSegmentTransformComponent = TransformComponentArray.getComponent(tongueSegment);
   
   // @HACKKK!K!!!!! @HACK @HACK
   const aiHelperComponent = AIHelperComponentArray.getComponent(OkrenComponentArray.activeEntities[0]);
   const combatAI = aiHelperComponent.getOkrenCombatAI();
   combatAI.tongueIsRetracting = true;
}