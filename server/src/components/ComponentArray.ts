import { ServerComponentType } from "battletribes-shared/components";
import { DamageSource, Entity } from "battletribes-shared/entities";
import { EntityConfig } from "../components";
import { Packet } from "battletribes-shared/packets";
import { Hitbox } from "battletribes-shared/boxes/boxes";
import { assert, Point } from "battletribes-shared/utils";
import Layer from "../Layer";

const enum ComponentArrayPriority {
   low,
   medium,
   high
}

export const ComponentArrays = new Array<ComponentArray>();
const ComponentArrayRecord = {} as { [T in ServerComponentType]: ComponentArray<object, T> };

export function getComponentArrayRecord(): typeof ComponentArrayRecord {
   return ComponentArrayRecord;
}

export class ComponentArray<T extends object = object, C extends ServerComponentType = ServerComponentType> {
   public readonly componentType: ServerComponentType;
   private readonly isActiveByDefault: boolean;
   
   public components = new Array<T>();
   private componentBuffer = new Array<T>();
   public bufferedComponentJoinTicksRemaining = new Array<number>();

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

   private componentBufferIDs = new Array<number>();

   private deactivateBuffer = new Array<number>();

   // @Cleanup: Layer should probs be in entity config
   // @Bug @Incomplete: This function shouldn't create an entity, as that will cause a crash. (Can't add components to the join buffer while iterating it). solution: make it not crash
   /** Called after all the components for an entity are created, before the entity is added to the join buffer. */
   public onInitialise?(config: EntityConfig, entity: Entity, layer: Layer): void;
   // @Bug @Incomplete: This function shouldn't create an entity, as that will cause a crash.
   public onJoin?(entity: Entity): void;
   public onTick?: {
      readonly tickInterval: number;
      func(entity: Entity): void;
   };
   /** Called whenever the entity collides with a wall */
   public onWallCollision?(entity: Entity): void;
   public onEntityCollision?(affectedEntity: Entity, collidingEntity: Entity): void;
   public onHitboxCollision?(affectedEntity: Entity, collidingEntity: Entity, affectedHitbox: Hitbox, collidingHitbox: Hitbox, collisionPoint: Point): void;
   /** Called immediately after an entity is marked for removal. */
   public preRemove?(entity: Entity): void;
   /**
    * Called just before the entity is removed from the world.
    * Should be used to clean up all data related to the entity, so that the entity no longer exists in the world.
   */
   public onRemove?(entity: Entity): void;
   // @Cleanup: make getDataLength not return an extra float length
   /** Returns the length of the data that would be added to the packet */
   public getDataLength: (entity: Entity, player: Entity | null) => number;
   public addDataToPacket: (packet: Packet, entity: Entity, player: Entity | null) => void;

   /**
    * Called when the entity takes damage.
    * Only relevant for entities with health components
   */
   public onTakeDamage?(entity: Entity, attackingEntity: Entity | null, damageSource: DamageSource, damageTaken: number): void;

   /**
    * Called when the entity deals damage to another entity
    * Only relevant for entities with health components
   */
   public onDealDamage?(entity: Entity, attackedEntity: Entity, damageSource: DamageSource): void;

   /**
    * Called when the entity is killed (their health is reduced to 0.)
    * Only relevant for entities with health components
   */
   public onDeath?(entity: Entity, attackingEntity: Entity | null, damageSource: DamageSource): void;

   /** Called when an entity with the component kills another entity (reduces their health to 0.) */
   public onKill?(entity: Entity, killedEntity: Entity): void;
   
   constructor(componentType: C, isActiveByDefault: boolean, getDataLength: (entity: Entity, player: Entity | null) => number, addDataToPacket: (packet: Packet, entity: Entity, player: Entity | null) => void) {
      this.componentType = componentType;
      this.isActiveByDefault = isActiveByDefault;

      this.getDataLength = getDataLength;
      this.addDataToPacket = addDataToPacket;

      assert(typeof ComponentArrayRecord[componentType] === "undefined");

      ComponentArrays.push(this);
      // @Cleanup: cast
      ComponentArrayRecord[componentType] = this as any;
   }
   
   public addComponent(entity: Entity, component: T, joinDelayTicks: number): void {
      if (typeof this.entityToIndexMap[entity] !== "undefined") {
         throw new Error("Component added to same entity twice.");
      }

      // Note: when a component is inserted, it should be inserted after all the existing entities with the same join delay ticks,
      // otherwise it will break onJoin functions which create entities.

      // @Speed
      // Find a spot for the component
      let insertIdx = this.bufferedComponentJoinTicksRemaining.length;
      for (let i = 0; i < this.bufferedComponentJoinTicksRemaining.length; i++) {
         if (this.bufferedComponentJoinTicksRemaining[i] > joinDelayTicks) {
            insertIdx = i;
            break;
         }
      }

      this.componentBuffer.splice(insertIdx, 0, component);
      this.componentBufferIDs.splice(insertIdx, 0, entity);
      this.bufferedComponentJoinTicksRemaining.splice(insertIdx, 0, joinDelayTicks);
   }

   public pushComponentsFromBuffer(): void {
      for (let i = 0; i < this.componentBuffer.length; i++) {
         const ticksRemaining = this.bufferedComponentJoinTicksRemaining[i];
         if (ticksRemaining > 0) {
            break;
         }
         
         const component = this.componentBuffer[i];
         const entity = this.componentBufferIDs[i];
      
         // Put new entry at end and update the maps
         const newIndex = this.components.length;
         this.entityToIndexMap[entity] = newIndex;
         this.indexToEntityMap[newIndex] = entity;
         this.components.push(component);
         
         if (this.isActiveByDefault) {
            this.activateComponent(entity);
         }
      }
   }

   public getComponentBuffer(): ReadonlyArray<T> {
      return this.componentBuffer;
   }

   public getComponentBufferIDs(): ReadonlyArray<number> {
      return this.componentBufferIDs;
   }

   public getFinalJoiningBufferIdx(): number | null {
      let finalPushedIdx: number | null = null;
      for (let i = 0; i < this.componentBufferIDs.length; i++) {
         const ticksRemaining = this.bufferedComponentJoinTicksRemaining[i];
         if (ticksRemaining > 0) {
            break;
         } else {
            finalPushedIdx = i;
         }
      }
      return finalPushedIdx;
   }

   public clearJoinedComponents(finalPushedIdx: number | null): void {
      if (finalPushedIdx !== null) {
         const numPushedEntities = finalPushedIdx + 1;
         this.componentBuffer.splice(0, numPushedEntities);
         this.componentBufferIDs.splice(0, numPushedEntities);
         this.bufferedComponentJoinTicksRemaining.splice(0, numPushedEntities);
      }
   }

   public tickJoinInfos(finalJoiningIdx: number | null): void {
      const startIdx = finalJoiningIdx !== null ? finalJoiningIdx + 1 : 0;
      for (let i = startIdx; i < this.componentBufferIDs.length; i++) {
         const ticksRemaining = this.bufferedComponentJoinTicksRemaining[i];
         this.bufferedComponentJoinTicksRemaining[i] = ticksRemaining - 1;
      }
   }

   public getComponent(entity: Entity): T {
      return this.components[this.entityToIndexMap[entity]!];
   }

   public removeComponent(entity: Entity): void {
		// Copy element at end into deleted element's place to maintain density
      const indexOfRemovedEntity = this.entityToIndexMap[entity]!;
      this.components[indexOfRemovedEntity] = this.components[this.components.length - 1];

		// Update map to point to moved spot
      const entityOfLastElement = this.indexToEntityMap[this.components.length - 1]!;
      this.entityToIndexMap[entityOfLastElement] = indexOfRemovedEntity;
      this.indexToEntityMap[indexOfRemovedEntity] = entityOfLastElement;

      delete this.entityToIndexMap[entity];
      delete this.indexToEntityMap[this.components.length - 1];

      this.components.pop();

      if (typeof this.activeEntityToIndexMap[entity] !== "undefined") {
         this.deactivateComponent(entity);
      }
   }

   public hasComponent(entity: Entity): boolean {
      return typeof this.entityToIndexMap[entity] !== "undefined";
   }

   public activateComponent(entity: Entity): void {
      if (typeof this.activeEntityToIndexMap[entity] !== "undefined") {
         return;
      }

      const idx = this.entityToIndexMap[entity]!;
      const component = this.components[idx];
      
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

   /** Queues a component to be deactivated */
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
}

export function sortComponentArrays(): void {
   const PRIORITIES: Record<ServerComponentType, ComponentArrayPriority> = {
      [ServerComponentType.aiHelper]: ComponentArrayPriority.low,
      // Low so that any damage boxes created aren't immediately tickled
      [ServerComponentType.damageBox]: ComponentArrayPriority.low,
      [ServerComponentType.berryBush]: ComponentArrayPriority.medium,
      [ServerComponentType.blueprint]: ComponentArrayPriority.medium,
      [ServerComponentType.boulder]: ComponentArrayPriority.medium,
      [ServerComponentType.cactus]: ComponentArrayPriority.medium,
      [ServerComponentType.cooking]: ComponentArrayPriority.medium,
      [ServerComponentType.cow]: ComponentArrayPriority.medium,
      [ServerComponentType.door]: ComponentArrayPriority.medium,
      [ServerComponentType.fish]: ComponentArrayPriority.medium,
      [ServerComponentType.frozenYeti]: ComponentArrayPriority.medium,
      [ServerComponentType.golem]: ComponentArrayPriority.medium,
      [ServerComponentType.hut]: ComponentArrayPriority.medium,
      [ServerComponentType.iceShard]: ComponentArrayPriority.medium,
      [ServerComponentType.iceSpikes]: ComponentArrayPriority.medium,
      [ServerComponentType.inventory]: ComponentArrayPriority.medium,
      [ServerComponentType.inventoryUse]: ComponentArrayPriority.medium,
      [ServerComponentType.item]: ComponentArrayPriority.medium,
      [ServerComponentType.pebblum]: ComponentArrayPriority.medium,
      [ServerComponentType.player]: ComponentArrayPriority.medium,
      [ServerComponentType.rockSpike]: ComponentArrayPriority.medium,
      [ServerComponentType.slime]: ComponentArrayPriority.medium,
      [ServerComponentType.slimeSpit]: ComponentArrayPriority.medium,
      [ServerComponentType.slimewisp]: ComponentArrayPriority.medium,
      [ServerComponentType.snowball]: ComponentArrayPriority.medium,
      [ServerComponentType.statusEffect]: ComponentArrayPriority.medium,
      [ServerComponentType.throwingProjectile]: ComponentArrayPriority.medium,
      [ServerComponentType.tombstone]: ComponentArrayPriority.medium,
      [ServerComponentType.totemBanner]: ComponentArrayPriority.medium,
      [ServerComponentType.tree]: ComponentArrayPriority.medium,
      [ServerComponentType.tribe]: ComponentArrayPriority.medium,
      [ServerComponentType.tribeMember]: ComponentArrayPriority.medium,
      [ServerComponentType.tribesman]: ComponentArrayPriority.medium,
      [ServerComponentType.tribesmanAI]: ComponentArrayPriority.medium,
      [ServerComponentType.turret]: ComponentArrayPriority.medium,
      [ServerComponentType.yeti]: ComponentArrayPriority.medium,
      [ServerComponentType.zombie]: ComponentArrayPriority.medium,
      [ServerComponentType.ammoBox]: ComponentArrayPriority.medium,
      [ServerComponentType.escapeAI]: ComponentArrayPriority.medium,
      [ServerComponentType.followAI]: ComponentArrayPriority.medium,
      [ServerComponentType.researchBench]: ComponentArrayPriority.medium,
      [ServerComponentType.tunnel]: ComponentArrayPriority.medium,
      [ServerComponentType.buildingMaterial]: ComponentArrayPriority.medium,
      [ServerComponentType.spikes]: ComponentArrayPriority.medium,
      [ServerComponentType.punjiSticks]: ComponentArrayPriority.medium,
      [ServerComponentType.tribeWarrior]: ComponentArrayPriority.medium,
      [ServerComponentType.healingTotem]: ComponentArrayPriority.medium,
      [ServerComponentType.planterBox]: ComponentArrayPriority.medium,
      [ServerComponentType.planted]: ComponentArrayPriority.medium,
      [ServerComponentType.treePlanted]: ComponentArrayPriority.medium,
      [ServerComponentType.berryBushPlanted]: ComponentArrayPriority.medium,
      [ServerComponentType.iceSpikesPlanted]: ComponentArrayPriority.medium,
      [ServerComponentType.structure]: ComponentArrayPriority.medium,
      [ServerComponentType.fence]: ComponentArrayPriority.medium,
      [ServerComponentType.fenceGate]: ComponentArrayPriority.medium,
      [ServerComponentType.craftingStation]: ComponentArrayPriority.medium,
      [ServerComponentType.transform]: ComponentArrayPriority.medium,
      [ServerComponentType.projectile]: ComponentArrayPriority.medium,
      [ServerComponentType.iceArrow]: ComponentArrayPriority.medium,
      [ServerComponentType.layeredRod]: ComponentArrayPriority.medium,
      [ServerComponentType.decoration]: ComponentArrayPriority.medium,
      [ServerComponentType.spitPoisonArea]: ComponentArrayPriority.medium,
      [ServerComponentType.battleaxeProjectile]: ComponentArrayPriority.medium,
      [ServerComponentType.spearProjectile]: ComponentArrayPriority.medium,
      [ServerComponentType.krumblid]: ComponentArrayPriority.medium,
      [ServerComponentType.guardian]: ComponentArrayPriority.medium,
      [ServerComponentType.guardianGemQuake]: ComponentArrayPriority.medium,
      [ServerComponentType.guardianGemFragmentProjectile]: ComponentArrayPriority.medium,
      [ServerComponentType.guardianSpikyBall]: ComponentArrayPriority.medium,
      [ServerComponentType.bracings]: ComponentArrayPriority.medium,
      [ServerComponentType.ballista]: ComponentArrayPriority.medium,
      [ServerComponentType.barrel]: ComponentArrayPriority.medium,
      [ServerComponentType.slingTurret]: ComponentArrayPriority.medium,
      [ServerComponentType.campfire]: ComponentArrayPriority.medium,
      [ServerComponentType.furnace]: ComponentArrayPriority.medium,
      [ServerComponentType.fireTorch]: ComponentArrayPriority.medium,
      [ServerComponentType.spikyBastard]: ComponentArrayPriority.medium,
      [ServerComponentType.glurb]: ComponentArrayPriority.medium,
      [ServerComponentType.slurbTorch]: ComponentArrayPriority.medium,
      [ServerComponentType.attackingEntities]: ComponentArrayPriority.medium,
      [ServerComponentType.patrolAI]: ComponentArrayPriority.medium,
      [ServerComponentType.aiAssignment]: ComponentArrayPriority.medium,
      [ServerComponentType.treeRootBase]: ComponentArrayPriority.medium,
      [ServerComponentType.treeRootSegment]: ComponentArrayPriority.medium,
      [ServerComponentType.mithrilOreNode]: ComponentArrayPriority.medium,
      [ServerComponentType.scrappy]: ComponentArrayPriority.medium,
      [ServerComponentType.cogwalker]: ComponentArrayPriority.medium,
      [ServerComponentType.automatonAssembler]: ComponentArrayPriority.medium,
      [ServerComponentType.mithrilAnvil]: ComponentArrayPriority.medium,
      [ServerComponentType.rideable]: ComponentArrayPriority.medium,
      [ServerComponentType.health]: ComponentArrayPriority.high,
      // The physics component ticking must be done at the end so there is time for the positionIsDirty and hitboxesAreDirty flags to collect
      [ServerComponentType.physics]: ComponentArrayPriority.high
   };

   for (let i = 0; i < ComponentArrays.length - 1; i++) {
      for (let j = 0; j < ComponentArrays.length - i - 1; j++) {
         const elem1 = ComponentArrays[j];
         const elem2 = ComponentArrays[j + 1];
         
         const priority1 = PRIORITIES[elem1.componentType];
         const priority2 = PRIORITIES[elem2.componentType];
         
         if (priority1 > priority2) {
            const temp = ComponentArrays[j];
            ComponentArrays[j] = ComponentArrays[j + 1];
            ComponentArrays[j + 1] = temp;
         }
      }
  }
}