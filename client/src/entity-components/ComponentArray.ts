import { ServerComponentType } from "battletribes-shared/components";
import { EntityID, EntityType } from "battletribes-shared/entities";
import { Hitbox } from "../../../shared/src/boxes/boxes";
import ServerComponentArray from "./ServerComponentArray";
import ClientComponentArray from "./ClientComponentArray";
import { ClientComponentParams } from "./client-components";
import { HitData } from "../../../shared/src/client-server-types";
import { EntityRenderInfo } from "../EntityRenderInfo";
import Layer from "../Layer";
import { ServerComponentParams } from "./components";
import { ClientComponentType } from "./client-component-types";

export const enum ComponentArrayType {
   server,
   client
}

let componentArrayIDCounter = 0;

/** Contains information useful for creating components. */
export type EntityConfig<ServerComponentTypes extends ServerComponentType, ClientComponentTypes extends ClientComponentType> = {
   /** Currently this is used to create lights and sometimes attach components in the createComponent function */
   readonly entity: EntityID;
   readonly entityType: EntityType;
   readonly layer: Layer;
   readonly renderInfo: EntityRenderInfo;
   readonly serverComponents: {
      [T in ServerComponentTypes]: ServerComponentParams<T>;
   };
   readonly clientComponents: {
      [T in ClientComponentTypes]: ClientComponentParams<T>;
   }
};

export interface ComponentArrayFunctions<T extends object, RenderParts extends object | never> {
   /** SHOULD NOT MUTATE THE GLOBAL STATE */
   createRenderParts?(renderInfo: EntityRenderInfo, entityConfig: EntityConfig<never, never>): RenderParts;
   /** SHOULD NOT MUTATE THE GLOBAL STATE */
   createComponent(config: EntityConfig<never, never>, renderParts: RenderParts): T;
   /** Called once when the entity is being created, just after all the components are created from their params */
   onLoad?(entity: EntityID): void;
   /** Called when the entity is spawned in, not when the client first becomes aware of the entity's existence. After the load function */
   onSpawn?(entity: EntityID): void;
   onTick?(entity: EntityID): void;
   /** Called when a packet is skipped and there is no data to update from */
   onUpdate?(entity: EntityID): void;
   onCollision?(entity: EntityID, collidingEntity: EntityID, pushedHitbox: Hitbox, pushingHitbox: Hitbox): void;
   onHit?(entity: EntityID, hitData: Readonly<HitData>): void;
   onRemove?(entity: EntityID): void;
   /** Called when the entity dies, not when the entity leaves the player's vision. */
   onDie?(entity: EntityID): void;
}

type ComponentTypeForArray = {
   [ComponentArrayType.server]: ServerComponentType,
   [ComponentArrayType.client]: ClientComponentType
};

let componentArrays = new Array<ComponentArray>();
let serverComponentArrays = new Array<ServerComponentArray>();

let clientComponentArrayRecord: Record<ClientComponentType, ClientComponentArray> = {} as any;
let serverComponentArrayRecord: Record<ServerComponentType, ServerComponentArray> = {} as any;

export abstract class ComponentArray<
   T extends object = object,
   RenderParts extends object | never = object | never,
   ArrayType extends ComponentArrayType = ComponentArrayType,
   ComponentType extends ComponentTypeForArray[ArrayType] = ComponentTypeForArray[ArrayType]
> implements ComponentArrayFunctions<T, RenderParts> {
   public readonly id = componentArrayIDCounter++;
   private readonly isActiveByDefault: boolean;
   
   public entities = new Array<EntityID>();
   public components = new Array<T>();

   /** Maps entity IDs to component indexes */
   private entityToIndexMap: Partial<Record<EntityID, number>> = {};
   /** Maps component indexes to entity IDs */
   private indexToEntityMap: Partial<Record<number, EntityID>> = {};
   
   public activeComponents = new Array<T>();
   public activeEntities = new Array<EntityID>();

   /** Maps entity IDs to component indexes */
   private activeEntityToIndexMap: Record<EntityID, number> = {};
   /** Maps component indexes to entity IDs */
   private activeIndexToEntityMap: Record<number, EntityID> = {};

   private deactivateBuffer = new Array<number>();

   // In reality this is just all information beyond its config which the component wishes to expose to other components
   // This is a separate layer so that, for example, components can immediately get render parts without having to wait for onLoad (introducing polymorphism)
   public createRenderParts?(renderInfo: EntityRenderInfo, config: EntityConfig<never, never>): RenderParts;
   // @Cleanup: At some point I was going for this to be a pure-ish function where it just returns the component with no side-effects,
   // but is that really the right approach? What would be the benefits? That was my original reason for making the
   // createRenderParts thing.
   public readonly createComponent: (config: EntityConfig<never, never>, renderParts: RenderParts) => T;
   public onLoad?(entity: EntityID): void;
   public onSpawn?(entity: EntityID): void;
   public onTick?: (entity: EntityID) => void;
   public onUpdate?: (entity: EntityID) => void;
   public onCollision?(entity: EntityID, collidingEntity: EntityID, pushedHitbox: Hitbox, pushingHitbox: Hitbox): void;
   public onHit?(entity: EntityID, hitData: Readonly<HitData>): void;
   public onDie?(entity: EntityID): void;
   public onRemove?(entity: EntityID): void;

   constructor(arrayType: ArrayType, componentType: ComponentType, isActiveByDefault: boolean, functions: ComponentArrayFunctions<T, RenderParts>) {
      this.isActiveByDefault = isActiveByDefault;
      
      this.createRenderParts = functions.createRenderParts;
      this.createComponent = functions.createComponent;
      this.onLoad = functions.onLoad;
      this.onSpawn = functions.onSpawn;
      this.onTick = functions.onTick;
      this.onUpdate = functions.onUpdate;
      this.onCollision = functions.onCollision;
      this.onHit = functions.onHit;
      this.onRemove = functions.onRemove;
      this.onDie = functions.onDie;

      componentArrays.push(this as unknown as ComponentArray);
      if (arrayType === ComponentArrayType.server) {
         // @Cleanup: casts
         serverComponentArrays.push(this as unknown as ServerComponentArray);
         serverComponentArrayRecord[componentType as ServerComponentType] = this as unknown as ServerComponentArray;
      } else {
         // @Cleanup: casts
         clientComponentArrayRecord[componentType as ClientComponentType] = this as unknown as ClientComponentArray;
      }
   }

   public addComponent(entityID: EntityID, component: T): void {
      // Put new entry at end and update the maps
      const newIndex = this.components.length;
      this.entityToIndexMap[entityID] = newIndex;
      this.indexToEntityMap[newIndex] = entityID;
      this.components.push(component);
      this.entities.push(entityID);

      if (this.isActiveByDefault) {
         this.activateComponent(component, entityID);
      }
   }

   public removeComponent(entityID: EntityID): void {
		// Copy element at end into deleted element's place to maintain density
      const indexOfRemovedEntity = this.entityToIndexMap[entityID]!;
      this.components[indexOfRemovedEntity] = this.components[this.components.length - 1];
      this.entities[indexOfRemovedEntity] = this.entities[this.entities.length - 1];

		// Update map to point to moved spot
      const entityOfLastElement = this.indexToEntityMap[this.components.length - 1]!;
      this.entityToIndexMap[entityOfLastElement] = indexOfRemovedEntity;
      this.indexToEntityMap[indexOfRemovedEntity] = entityOfLastElement;

      delete this.entityToIndexMap[entityID];
      delete this.indexToEntityMap[this.components.length - 1];

      this.components.pop();
      this.entities.pop();

      if (typeof this.activeEntityToIndexMap[entityID] !== "undefined") {
         this.deactivateComponent(entityID);
      }
   }

   public getComponent(entity: EntityID): T {
      return this.components[this.entityToIndexMap[entity]!];
   }

   public hasComponent(entity: EntityID): boolean {
      return typeof this.entityToIndexMap[entity] !== "undefined";
   }

   public activateComponent(component: T, entity: EntityID): void {
      if (typeof this.activeEntityToIndexMap[entity] !== "undefined") {
         return;
      }
      
      // Put new entry at end and update the maps
      const newIndex = this.activeComponents.length;
      this.activeEntityToIndexMap[entity] = newIndex;
      this.activeIndexToEntityMap[newIndex] = entity;
      this.activeComponents.push(component);

      this.activeEntities.push(entity);
   }

   private deactivateComponent(entity: EntityID): void {
      // Copy element at end into deleted element's place to maintain density
      const indexOfRemovedEntity = this.activeEntityToIndexMap[entity];
      this.activeComponents[indexOfRemovedEntity] = this.activeComponents[this.activeComponents.length - 1];
      this.activeEntities[indexOfRemovedEntity] = this.activeEntities[this.activeComponents.length - 1];

      // Update map to point to moved spot
      const entityOfLastElement = this.activeIndexToEntityMap[this.activeComponents.length - 1];
      this.activeEntityToIndexMap[entityOfLastElement] = indexOfRemovedEntity;
      this.activeIndexToEntityMap[indexOfRemovedEntity] = entityOfLastElement;

      delete this.activeEntityToIndexMap[entity];
      delete this.activeIndexToEntityMap[this.activeComponents.length - 1];

      this.activeComponents.pop();
      this.activeEntities.pop();
   }

   public queueComponentDeactivate(entity: EntityID): void {
      this.deactivateBuffer.push(entity);
   }

   public deactivateQueue(): void {
      for (let i = 0; i < this.deactivateBuffer.length; i++) {
         const entityID = this.deactivateBuffer[i];
         this.deactivateComponent(entityID);
      }
      this.deactivateBuffer = [];
   }
}

export function getComponentArrays(): ReadonlyArray<ComponentArray> {
   return componentArrays;
}

export function getServerComponentArrays(): ReadonlyArray<ServerComponentArray> {
   return serverComponentArrays;
}

export function getClientComponentArray(componentType: ClientComponentType): ClientComponentArray {
   return clientComponentArrayRecord[componentType];
}

export function getServerComponentArray(componentType: ServerComponentType): ServerComponentArray {
   return serverComponentArrayRecord[componentType];
}

export function updateEntity(entity: EntityID): void {
   for (let i = 0; i < componentArrays.length; i++) {
      const componentArray = componentArrays[i];
      if (typeof componentArray.onUpdate === "undefined") {
         continue;
      }
      
      if (componentArray.hasComponent(entity)) {
         componentArray.onUpdate(entity);
      }
   }
}

if (module.hot) {
   module.hot.dispose(data => {
      data.componentArrays = componentArrays;
      data.serverComponentArrayRecord = serverComponentArrayRecord;
   });

   if (module.hot.data) {
      componentArrays = module.hot.data.componentArrays;
      serverComponentArrayRecord = module.hot.data.serverComponentArrayRecord;
   }
}