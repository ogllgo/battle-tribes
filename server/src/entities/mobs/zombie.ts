import { DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { EntityID, EntityType } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { Point, randInt } from "battletribes-shared/utils";
import { HealthComponent, HealthComponentArray } from "../../components/HealthComponent";
import { ZombieComponent, ZombieComponentArray } from "../../components/ZombieComponent";
import { addInventoryToInventoryComponent, InventoryComponent } from "../../components/InventoryComponent";
import { PhysicsComponent } from "../../components/PhysicsComponent";
import { Inventory, InventoryName } from "battletribes-shared/items/items";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../../components";
import { TransformComponent } from "../../components/TransformComponent";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import { getEntityType } from "../../world";
import WanderAI from "../../ai/WanderAI";
import { AIHelperComponent, AIType } from "../../components/AIHelperComponent";
import { Biome } from "battletribes-shared/tiles";
import Layer from "../../Layer";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { InventoryUseComponent } from "../../components/InventoryUseComponent";
import { CollisionGroup } from "battletribes-shared/collision-groups";

export const enum ZombieVars {
   CHASE_PURSUE_TIME_TICKS = 5 * Settings.TPS,
   VISION_RANGE = 375
}

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.zombie
   | ServerComponentType.aiHelper
   | ServerComponentType.inventory
   | ServerComponentType.inventoryUse;

const MAX_HEALTH = 20;

function positionIsValidCallback(_entity: EntityID, layer: Layer, x: number, y: number): boolean {
   return !layer.positionHasWall(x, y) && layer.getBiomeAtPosition(x, y) === Biome.grasslands;
}

export function createZombieConfig(isGolden: boolean, tombstone: EntityID): EntityConfig<ComponentTypes> {
   const zombieType = isGolden ? 3 : randInt(0, 2);

   const transformComponent = new TransformComponent(CollisionGroup.default);
   const hitbox = createHitbox(new CircularBox(new Point(0, 0), 0, 32), 1, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox, null);

   const physicsComponent = new PhysicsComponent();
   
   const healthComponent = new HealthComponent(MAX_HEALTH);
   
   const statusEffectComponent = new StatusEffectComponent(0);

   const zombieComponent = new ZombieComponent(zombieType, tombstone);

   const aiHelperComponent = new AIHelperComponent(ZombieVars.VISION_RANGE);
   aiHelperComponent.ais[AIType.wander] = new WanderAI(150, Math.PI * 3, 0.4, positionIsValidCallback);
   
   const inventoryComponent = new InventoryComponent();
   const inventoryUseComponent = new InventoryUseComponent();
   
   const handSlot = new Inventory(1, 1, InventoryName.handSlot);
   addInventoryToInventoryComponent(inventoryComponent, handSlot, { acceptsPickedUpItems: true, isDroppedOnDeath: true, isSentToEnemyPlayers: false });
   inventoryUseComponent.associatedInventoryNames.push(handSlot.name);

   if (Math.random() < 0.7) {
      const offhand = new Inventory(0, 0, InventoryName.offhand);
      addInventoryToInventoryComponent(inventoryComponent, offhand, { acceptsPickedUpItems: true, isDroppedOnDeath: true, isSentToEnemyPlayers: false });
      inventoryUseComponent.associatedInventoryNames.push(offhand.name);
   }
   
   return {
      entityType: EntityType.zombie,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.zombie]: zombieComponent,
         [ServerComponentType.aiHelper]: aiHelperComponent,
         [ServerComponentType.inventory]: inventoryComponent,
         [ServerComponentType.inventoryUse]: inventoryUseComponent
      }
   };
}

export function onZombieHurt(zombie: EntityID, attackingEntity: EntityID): void {
   // @Cleanup: too many ifs. generalise
   const attackingEntityType = getEntityType(attackingEntity);
   if (HealthComponentArray.hasComponent(attackingEntity) && attackingEntityType !== EntityType.iceSpikes && attackingEntityType !== EntityType.cactus && attackingEntityType !== EntityType.floorSpikes && attackingEntityType !== EntityType.wallSpikes && attackingEntityType !== EntityType.floorPunjiSticks && attackingEntityType !== EntityType.wallPunjiSticks) {
      const zombieComponent = ZombieComponentArray.getComponent(zombie);
      zombieComponent.attackingEntityIDs[attackingEntity] = ZombieVars.CHASE_PURSUE_TIME_TICKS;
   }
}

export function onZombieVisibleEntityHurt(zombie: EntityID, hurtEntity: EntityID): void {
   const zombieComponent = ZombieComponentArray.getComponent(zombie);

   zombieComponent.visibleHurtEntityID = hurtEntity;
   zombieComponent.visibleHurtEntityTicks = 0;
}