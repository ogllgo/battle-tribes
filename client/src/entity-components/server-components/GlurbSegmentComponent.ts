import { ServerComponentType } from "../../../../shared/src/components";
import { Entity } from "../../../../shared/src/entities";
import { PacketReader } from "../../../../shared/src/packets";
import { Settings } from "../../../../shared/src/settings";
import { randFloat, Point, randAngle } from "../../../../shared/src/utils";
import { Hitbox } from "../../hitboxes";
import { createSlurbParticle } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { coatSlimeTrails } from "../../rendering/webgl/slime-trail-rendering";
import { playSound, playSoundOnHitbox } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityIntermediateInfo, EntityParams, getEntityLayer, getEntityRenderInfo } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { entityIsVisibleToCamera, TransformComponentArray, getRandomPositionInBox, entityChildIsHitbox } from "./TransformComponent";

export interface GlurbSegmentComponentParams {
   readonly mossBallCompleteness: number;
}

interface IntermediateInfo {
   readonly mossBallRenderPart: TexturedRenderPart | null;
}

export interface GlurbSegmentComponent {
   mossBallRenderPart: TexturedRenderPart | null;
}

export const GlurbSegmentComponentArray = new ServerComponentArray<GlurbSegmentComponent, GlurbSegmentComponentParams, IntermediateInfo>(ServerComponentType.glurbSegment, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData,
   onTick: onTick,
   onHit: onHit,
   onDie: onDie
});

function createParamsFromData(reader: PacketReader): GlurbSegmentComponentParams {
   const mossBallCompleteness = reader.readNumber();
   
   return {
      mossBallCompleteness: mossBallCompleteness
   };
}

const getMossBallTextureSource = (mossBallCompleteness: number): string => {
   switch (mossBallCompleteness) {
      case 1: return "entities/glurb/moss-ball/moss-ball-1.png";
      case 2: return "entities/glurb/moss-ball/moss-ball-2.png";
      case 3: return "entities/glurb/moss-ball/moss-ball-3.png";
      case 4: return "entities/glurb/moss-ball/moss-ball-4.png";
      case 5: return "entities/glurb/moss-ball/moss-ball-5.png";
      case 6: return "entities/glurb/moss-ball/moss-ball-6.png";
      default: throw new Error();
   }
}

const createMossBallRenderPart = (mossBallCompleteness: number, parentHitbox: Hitbox): TexturedRenderPart => {
   const renderPart = new TexturedRenderPart(
      parentHitbox,
      0,
      0,
      getTextureArrayIndex(getMossBallTextureSource(mossBallCompleteness))
   );
   return renderPart;
}

function populateIntermediateInfo(entityIntermediateInfo: EntityIntermediateInfo, entityParams: EntityParams): IntermediateInfo {
   const glurbSegmentComponentParams = entityParams.serverComponentParams[ServerComponentType.glurbSegment]!;

   let renderPart: TexturedRenderPart | null;
   if (glurbSegmentComponentParams.mossBallCompleteness > 0) {
      const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
      const hitbox = transformComponentParams.children[0] as Hitbox;
   
      renderPart = createMossBallRenderPart(glurbSegmentComponentParams.mossBallCompleteness, hitbox);
      entityIntermediateInfo.renderInfo.attachRenderPart(renderPart);
   } else {
      renderPart = null;
   }

   return {
      mossBallRenderPart: renderPart
   };
}

function createComponent(_entityParams: EntityParams, intermediateInfo: IntermediateInfo): GlurbSegmentComponent {
   return {
      mossBallRenderPart: intermediateInfo.mossBallRenderPart
   };
}

function getMaxRenderParts(): number {
   return 1;
}

function padData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, glurbSegment: Entity): void {
   const glurbSegmentComponent = GlurbSegmentComponentArray.getComponent(glurbSegment);

   const mossBallCompleteness = reader.readNumber();

   if (mossBallCompleteness === 0) {
      if (glurbSegmentComponent.mossBallRenderPart !== null) {
         const renderInfo = getEntityRenderInfo(glurbSegment);
         renderInfo.removeRenderPart(glurbSegmentComponent.mossBallRenderPart);
         glurbSegmentComponent.mossBallRenderPart = null;
      }
   } else {
      if (glurbSegmentComponent.mossBallRenderPart === null) {
         const transformComponent = TransformComponentArray.getComponent(glurbSegment);
         const hitbox = transformComponent.children[0] as Hitbox;
         
         glurbSegmentComponent.mossBallRenderPart = createMossBallRenderPart(mossBallCompleteness, hitbox);
         const renderInfo = getEntityRenderInfo(glurbSegment);
         renderInfo.attachRenderPart(glurbSegmentComponent.mossBallRenderPart);
      } else {
         glurbSegmentComponent.mossBallRenderPart.switchTextureSource(getMossBallTextureSource(mossBallCompleteness));
      }
   }
}

function onTick(glurb: Entity): void {
   // @Hack
   if (entityIsVisibleToCamera(glurb)) {
      const layer = getEntityLayer(glurb);
      const transformComponent = TransformComponentArray.getComponent(glurb);
      for (const hitbox of transformComponent.children) {
         if (entityChildIsHitbox(hitbox)) {
            coatSlimeTrails(layer, hitbox.box);
         }
      }
   }

   const glurbSegmentComponent = GlurbSegmentComponentArray.getComponent(glurb);
   if (glurbSegmentComponent.mossBallRenderPart !== null) {
      // @Hack ! this will be better once the moss ball is its own entity
      glurbSegmentComponent.mossBallRenderPart.angle += Math.PI * 0.25 * Settings.I_TPS;
   }
}

function onHit(entity: Entity, _hitbox: Hitbox, hitPosition: Point): void {
   for (let i = 0; i < 10; i++) {
      createSlurbParticle(hitPosition.x, hitPosition.y, randAngle(), randFloat(80, 120), 0, 0);
   }

   playSound("glurb-hit.mp3", 0.4, randFloat(0.9, 1.2), hitPosition, getEntityLayer(entity));
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.children[0] as Hitbox;

   for (let i = 0; i < 3; i++) {
      const pos = getRandomPositionInBox(hitbox.box);
      createSlurbParticle(pos.x, pos.y, randAngle(), randFloat(80, 120), 0, 0);
   }

   playSoundOnHitbox("glurb-death.mp3", 0.2, 1, entity, hitbox, false);
}