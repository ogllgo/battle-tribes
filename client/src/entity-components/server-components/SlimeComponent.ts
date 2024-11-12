import { lerp, randFloat, randInt } from "battletribes-shared/utils";
import { Entity, SlimeSize } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { VisualRenderPart } from "../../render-parts/render-parts";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import { playSound } from "../../sound";
import { getEntityTile, TransformComponentArray } from "./TransformComponent";
import { getEntityLayer, getEntityRenderInfo } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { PhysicsComponentArray, resetIgnoredTileSpeedMultipliers } from "./PhysicsComponent";
import { TileType } from "../../../../shared/src/tiles";
import { EntityConfig } from "../ComponentArray";
import { createSlimePoolParticle, createSlimeSpeckParticle } from "../../particles";

export interface SlimeComponentParams {
   readonly size: SlimeSize;
}

interface RenderParts {
   readonly bodyRenderPart: VisualRenderPart;
   readonly eyeRenderPart: VisualRenderPart;
}

export interface SlimeComponent {
   bodyRenderPart: VisualRenderPart;
   eyeRenderPart: VisualRenderPart;
   readonly orbRenderParts: Array<VisualRenderPart>;

   size: SlimeSize;
   readonly orbs: Array<SlimeOrbInfo>;

   internalTickCounter: number;
}

export const SLIME_SIZES: ReadonlyArray<number> = [
   64, // small
   88, // medium
   120 // large
];

/** Information about an orb inside a slime */
interface SlimeOrbInfo {
   readonly size: SlimeSize;
   /** Offset of the orb from the center of the slime (from 0->1) */
   readonly offset: number;
   rotation: number;
   angularVelocity: number;
}

const SIZE_STRINGS: ReadonlyArray<string> = ["small", "medium", "large"];

const EYE_OFFSETS: ReadonlyArray<number> = [16, 24, 34];

const EYE_SHAKE_START_FREQUENCY = 0.5;
const EYE_SHAKE_END_FREQUENCY = 1.25;
const EYE_SHAKE_START_AMPLITUDE = 0.07;
const EYE_SHAKE_END_AMPLITUDE = 0.2;

const IGNORED_TILE_SPEED_MULTIPLIERS = [TileType.slime];

const NUM_PUDDLE_PARTICLES_ON_HIT: ReadonlyArray<number> = [1, 2, 3];
const NUM_PUDDLE_PARTICLES_ON_DEATH: ReadonlyArray<number> = [3, 5, 7];
const NUM_SPECK_PARTICLES_ON_HIT: ReadonlyArray<number> = [3, 5, 7];
const NUM_SPECK_PARTICLES_ON_DEATH: ReadonlyArray<number> = [6, 10, 15];

const getBodyShakeAmount = (spitProgress: number): number => {
   return lerp(0, 5, spitProgress);
}

export const SlimeComponentArray = new ServerComponentArray<SlimeComponent, SlimeComponentParams, RenderParts>(ServerComponentType.slime, true, {
   createParamsFromData: createParamsFromData,
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   onTick: onTick,
   padData: padData,
   updateFromData: updateFromData,
   onHit: onHit,
   onDie: onDie
});

function createParamsFromData(reader: PacketReader): SlimeComponentParams {
   const size = reader.readNumber() as SlimeSize;

   reader.padOffset(3 * Float32Array.BYTES_PER_ELEMENT);
   
   const numOrbs = reader.readNumber();
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT * numOrbs);

   return {
      size: size
   };
}

function createRenderParts(renderInfo: EntityRenderInfo, entityConfig: EntityConfig<ServerComponentType.slime, never>): RenderParts {
   const size = entityConfig.serverComponents[ServerComponentType.slime].size;
   const sizeString = SIZE_STRINGS[size];

   // Body
   const bodyRenderPart = new TexturedRenderPart(
      null,
      2,
      0,
      getTextureArrayIndex(`entities/slime/slime-${sizeString}-body.png`)
   );
   renderInfo.attachRenderPart(bodyRenderPart);

   // Shading
   renderInfo.attachRenderPart(new TexturedRenderPart(
      null,
      0,
      0,
      getTextureArrayIndex(`entities/slime/slime-${sizeString}-shading.png`)
   ));

   // Eye
   const eyeRenderPart = new TexturedRenderPart(
      null,
      3,
      0,
      getTextureArrayIndex(`entities/slime/slime-${sizeString}-eye.png`)
   );
   eyeRenderPart.inheritParentRotation = false;
   renderInfo.attachRenderPart(eyeRenderPart);

   return {
      bodyRenderPart: bodyRenderPart,
      eyeRenderPart: eyeRenderPart
   };
}

function createComponent(entityConfig: EntityConfig<ServerComponentType.slime, never>, renderParts: RenderParts): SlimeComponent {
   return {
      bodyRenderPart: renderParts.bodyRenderPart,
      eyeRenderPart: renderParts.eyeRenderPart,
      orbRenderParts: [],
      size: entityConfig.serverComponents[ServerComponentType.slime].size,
      orbs: new Array<SlimeOrbInfo>,
      internalTickCounter: 0
   };
}

function onTick(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   
   const layer = getEntityLayer(entity);

   // Slimes move at normal speed on slime tiles
   const tile = getEntityTile(layer, transformComponent);
   const physicsComponent = PhysicsComponentArray.getComponent(entity);
   if (tile.type === TileType.slime) {
      physicsComponent.ignoredTileSpeedMultipliers = IGNORED_TILE_SPEED_MULTIPLIERS;
   } else {
      resetIgnoredTileSpeedMultipliers(physicsComponent);
   }

   if (Math.random() < 0.2 / Settings.TPS) {
      playSound("slime-ambient-" + randInt(1, 4) + ".mp3", 0.4, 1, transformComponent.position);
   }

   const slimeComponent = SlimeComponentArray.getComponent(entity);
   for (let i = 0; i < slimeComponent.orbs.length; i++) {
      const orb = slimeComponent.orbs[i];

      // Randomly move around the orbs
      if (Math.random() < 0.3 / Settings.TPS) {
         orb.angularVelocity = randFloat(-3, 3);
      }

      // Update orb angular velocity & rotation
      orb.rotation += orb.angularVelocity / Settings.TPS;

      // Update the orb's rotation
      if (orb.angularVelocity !== 0) {
         const spriteSize = SLIME_SIZES[slimeComponent.size];
         const offsetMagnitude = spriteSize / 2 * lerp(0.3, 0.7, orb.offset);
         slimeComponent.orbRenderParts[i].offset.x = offsetMagnitude * Math.sin(orb.rotation);
         slimeComponent.orbRenderParts[i].offset.y = offsetMagnitude * Math.cos(orb.rotation);
      }

      orb.angularVelocity -= 3 / Settings.TPS;
      if (orb.angularVelocity < 0) {
         orb.angularVelocity = 0;
      }
   }
}

const createOrb = (slimeComponent: SlimeComponent, entity: Entity, size: SlimeSize): void => {
   const orbInfo: SlimeOrbInfo = {
      size: size,
      rotation: 2 * Math.PI * Math.random(),
      offset: Math.random(),
      angularVelocity: 0
   };
   slimeComponent.orbs.push(orbInfo);

   const sizeString = SIZE_STRINGS[size];
   
   // Calculate the orb's offset from the center of the slime
   const spriteSize = SLIME_SIZES[slimeComponent.size];
   const offsetMagnitude = spriteSize / 2 * lerp(0.3, 0.7, orbInfo.offset);

   const renderPart = new TexturedRenderPart(
      null,
      1,
      orbInfo.rotation,
      getTextureArrayIndex(`entities/slime/slime-orb-${sizeString}.png`)
   );
   renderPart.offset.x = offsetMagnitude * Math.sin(orbInfo.rotation);
   renderPart.offset.y = offsetMagnitude * Math.cos(orbInfo.rotation);
   slimeComponent.orbRenderParts.push(renderPart);

   const renderInfo = getEntityRenderInfo(entity);
   renderInfo.attachRenderPart(renderPart);
}

function padData(reader: PacketReader): void {
   reader.padOffset(4 * Float32Array.BYTES_PER_ELEMENT);
   
   const numOrbs = reader.readNumber();
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT * numOrbs);
}

function updateFromData(reader: PacketReader, entity: Entity): void {
   const slimeComponent = SlimeComponentArray.getComponent(entity);
   
   // @Incomplete: change render parts when this happens?
   slimeComponent.size = reader.readNumber();
   const eyeRotation = reader.readNumber();
   const anger = reader.readNumber();
   const spitChargeProgress = reader.readNumber();

   // 
   // Update the eye's rotation
   // 

   slimeComponent.eyeRenderPart.rotation = eyeRotation;
   if (anger >= 0) {
      const frequency = lerp(EYE_SHAKE_START_FREQUENCY, EYE_SHAKE_END_FREQUENCY, anger);
      slimeComponent.internalTickCounter += frequency;

      let amplitude = lerp(EYE_SHAKE_START_AMPLITUDE, EYE_SHAKE_END_AMPLITUDE, anger) * 100;
      amplitude /= Math.PI * SLIME_SIZES[slimeComponent.size];
      slimeComponent.eyeRenderPart.rotation += amplitude * Math.sin(slimeComponent.internalTickCounter * 3);
   } else {
      slimeComponent.internalTickCounter = 0;
   }

   slimeComponent.eyeRenderPart.offset.x = EYE_OFFSETS[slimeComponent.size] * Math.sin(slimeComponent.eyeRenderPart.rotation);
   slimeComponent.eyeRenderPart.offset.y = EYE_OFFSETS[slimeComponent.size] * Math.cos(slimeComponent.eyeRenderPart.rotation);

   if (anger === -1) {
      slimeComponent.bodyRenderPart.shakeAmount = 0;
   } else {
      slimeComponent.bodyRenderPart.shakeAmount = getBodyShakeAmount(spitChargeProgress);
   }

   // @Temporary @Speed
   const orbSizes = new Array<SlimeSize>();
   const numOrbs = reader.readNumber();
   for (let i = 0; i < numOrbs; i++) {
      const orbSize = reader.readNumber() as SlimeSize;
      orbSizes.push(orbSize);
   }

   // Add any new orbs
   for (let i = slimeComponent.orbs.length; i < orbSizes.length; i++) {
      const size = orbSizes[i];
      createOrb(slimeComponent, entity, size);
   }
}

function onHit(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const slimeComponent = SlimeComponentArray.getComponent(entity);

   const radius = SLIME_SIZES[slimeComponent.size] / 2;
   
   for (let i = 0; i < NUM_PUDDLE_PARTICLES_ON_HIT[slimeComponent.size]; i++) {
      createSlimePoolParticle(transformComponent.position.x, transformComponent.position.y, radius);
   }

   for (let i = 0; i < NUM_SPECK_PARTICLES_ON_HIT[slimeComponent.size]; i++) {
      createSlimeSpeckParticle(transformComponent.position.x, transformComponent.position.y, radius * Math.random());
   }

   playSound("slime-hit-" + randInt(1, 2) + ".mp3", 0.4, 1, transformComponent.position);
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const slimeComponent = SlimeComponentArray.getComponent(entity);

   const radius = SLIME_SIZES[slimeComponent.size] / 2;

   for (let i = 0; i < NUM_PUDDLE_PARTICLES_ON_DEATH[slimeComponent.size]; i++) {
      createSlimePoolParticle(transformComponent.position.x, transformComponent.position.y, radius);
   }

   for (let i = 0; i < NUM_SPECK_PARTICLES_ON_DEATH[slimeComponent.size]; i++) {
      createSlimeSpeckParticle(transformComponent.position.x, transformComponent.position.y, radius * Math.random());
   }

   playSound("slime-death.mp3", 0.4, 1, transformComponent.position);
}