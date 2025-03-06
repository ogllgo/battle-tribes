import { Entity, EntityType } from "../../shared/src/entities";
import { Packet } from "../../shared/src/packets";
import { EntityTamingSpec, TamingTier } from "../../shared/src/taming";
import { assert } from "../../shared/src/utils";
import { getEntityType } from "./world";

const tamingSpecsMap = new Map<EntityType, EntityTamingSpec>();

export function getTamingSpecsMap(): ReadonlyMap<EntityType, EntityTamingSpec> {
   return tamingSpecsMap;
}

export function registerEntityTamingSpec(entityType: EntityType, spec: EntityTamingSpec): void {
   tamingSpecsMap.set(entityType, spec);
}

export function getTamingSpec(entity: Entity): EntityTamingSpec {
   const entityType = getEntityType(entity);
   const spec = tamingSpecsMap.get(entityType);
   assert(typeof spec !== "undefined");
   return spec;
}

export function getTamingSpecDataLength(tamingSpec: EntityTamingSpec): number {
   let lengthBytes = Float32Array.BYTES_PER_ELEMENT;

   lengthBytes += Float32Array.BYTES_PER_ELEMENT + 3 * Float32Array.BYTES_PER_ELEMENT * tamingSpec.skillNodes.length;

   lengthBytes += Float32Array.BYTES_PER_ELEMENT;

   lengthBytes += Float32Array.BYTES_PER_ELEMENT * (tamingSpec.maxTamingTier + 1);

   return lengthBytes;
}

export function addTamingSpecToData(packet: Packet, tamingSpec: EntityTamingSpec): void {
   packet.addNumber(tamingSpec.maxTamingTier);
   
   packet.addNumber(tamingSpec.skillNodes.length);
   for (const skillNode of tamingSpec.skillNodes) {
      packet.addNumber(skillNode.skill.id);
      packet.addNumber(skillNode.x);
      packet.addNumber(skillNode.y);
   }

   packet.addNumber(tamingSpec.foodItemType);

   for (let tamingTier = 0; tamingTier <= tamingSpec.maxTamingTier; tamingTier++) {
      const foodRequirements = tamingSpec.tierFoodRequirements[tamingTier as TamingTier];
      assert(typeof foodRequirements !== "undefined");
      packet.addNumber(foodRequirements);
   }
}