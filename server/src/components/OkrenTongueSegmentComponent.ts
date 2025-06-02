import { ServerComponentType } from "../../../shared/src/components";
import { Entity } from "../../../shared/src/entities";
import { ComponentArray } from "./ComponentArray";
import { OkrenTongueComponentArray, startRetractingTongue } from "./OkrenTongueComponent";
import { TransformComponentArray } from "./TransformComponent";

export class OkrenTongueSegmentComponent {}

export const OkrenTongueSegmentComponentArray = new ComponentArray<OkrenTongueSegmentComponent>(ServerComponentType.okrenTongueSegment, true, getDataLength, addDataToPacket);
OkrenTongueSegmentComponentArray.onTakeDamage = onTakeDamage;

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}

// @Copynpaste
function onTakeDamage(tongueSegment: Entity): void {
   // @Copynpaste
   const tongueTipTransformComponent = TransformComponentArray.getComponent(tongueSegment);
   const tongue = tongueTipTransformComponent.parentEntity;
   const okrenTongueComponent = OkrenTongueComponentArray.getComponent(tongue);
   startRetractingTongue(tongue, okrenTongueComponent);
}