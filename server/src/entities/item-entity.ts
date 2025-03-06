import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { Entity, EntityType } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { Point } from "battletribes-shared/utils";
import { ItemComponent } from "../components/ItemComponent";
import { ServerComponentType } from "battletribes-shared/components";
import { createEntityConfig, EntityConfig } from "../components";
import { ItemType } from "battletribes-shared/items/items";
import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import RectangularBox from "battletribes-shared/boxes/RectangularBox";
import { getRandomPositionInEntity, TransformComponent, TransformComponentArray } from "../components/TransformComponent";
import { PhysicsComponent } from "../components/PhysicsComponent";
import Layer from "../Layer";
import { getSubtileIndex } from "../../../shared/src/subtiles";
import { getEntityLayer } from "../world";
import { createEntity } from "../Entity";
import { createHitbox } from "../hitboxes";

export function createItemEntityConfig(position: Point, rotation: number, itemType: ItemType, amount: number, throwingEntity: Entity | null): EntityConfig {
   const transformComponent = new TransformComponent(0);
   
   const hitbox = createHitbox(transformComponent, null, new RectangularBox(position, new Point(0, 0), rotation, 16, 16), 0.2, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox, null);
   transformComponent.collisionMask = DEFAULT_COLLISION_MASK & ~COLLISION_BITS.planterBox;
   
   const physicsComponent = new PhysicsComponent();

   const itemComponent = new ItemComponent(itemType, amount, throwingEntity);
   
   return createEntityConfig(
      EntityType.itemEntity,
      {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.item]: itemComponent
      },
      []
   );
}

const generateItemEntitySpawnPosition = (entityLayer: Layer, transformComponent: TransformComponent): Point | null => {
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
      const spawnPosition = generateItemEntitySpawnPosition(layer, transformComponent);
      if (spawnPosition === null) {
         continue;
      }
      
      // Create item entity
      const config = createItemEntityConfig(spawnPosition, 2 * Math.PI * Math.random(), itemType, 1, null);
      createEntity(config, getEntityLayer(entity), 0);
   }
}