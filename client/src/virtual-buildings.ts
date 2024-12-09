import { Hitbox } from "../../shared/src/boxes/boxes";
import { PacketReader } from "../../shared/src/packets";
import { StructureType } from "../../shared/src/structures";
import { Point } from "../../shared/src/utils";
import { ClientHitbox } from "./boxes";
import { readCircularHitboxFromData, readRectangularHitboxFromData } from "./entity-components/server-components/TransformComponent";
import Layer from "./Layer";
import { layers } from "./world";

export interface VirtualBuilding {
   readonly entityType: StructureType;
   readonly id: number;
   readonly layer: Layer;
   readonly position: Readonly<Point>;
   readonly rotation: number;
   readonly hitboxes: ReadonlyArray<Hitbox>;
}

export function readVirtualBuildingFromData(reader: PacketReader): VirtualBuilding {
   const entityType = reader.readNumber() as StructureType;
   const virtualBuildingID = reader.readNumber();
   const layerDepth = reader.readNumber();
   const x = reader.readNumber();
   const y = reader.readNumber();
   const rotation = reader.readNumber();
   
   const layer = layers[layerDepth];

   // Hitboxes
   const hitboxes = new Array<ClientHitbox>();
   const numHitboxes = reader.readNumber();
   for (let i = 0; i < numHitboxes; i++) {
      const isCircular = reader.readBoolean();
      reader.padOffset(3);

      let hitbox: ClientHitbox;
      if (isCircular) {
         hitbox = readCircularHitboxFromData(reader);
      } else {
         hitbox = readRectangularHitboxFromData(reader);
      }
      hitboxes.push(hitbox);
   }

   return {
      entityType: entityType,
      id: virtualBuildingID,
      layer: layer,
      position: new Point(x, y),
      rotation: rotation,
      hitboxes: hitboxes
   };
}