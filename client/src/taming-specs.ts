import { Entity, EntityType } from "../../shared/src/entities";
import { ItemType } from "../../shared/src/items/items";
import { PacketReader } from "../../shared/src/packets";
import { EntityTamingSpec, TamingSkillID, TamingTier } from "../../shared/src/taming";
import { assert } from "../../shared/src/utils";
import { getEntityType } from "./world";

const TAMING_SPECS: Partial<Record<EntityType, EntityTamingSpec>> = {};

export function getEntityTamingSpec(entity: Entity): EntityTamingSpec {
   const entityType = getEntityType(entity);
   const spec = TAMING_SPECS[entityType];
   assert(typeof spec !== "undefined");
   return spec;
}

const readTamingSpecFromData = (reader: PacketReader): EntityTamingSpec => {
   const maxTamingTier = reader.readNumber() as TamingTier;
   
   const numSkills = reader.readNumber();
   const skills = new Array<TamingSkillID>();
   for (let i = 0; i < numSkills; i++) {
      const skillID = reader.readNumber() as TamingSkillID;
      skills.push(skillID);
   }

   const foodItemType = reader.readNumber() as ItemType;

   const tierFoodRequirements = {} as Record<TamingTier, number>;
   for (let tamingTier = 0; tamingTier <= maxTamingTier; tamingTier++) {
      const foodRequired = reader.readNumber();
      tierFoodRequirements[tamingTier as TamingTier] = foodRequired;
   }

   return {
      maxTamingTier: maxTamingTier,
      skills: skills,
      foodItemType: foodItemType,
      tierFoodRequirements: tierFoodRequirements
   };
}

export function registerTamingSpecsFromData(reader: PacketReader): void {
   const numSpecs = reader.readNumber();
   for (let i = 0; i < numSpecs; i++) {
      const entityType = reader.readNumber() as EntityType;
      const spec = readTamingSpecFromData(reader);

      TAMING_SPECS[entityType] = spec;
   }
}