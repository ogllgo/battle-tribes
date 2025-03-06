import { ClientComponentType } from "./client-component-types";
import { ComponentArray, ComponentArrayFunctions, ComponentArrayType } from "./ComponentArray";

export default class ClientComponentArray<
   T extends object = object,
   IntermediateInfo extends object | never = object | never,
   ComponentType extends ClientComponentType = ClientComponentType
> extends ComponentArray<T, IntermediateInfo, ComponentArrayType.client, ComponentType> {
   constructor(componentType: ComponentType, isActiveByDefault: boolean, functions: ComponentArrayFunctions<T, IntermediateInfo>) {
      super(ComponentArrayType.client, componentType, isActiveByDefault, functions);
   }
}