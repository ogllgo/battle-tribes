import { ServerComponentType } from "../../../shared/src/components";
import { EntityID } from "../../../shared/src/entities";
import { Packet } from "../../../shared/src/packets";
import { deregisterEntitySupports, registerEntitySupports } from "../collapses";
import { ComponentArray } from "./ComponentArray";
import { TransformComponentArray } from "./TransformComponent";

export class BracingsComponent {}

export const BracingsComponentArray = new ComponentArray<BracingsComponent>(ServerComponentType.bracings, true, {
   onJoin: onJoin,
   onRemove: onRemove,
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function onJoin(entity: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   registerEntitySupports(transformComponent);
}

function onRemove(entity: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   deregisterEntitySupports(transformComponent);
}

function getDataLength(_entity: EntityID): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {}