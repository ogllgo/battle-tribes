import { ServerComponentType } from "../../../shared/src/components";
import { Entity } from "../../../shared/src/entities";
import { PacketReader } from "../../../shared/src/packets";
import { ComponentTint } from "../EntityRenderInfo";
import { EntityPreCreationInfo } from "../world";
import { ComponentArray, ComponentArrayFunctions, ComponentArrayType } from "./ComponentArray";

interface ServerComponentArrayFunctions<
   T extends object,
   ComponentParams extends object,
   RenderParts extends object | never
> extends ComponentArrayFunctions<T, RenderParts> {
   createParamsFromData(reader: PacketReader): ComponentParams;
   getMaxRenderParts(preCreationInfo: EntityPreCreationInfo<never>): number;
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
   RenderParts extends object | never = object | never,
   ComponentType extends ServerComponentType = ServerComponentType
> extends ComponentArray<T, RenderParts, ComponentArrayType.server, ComponentType> implements ServerComponentArrayFunctions<T, ComponentParams, RenderParts> {
   public createParamsFromData: (reader: PacketReader) => ComponentParams;
   public readonly getMaxRenderParts: (preCreationInfo: EntityPreCreationInfo<never>) => number;
   public padData: (reader: PacketReader) => void;
   public updateFromData: (reader: PacketReader, entity: Entity) => void;
   public updatePlayerFromData?(reader: PacketReader, isInitialData: boolean): void;
   public updatePlayerAfterData?(): void;
   public calculateTint?(entity: Entity): ComponentTint;

   constructor(componentType: ComponentType, isActiveByDefault: boolean, functions: ServerComponentArrayFunctions<T, ComponentParams, RenderParts>) {
      super(ComponentArrayType.server, componentType, isActiveByDefault, functions);

      this.createParamsFromData = functions.createParamsFromData;
      this.getMaxRenderParts = functions.getMaxRenderParts;
      this.padData = functions.padData;
      this.updateFromData = functions.updateFromData;
      this.updatePlayerFromData = functions.updatePlayerFromData;
      this.updatePlayerAfterData = functions.updatePlayerAfterData;
      this.calculateTint = functions.calculateTint;
   }
}