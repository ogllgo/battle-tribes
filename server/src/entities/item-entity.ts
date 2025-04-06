import { CollisionBit, DEFAULT_COLLISION_MASK } from "battletribes-shared/collision";
import { Entity, EntityType } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { Point } from "battletribes-shared/utils";
import { ItemComponent } from "../components/ItemComponent";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig, LightCreationInfo } from "../components";
import { ItemType } from "battletribes-shared/items/items";
import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import RectangularBox from "battletribes-shared/boxes/RectangularBox";
import { addHitboxToTransformComponent, getRandomPositionInEntity, TransformComponent, TransformComponentArray } from "../components/TransformComponent";
import { PhysicsComponent } from "../components/PhysicsComponent";
import Layer from "../Layer";
import { getSubtileIndex } from "../../../shared/src/subtiles";
import { getEntityLayer } from "../world";
import { createEntity } from "../Entity";
import { createHitbox } from "../hitboxes";
import { createLight } from "../light-levels";

export function createItemEntityConfig(position: Point, rotation: number, itemType: ItemType, amount: number, throwingEntity: Entity | null): EntityConfig {
   const transformComponent = new TransformComponent();
   
   const hitbox = createHitbox(transformComponent, null, new RectangularBox(position, new Point(0, 0), rotation, 16, 16), 0.2, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   addHitboxToTransformComponent(transformComponent, hitbox);
   transformComponent.collisionMask = DEFAULT_COLLISION_MASK & ~CollisionBit.planterBox;
   
   const physicsComponent = new PhysicsComponent();

   const itemComponent = new ItemComponent(itemType, amount, throwingEntity);

   const lights = new Array<LightCreationInfo>();
   if (itemType === ItemType.slurb) {
      const light = createLight(new Point(0, 0), 0.6, 0.5, 4, 1, 0.1, 1);
      const lightCreationInfo: LightCreationInfo = {
         light: light,
         attachedHitbox: hitbox
      };
      lights.push(lightCreationInfo);
   }
   
   return {
      entityType: EntityType.itemEntity,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.item]: itemComponent
      },
      lights: lights
   };
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