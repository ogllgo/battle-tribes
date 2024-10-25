import { ServerComponentType } from "../../../shared/src/components";
import { EntityID } from "../../../shared/src/entities";
import { PacketReader } from "../../../shared/src/packets";
import { ComponentTint } from "../EntityRenderInfo";
import { ComponentArray, ComponentArrayFunctions, ComponentArrayType } from "./ComponentArray";

interface ServerComponentArrayFunctions<
   T extends object,
   ComponentParams extends object,
   RenderParts extends object | never
> extends ComponentArrayFunctions<T, RenderParts> {
   createParamsFromData(reader: PacketReader): ComponentParams;
   padData(reader: PacketReader): void;
   // Note: reader is before entity as every function will need the reader, but not all are guaranteed to need the entity
   updateFromData(reader: PacketReader, entity: EntityID): void;
   /** Updates the player instance from server data */
   updatePlayerFromData?(reader: PacketReader, isInitialData: boolean): void;
   /** Called on the player instance after all components are updated from server data */
   updatePlayerAfterData?(): void;
   calculateTint?(entity: EntityID): ComponentTint;
}

export default class ServerComponentArray<
   /** The actual component's type */
   T extends object = object,
   ComponentParams extends object = object,
   RenderParts extends object | never = object | never,
   ComponentType extends ServerComponentType = ServerComponentType
> extends ComponentArray<T, RenderParts, ComponentArrayType.server, ComponentType> implements ServerComponentArrayFunctions<T, ComponentParams, RenderParts> {
   public createParamsFromData: (reader: PacketReader) => ComponentParams;
   public padData: (reader: PacketReader) => void;
   public updateFromData: (reader: PacketReader, entity: EntityID) => void;
   public updatePlayerFromData?(reader: PacketReader, isInitialData: boolean): void;
   public updatePlayerAfterData?(): void;
   public calculateTint?(entity: EntityID): ComponentTint;

   constructor(componentType: ComponentType, isActiveByDefault: boolean, functions: ServerComponentArrayFunctions<T, ComponentParams, RenderParts>) {
      super(ComponentArrayType.server, componentType, isActiveByDefault, functions);

      this.createParamsFromData = functions.createParamsFromData;
      this.padData = functions.padData;
      this.updateFromData = functions.updateFromData;
      this.updatePlayerFromData = functions.updatePlayerFromData;
      this.updatePlayerAfterData = functions.updatePlayerAfterData;
      this.calculateTint = functions.calculateTint;
   }
}