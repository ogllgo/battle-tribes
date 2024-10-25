import { ClientComponentType } from "./client-components";
import { ComponentArray, ComponentArrayFunctions, ComponentArrayType } from "./ComponentArray";

export default class ClientComponentArray<
   T extends object = object,
   RenderParts extends object | never = object | never,
   ComponentType extends ClientComponentType = ClientComponentType
> extends ComponentArray<T, RenderParts, ComponentArrayType.client, ComponentType> {
   constructor(componentType: ComponentType, isActiveByDefault: boolean, functions: ComponentArrayFunctions<T, RenderParts>) {
      super(ComponentArrayType.client, componentType, isActiveByDefault, functions);
   }
}