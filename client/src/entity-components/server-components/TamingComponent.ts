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
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { Hitbox } from "../../hitboxes";
import { RenderPart } from "../../render-parts/render-parts";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { playerTribe } from "../../tribes";
import { EntityParams, getEntityRenderInfo, getEntityType } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { EntityAttachInfo, entityTreeHasComponent, TransformComponentArray } from "./TransformComponent";

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
   readonly isAttacking: boolean;
   readonly isFollowing: boolean;
}

interface IntermediateInfo {
   readonly tamingTierRenderPart: TexturedRenderPart | null;
   readonly attackHalo: RenderPart | null;
   readonly followHalo: RenderPart | null;
}

export interface TamingComponent {
   tamingTier: number;
   foodEatenInTier: number;
   name: string;
   readonly acquiredSkills: Array<TamingSkill>;
   readonly skillLearningArray: Array<TamingSkillLearning>;

   tamingTierRenderPart: TexturedRenderPart | null;

   isAttacking: boolean;
   isFollowing: boolean;
   attackHalo: RenderPart | null;
   followHalo: RenderPart | null;
}

const TAMING_TIER_TEXTURE_SOURCES: Record<number, string> = {
   1: "entities/miscellaneous/taming-tier-1.png",
   2: "entities/miscellaneous/taming-tier-2.png",
   3: "entities/miscellaneous/taming-tier-3.png"
};

// @HACK!! could potentially collide with others. and is just generally shit. ALso might mess with z-indexes!!! if its large enough
const TAMING_TIER_RENDER_PART_Z_INDEX = 19;
const HALO_RENDER_PART_Z_INDEX = 20;

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
   
   const isAttacking = reader.readBoolean();
   reader.padOffset(3);
   
   const isFollowing = reader.readBoolean();
   reader.padOffset(3);
   
   return {
      tamingTier: tamingTier,
      berriesEatenInTier: berriesEatenInTier,
      name: name,
      acquiredSkills: acquiredSkills,
      skillLearningArray: skillLearningArray,
      isAttacking: isAttacking,
      isFollowing: isFollowing
   };
}

const createFollowHalo = (headRenderPart: RenderPart): RenderPart => {
   const followHalo = new TexturedRenderPart(
      headRenderPart,
      HALO_RENDER_PART_Z_INDEX,
      0,
      getTextureArrayIndex("entities/miscellaneous/follow-halo.png")
   );
   followHalo.inheritParentRotation = false;
   return followHalo;
}

const createAttackHalo = (headRenderPart: RenderPart): RenderPart => {
   const attackHalo = new TexturedRenderPart(
      headRenderPart,
      HALO_RENDER_PART_Z_INDEX,
      0,
      getTextureArrayIndex("entities/miscellaneous/attack-halo.png")
   );
   attackHalo.inheritParentRotation = false;
   return attackHalo;
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
      TAMING_TIER_RENDER_PART_Z_INDEX,
      0,
      getTextureArrayIndex(TAMING_TIER_TEXTURE_SOURCES[tamingTier])
   );
   renderPart.inheritParentRotation = false;
   renderPart.opacity = getTamingTierRenderPartOpacity();
   return renderPart;
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.children[0] as Hitbox;

   const tamingComponentParams = entityParams.serverComponentParams[ServerComponentType.taming]!;
   const tamingTier = tamingComponentParams.tamingTier;

   // @HACK @TEMPORARY: the entity intermediate info's render info is the wrong one to use for glurbs, sooo... we don't set it and let the updateFromData figure it out.
   const tamingTierRenderPart = null;
   if (1+1===3) {
      const tamingTierRenderPart = tamingTier > 0 ? createTamingTierRenderPart(tamingTier, hitbox) : null;
      // @Speed: 2nd comparison
      if (tamingTierRenderPart !== null) {
         renderInfo.attachRenderPart(tamingTierRenderPart);
      }
   }
   
   // Attack halo
   let attackHalo: RenderPart | null;
   // if (tamingComponentParams.isAttacking) {
   //    // @Copynpaste
   //    const headRenderPart = renderInfo.getRenderThing("tamingComponent:head");
   //    attackHalo = createAttackHalo(headRenderPart);
   //    renderInfo.attachRenderPart(attackHalo);
   // } else {
   //    attackHalo = null;
   // }
   attackHalo = null;
   
   // Follow halo
   let followHalo: RenderPart | null;
   // if (tamingComponentParams.isFollowing) {
   //    const headRenderPart = renderInfo.getRenderThing("tamingComponent:head");
   //    followHalo = createFollowHalo(headRenderPart);
   //    renderInfo.attachRenderPart(followHalo);
   // } else {
   //    followHalo = null;
   // }
   followHalo = null;
   
   return {
      tamingTierRenderPart: tamingTierRenderPart,
      attackHalo: attackHalo,
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
      isAttacking: tamingComponentParams.isAttacking,
      isFollowing: tamingComponentParams.isFollowing,
      attackHalo: intermediateInfo.attackHalo,
      followHalo: intermediateInfo.followHalo
   };
}

function getMaxRenderParts(): number {
   // @Hack: shoudl be lower
   return 5;
}

function padData(reader: PacketReader): void {
   reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);
   reader.padString();

   const numAcquiredSkills = reader.readNumber();
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT * numAcquiredSkills);

   reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);
}

/**
crypto miner video
- the actual game should eb something tangientally reltated to crypto mining, e.g. you are a miner of the corporation Crypt Miners Inc., working in the crypt (the cover)
- through tthe video make very many hints that it is a crypto miner
- REALLY encourage people to play the game throughout the video
   - say "leave it running throughout the night"
   - mention the high battery usage but say there are complex algorithms at work
   - this game uses an advanced monetisation model (never mention what it is and have it be free to play with no ads or in game purchases)
   - in every irl clip with the game have my computer going with fan at 100% completely overpowering the narration and other audio
   - mention i've been looking into diversifying my income streams recently
   - mention doge at least 3 times
      - also mention web3 VERY frequently (this game uses BLOCKCHAIN technology to secure your account and other features)
   - say that you should play this game with the best GPU possible. "EXTREMELY GPU INTENSIVE GAME". and have the graphics be REAAALY simple and no intensive logic
      - 8 bit sound effects
      - similar to legend of zelda 1 (slow load times)
      as a loading thing have "mining crypto.." and it changes to "calculating AI vectors"
         - "Mining crypto for Eggpoison ({{wallet address}})" for the 1st frame and it immediately changes and from then on is normal stuff
         have my wallet address be a central plot point but not mentioned as a wallet address
            - "We must find the first part of the Key" -> first 10 chars
            - maybe you mine the ore and then bring it back to a house where its address is my crypto wallet
            have the gameplay mimic the crypto mining process (e.g. mine until you finish the job)
   - maybe a followup video on 2nd chanpnel about the allegations that it is a crypto miner
      - in the comments, vehemently argue with every single person, regardless of whether they are in on it or not. Also constnatly shill bitcoin indiscretely; make every response very clearly written by an old model of chatgpt. It should always end with "Let me know if you ahve any other questions!" and begin with "Thanks for the really insightful comment!"
      - never deny it, only plug blockchain technology and doge
         - First, let me weave you a story. About a new up and coming Web3 blockchain product which will revolutionise the industry (never mention which industry)
         - Let me address the unfounded and frankly antagonistic allegations that my most recent game is mining crypto in the background. But before we unpack these fantasies, have you heard of BitCoin?
         - start the video on a browser page looking at my crypto wallet
            - make another program which shows all active players of the game as little rats in cells in a big block with all of their hostnames, and coins being funneled into a big pig money jar, squid game stylo
         - be eating chips the entire time, as i'm speaking too, and drinking water really obnoxiously
         * @param tamingComponent 
 * @param skillID 
 * @returns 
 */
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
      tamingComponent.followHalo.angle += 0.65 * UtilVars.PI * Settings.I_TPS;
   }

   // @Copynpaste
   if (tamingComponent.attackHalo !== null) {
      tamingComponent.attackHalo.angle += 0.65 * UtilVars.PI * Settings.I_TPS;
   }
}

// @Hack
const getHeadHitbox = (entity: Entity): Hitbox => {
   // @HACK!!!
   if (getEntityType(entity) === EntityType.glurb) {
      const glurbTransformComponent = TransformComponentArray.getComponent(entity);
      const headChild = (glurbTransformComponent.children[0] as EntityAttachInfo).attachedEntity;

      const headTransformComponent = TransformComponentArray.getComponent(headChild);
      return headTransformComponent.children[0] as Hitbox;
   } else {
      const transformComponent = TransformComponentArray.getComponent(entity);
      return transformComponent.children[0] as Hitbox;
   }
}

// @Hack
const getHeadRenderInfo = (entity: Entity): EntityRenderInfo => {
   // @HACK!!!
   if (getEntityType(entity) === EntityType.glurb) {
      const glurbTransformComponent = TransformComponentArray.getComponent(entity);
      const headChild = (glurbTransformComponent.children[0] as EntityAttachInfo).attachedEntity;

      return getEntityRenderInfo(headChild);
   } else {
      return getEntityRenderInfo(entity);
   }
}

function updateFromData(reader: PacketReader, entity: Entity): void {
   const tamingComponent = TamingComponentArray.getComponent(entity);

   const tamingTier = reader.readNumber();
   if (tamingTier !== tamingComponent.tamingTier) {
      if (tamingComponent.tamingTierRenderPart === null) {
          const hitbox = getHeadHitbox(entity);
         
         tamingComponent.tamingTierRenderPart = createTamingTierRenderPart(tamingTier, hitbox);
         const renderInfo = getHeadRenderInfo(entity);
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

   tamingComponent.isAttacking = reader.readBoolean();
   reader.padOffset(3);
   
   tamingComponent.isFollowing = reader.readBoolean();
   reader.padOffset(3);
   
   // @Copynpaste
   if (tamingComponent.isAttacking) {
      if (tamingComponent.attackHalo === null) {
         const renderInfo = getEntityRenderInfo(entity);
         const headRenderPart = renderInfo.getRenderThing("tamingComponent:head")
         tamingComponent.attackHalo = createAttackHalo(headRenderPart);
         renderInfo.attachRenderPart(tamingComponent.attackHalo);
      }
   } else if (tamingComponent.attackHalo !== null) {
      const renderInfo = getEntityRenderInfo(entity);
      renderInfo.removeRenderPart(tamingComponent.attackHalo);
      tamingComponent.attackHalo = null;
   }

   if (tamingComponent.isFollowing) {
      if (tamingComponent.followHalo === null) {
         const renderInfo = getHeadRenderInfo(entity);
         const headRenderPart = renderInfo.getRenderThing("tamingComponent:head")
         tamingComponent.followHalo = createFollowHalo(headRenderPart);
         renderInfo.attachRenderPart(tamingComponent.followHalo);
      }
   } else if (tamingComponent.followHalo !== null) {
      const renderInfo = getHeadRenderInfo(entity);
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