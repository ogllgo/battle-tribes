import { ScarInfo } from "battletribes-shared/components";
import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import { Entity } from "../../../../shared/src/entities";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityIntermediateInfo, EntityParams } from "../../world";
import { Hitbox } from "../../hitboxes";

export interface TribeWarriorComponentParams {
   readonly scars: Array<ScarInfo>;
}

interface IntermediateInfo {}

export interface TribeWarriorComponent {
   readonly scars: Array<ScarInfo>;
}

export const TribeWarriorComponentArray = new ServerComponentArray<TribeWarriorComponent, TribeWarriorComponentParams, IntermediateInfo>(ServerComponentType.tribeWarrior, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(reader: PacketReader): TribeWarriorComponentParams {
   const scars = new Array<ScarInfo>();
   const numScars = reader.readNumber();
   for (let i = 0; i < numScars; i++) {
      const offsetX = reader.readNumber();
      const offsetY = reader.readNumber();
      const rotation = reader.readNumber();
      const type = reader.readNumber();

      scars.push({
         offsetX: offsetX,
         offsetY: offsetY,
         rotation: rotation,
         type: type
      });
   }

   return {
      scars: scars
   };
}

function populateIntermediateInfo(entityIntermediateInfo: EntityIntermediateInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.children[0] as Hitbox;
   
   const tribeWarriorComponentParams = entityParams.serverComponentParams[ServerComponentType.tribeWarrior]!;
   for (let i = 0; i < tribeWarriorComponentParams.scars.length; i++) {
      const scarInfo = tribeWarriorComponentParams.scars[i];

      const renderPart = new TexturedRenderPart(
         hitbox,
         2.5,
         scarInfo.rotation,
         getTextureArrayIndex("scars/scar-" + (scarInfo.type + 1) + ".png")
      );
      renderPart.offset.x = scarInfo.offsetX;
      renderPart.offset.y = scarInfo.offsetY;

      entityIntermediateInfo.renderInfo.attachRenderPart(renderPart);
   }

   return {};
}

function createComponent(entityParams: EntityParams): TribeWarriorComponent {
   return {
      scars: entityParams.serverComponentParams[ServerComponentType.tribeWarrior]!.scars
   };
}

function getMaxRenderParts(entityParams: EntityParams): number {
   const tribeWarriorComponentParams = entityParams.serverComponentParams[ServerComponentType.tribeWarrior]!;
   return tribeWarriorComponentParams.scars.length;
}

function padData(reader: PacketReader): void {
   const numScars = reader.readNumber();
   reader.padOffset(4 * Float32Array.BYTES_PER_ELEMENT * numScars);
}

function updateFromData(reader: PacketReader, entity: Entity): void {
   const tribeWarriorComponent = TribeWarriorComponentArray.getComponent(entity);
   
   const numScars = reader.readNumber();
   for (let i = tribeWarriorComponent.scars.length; i < numScars; i++) {
      const offsetX = reader.readNumber();
      const offsetY = reader.readNumber();
      const rotation = reader.readNumber();
      const type = reader.readNumber();

      tribeWarriorComponent.scars.push({
         offsetX: offsetX,
         offsetY: offsetY,
         rotation: rotation,
         type: type
      });
   }
}