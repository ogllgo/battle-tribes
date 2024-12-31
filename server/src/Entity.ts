import { Entity } from "battletribes-shared/entities";
import Layer from "./Layer";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "./components";
import { ComponentArray, getComponentArrayRecord } from "./components/ComponentArray";
import { addEntityToJoinBuffer } from "./world";

// @Cleanup: Rename this file

// We skip 0 as that is reserved for there being no entity
let idCounter = 1;

// @Hack @Cleanup ?@Speed
const getComponentTypes = <ComponentTypes extends ServerComponentType>(componentConfig: EntityConfig<ComponentTypes>): ReadonlyArray<ComponentTypes> => {
   return Object.keys(componentConfig.components).map(Number) as Array<ComponentTypes>;
}

export function createEntity<ComponentTypes extends ServerComponentType>(entityConfig: EntityConfig<ComponentTypes>, layer: Layer, joinDelayTicks: number): Entity {
   const id = idCounter++;
   // @Hack
   const componentTypes = getComponentTypes(entityConfig);
   const componentArrayRecord = getComponentArrayRecord();

   // Run initialise functions
   for (let i = 0; i < componentTypes.length; i++) {
      const componentType = componentTypes[i];
      const componentArray = componentArrayRecord[componentType] as ComponentArray<object, ComponentTypes>;

      if (typeof componentArray.onInitialise !== "undefined") {
         // @Cleanup: remove need for cast
         componentArray.onInitialise(entityConfig, id, layer);
      }
   }
   
   for (let i = 0; i < componentTypes.length; i++) {
      const componentType = componentTypes[i];
      
      const component = entityConfig.components[componentType];

      const componentArray = componentArrayRecord[componentType] as ComponentArray<object, ComponentTypes>;
      componentArray.addComponent(id, component, joinDelayTicks);
   }

   // @Hack: cast
   addEntityToJoinBuffer(id, entityConfig, layer, componentTypes, joinDelayTicks);

   return id;
}