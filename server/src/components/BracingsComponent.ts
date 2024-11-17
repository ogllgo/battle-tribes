import { ServerComponentType } from "../../../shared/src/components";
import { Entity } from "../../../shared/src/entities";
import { Packet } from "../../../shared/src/packets";
import { deregisterEntitySupports, registerEntitySupports } from "../collapses";
import { ComponentArray } from "./ComponentArray";
import { TransformComponentArray } from "./TransformComponent";

export class BracingsComponent {}

export const BracingsComponentArray = new ComponentArray<BracingsComponent>(ServerComponentType.bracings, true, getDataLength, addDataToPacket);
BracingsComponentArray.onJoin = onJoin;
BracingsComponentArray.onRemove = onRemove;

function onJoin(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   registerEntitySupports(transformComponent);
}

function onRemove(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   deregisterEntitySupports(transformComponent);
}

function getDataLength(_entity: Entity): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity): void {}