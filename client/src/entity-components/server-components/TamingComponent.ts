import { ServerComponentType } from "../../../../shared/src/components";
import { Entity, EntityType } from "../../../../shared/src/entities";
import { ItemType } from "../../../../shared/src/items/items";
import { PacketReader } from "../../../../shared/src/packets";
import { Settings } from "../../../../shared/src/settings";
import { getTamingSkill, TamingSkill, TamingSkillID } from "../../../../shared/src/taming";
import { TribeType } from "../../../../shared/src/tribes";
import { UtilVars } from "../../../../shared/src/utils";
import Board from "../../Board";
import { getPlayerSelectedItem } from "../../components/game/GameInteractableLayer";
import { Hitbox } from "../../hitboxes";
import { RenderPart } from "../../render-parts/render-parts";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { playerTribe } from "../../tribes";
import { EntityIntermediateInfo, EntityParams, getEntityRenderInfo, getEntityType } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { entityTreeHasComponent, TransformComponentArray } from "./TransformComponent";

interface TamingSkillLearning {
   readonly skill: TamingSkill;
   /** Indexes will be the same as the requirements on the skill */
   readonly requirementProgressArray: Array<number>;
   lastUpdateTicks: number;
}

export interface TamingComponentParams {
   readonly tamingTier: number;
   readonly berriesEatenInTier: number;
   readonly name: string;
   readonly acquiredSkills: Array<TamingSkill>;
   readonly skillLearningArray: Array<TamingSkillLearning>;
   readonly isFollowing: boolean;
}

interface IntermediateInfo {
   readonly tamingTierRenderPart: TexturedRenderPart | null;
   readonly followHalo: RenderPart | null;
}

export interface TamingComponent {
   tamingTier: number;
   foodEatenInTier: number;
   name: string;
   readonly acquiredSkills: Array<TamingSkill>;
   readonly skillLearningArray: Array<TamingSkillLearning>;

   tamingTierRenderPart: TexturedRenderPart | null;

   isFollowing: boolean;
   followHalo: RenderPart | null;
}
const TAMING_TIER_TEXTURE_SOURCES: Record<number, string> = {
   1: "entities/miscellaneous/taming-tier-1.png",
   2: "entities/miscellaneous/taming-tier-2.png",
   3: "entities/miscellaneous/taming-tier-3.png"
};

export const TamingComponentArray = new ServerComponentArray<TamingComponent, TamingComponentParams, IntermediateInfo>(ServerComponentType.taming, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData,
   onTick: onTick
});

function createParamsFromData(reader: PacketReader): TamingComponentParams {
   const tamingTier = reader.readNumber();
   const berriesEatenInTier = reader.readNumber();
   const name = reader.readString();

   const numAcquiredSkills = reader.readNumber();
   const acquiredSkills = new Array<TamingSkill>();
   for (let i = 0; i < numAcquiredSkills; i++) {
      const skillID = reader.readNumber() as TamingSkillID;
      const skill = getTamingSkill(skillID);
      acquiredSkills.push(skill);
   }

   const numSkillLearnings = reader.readNumber();
   const skillLearningArray = new Array<TamingSkillLearning>();
   for (let i = 0; i < numSkillLearnings; i++) {
      const skillID = reader.readNumber() as TamingSkillID;
      const skill = getTamingSkill(skillID);

      const requirementProgressArray = new Array<number>();
      for (let i = 0; i < skill.requirements.length; i++) {
         const requirementProgress = reader.readNumber();
         requirementProgressArray.push(requirementProgress);
      }
      
      const skillLearning: TamingSkillLearning = {
         skill: skill,
         requirementProgressArray: requirementProgressArray,
         lastUpdateTicks: Board.serverTicks
      };
      skillLearningArray.push(skillLearning);
   }
   
   const isFollowing = reader.readBoolean();
   reader.padOffset(3);
   
   return {
      tamingTier: tamingTier,
      berriesEatenInTier: berriesEatenInTier,
      name: name,
      acquiredSkills: acquiredSkills,
      skillLearningArray: skillLearningArray,
      isFollowing: isFollowing
   };
}

const createFollowHalo = (headRenderPart: RenderPart): RenderPart => {
   const followHalo = new TexturedRenderPart(
      headRenderPart,
      2,
      0,
      getTextureArrayIndex("entities/miscellaneous/follow-halo.png")
   );
   followHalo.inheritParentRotation = false;
   return followHalo;
}

const getTamingTierRenderPartOpacity = (): number => {
   const heldItem = getPlayerSelectedItem();
   if (heldItem !== null && (heldItem.type === ItemType.animalStaff || heldItem.type === ItemType.tamingAlmanac)) {
      return 0.55;
   }
   return 0;
}

const createTamingTierRenderPart = (tamingTier: number, parentHitbox: Hitbox): TexturedRenderPart => {
   const renderPart = new TexturedRenderPart(
      parentHitbox,
      1,
      0,
      getTextureArrayIndex(TAMING_TIER_TEXTURE_SOURCES[tamingTier])
   );
   renderPart.inheritParentRotation = false;
   renderPart.opacity = getTamingTierRenderPartOpacity();
   return renderPart;
}

function populateIntermediateInfo(entityIntermediateInfo: EntityIntermediateInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.hitboxes[0];

   const tamingComponentParams = entityParams.serverComponentParams[ServerComponentType.taming]!;
   const tamingTier = tamingComponentParams.tamingTier;

   const tamingTierRenderPart = tamingTier > 0 ? createTamingTierRenderPart(tamingTier, hitbox) : null;
   // @Speed: 2nd comparison
   if (tamingTierRenderPart !== null) {
      entityIntermediateInfo.renderInfo.attachRenderPart(tamingTierRenderPart);
   }
   
   // Follow halo
   let followHalo: RenderPart | null;
   if (tamingComponentParams.isFollowing) {
      const headRenderPart = entityIntermediateInfo.renderInfo.getRenderThing("tamingComponent:head");
      followHalo = createFollowHalo(headRenderPart);
      entityIntermediateInfo.renderInfo.attachRenderPart(followHalo);
   } else {
      followHalo = null;
   }
   
   return {
      tamingTierRenderPart: tamingTierRenderPart,
      followHalo: followHalo
   }
}

function createComponent(entityParams: EntityParams, intermediateInfo: IntermediateInfo): TamingComponent {
   const tamingComponentParams = entityParams.serverComponentParams[ServerComponentType.taming]!;
   return {
      tamingTier: tamingComponentParams.tamingTier,
      foodEatenInTier: tamingComponentParams.berriesEatenInTier,
      name: tamingComponentParams.name,
      acquiredSkills: tamingComponentParams.acquiredSkills,
      skillLearningArray: tamingComponentParams.skillLearningArray,
      tamingTierRenderPart: intermediateInfo.tamingTierRenderPart,
      isFollowing: tamingComponentParams.isFollowing,
      followHalo: intermediateInfo.followHalo
   };
}

function getMaxRenderParts(): number {
   return 2;
}

function padData(reader: PacketReader): void {
   reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);
   reader.padString();

   const numAcquiredSkills = reader.readNumber();
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT * numAcquiredSkills);

   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

export function getTamingSkillLearning(tamingComponent: TamingComponent, skillID: TamingSkillID): TamingSkillLearning | null {
   for (const skillLearning of tamingComponent.skillLearningArray) {
      if (skillLearning.skill.id === skillID) {
         return skillLearning;
      }
   }
   return null;
}

export function skillLearningIsComplete(skillLearning: TamingSkillLearning): boolean {
   for (let i = 0; i < skillLearning.skill.requirements.length; i++) {
      const requirement = skillLearning.skill.requirements[0];
      const requirementProgress = skillLearning.requirementProgressArray[0];
      if (requirementProgress < requirement.amountRequired) {
         return false;
      }
   }

   return true;
}

function onTick(entity: Entity): void {
   // @Speed
   const tamingComponent = TamingComponentArray.getComponent(entity);
   if (tamingComponent.tamingTierRenderPart !== null) {
      tamingComponent.tamingTierRenderPart.opacity = getTamingTierRenderPartOpacity();
   }

   // @Speed
   // @Bug: Will look jittery for low TPS values.
   if (tamingComponent.followHalo !== null) {
      tamingComponent.followHalo.rotation += 0.65 * UtilVars.PI * Settings.I_TPS;
   }
}

function updateFromData(reader: PacketReader, entity: Entity): void {
   const tamingComponent = TamingComponentArray.getComponent(entity);

   const tamingTier = reader.readNumber();
   if (tamingTier !== tamingComponent.tamingTier) {
      if (tamingComponent.tamingTierRenderPart === null) {
         const transformComponent = TransformComponentArray.getComponent(entity);
         const hitbox = transformComponent.hitboxes[0];
         
         tamingComponent.tamingTierRenderPart = createTamingTierRenderPart(tamingTier, hitbox);
         const renderInfo = getEntityRenderInfo(entity);
         renderInfo.attachRenderPart(tamingComponent.tamingTierRenderPart);
      } else {
         tamingComponent.tamingTierRenderPart.textureArrayIndex = getTextureArrayIndex(TAMING_TIER_TEXTURE_SOURCES[tamingTier]);
      }
   }
   tamingComponent.tamingTier = tamingTier;
   
   tamingComponent.foodEatenInTier = reader.readNumber();
   tamingComponent.name = reader.readString();

   const newNumAcquiredSkills = reader.readNumber();
   for (let i = 0; i < newNumAcquiredSkills; i++) {
      if (i < tamingComponent.acquiredSkills.length) {
         reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
      } else {
         const skillID = reader.readNumber() as TamingSkillID;
         const skill = getTamingSkill(skillID);
         tamingComponent.acquiredSkills.push(skill);
      }
   }

   // Update existing/new skill learnings
   const numSkillLearnings = reader.readNumber();
   for (let i = 0; i < numSkillLearnings; i++) {
      const skillID = reader.readNumber() as TamingSkillID;
      const skill = getTamingSkill(skillID);

      const existingSkillLearning = getTamingSkillLearning(tamingComponent, skillID);
      if (existingSkillLearning !== null) {
         // Update requirement progress array
         for (let i = 0; i < skill.requirements.length; i++) {
            existingSkillLearning.requirementProgressArray[i] = reader.readNumber();
         }

         existingSkillLearning.lastUpdateTicks = Board.serverTicks;
      } else {
         const requirementProgressArray = new Array<number>();
         for (let i = 0; i < skill.requirements.length; i++) {
            const requirementProgress = reader.readNumber();
            requirementProgressArray.push(requirementProgress);
         }

         const skillLearning: TamingSkillLearning = {
            skill: skill,
            requirementProgressArray: requirementProgressArray,
            lastUpdateTicks: Board.serverTicks
         };
         tamingComponent.skillLearningArray.push(skillLearning);
      }
   }

   // Remove old skill learnings
   for (let i = 0; i < tamingComponent.skillLearningArray.length; i++) {
      const skillLearning = tamingComponent.skillLearningArray[i];
      if (skillLearning.lastUpdateTicks !== Board.serverTicks) {
         tamingComponent.skillLearningArray.splice(i, 1);
         i--;
      }
   }
   
   tamingComponent.isFollowing = reader.readBoolean();
   reader.padOffset(3);

   if (tamingComponent.isFollowing) {
      if (tamingComponent.followHalo === null) {
         const renderInfo = getEntityRenderInfo(entity);
         // @Copynpaste
         const headRenderPart = renderInfo.getRenderThing("tamingComponent:head");
         tamingComponent.followHalo = createFollowHalo(headRenderPart);
         renderInfo.attachRenderPart(tamingComponent.followHalo);
      }
   } else if (tamingComponent.followHalo !== null) {
      const renderInfo = getEntityRenderInfo(entity);
      renderInfo.removeRenderPart(tamingComponent.followHalo);
      tamingComponent.followHalo = null;
   }
}

export function hasTamingSkill(tamingComponent: TamingComponent, skillID: TamingSkillID): boolean {
   for (const skill of tamingComponent.acquiredSkills) {
      if (skill.id === skillID) {
         return true;
      }
   }
   return false;
}

export function entityIsTameableByPlayer(entity: Entity): boolean {
   if (getEntityType(entity) === EntityType.yeti && playerTribe.tribeType !== TribeType.frostlings) {
      return false;
   }

   // @HACK: Cast
   return entityTreeHasComponent(TamingComponentArray as any, entity);
}

export function getRootEntity(entity: Entity): Entity {
   const transformComponent = TransformComponentArray.getComponent(entity);
   return transformComponent.rootEntity;
}