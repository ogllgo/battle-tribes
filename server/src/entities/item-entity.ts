import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { Entity, EntityType } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { Point } from "battletribes-shared/utils";
import { ItemComponent } from "../components/ItemComponent";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../components";
import { ItemType } from "battletribes-shared/items/items";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import RectangularBox from "battletribes-shared/boxes/RectangularBox";
import { getRandomPositionInEntity, TransformComponent, TransformComponentArray } from "../components/TransformComponent";
import { PhysicsComponent } from "../components/PhysicsComponent";
import Layer from "../Layer";
import { getSubtileIndex } from "../../../shared/src/subtiles";
import { getEntityLayer } from "../world";
import { createEntity } from "../Entity";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.item;

export function createItemEntityConfig(itemType: ItemType, amount: number, throwingEntity: Entity | null): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent(0);
   const hitbox = createHitbox(new RectangularBox(null, new Point(0, 0), Settings.ITEM_SIZE, Settings.ITEM_SIZE, 0), 0.2, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox, null);
   transformComponent.collisionMask = DEFAULT_COLLISION_MASK & ~COLLISION_BITS.planterBox;
   
   const physicsComponent = new PhysicsComponent();

   const itemComponent = new ItemComponent(itemType, amount, throwingEntity);
   
   return {
      entityType: EntityType.itemEntity,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.item]: itemComponent
      },
      lights: []
   };
}

const getItemEntitySpawnPosition = (entityLayer: Layer, transformComponent: TransformComponent): Point | null => {
   for (let attempts = 0; attempts < 50; attempts++) {
      const position = getRandomPositionInEntity(transformComponent);

      const subtileIndex = getSubtileIndex(Math.floor(position.x / Settings.SUBTILE_SIZE), Math.floor(position.y / Settings.SUBTILE_SIZE));
      // Don't spawn item entities in walls otherwise they can get stuck in the wall
      if (!entityLayer.subtileIsWall(subtileIndex)) {
         return position;
      }
   }

   return null;
}

export function createItemsOverEntity(entity: Entity, itemType: ItemType, amount: number): void {
   const layer = getEntityLayer(entity);
   const transformComponent = TransformComponentArray.getComponent(entity);

   for (let i = 0; i < amount; i++) {
      const spawnPosition = getItemEntitySpawnPosition(layer, transformComponent);
      if (spawnPosition === null) {
         continue;
      }
      
      // Create item entity
      const config = createItemEntityConfig(itemType, 1, null);
      config.components[ServerComponentType.transform].position.x = spawnPosition.x;
      config.components[ServerComponentType.transform].position.y = spawnPosition.y;
      config.components[ServerComponentType.transform].relativeRotation = 2 * Math.PI * Math.random();
      createEntity(config, getEntityLayer(entity), 0);
   }
}