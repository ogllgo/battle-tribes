import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { Entity, EntityType } from "battletribes-shared/entities";
import { Point } from "battletribes-shared/utils";
import { ItemComponent } from "../components/ItemComponent";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../components";
import { ItemType } from "battletribes-shared/items/items";
import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import RectangularBox from "battletribes-shared/boxes/RectangularBox";
import { addHitboxToTransformComponent, TransformComponent } from "../components/TransformComponent";
import { PhysicsComponent } from "../components/PhysicsComponent";
import { FleshSwordItemComponent } from "../components/FleshSwordItemComponent";
import { AIHelperComponent } from "../components/AIHelperComponent";
import { createHitbox } from "../hitboxes";

export function createFleshSwordItemEntityConfig(position: Point, rotation: number, itemType: ItemType, amount: number, throwingEntity: Entity | null): EntityConfig {
   const transformComponent = new TransformComponent();
   const hitbox = createHitbox(transformComponent, null, new RectangularBox(position, new Point(0, 0), rotation, 16, 16), 0.2, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   addHitboxToTransformComponent(transformComponent, hitbox);
   transformComponent.collisionMask = DEFAULT_COLLISION_MASK & ~COLLISION_BITS.planterBox;
   
   const physicsComponent = new PhysicsComponent();

   const itemComponent = new ItemComponent(itemType, amount, throwingEntity);

   const aiHelperComponent = new AIHelperComponent(hitbox, 250);
   
   const fleshSwordItemComponent = new FleshSwordItemComponent();
   
   return {
      entityType: EntityType.fleshSwordItemEntity,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.item]: itemComponent,
         [ServerComponentType.aiHelper]: aiHelperComponent,
         [ServerComponentType.fleshSwordItem]: fleshSwordItemComponent
      },
      lights: []
   };
}