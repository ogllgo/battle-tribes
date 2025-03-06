import { HitboxCollisionType } from "../../../shared/src/boxes/boxes";
import CircularBox from "../../../shared/src/boxes/CircularBox";
import RectangularBox from "../../../shared/src/boxes/RectangularBox";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "../../../shared/src/collision";
import { ServerComponentType } from "../../../shared/src/components";
import { Entity, EntityType } from "../../../shared/src/entities";
import { getItemAttackInfo, InventoryName } from "../../../shared/src/items/items";
import { Point } from "../../../shared/src/utils";
import { createEntityConfig, EntityConfig } from "../components";
import { getHeldItem, LimbInfo } from "../components/InventoryUseComponent";
import { PhysicsComponent } from "../components/PhysicsComponent";
import { setHitboxToState, SwingAttackComponent } from "../components/SwingAttackComponent";
import { TransformComponent, TransformComponentArray } from "../components/TransformComponent";
import { createHitbox } from "../hitboxes";

export function createSwingAttackConfig(position: Point, rotation: number, owner: Entity, limb: LimbInfo): EntityConfig {
   const isFlipped = limb.associatedInventory.name === InventoryName.offhand;
   
   const ownerTransformComponent = TransformComponentArray.getComponent(owner);
   const ownerHitbox = ownerTransformComponent.hitboxes[0];
   
   const heldItem = getHeldItem(limb);
   const heldItemAttackInfo = getItemAttackInfo(heldItem !== null ? heldItem.type : null);
   const damageBoxInfo = heldItemAttackInfo.heldItemDamageBoxInfo;
   
   const transformComponent = new TransformComponent(owner);

   const limbHitbox = createHitbox(transformComponent, ownerHitbox, new CircularBox(position, new Point(0, 0), rotation, 12), 0, HitboxCollisionType.soft, COLLISION_BITS.default, DEFAULT_COLLISION_MASK, []);
   transformComponent.addHitbox(limbHitbox, null);

   setHitboxToState(ownerTransformComponent, limbHitbox, limb.currentActionStartLimbState, isFlipped);

   if (damageBoxInfo !== null) {
      const heldItemHitbox = createHitbox(transformComponent, limbHitbox, new RectangularBox(new Point(0, 0), new Point(damageBoxInfo.offsetX * (isFlipped ? -1 : 1), damageBoxInfo.offsetY), damageBoxInfo.rotation * (isFlipped ? -1 : 1), damageBoxInfo.width, damageBoxInfo.height), 0, HitboxCollisionType.soft, COLLISION_BITS.default, DEFAULT_COLLISION_MASK, []);
      transformComponent.addHitbox(heldItemHitbox, null);
   }

   const physicsComponent = new PhysicsComponent();

   const swingAttackComponent = new SwingAttackComponent(owner, limb);
   
   return createEntityConfig(
      EntityType.swingAttack,
      {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.swingAttack]: swingAttackComponent
      },
      []
   );
}