import { Hitbox } from "../../../shared/src/boxes/boxes";
import { BlockType, ServerComponentType } from "../../../shared/src/components";
import { Entity, EntityType } from "../../../shared/src/entities";
import { Packet } from "../../../shared/src/packets";
import { Settings } from "../../../shared/src/settings";
import { Point } from "../../../shared/src/utils";
import { calculateItemKnockback } from "../entities/tribes/limb-use";
import { registerDirtyEntity } from "../server/player-clients";
import { destroyEntity, getEntityType } from "../world";
import { ComponentArray } from "./ComponentArray";
import { getHeldItem } from "./InventoryUseComponent";
import { applyKnockback } from "./PhysicsComponent";
import { ProjectileComponentArray } from "./ProjectileComponent";
import { SwingAttackComponentArray } from "./SwingAttackComponent";
import { TransformComponentArray } from "./TransformComponent";

export class BlockAttackComponent {
   public readonly owner: Entity;
   public readonly blockType: BlockType;
   // @Cleanup: Is this necessary? Could we do it with just a tick event?
   // @Hack: surely this shouldn't exist - shields can block multiple times
   public hasBlocked = false;

   constructor(owner: Entity, blockType: BlockType) {
      this.owner = owner;
      this.blockType = blockType;
   }
}

export const BlockAttackComponentArray = new ComponentArray<BlockAttackComponent>(ServerComponentType.blockAttack, true, getDataLength, addDataToPacket);
BlockAttackComponentArray.onHitboxCollision = onHitboxCollision;

function getDataLength(): number {
   return 2 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const blockAttackComponent = BlockAttackComponentArray.getComponent(entity);
   packet.addBoolean(blockAttackComponent.hasBlocked);
   packet.padOffset(3);
}

const blockSwing = (blockAttack: Entity, swingAttack: Entity): void => {
   const blockAttackComponent = BlockAttackComponentArray.getComponent(blockAttack);
   const blocker = blockAttackComponent.owner;

   const swingAttackComponent = SwingAttackComponentArray.getComponent(swingAttack);
   const attacker = swingAttackComponent.owner;
   const attackerLimb = swingAttackComponent.limb;

   // Pause the attacker's attack for a brief period
   attackerLimb.currentActionPauseTicksRemaining = Math.floor(Settings.TPS / 15);
   attackerLimb.currentActionRate = 0.4;
   swingAttackComponent.isBlocked = true;
   registerDirtyEntity(swingAttack);

   // If the block box is a shield, completely shut down the swing
   if (blockAttackComponent.blockType === BlockType.shieldBlock) {
      destroyEntity(swingAttack);

      const attackerTransformComponent = TransformComponentArray.getComponent(attacker);
      const blockerTransformComponent = TransformComponentArray.getComponent(blocker);

      // Push back
      const pushDirection = attackerTransformComponent.position.calculateAngleBetween(blockerTransformComponent.position);
      const attackingItem = getHeldItem(attackerLimb);
      const knockbackAmount = calculateItemKnockback(attackingItem, true);
      applyKnockback(blocker, knockbackAmount, pushDirection);
   }

   blockAttackComponent.hasBlocked = true;

   // @Copynpaste @Incomplete
   // blockBoxLimb.lastBlockTick = getGameTicks();
   // blockBoxLimb.blockPositionX = blockBox.box.position.x;
   // blockBoxLimb.blockPositionY = blockBox.box.position.y;
   // blockBoxLimb.blockType = blockBox.blockType;
}

const blockProjectile = (blockAttack: Entity, projectile: Entity): void => {
   const blockAttackComponent = BlockAttackComponentArray.getComponent(blockAttack);
   const blocker = blockAttackComponent.owner;

   blockAttackComponent.hasBlocked = true;
   // @Copynpaste @Incomplete
   // blockBoxLimb.lastBlockTick = getGameTicks();
   // blockBoxLimb.blockPositionX = blockBox.box.position.x;
   // blockBoxLimb.blockPositionY = blockBox.box.position.y;
   // blockBoxLimb.blockType = blockBox.blockType;

   if (blockAttackComponent.blockType === BlockType.shieldBlock) {
      const blockerTransformComponent = TransformComponentArray.getComponent(blocker);
      const projectileTransformComponent = TransformComponentArray.getComponent(projectile);
      
      // Push back
      const pushDirection = projectileTransformComponent.position.calculateAngleBetween(blockerTransformComponent.position);
      // @Hack @Hardcoded: knockback amount
      applyKnockback(blocker, 75, pushDirection);
      
      destroyEntity(projectile);
   } else {
      const projectileComponent = ProjectileComponentArray.getComponent(projectile);
      projectileComponent.isBlocked = true;
   }
}

function onHitboxCollision(blockAttack: Entity, collidingEntity: Entity, actingHitbox: Hitbox, receivingHitbox: Hitbox, collisionPoint: Point): void {
   // Block swings
   if (getEntityType(collidingEntity) === EntityType.swingAttack) {
      blockSwing(blockAttack, collidingEntity);
      return;
   }

   // Block projectiles
   if (ProjectileComponentArray.hasComponent(collidingEntity)) {
      blockProjectile(blockAttack, collidingEntity);
   }
}