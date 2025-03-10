import { BlockType, ServerComponentType } from "../../../shared/src/components";
import { Entity, EntityType } from "../../../shared/src/entities";
import { Packet } from "../../../shared/src/packets";
import { Settings } from "../../../shared/src/settings";
import { Point } from "../../../shared/src/utils";
import { calculateItemKnockback } from "../entities/tribes/limb-use";
import { applyKnockback, Hitbox } from "../hitboxes";
import { registerDirtyEntity } from "../server/player-clients";
import { destroyEntity, getEntityType } from "../world";
import { ComponentArray } from "./ComponentArray";
import { getHeldItem } from "./InventoryUseComponent";
import { ProjectileComponentArray } from "./ProjectileComponent";
import { SwingAttackComponentArray } from "./SwingAttackComponent";

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
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const blockAttackComponent = BlockAttackComponentArray.getComponent(entity);
   packet.addBoolean(blockAttackComponent.hasBlocked);
   packet.padOffset(3);
}

const blockSwing = (blockAttack: Entity, swingAttack: Entity, blockingHitbox: Hitbox, swingHitbox: Hitbox): void => {
   const blockAttackComponent = BlockAttackComponentArray.getComponent(blockAttack);
   const blocker = blockAttackComponent.owner;

   const swingAttackComponent = SwingAttackComponentArray.getComponent(swingAttack);
   const attackerLimb = swingAttackComponent.limb;

   // Pause the attacker's attack for a brief period
   attackerLimb.currentActionPauseTicksRemaining = Math.floor(Settings.TPS / 15);
   attackerLimb.currentActionRate = 0.4;
   swingAttackComponent.isBlocked = true;
   registerDirtyEntity(swingAttack);

   // If the block box is a shield, completely shut down the swing
   if (blockAttackComponent.blockType === BlockType.shieldBlock) {
      destroyEntity(swingAttack);

      // Push back
      const pushDirection = swingHitbox.box.position.calculateAngleBetween(blockingHitbox.box.position);
      const attackingItem = getHeldItem(attackerLimb);
      const knockbackAmount = calculateItemKnockback(attackingItem, true);
      applyKnockback(blocker, blockingHitbox, knockbackAmount, pushDirection);
   }

   blockAttackComponent.hasBlocked = true;

   // @Copynpaste @Incomplete
   // blockBoxLimb.lastBlockTick = getGameTicks();
   // blockBoxLimb.blockPositionX = blockBox.box.position.x;
   // blockBoxLimb.blockPositionY = blockBox.box.position.y;
   // blockBoxLimb.blockType = blockBox.blockType;
}

const blockProjectile = (blockAttack: Entity, projectile: Entity, blockingHitbox: Hitbox, projectileHitbox: Hitbox): void => {
   const blockAttackComponent = BlockAttackComponentArray.getComponent(blockAttack);
   const blocker = blockAttackComponent.owner;

   blockAttackComponent.hasBlocked = true;
   // @Copynpaste @Incomplete
   // blockBoxLimb.lastBlockTick = getGameTicks();
   // blockBoxLimb.blockPositionX = blockBox.box.position.x;
   // blockBoxLimb.blockPositionY = blockBox.box.position.y;
   // blockBoxLimb.blockType = blockBox.blockType;

   if (blockAttackComponent.blockType === BlockType.shieldBlock) {
      // Push back
      const pushDirection = projectileHitbox.box.position.calculateAngleBetween(blockingHitbox.box.position);
      // @Hack @Hardcoded: knockback amount
      applyKnockback(blocker, blockingHitbox, 75, pushDirection);
      
      destroyEntity(projectile);
   } else {
      const projectileComponent = ProjectileComponentArray.getComponent(projectile);
      projectileComponent.isBlocked = true;
   }
}

function onHitboxCollision(blockAttack: Entity, collidingEntity: Entity, affectedHitbox: Hitbox, collidingHitbox: Hitbox, collisionPoint: Point): void {
   // Block swings
   if (getEntityType(collidingEntity) === EntityType.swingAttack) {
      blockSwing(blockAttack, collidingEntity, affectedHitbox, collidingHitbox);
      return;
   }

   // Block projectiles
   if (ProjectileComponentArray.hasComponent(collidingEntity)) {
      blockProjectile(blockAttack, collidingEntity, affectedHitbox, collidingHitbox);
   }
}