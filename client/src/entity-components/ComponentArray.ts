import { ServerComponentType } from "battletribes-shared/components";
import { Entity } from "battletribes-shared/entities";
import ServerComponentArray from "./ServerComponentArray";
import ClientComponentArray from "./ClientComponentArray";
import { ClientComponentType } from "./client-component-types";
import { assert, Point } from "../../../shared/src/utils";
import { EntityParams } from "../world";
import { Hitbox } from "../hitboxes";
import { EntityRenderInfo } from "../EntityRenderInfo";

export const enum ComponentArrayType {
   server,
   client
}

let componentArrayIDCounter = 0;

export interface ComponentArrayFunctions<T extends object, ComponentIntermediateInfo extends object | never> {
   /** SHOULD NOT MUTATE THE GLOBAL STATE */
   populateIntermediateInfo?(renderInfo: EntityRenderInfo, entityParams: EntityParams): ComponentIntermediateInfo;
   /** SHOULD NOT MUTATE THE GLOBAL STATE */
   createComponent(entityParams: Readonly<EntityParams>, intermediateInfo: Readonly<ComponentIntermediateInfo>, renderInfo: EntityRenderInfo): T;
   getMaxRenderParts(entityParams: EntityParams): number;
   /** Called once when the entity is being created, just after all the components are created from their params */
   onLoad?(entity: Entity): void;
   onJoin?(entity: Entity): void;
   /** Called when the entity is spawned in, not when the client first becomes aware of the entity's existence. After the load function */
   onSpawn?(entity: Entity): void;
   onTick?(entity: Entity): void;
   /** Called when a packet is skipped and there is no data to update from, so we must extrapolate all the game logic */
   onUpdate?(entity: Entity): void;
   onCollision?(entity: Entity, collidingEntity: Entity, pushedHitbox: Hitbox, pushingHitbox: Hitbox): void;
   onHit?(entity: Entity, hitHitbox: Hitbox, hitPosition: Point, hitFlags: number): void;
   onRemove?(entity: Entity): void;
   /** Called when the entity dies, not when the entity leaves the player's vision. */
   onDie?(entity: Entity): void;
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
   ComponentIntermediateInfo extends object | never = object | never,
   ArrayType extends ComponentArrayType = ComponentArrayType,
   ComponentType extends ComponentTypeForArray[ArrayType] = ComponentTypeForArray[ArrayType]
> implements ComponentArrayFunctions<T, ComponentIntermediateInfo> {
   public readonly id = componentArrayIDCounter++;
   private readonly isActiveByDefault: boolean;
   
   public entities = new Array<Entity>();
   public components = new Array<T>();

   /** Maps entity IDs to component indexes */
   private entityToIndexMap: Partial<Record<Entity, number>> = {};
   /** Maps component indexes to entity IDs */
   private indexToEntityMap: Partial<Record<number, Entity>> = {};
   
   public activeComponents = new Array<T>();
   public activeEntities = new Array<Entity>();

   /** Maps entity IDs to component indexes */
   private activeEntityToIndexMap: Record<Entity, number> = {};
   /** Maps component indexes to entity IDs */
   private activeIndexToEntityMap: Record<number, Entity> = {};

   private deactivateBuffer = new Array<number>();

   // In reality this is just all information beyond its config which the component wishes to expose to other components
   // This is a separate layer so that, for example, components can immediately get render parts without having to wait for onLoad (introducing polymorphism)
   public populateIntermediateInfo?(renderInfo: EntityRenderInfo, entityParams: Readonly<EntityParams>): ComponentIntermediateInfo;
   public readonly createComponent: (entityParams: Readonly<EntityParams>, intermediateInfo: Readonly<ComponentIntermediateInfo>, renderInfo: EntityRenderInfo) => T;
   public readonly getMaxRenderParts: (entityParams: EntityParams) => number;
   public onLoad?(entity: Entity): void;
   public onJoin?(entity: Entity): void;
   public onSpawn?(entity: Entity): void;
   public onTick?: (entity: Entity) => void;
   public onUpdate?: (entity: Entity) => void;
   public onCollision?(entity: Entity, collidingEntity: Entity, pushedHitbox: Hitbox, pushingHitbox: Hitbox): void;
   public onHit?(entity: Entity, hitHitbox: Hitbox, hitPosition: Point, hitFlags: number): void;
   public onDie?(entity: Entity): void;
   public onRemove?(entity: Entity): void;

   constructor(arrayType: ArrayType, componentType: ComponentType, isActiveByDefault: boolean, functions: ComponentArrayFunctions<T, ComponentIntermediateInfo>) {
      this.isActiveByDefault = isActiveByDefault;
      
      this.populateIntermediateInfo = functions.populateIntermediateInfo;
      this.createComponent = functions.createComponent;
      this.getMaxRenderParts = functions.getMaxRenderParts;
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
         assert(typeof serverComponentArrayRecord[componentType as ServerComponentType] === "undefined");
         
         // @Cleanup: casts
         serverComponentArrays.push(this as unknown as ServerComponentArray);
         serverComponentArrayRecord[componentType as ServerComponentType] = this as unknown as ServerComponentArray;
      } else {
         assert(typeof clientComponentArrayRecord[componentType as ClientComponentType] === "undefined");

         // @Cleanup: casts
         clientComponentArrayRecord[componentType as ClientComponentType] = this as unknown as ClientComponentArray;
      }
   }

   public addComponent(entityID: Entity, component: T): void {
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

   public removeComponent(entityID: Entity): void {
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

   public getComponent(entity: Entity): T {
      return this.components[this.entityToIndexMap[entity]!];
   }

   public hasComponent(entity: Entity): boolean {
      return typeof this.entityToIndexMap[entity] !== "undefined";
   }

   public activateComponent(component: T, entity: Entity): void {
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

   private deactivateComponent(entity: Entity): void {
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

   public queueComponentDeactivate(entity: Entity): void {
      this.deactivateBuffer.push(entity);
   }

   public deactivateQueue(): void {
      for (let i = 0; i < this.deactivateBuffer.length; i++) {
         const entityID = this.deactivateBuffer[i];
         this.deactivateComponent(entityID);
      }
      this.deactivateBuffer = [];
   }

   /** VERY slow function. Should only be used for debugging purposes. */
   public getEntityFromComponent(component: T): Entity {
      let idx: number | undefined;
      for (let i = 0; i < this.components.length; i++) {
         const currentComponent = this.components[i];
         if (currentComponent === component) {
            idx = i;
            break;
         }
      }
      assert(typeof idx !== "undefined");

      const entity = this.indexToEntityMap[idx];
      assert(typeof entity !== "undefined");

      return entity;
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

export function updateEntity(entity: Entity): void {
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