import { ServerComponentType } from "../../../shared/src/components";
import { EntityID, EntityType } from "../../../shared/src/entities";
import { PacketReader } from "../../../shared/src/packets";
import { ComponentTint, EntityRenderInfo } from "../Entity";
import Layer from "../Layer";
import { ComponentArray, ComponentArrayFunctions, ComponentArrayType } from "./ComponentArray";
import { ServerComponentParams } from "./components";

// @Cleanup: Ideally only have in the 
export type EntityComponents = Partial<{
   [T in ServerComponentType]: ServerComponentParams<T>;
}>;

/** Contains information useful for creating components. */
export type EntityConfig<ServerComponentTypes extends ServerComponentType = ServerComponentType> = {
   /** Currently this is used to create lights and sometimes attach components in the createComponent function */
   readonly entity: EntityID;
   readonly entityType: EntityType;
   readonly layer: Layer;
   readonly renderInfo: EntityRenderInfo;
   readonly components: {
      [T in ServerComponentTypes]: ServerComponentParams<T>;
   };
};

interface ServerComponentArrayFunctions<
   T extends object,
   ComponentParams extends object,
   RenderParts extends object | never
> extends ComponentArrayFunctions<T> {
   createParamsFromData(reader: PacketReader): ComponentParams;
   createRenderParts?(renderInfo: EntityRenderInfo, entityConfig: EntityConfig): RenderParts;
   createComponent(config: EntityConfig, renderParts: RenderParts): T;
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
> extends ComponentArray<T, ComponentArrayType.server, ComponentType> implements ServerComponentArrayFunctions<T, ComponentParams, RenderParts> {
   public createParamsFromData: (reader: PacketReader) => ComponentParams;
   // In reality this is just all information beyond its config which the component wishes to expose to other components
   // This is a separate layer so that, for example, components can immediately get render parts without having to wait for onLoad (introducing polymorphism)
   public createRenderParts?(renderInfo: EntityRenderInfo, config: EntityConfig): RenderParts;
   // @Cleanup: At some point I was going for this to be a pure-ish function where it just returns the component with no side-effects,
   // but is that really the right approach? What would be the benefits? That was my original reason for making the
   // createRenderParts thing.
   public readonly createComponent: (config: EntityConfig, renderParts: RenderParts) => T;
   public padData: (reader: PacketReader) => void;
   public updateFromData: (reader: PacketReader, entity: EntityID) => void;
   public updatePlayerFromData?(reader: PacketReader, isInitialData: boolean): void;
   public updatePlayerAfterData?(): void;
   public calculateTint?(entity: EntityID): ComponentTint;

   constructor(componentType: ComponentType, isActiveByDefault: boolean, functions: ServerComponentArrayFunctions<T, ComponentParams, RenderParts>) {
      super(ComponentArrayType.server, componentType, isActiveByDefault, functions);

      this.createParamsFromData = functions.createParamsFromData;
      this.createComponent = functions.createComponent;
      this.createRenderParts = functions.createRenderParts;
      this.padData = functions.padData;
      this.updateFromData = functions.updateFromData;
      this.updatePlayerFromData = functions.updatePlayerFromData;
      this.updatePlayerAfterData = functions.updatePlayerAfterData;
      this.calculateTint = functions.calculateTint;
   }
}