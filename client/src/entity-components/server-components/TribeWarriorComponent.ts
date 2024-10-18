import { ScarInfo } from "battletribes-shared/components";
import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray, { EntityConfig } from "../ServerComponentArray";
import { EntityID } from "../../../../shared/src/entities";

export interface TribeWarriorComponentParams {
   readonly scars: Array<ScarInfo>;
}

export interface TribeWarriorComponent {
   readonly scars: Array<ScarInfo>;
}

export const TribeWarriorComponentArray = new ServerComponentArray<TribeWarriorComponent, TribeWarriorComponentParams, never>(ServerComponentType.tribeWarrior, true, {
   createParamsFromData: createParamsFromData,
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

function createComponent(entityConfig: EntityConfig<ServerComponentType.tribeWarrior>): TribeWarriorComponent {
   return {
      scars: entityConfig.components[ServerComponentType.tribeWarrior].scars
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