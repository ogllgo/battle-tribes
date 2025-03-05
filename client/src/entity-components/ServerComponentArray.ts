import { ServerComponentType } from "../../../shared/src/components";
import { Entity } from "../../../shared/src/entities";
import { PacketReader } from "../../../shared/src/packets";
import { ComponentTint } from "../EntityRenderInfo";
import { ComponentArray, ComponentArrayFunctions, ComponentArrayType } from "./ComponentArray";

interface ServerComponentArrayFunctions<
   T extends object,
   ComponentParams extends object,
   ComponentIntermediateInfo extends object | never
> extends ComponentArrayFunctions<T, ComponentIntermediateInfo> {
   createParamsFromData(reader: PacketReader): ComponentParams;
   padData(reader: PacketReader): void;
   // Note: reader is before entity as every function will need the reader, but not all are guaranteed to need the entity
   updateFromData(reader: PacketReader, entity: Entity): void;
   /** Updates the player instance from server data */
   updatePlayerFromData?(reader: PacketReader, isInitialData: boolean): void;
   /** Called on the player instance after all components are updated from server data */
   updatePlayerAfterData?(): void;
   calculateTint?(entity: Entity): ComponentTint;
}

export default class ServerComponentArray<
   /** The actual component's type */
   T extends object = object,
   ComponentParams extends object = object,
   ComponentIntermediateInfo extends object | never = object | never,
   ComponentType extends ServerComponentType = ServerComponentType
> extends ComponentArray<T, ComponentIntermediateInfo, ComponentArrayType.server, ComponentType> implements ServerComponentArrayFunctions<T, ComponentParams, ComponentIntermediateInfo> {
   public createParamsFromData: (reader: PacketReader) => ComponentParams;
   public padData: (reader: PacketReader) => void;
   public updateFromData: (reader: PacketReader, entity: Entity) => void;
   public updatePlayerFromData?(reader: PacketReader, isInitialData: boolean): void;
   public updatePlayerAfterData?(): void;
   public calculateTint?(entity: Entity): ComponentTint;

   constructor(componentType: ComponentType, isActiveByDefault: boolean, functions: ServerComponentArrayFunctions<T, ComponentParams, ComponentIntermediateInfo>) {
      super(ComponentArrayType.server, componentType, isActiveByDefault, functions);

      this.createParamsFromData = functions.createParamsFromData;
      this.padData = functions.padData;
      this.updateFromData = functions.updateFromData;
      this.updatePlayerFromData = functions.updatePlayerFromData;
      this.updatePlayerAfterData = functions.updatePlayerAfterData;
      this.calculateTint = functions.calculateTint;
   }
}