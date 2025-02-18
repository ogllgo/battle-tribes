import { BlueprintType, ServerComponentType } from "battletribes-shared/components";
import { assertUnreachable, randFloat, rotateXAroundOrigin, rotateYAroundOrigin } from "battletribes-shared/utils";
import { playSoundOnEntity } from "../../sound";
import { createDustCloud, createLightWoodSpeckParticle, createRockParticle, createRockSpeckParticle, createSawdustCloud, createWoodShardParticle } from "../../particles";
import { getEntityTextureAtlas, getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { ParticleRenderLayer } from "../../rendering/webgl/particle-rendering";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { PacketReader } from "battletribes-shared/packets";
import { Entity } from "../../../../shared/src/entities";
import { TransformComponentArray } from "./TransformComponent";
import { EntityPreCreationInfo, getEntityRenderInfo } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { BALLISTA_GEAR_X, BALLISTA_GEAR_Y, BALLISTA_AMMO_BOX_OFFSET_X, BALLISTA_AMMO_BOX_OFFSET_Y } from "../../utils";
import { WARRIOR_HUT_SIZE } from "./HutComponent";
import { EntityConfig } from "../ComponentArray";
import { TribeComponentArray } from "./TribeComponent";
import { playerTribe } from "../../tribes";

export interface BlueprintComponentParams {
   readonly blueprintType: BlueprintType;
   readonly lastBlueprintProgress: number;
   readonly associatedEntityID: number;
}

export interface BlueprintComponent {
   readonly partialRenderParts: Array<TexturedRenderPart>;
   
   blueprintType: BlueprintType;
   lastBlueprintProgress: number;
   associatedEntityID: number;
}

interface ProgressTextureInfo {
   readonly progressTextureSources: ReadonlyArray<string>;
   // @Cleanup: Just use the last element of the progress textures
   readonly completedTextureSource: string;
   readonly offsetX: number;
   readonly offsetY: number;
   readonly rotation: number;
   readonly zIndex: number;
}
// @Cleanup: Some of these are duplicates
// @Robustness: Do something better than hand-writing 'blueprint-1', 'blueprint-2', etc. in an array.
export const BLUEPRINT_PROGRESS_TEXTURE_SOURCES: Record<BlueprintType, ReadonlyArray<ProgressTextureInfo>> = {
   [BlueprintType.woodenDoor]: [
      {
         progressTextureSources: ["entities/door/wooden-door-blueprint-1.png", "entities/door/wooden-door-blueprint-2.png"],
         completedTextureSource: "entities/door/wooden-door.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0,
         zIndex: 0
      }
   ],
   [BlueprintType.stoneDoor]: [
      {
         progressTextureSources: ["entities/door/stone-door-blueprint-1.png", "entities/door/stone-door-blueprint-2.png"],
         completedTextureSource: "entities/door/stone-door.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0,
         zIndex: 0
      }
   ],
   // @Cleanup
   [BlueprintType.stoneDoorUpgrade]: [
      {
         progressTextureSources: ["entities/door/stone-door-blueprint-1.png", "entities/door/stone-door-blueprint-2.png"],
         completedTextureSource: "entities/door/stone-door.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0,
         zIndex: 0
      }
   ],
   [BlueprintType.woodenEmbrasure]: [
      {
         progressTextureSources: ["entities/embrasure/wooden-embrasure-blueprint-1.png", "entities/embrasure/wooden-embrasure-blueprint-2.png", "entities/embrasure/wooden-embrasure-blueprint-3.png"],
         completedTextureSource: "entities/embrasure/wooden-embrasure.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0,
         zIndex: 0
      }
   ],
   [BlueprintType.stoneEmbrasure]: [
      {
         progressTextureSources: ["entities/embrasure/stone-embrasure-blueprint-1.png", "entities/embrasure/stone-embrasure-blueprint-2.png", "entities/embrasure/stone-embrasure-blueprint-3.png"],
         completedTextureSource: "entities/embrasure/stone-embrasure.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0,
         zIndex: 0
      }
   ],
   // @Cleanup
   [BlueprintType.stoneEmbrasureUpgrade]: [
      {
         progressTextureSources: ["entities/embrasure/stone-embrasure-blueprint-1.png", "entities/embrasure/stone-embrasure-blueprint-2.png", "entities/embrasure/stone-embrasure-blueprint-3.png"],
         completedTextureSource: "entities/embrasure/stone-embrasure.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0,
         zIndex: 0
      }
   ],
   [BlueprintType.woodenTunnel]: [
      {
         progressTextureSources: ["entities/tunnel/wooden-tunnel-blueprint-1.png", "entities/tunnel/wooden-tunnel-blueprint-2.png"],
         completedTextureSource: "entities/tunnel/wooden-tunnel.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0,
         zIndex: 0
      }
   ],
   [BlueprintType.stoneTunnel]: [
      {
         progressTextureSources: ["entities/tunnel/stone-tunnel-blueprint-1.png", "entities/tunnel/stone-tunnel-blueprint-2.png"],
         completedTextureSource: "entities/tunnel/stone-tunnel.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0,
         zIndex: 0
      }
   ],
   // @Cleanup
   [BlueprintType.stoneTunnelUpgrade]: [
      {
         progressTextureSources: ["entities/tunnel/stone-tunnel-blueprint-1.png", "entities/tunnel/stone-tunnel-blueprint-2.png"],
         completedTextureSource: "entities/tunnel/stone-tunnel.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0,
         zIndex: 0
      }
   ],
   [BlueprintType.ballista]: [
      // Base
      {
         progressTextureSources: ["entities/ballista/base-blueprint-1.png", "entities/ballista/base-blueprint-2.png", "entities/ballista/base-blueprint-3.png", "entities/ballista/base-blueprint-4.png", "entities/ballista/base-blueprint-5.png", "entities/ballista/base-blueprint-6.png", "entities/ballista/base.png"],
         completedTextureSource: "entities/ballista/base.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0,
         zIndex: 0
      },
      // Plate
      {
         progressTextureSources: ["entities/ballista/plate-blueprint-1.png", "entities/ballista/plate-blueprint-2.png", "entities/ballista/plate.png"],
         completedTextureSource: "entities/ballista/plate.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0,
         zIndex: 2
      },
      // Shaft
      {
         progressTextureSources: ["entities/ballista/shaft-blueprint-1.png", "entities/ballista/shaft-blueprint-2.png", "entities/ballista/shaft-blueprint-3.png", "entities/ballista/shaft-blueprint-4.png", "entities/ballista/shaft.png"],
         completedTextureSource: "entities/ballista/shaft.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0,
         zIndex: 3
      },
      // Crossbow
      {
         progressTextureSources: ["entities/ballista/crossbow-blueprint-1.png", "entities/ballista/crossbow-blueprint-2.png", "entities/ballista/crossbow-blueprint-3.png", "entities/ballista/crossbow-blueprint-4.png", "entities/ballista/crossbow.png"],
         completedTextureSource: "entities/ballista/crossbow.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0,
         zIndex: 5
      },
      // Left gear
      {
         progressTextureSources: ["entities/ballista/gear.png"],
         completedTextureSource: "entities/ballista/gear.png",
         offsetX: BALLISTA_GEAR_X,
         offsetY: BALLISTA_GEAR_Y,
         rotation: 0,
         zIndex: 2.5
      },
      // Right gear
      {
         progressTextureSources: ["entities/ballista/gear.png"],
         completedTextureSource: "entities/ballista/gear.png",
         offsetX: -BALLISTA_GEAR_X,
         offsetY: BALLISTA_GEAR_Y,
         rotation: 0,
         zIndex: 2.6
      },
      // Ammo box
      {
         progressTextureSources: ["entities/ballista/ammo-box-blueprint-1.png", "entities/ballista/ammo-box-blueprint-2.png", "entities/ballista/ammo-box.png"],
         completedTextureSource: "entities/ballista/ammo-box.png",
         offsetX: BALLISTA_AMMO_BOX_OFFSET_X,
         offsetY: BALLISTA_AMMO_BOX_OFFSET_Y,
         rotation: Math.PI / 2,
         zIndex: 1
      }
   ],
   [BlueprintType.slingTurret]: [
      // Base
      {
         progressTextureSources: ["entities/sling-turret/base-blueprint-1.png", "entities/sling-turret/base-blueprint-2.png", "entities/sling-turret/base-blueprint-3.png", "entities/sling-turret/base-blueprint-4.png", "entities/sling-turret/sling-turret-base.png"],
         completedTextureSource: "entities/sling-turret/sling-turret-base.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0,
         zIndex: 0
      },
      // Plate
      {
         progressTextureSources: ["entities/sling-turret/plate-blueprint-1.png", "entities/sling-turret/plate-blueprint-2.png", "entities/sling-turret/sling-turret-plate.png"],
         completedTextureSource: "entities/sling-turret/sling-turret-plate.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0,
         zIndex: 1
      },
      // Sling
      {
         progressTextureSources: ["entities/sling-turret/sling-blueprint-1.png", "entities/sling-turret/sling-blueprint-2.png"],
         completedTextureSource: "entities/sling-turret/sling-blueprint-2.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0,
         zIndex: 2
      }
   ],
   [BlueprintType.stoneWall]: [
      {
         progressTextureSources: ["entities/wall/stone-wall-blueprint-1.png", "entities/wall/stone-wall-blueprint-2.png", "entities/wall/stone-wall-blueprint-3.png"],
         completedTextureSource: "entities/wall/stone-wall.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0,
         zIndex: 0
      }
   ],
   [BlueprintType.stoneFloorSpikes]: [
      {
         progressTextureSources: ["entities/spikes/stone-floor-spikes-blueprint-1.png", "entities/spikes/stone-floor-spikes-blueprint-2.png"],
         completedTextureSource: "entities/spikes/stone-floor-spikes.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0,
         zIndex: 0
      }
   ],
   [BlueprintType.stoneWallSpikes]: [
      {
         progressTextureSources: ["entities/spikes/stone-wall-spikes-blueprint-1.png", "entities/spikes/stone-wall-spikes-blueprint-2.png"],
         completedTextureSource: "entities/spikes/stone-wall-spikes.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0,
         zIndex: 0
      }
   ],
   [BlueprintType.warriorHutUpgrade]: [
      {
         progressTextureSources: ["entities/warrior-hut/warrior-hut-blueprint-1.png", "entities/warrior-hut/warrior-hut-blueprint-2.png", "entities/warrior-hut/warrior-hut-blueprint-3.png", "entities/warrior-hut/warrior-hut-blueprint-4.png", "entities/warrior-hut/warrior-hut-blueprint-5.png", "entities/warrior-hut/warrior-hut-blueprint-6.png"],
         completedTextureSource: "entities/warrior-hut/warrior-hut.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0,
         zIndex: 0
      },
      // Left door
      {
         progressTextureSources: ["entities/warrior-hut/warrior-hut-door.png"],
         completedTextureSource: "entities/warrior-hut/warrior-hut-door.png",
         offsetX: -20,
         offsetY: WARRIOR_HUT_SIZE / 2,
         rotation: Math.PI/2,
         zIndex: 1
      },
      // Right door
      {
         progressTextureSources: ["entities/warrior-hut/warrior-hut-door.png"],
         completedTextureSource: "entities/warrior-hut/warrior-hut-door.png",
         offsetX: 20,
         offsetY: WARRIOR_HUT_SIZE / 2,
         rotation: Math.PI*3/2,
         zIndex: 2
      }
   ],
   [BlueprintType.fenceGate]: [
      {
         progressTextureSources: ["entities/fence-gate/fence-gate-sides-blueprint-1.png"],
         completedTextureSource: "entities/fence-gate/fence-gate-sides.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0,
         zIndex: 1
      },
      {
         progressTextureSources: ["entities/fence-gate/fence-gate-door-blueprint-1.png"],
         completedTextureSource: "entities/fence-gate/fence-gate-door.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0,
         zIndex: 0
      },
   ],
   [BlueprintType.stoneBracings]: [
      {
         progressTextureSources: ["entities/bracings/stone-vertical-post.png"],
         completedTextureSource: "entities/bracings/stone-vertical-post.png",
         offsetX: 0,
         offsetY: 28,
         rotation: 0,
         zIndex: 0
      }
   ],
   [BlueprintType.scrappy]: [
      {
         progressTextureSources: ["entities/scrappy/body.png"],
         completedTextureSource: "entities/scrappy/body.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0,
         zIndex: 0
      },
      {
         progressTextureSources: ["entities/scrappy/hand.png"],
         completedTextureSource: "entities/scrappy/hand.png",
         offsetX: 0,
         offsetY: 20,
         rotation: 0,
         zIndex: 0
      }
   ],
   [BlueprintType.cogwalker]: [
      {
         progressTextureSources: ["entities/cogwalker/body.png"],
         completedTextureSource: "entities/cogwalker/body.png",
         offsetX: 0,
         offsetY: 0,
         rotation: 0,
         zIndex: 0
      },
      {
         progressTextureSources: ["entities/cogwalker/hand.png"],
         completedTextureSource: "entities/cogwalker/hand.png",
         offsetX: 28 * Math.sin(0.4 * Math.PI),
         offsetY: 28 * Math.cos(0.4 * Math.PI),
         rotation: 0,
         zIndex: 0
      },
      {
         progressTextureSources: ["entities/cogwalker/hand.png"],
         completedTextureSource: "entities/cogwalker/hand.png",
         offsetX: -28 * Math.sin(0.4 * Math.PI),
         offsetY: 28 * Math.cos(0.4 * Math.PI),
         rotation: 0,
         zIndex: 0
      }
   ]
};

const createWoodenBlueprintWorkParticleEffects = (entity: Entity): void => {
   const transformComponent = TransformComponentArray.getComponent(entity);
   
   for (let i = 0; i < 2; i++) {
      createWoodShardParticle(transformComponent.position.x, transformComponent.position.y, 24);
   }

   for (let i = 0; i < 3; i++) {
      createLightWoodSpeckParticle(transformComponent.position.x, transformComponent.position.y, 24 * Math.random());
   }

   for (let i = 0; i < 2; i++) {
      const x = transformComponent.position.x + randFloat(-24, 24);
      const y = transformComponent.position.y + randFloat(-24, 24);
      createSawdustCloud(x, y);
   }
}
/*
// @Incomplete:
make them render on high position
make the origin point for the offset be based on the partial render part (random point in the partial render part)
*/

const createStoneBlueprintWorkParticleEffects = (originX: number, originY: number): void => {
   for (let i = 0; i < 3; i++) {
      const offsetDirection = 2 * Math.PI * Math.random();
      const offsetAmount = 12 * Math.random();
      createRockParticle(originX + offsetAmount * Math.sin(offsetDirection), originY + offsetAmount * Math.cos(offsetDirection), 2 * Math.PI * Math.random(), randFloat(50, 70), ParticleRenderLayer.high);
   }

   for (let i = 0; i < 10; i++) {
      createRockSpeckParticle(originX, originY, 12 * Math.random(), 0, 0, ParticleRenderLayer.high);
   }

   for (let i = 0; i < 2; i++) {
      const x = originX + randFloat(-24, 24);
      const y = originY + randFloat(-24, 24);
      createDustCloud(x, y);
   }
}

export const BlueprintComponentArray = new ServerComponentArray<BlueprintComponent, BlueprintComponentParams, never>(ServerComponentType.blueprint, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   onLoad: onLoad,
   onSpawn: onSpawn,
   padData: padData,
   updateFromData: updateFromData,
   onDie: onDie
});

function createParamsFromData(reader: PacketReader): BlueprintComponentParams {
   const blueprintType = reader.readNumber() as BlueprintType;
   const blueprintProgress = reader.readNumber();
   const associatedEntityID = reader.readNumber();

   return {
      blueprintType: blueprintType,
      lastBlueprintProgress: blueprintProgress,
      associatedEntityID: associatedEntityID
   };
}

function createComponent(entityConfig: EntityConfig<ServerComponentType.blueprint, never>): BlueprintComponent {
   const blueprintComponentParams = entityConfig.serverComponents[ServerComponentType.blueprint];
   
   return {
      partialRenderParts: [],
      blueprintType: blueprintComponentParams.blueprintType,
      lastBlueprintProgress: blueprintComponentParams.lastBlueprintProgress,
      associatedEntityID: blueprintComponentParams.associatedEntityID
   };
}

function getMaxRenderParts(preCreationInfo: EntityPreCreationInfo<ServerComponentType.blueprint>): number {
   const blueprintComponentParams = preCreationInfo.serverComponentParams[ServerComponentType.blueprint];
   return 2 * BLUEPRINT_PROGRESS_TEXTURE_SOURCES[blueprintComponentParams.blueprintType].length;
}

const updatePartialTexture = (entity: Entity): void => {
   const blueprintComponent = BlueprintComponentArray.getComponent(entity);
   const blueprintType = blueprintComponent.blueprintType;
   const blueprintProgress = blueprintComponent.lastBlueprintProgress;
   
   const numTextures = countProgressTextures(blueprintType);
   const stage = Math.floor(blueprintProgress * (numTextures + 1));
   if (stage === 0) {
      return;
   }
   
   const lastTextureIndex = stage - 1;
   const progressTextureInfoArray = BLUEPRINT_PROGRESS_TEXTURE_SOURCES[blueprintType];

   let currentIndexStart = 0;
   for (let i = 0; i < progressTextureInfoArray.length; i++) {
      const progressTextureInfo = progressTextureInfoArray[i];

      let localTextureIndex = lastTextureIndex - currentIndexStart;
      if (localTextureIndex >= progressTextureInfo.progressTextureSources.length) {
         localTextureIndex = progressTextureInfo.progressTextureSources.length - 1;
      }

      const textureSource = progressTextureInfo.progressTextureSources[localTextureIndex];
      if (blueprintComponent.partialRenderParts.length <= i) {
         // New render part
         const renderPart = new TexturedRenderPart(
            null,
            progressTextureInfo.zIndex + 0.01,
            progressTextureInfo.rotation,
            getTextureArrayIndex(textureSource)
         );
         renderPart.offset.x = progressTextureInfo.offsetX
         renderPart.offset.y = progressTextureInfo.offsetY;

         const renderInfo = getEntityRenderInfo(entity);
         renderInfo.attachRenderPart(renderPart);
         blueprintComponent.partialRenderParts.push(renderPart);
      } else {
         // Existing render part
         blueprintComponent.partialRenderParts[i].switchTextureSource(textureSource);
      }

      currentIndexStart += progressTextureInfo.progressTextureSources.length;

      // If the last texture index hasn't reached the next set of progress textures, then break
      if (lastTextureIndex < currentIndexStart) {
         break;
      }
   }
}

function onLoad(entity: Entity): void {
   updatePartialTexture(entity);
   
   const blueprintComponent = BlueprintComponentArray.getComponent(entity);
   const tribeComponent = TribeComponentArray.getComponent(entity);
   
   // Create completed render parts
   const progressTextureInfoArray = BLUEPRINT_PROGRESS_TEXTURE_SOURCES[blueprintComponent.blueprintType];
   const renderInfo = getEntityRenderInfo(entity);
   for (let i = 0; i < progressTextureInfoArray.length; i++) {
      const progressTextureInfo = progressTextureInfoArray[i];

      const renderPart = new TexturedRenderPart(
         null,
         progressTextureInfo.zIndex,
         progressTextureInfo.rotation,
         getTextureArrayIndex(progressTextureInfo.completedTextureSource)
      );
      renderPart.offset.x = progressTextureInfo.offsetX;
      renderPart.offset.y = progressTextureInfo.offsetY;
      renderPart.opacity = 0.5;
      if (tribeComponent.tribeID === playerTribe.id) {
         renderPart.tintR = 0.2;
         renderPart.tintG = 0.1;
         renderPart.tintB = 0.8;
      } else {
         renderPart.tintR = 0.8;
         renderPart.tintG = 0.0;
         renderPart.tintB = 0.15;
      }
      renderInfo.attachRenderPart(renderPart);
   }
}


function onSpawn(entity: Entity): void {
   playSoundOnEntity("blueprint-place.mp3", 0.4, 1, entity, false);
}

function padData(reader: PacketReader): void {
   reader.padOffset(3 * Float32Array.BYTES_PER_ELEMENT);
}

const countProgressTextures = (blueprintType: BlueprintType): number => {
   let numTextures = 0;
   const progressTextureInfoArray = BLUEPRINT_PROGRESS_TEXTURE_SOURCES[blueprintType];
   for (let i = 0; i < progressTextureInfoArray.length; i++) {
      const progressTextureInfo = progressTextureInfoArray[i];
      numTextures += progressTextureInfo.progressTextureSources.length;
   }
   return numTextures;
}

const getCurrentBlueprintProgressTexture = (blueprintType: BlueprintType, blueprintProgress: number): ProgressTextureInfo => {
   const numTextures = countProgressTextures(blueprintType);

   const stage = Math.floor(blueprintProgress * (numTextures + 1));
   
   const lastTextureIndex = stage - 1;
   const progressTextureInfoArray = BLUEPRINT_PROGRESS_TEXTURE_SOURCES[blueprintType];

   let currentIndexStart = 0;
   for (let i = 0; i < progressTextureInfoArray.length; i++) {
      const progressTextureInfo = progressTextureInfoArray[i];

      currentIndexStart += progressTextureInfo.progressTextureSources.length;

      if (currentIndexStart >= lastTextureIndex) {
         return progressTextureInfo;
      }
   }

   return progressTextureInfoArray[progressTextureInfoArray.length - 1];
}

function updateFromData(reader: PacketReader, entity: Entity): void {
   const blueprintComponent = BlueprintComponentArray.getComponent(entity);
   
   blueprintComponent.blueprintType = reader.readNumber();
   const blueprintProgress = reader.readNumber();
   blueprintComponent.associatedEntityID = reader.readNumber();

   // @Speed: don't do always, only if the data changes!
   updatePartialTexture(entity);

   if (blueprintProgress !== blueprintComponent.lastBlueprintProgress) {
      const transformComponent = TransformComponentArray.getComponent(entity);

      playSoundOnEntity("blueprint-work.mp3", 0.4, randFloat(0.9, 1.1), entity, false);

      const progressTexture = getCurrentBlueprintProgressTexture(blueprintComponent.blueprintType, blueprintProgress);
      
      // @Cleanup
      const textureAtlas = getEntityTextureAtlas();
      const textureArrayIndex = getTextureArrayIndex(progressTexture.completedTextureSource);
      const xShift = textureAtlas.textureWidths[textureArrayIndex] * 4 * 0.5 * randFloat(-0.75, 0.75);
      const yShift = textureAtlas.textureHeights[textureArrayIndex] * 4 * 0.5 * randFloat(-0.75, 0.75);
      const particleOriginX = transformComponent.position.x + rotateXAroundOrigin(progressTexture.offsetX + xShift, progressTexture.offsetY + yShift, progressTexture.rotation);
      const particleOriginY = transformComponent.position.y + rotateYAroundOrigin(progressTexture.offsetX + xShift, progressTexture.offsetY + yShift, progressTexture.rotation);
      
      // @Incomplete: Change the particle effect type depending on the material of the worked-on partial texture
      // Create particle effects
      switch (blueprintComponent.blueprintType) {
         case BlueprintType.woodenDoor:
         case BlueprintType.woodenEmbrasure:
         case BlueprintType.woodenTunnel:
         case BlueprintType.slingTurret:
         case BlueprintType.ballista:
         case BlueprintType.warriorHutUpgrade:
         case BlueprintType.fenceGate: {
            createWoodenBlueprintWorkParticleEffects(entity);
            break;
         }
         case BlueprintType.stoneDoorUpgrade:
         case BlueprintType.stoneEmbrasure:
         case BlueprintType.stoneEmbrasureUpgrade:
         case BlueprintType.stoneFloorSpikes:
         case BlueprintType.stoneTunnel:
         case BlueprintType.stoneTunnelUpgrade:
         case BlueprintType.stoneWallSpikes:
         case BlueprintType.stoneWall:
         case BlueprintType.stoneDoor:
         case BlueprintType.stoneBracings: {
            createStoneBlueprintWorkParticleEffects(particleOriginX, particleOriginY);
            break;
         }
         case BlueprintType.scrappy:
         case BlueprintType.cogwalker: {
            createStoneBlueprintWorkParticleEffects(particleOriginX, particleOriginY);
            break;
         }
         default: {
            assertUnreachable(blueprintComponent.blueprintType);
         }
      }
   }
   blueprintComponent.lastBlueprintProgress = blueprintProgress;
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);

   playSoundOnEntity("blueprint-work.mp3", 0.4, 1, entity, false);
   playSoundOnEntity("structure-shaping.mp3", 0.4, 1, entity, false);

   // @Cleanup: Copy and pasted from blueprint component
   const blueprintComponent = BlueprintComponentArray.getComponent(entity);
   switch (blueprintComponent.blueprintType) {
      case BlueprintType.woodenDoor:
      case BlueprintType.woodenEmbrasure:
      case BlueprintType.woodenTunnel:
      case BlueprintType.slingTurret:
      case BlueprintType.ballista:
      case BlueprintType.warriorHutUpgrade:
      case BlueprintType.fenceGate: {
         for (let i = 0; i < 5; i++) {
            const x = transformComponent.position.x + randFloat(-32, 32);
            const y = transformComponent.position.y + randFloat(-32, 32);
            createSawdustCloud(x, y);
         }
   
         for (let i = 0; i < 8; i++) {
            createLightWoodSpeckParticle(transformComponent.position.x, transformComponent.position.y, 32);
         }
         break;
      }
      case BlueprintType.stoneDoorUpgrade:
      case BlueprintType.stoneEmbrasure:
      case BlueprintType.stoneEmbrasureUpgrade:
      case BlueprintType.stoneFloorSpikes:
      case BlueprintType.stoneTunnel:
      case BlueprintType.stoneTunnelUpgrade:
      case BlueprintType.stoneWallSpikes:
      case BlueprintType.stoneWall:
      case BlueprintType.stoneDoor:
      case BlueprintType.stoneBracings: {
         for (let i = 0; i < 5; i++) {
            const offsetDirection = 2 * Math.PI * Math.random();
            const offsetAmount = 32 * Math.random();
            createRockParticle(transformComponent.position.x + offsetAmount * Math.sin(offsetDirection), transformComponent.position.y + offsetAmount * Math.cos(offsetDirection), 2 * Math.PI * Math.random(), randFloat(50, 70), ParticleRenderLayer.high);
         }
      
         for (let i = 0; i < 10; i++) {
            createRockSpeckParticle(transformComponent.position.x, transformComponent.position.y, 32 * Math.random(), 0, 0, ParticleRenderLayer.high);
         }
      
         for (let i = 0; i < 3; i++) {
            const x = transformComponent.position.x + randFloat(-32, 32);
            const y = transformComponent.position.y + randFloat(-32, 32);
            createDustCloud(x, y);
         }
         break;
      }
      case BlueprintType.scrappy:
      case BlueprintType.cogwalker: {
         break;
      }
      default: {
         assertUnreachable(blueprintComponent.blueprintType);
      }
   }
}