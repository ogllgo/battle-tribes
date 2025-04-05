import { HitboxCollisionType, updateBox } from "../../../shared/src/boxes/boxes";
import CircularBox from "../../../shared/src/boxes/CircularBox";
import RectangularBox from "../../../shared/src/boxes/RectangularBox";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "../../../shared/src/collision";
import { ServerComponentType } from "../../../shared/src/components";
import { Entity, EntityType } from "../../../shared/src/entities";
import { getItemAttackInfo, InventoryName } from "../../../shared/src/items/items";
import { Point } from "../../../shared/src/utils";
import { createEntityConfigAttachInfo, EntityConfig } from "../components";
import { getHeldItem, LimbInfo } from "../components/InventoryUseComponent";
import { PhysicsComponent } from "../components/PhysicsComponent";
import { setHitboxToState, SwingAttackComponent } from "../components/SwingAttackComponent";
import { addHitboxToTransformComponent, TransformComponent, TransformComponentArray } from "../components/TransformComponent";
import { createHitbox, Hitbox } from "../hitboxes";

export function createSwingAttackConfig(position: Point, rotation: number, owner: Entity, limb: LimbInfo): EntityConfig {
   const isFlipped = limb.associatedInventory.name === InventoryName.offhand;
   
   const ownerTransformComponent = TransformComponentArray.getComponent(owner);
   const ownerHitbox = ownerTransformComponent.children[0] as Hitbox;
   
   const heldItem = getHeldItem(limb);
   const heldItemAttackInfo = getItemAttackInfo(heldItem !== null ? heldItem.type : null);
   const damageBoxInfo = heldItemAttackInfo.heldItemDamageBoxInfo;
   
   const transformComponent = new TransformComponent();

   const limbHitbox = createHitbox(transformComponent, null, new CircularBox(position, new Point(0, 0), rotation, 12), 0, HitboxCollisionType.soft, COLLISION_BITS.default, DEFAULT_COLLISION_MASK, []);
   addHitboxToTransformComponent(transformComponent, limbHitbox);

   setHitboxToState(ownerTransformComponent, transformComponent, limbHitbox, limb.currentActionStartLimbState, isFlipped);
   // @hack ? Should probably set all hitbox positions when they are added from the join buffer.
   updateBox(limbHitbox.box, ownerHitbox.box);

   if (damageBoxInfo !== null) {
      const heldItemHitbox = createHitbox(transformComponent, limbHitbox, new RectangularBox(new Point(0, 0), new Point(damageBoxInfo.offsetX * (isFlipped ? -1 : 1), damageBoxInfo.offsetY), damageBoxInfo.rotation * (isFlipped ? -1 : 1), damageBoxInfo.width, damageBoxInfo.height), 0, HitboxCollisionType.soft, COLLISION_BITS.default, DEFAULT_COLLISION_MASK, []);
      addHitboxToTransformComponent(transformComponent, heldItemHitbox);
   }

   const physicsComponent = new PhysicsComponent();

   const swingAttackComponent = new SwingAttackComponent(owner, limb);
   
   return {
      entityType: EntityType.swingAttack,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.swingAttack]: swingAttackComponent
      },
      lights: [],
      attachInfo: createEntityConfigAttachInfo(owner, ownerHitbox, new Point(0, 0), true)
   };
}