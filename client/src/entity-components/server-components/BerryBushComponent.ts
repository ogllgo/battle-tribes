import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { getEntityRenderInfo } from "../../world";
import { EntityID } from "../../../../shared/src/entities";
import ServerComponentArray from "../ServerComponentArray";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { TransformComponentArray } from "./TransformComponent";
import { randFloat, randInt } from "../../../../shared/src/utils";
import { createLeafParticle, LeafParticleSize, createLeafSpeckParticle } from "../../particles";
import { playSound } from "../../sound";
import { EntityConfig } from "../ComponentArray";

export interface BerryBushComponentParams {
   readonly numBerries: number;
}

interface RenderParts {
   readonly renderPart: TexturedRenderPart;
}

export interface BerryBushComponent {
   numBerries: number;
   readonly renderPart: TexturedRenderPart;
}

const BERRY_BUSH_TEXTURE_SOURCES = [
   "entities/berry-bush1.png",
   "entities/berry-bush2.png",
   "entities/berry-bush3.png",
   "entities/berry-bush4.png",
   "entities/berry-bush5.png",
   "entities/berry-bush6.png"
];

const RADIUS = 40;

const LEAF_SPECK_COLOUR_LOW = [63/255, 204/255, 91/255] as const;
const LEAF_SPECK_COLOUR_HIGH = [35/255, 158/255, 88/255] as const;

export const BerryBushComponentArray = new ServerComponentArray<BerryBushComponent, BerryBushComponentParams, RenderParts>(ServerComponentType.berryBush, true, {
   createParamsFromData: createParamsFromData,
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   padData: padData,
   updateFromData: updateFromData,
   onHit: onHit,
   onDie: onDie
});

function createParamsFromData(reader: PacketReader): BerryBushComponentParams {
   const numBerries = reader.readNumber();
   return {
      numBerries: numBerries
   };
}

function createRenderParts(renderInfo: EntityRenderInfo, entityConfig: EntityConfig<ServerComponentType.berryBush, never>): RenderParts {
   const renderPart = new TexturedRenderPart(
      null,
      0,
      0,
      getTextureArrayIndex(BERRY_BUSH_TEXTURE_SOURCES[entityConfig.serverComponents[ServerComponentType.berryBush].numBerries])
   );
   renderPart.addTag("berryBushComponent:renderPart");
   renderInfo.attachRenderThing(renderPart)

   return {
      renderPart: renderPart
   };
}

function createComponent(entityConfig: EntityConfig<ServerComponentType.berryBush, never>, renderParts: RenderParts): BerryBushComponent {
   return {
      numBerries: entityConfig.serverComponents[ServerComponentType.berryBush].numBerries,
      renderPart: renderParts.renderPart
   };
}

function padData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: EntityID): void {
   const berryBushComponent = BerryBushComponentArray.getComponent(entity);
   
   berryBushComponent.numBerries = reader.readNumber();

   berryBushComponent.renderPart.switchTextureSource(BERRY_BUSH_TEXTURE_SOURCES[berryBushComponent.numBerries]);
   // @Bug: not working!
   const renderInfo = getEntityRenderInfo(entity);
   renderInfo.dirty();
}

function onHit(entity: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(entity);

   const moveDirection = 2 * Math.PI * Math.random();
   
   const spawnPositionX = transformComponent.position.x + RADIUS * Math.sin(moveDirection);
   const spawnPositionY = transformComponent.position.y + RADIUS * Math.cos(moveDirection);

   createLeafParticle(spawnPositionX, spawnPositionY, moveDirection + randFloat(-1, 1), LeafParticleSize.small);
   
   // Create leaf specks
   for (let i = 0; i < 5; i++) {
      createLeafSpeckParticle(transformComponent.position.x, transformComponent.position.y, RADIUS, LEAF_SPECK_COLOUR_LOW, LEAF_SPECK_COLOUR_HIGH);
   }

   playSound("berry-bush-hit-" + randInt(1, 3) + ".mp3", 0.4, 1, transformComponent.position);
}

function onDie(entity: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(entity);

   for (let i = 0; i < 6; i++) {
      const offsetMagnitude = RADIUS * Math.random();
      const spawnOffsetDirection = 2 * Math.PI * Math.random();
      const spawnPositionX = transformComponent.position.x + offsetMagnitude * Math.sin(spawnOffsetDirection);
      const spawnPositionY = transformComponent.position.y + offsetMagnitude * Math.cos(spawnOffsetDirection);

      createLeafParticle(spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), LeafParticleSize.small);
   }
   
   // Create leaf specks
   for (let i = 0; i < 9; i++) {
      createLeafSpeckParticle(transformComponent.position.x, transformComponent.position.y, RADIUS * Math.random(), LEAF_SPECK_COLOUR_LOW, LEAF_SPECK_COLOUR_HIGH);
   }

   playSound("berry-bush-destroy-1.mp3", 0.4, 1, transformComponent.position);
}