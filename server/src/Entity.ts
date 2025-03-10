import { Entity } from "battletribes-shared/entities";
import Layer from "./Layer";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "./components";
import { ComponentArray, getComponentArrayRecord } from "./components/ComponentArray";
import { addEntityToJoinBuffer } from "./world";

// @Cleanup: Rename this file

// We skip 0 as that is reserved for being a no-entity marker
let idCounter = 1;

// @Hack @Cleanup ?@Speed
const getComponentTypes = (componentConfig: EntityConfig): ReadonlyArray<ServerComponentType> => {
   return Object.keys(componentConfig.components).map(Number) as Array<ServerComponentType>;
}

export function createEntity<ComponentTypes extends ServerComponentType>(entityConfig: EntityConfig, layer: Layer, joinDelayTicks: number): Entity {
   const entity = idCounter++;
   
   // @Hack
   const componentTypes = getComponentTypes(entityConfig);
   const componentArrayRecord = getComponentArrayRecord();

   // Run initialise functions
   for (let i = 0; i < componentTypes.length; i++) {
      const componentType = componentTypes[i];
      const componentArray = componentArrayRecord[componentType] as ComponentArray<object, ComponentTypes>;

      if (typeof componentArray.onInitialise !== "undefined") {
         // @Cleanup: remove need for cast
         // @Cleanup: first 2 parameters can be combined
         componentArray.onInitialise(entityConfig, entity, layer);
      }
   }
   
   for (let i = 0; i < componentTypes.length; i++) {
      const componentType = componentTypes[i];
      
      const component = entityConfig.components[componentType]!;

      const componentArray = componentArrayRecord[componentType] as ComponentArray<object, ComponentTypes>;
      componentArray.addComponent(entity, component, joinDelayTicks);
   }

   addEntityToJoinBuffer(entity, entityConfig, layer, componentTypes, joinDelayTicks);

   // @Hack? Should the child configs just be handled on the entity config when adding it to the world?
   if (typeof entityConfig.childConfigs !== "undefined") {
      for (const childEntityConfig of entityConfig.childConfigs) {
         createEntity(childEntityConfig, layer, joinDelayTicks);
      }
   }

   return entity;
}