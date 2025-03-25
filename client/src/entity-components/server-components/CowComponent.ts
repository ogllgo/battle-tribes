import { ServerComponentType } from "battletribes-shared/components";
import { Settings } from "battletribes-shared/settings";
import { angle, randFloat, randInt, UtilVars } from "battletribes-shared/utils";
import Board from "../../Board";
import { BloodParticleSize, createBloodParticle, createBloodParticleFountain, createBloodPoolParticle, createDirtParticle } from "../../particles";
import { playSoundOnHitbox } from "../../sound";
import { ParticleRenderLayer } from "../../rendering/webgl/particle-rendering";
import { CowSpecies, Entity } from "battletribes-shared/entities";
import { PacketReader } from "battletribes-shared/packets";
import { EntityIntermediateInfo, EntityParams, getEntityLayer, getEntityRenderInfo } from "../../world";
import { entityChildIsHitbox, getEntityTile, TransformComponentArray } from "./TransformComponent";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { HitData } from "../../../../shared/src/client-server-types";
import { HitboxFlag } from "../../../../shared/src/boxes/boxes";
import { RenderPart } from "../../render-parts/render-parts";
import { Hitbox } from "../../hitboxes";

export interface CowComponentParams {
   readonly species: CowSpecies;
   readonly grazeProgress: number;
   readonly isAttacking: boolean;
   readonly isRamming: boolean;
}

interface IntermediateInfo {
   readonly headRenderPart: RenderPart;
   readonly attackHalo: RenderPart | null;
}

export interface CowComponent {
   readonly species: CowSpecies;
   grazeProgress: number;

   isAttacking: boolean;
   isRamming: boolean;
   
   readonly headRenderPart: RenderPart;
   attackHalo: RenderPart | null;
}

export const CowComponentArray = new ServerComponentArray<CowComponent, CowComponentParams, IntermediateInfo>(ServerComponentType.cow, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   onTick: onTick,
   padData: padData,
   updateFromData: updateFromData,
   onHit: onHit,
   onDie: onDie
});

function createParamsFromData(reader: PacketReader): CowComponentParams {
   const species = reader.readNumber();
   const grazeProgress = reader.readNumber();
   const isAttacking = reader.readBoolean();
   reader.padOffset(3);
   const isRamming = reader.readBoolean();
   reader.padOffset(3);

   return {
      species: species,
      grazeProgress: grazeProgress,
      isAttacking: isAttacking,
      isRamming: isRamming
   };
}

const createAttackHalo = (headRenderPart: RenderPart): RenderPart => {
   const attackHalo = new TexturedRenderPart(
      headRenderPart,
      2,
      0,
      getTextureArrayIndex("entities/miscellaneous/attack-halo.png")
   );
   attackHalo.inheritParentRotation = false;
   return attackHalo;
}

function populateIntermediateInfo(entityIntermediateInfo: EntityIntermediateInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   
   const cowComponentParams = entityParams.serverComponentParams[ServerComponentType.cow]!;
   const cowNum = cowComponentParams.species === CowSpecies.brown ? 1 : 2;

   let headRenderPart!: RenderPart;
   for (const hitbox of transformComponentParams.children) {
      if (!entityChildIsHitbox(hitbox)) {
         continue;
      }
      
      if (hitbox.flags.includes(HitboxFlag.COW_BODY)) {
         const bodyRenderPart = new TexturedRenderPart(
            hitbox,
            0,
            0,
            getTextureArrayIndex(`entities/cow/cow-body-${cowNum}.png`)
         );
         entityIntermediateInfo.renderInfo.attachRenderPart(bodyRenderPart);
      } else if (hitbox.flags.includes(HitboxFlag.COW_HEAD)) {
         // Head
         headRenderPart = new TexturedRenderPart(
            hitbox,
            1,
            0,
            getTextureArrayIndex(`entities/cow/cow-head-${cowNum}.png`)
         );
         headRenderPart.addTag("tamingComponent:head");
         entityIntermediateInfo.renderInfo.attachRenderPart(headRenderPart);
      }
   }

   // Attack halo
   let attackHalo: RenderPart | null;
   if (cowComponentParams.isAttacking) {
      attackHalo = createAttackHalo(headRenderPart);
      entityIntermediateInfo.renderInfo.attachRenderPart(attackHalo);
   } else {
      attackHalo = null;
   }

   return {
      headRenderPart: headRenderPart,
      attackHalo: attackHalo
   };
}

function createComponent(entityParams: EntityParams, intermediateInfo: IntermediateInfo): CowComponent {
   const cowComponentParams = entityParams.serverComponentParams[ServerComponentType.cow]!;
   
   return {
      species: cowComponentParams.species,
      grazeProgress: cowComponentParams.grazeProgress,
      isAttacking: cowComponentParams.isAttacking,
      isRamming: cowComponentParams.isRamming,
      headRenderPart: intermediateInfo.headRenderPart,
      attackHalo: intermediateInfo.attackHalo
   };
}

function getMaxRenderParts(): number {
   return 2;
}

function onTick(entity: Entity): void {
   const cowComponent = CowComponentArray.getComponent(entity);

   if (cowComponent.grazeProgress !== -1 && Board.tickIntervalHasPassed(0.1)) {
      const transformComponent = TransformComponentArray.getComponent(entity);
      const hitbox = transformComponent.children[0] as Hitbox;
      
      const spawnOffsetMagnitude = 30 * Math.random();
      const spawnOffsetDirection = 2 * Math.PI * Math.random();
      const spawnPositionX = hitbox.box.position.x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
      const spawnPositionY = hitbox.box.position.y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);
      createDirtParticle(spawnPositionX, spawnPositionY, ParticleRenderLayer.low);
   }

   if (Math.random() < 0.1 / Settings.TPS) {
      const transformComponent = TransformComponentArray.getComponent(entity);
      const hitbox = transformComponent.children[0] as Hitbox;
      playSoundOnHitbox("cow-ambient-" + randInt(1, 3) + ".mp3", 0.2, 1, entity, hitbox, true);
   }

   // @Copynpaste
   if (cowComponent.attackHalo !== null) {
      cowComponent.attackHalo.angle += 0.65 * UtilVars.PI * Settings.I_TPS;
   }
}

function padData(reader: PacketReader): void {
   reader.padOffset(4 * Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: Entity): void {
   const cowComponent = CowComponentArray.getComponent(entity);
   
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
   const grazeProgress = reader.readNumber();
   
   // When the cow has finished grazing, create a bunch of dirt particles
   if (grazeProgress < cowComponent.grazeProgress) {
      const transformComponent = TransformComponentArray.getComponent(entity);
      const layer = getEntityLayer(entity);
      
      const tile = getEntityTile(layer, transformComponent);
      for (let i = 0; i < 15; i++) {
         const x = (tile.x + Math.random()) * Settings.TILE_SIZE;
         const y = (tile.y + Math.random()) * Settings.TILE_SIZE;
         createDirtParticle(x, y, ParticleRenderLayer.low);
      }
   }
   cowComponent.grazeProgress = grazeProgress;

   cowComponent.isAttacking = reader.readBoolean();
   reader.padOffset(3);

   if (cowComponent.isAttacking) {
      if (cowComponent.attackHalo === null) {
         const renderInfo = getEntityRenderInfo(entity);
         cowComponent.attackHalo = createAttackHalo(cowComponent.headRenderPart);
         renderInfo.attachRenderPart(cowComponent.attackHalo);
      }
   } else if (cowComponent.attackHalo !== null) {
      const renderInfo = getEntityRenderInfo(entity);
      renderInfo.removeRenderPart(cowComponent.attackHalo);
      cowComponent.attackHalo = null;
   }

   const isRamming = reader.readBoolean();
   reader.padOffset(3);
   if (isRamming && !cowComponent.isRamming) {
      const transformComponent = TransformComponentArray.getComponent(entity);
      const hitbox = transformComponent.children[0] as Hitbox;
      playSoundOnHitbox("cow-angry.mp3", 0.4, 1, entity, hitbox, true);
   }
   cowComponent.isRamming = isRamming;
}

function onHit(entity: Entity, hitData: HitData): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.children[0] as Hitbox;
         
   // Blood pool particles
   for (let i = 0; i < 2; i++) {
      createBloodPoolParticle(hitbox.box.position.x, hitbox.box.position.y, 20);
   }
   
   // Blood particles
   for (let i = 0; i < 10; i++) {
      let offsetDirection = angle(hitData.hitPosition[0] - hitbox.box.position.x, hitData.hitPosition[1] - hitbox.box.position.y);
      offsetDirection += 0.2 * Math.PI * (Math.random() - 0.5);

      const spawnPositionX = hitbox.box.position.x + 32 * Math.sin(offsetDirection);
      const spawnPositionY = hitbox.box.position.y + 32 * Math.cos(offsetDirection);
      createBloodParticle(Math.random() < 0.6 ? BloodParticleSize.small : BloodParticleSize.large, spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(150, 250), true);
   }

   playSoundOnHitbox("cow-hurt-" + randInt(1, 3) + ".mp3", 0.4, 1, entity, hitbox, false);
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.children[0] as Hitbox;

   for (let i = 0; i < 3; i++) {
      createBloodPoolParticle(hitbox.box.position.x, hitbox.box.position.y, 35);
   }

   createBloodParticleFountain(entity, 0.1, 1.1);

   playSoundOnHitbox("cow-die-1.mp3", 0.2, 1, entity, hitbox, false);
}