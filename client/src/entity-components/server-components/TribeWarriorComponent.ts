import { ScarInfo } from "battletribes-shared/components";
import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import { EntityID } from "../../../../shared/src/entities";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { EntityConfig } from "../ComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";

export interface TribeWarriorComponentParams {
   readonly scars: Array<ScarInfo>;
}

interface RenderParts {}

export interface TribeWarriorComponent {
   readonly scars: Array<ScarInfo>;
}

export const TribeWarriorComponentArray = new ServerComponentArray<TribeWarriorComponent, TribeWarriorComponentParams, RenderParts>(ServerComponentType.tribeWarrior, true, {
   createParamsFromData: createParamsFromData,
   createRenderParts: createRenderParts,
   createComponent: createComponent,
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

function createRenderParts(renderInfo: EntityRenderInfo, entityConfig: EntityConfig<ServerComponentType.tribeWarrior, never>): RenderParts {
   const tribeWarriorComponentParams = entityConfig.serverComponents[ServerComponentType.tribeWarrior];
   for (let i = 0; i < tribeWarriorComponentParams.scars.length; i++) {
      const scarInfo = tribeWarriorComponentParams.scars[i];

      const renderPart = new TexturedRenderPart(
         null,
         2.5,
         scarInfo.rotation,
         getTextureArrayIndex("scars/scar-" + (scarInfo.type + 1) + ".png")
      );
      renderPart.offset.x = scarInfo.offsetX;
      renderPart.offset.y = scarInfo.offsetY;

      renderInfo.attachRenderPart(renderPart);
   }

   return {};
}

function createComponent(entityConfig: EntityConfig<ServerComponentType.tribeWarrior, never>): TribeWarriorComponent {
   return {
      scars: entityConfig.serverComponents[ServerComponentType.tribeWarrior].scars
   };
}

function padData(reader: PacketReader): void {
   const numScars = reader.readNumber();
   reader.padOffset(4 * Float32Array.BYTES_PER_ELEMENT * numScars);
}

function updateFromData(reader: PacketReader, entity: EntityID): void {
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