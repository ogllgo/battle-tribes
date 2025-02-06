import { createHitbox, HitboxCollisionType } from "../../../shared/src/boxes/boxes";
import RectangularBox from "../../../shared/src/boxes/RectangularBox";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "../../../shared/src/collision";
import { BlockType, ServerComponentType } from "../../../shared/src/components";
import { Entity, EntityType } from "../../../shared/src/entities";
import { getItemAttackInfo, InventoryName, ITEM_TYPE_RECORD } from "../../../shared/src/items/items";
import { Point } from "../../../shared/src/utils";
import { EntityConfig } from "../components";
import { BlockAttackComponent } from "../components/BlockAttackComponent";
import { getHeldItem, LimbInfo } from "../components/InventoryUseComponent";
import { PhysicsComponent } from "../components/PhysicsComponent";
import { TransformComponent } from "../components/TransformComponent";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.blockAttack;

export function createBlockAttackConfig(owner: Entity, limb: LimbInfo): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent(owner);

   const isFlipped = limb.associatedInventory.name === InventoryName.offhand;
   
   const heldItem = getHeldItem(limb);
   const heldItemAttackInfo = getItemAttackInfo(heldItem !== null ? heldItem.type : null);
   const damageBoxInfo = heldItemAttackInfo.heldItemDamageBoxInfo!;

   const hitbox = createHitbox(new RectangularBox(null, new Point(damageBoxInfo.offsetX * (isFlipped ? -1 : 1), damageBoxInfo.offsetY), damageBoxInfo.width, damageBoxInfo.height, damageBoxInfo.rotation * (isFlipped ? -1 : 1)), 0, HitboxCollisionType.soft, COLLISION_BITS.default, DEFAULT_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox, null);

   const physicsComponent = new PhysicsComponent();

   const blockType = heldItem !== null && ITEM_TYPE_RECORD[heldItem.type] === "shield" ? BlockType.shieldBlock : BlockType.toolBlock;
   const blockAttackComponent = new BlockAttackComponent(owner, blockType);
   
   return {
      entityType: EntityType.blockAttack,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.blockAttack]: blockAttackComponent
      },
      lights: []
   };
}