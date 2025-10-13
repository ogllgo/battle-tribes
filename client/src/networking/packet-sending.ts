import { alignLengthBytes, getStringLengthBytes, Packet, PacketType } from "battletribes-shared/packets";
import { getSelectedEntityID } from "../entity-selection";
import { Entity, EntityType } from "battletribes-shared/entities";
import { GameDataPacketOptions } from "battletribes-shared/client-server-types";
import OPTIONS from "../options";
import { windowHeight, windowWidth } from "../webgl";
import { InventoryName, ItemType } from "battletribes-shared/items/items";
import Client from "./Client";
import { getHotbarSelectedItemSlot, getInstancePlayerAction, getPlayerMoveIntention } from "../components/game/GameInteractableLayer";
import { entityExists, getEntityType } from "../world";
import { TransformComponentArray } from "../entity-components/server-components/TransformComponent";
import { BlueprintType } from "../../../shared/src/components";
import { TechID } from "../../../shared/src/techs";
import { playerInstance } from "../player";
import { TamingSkillID } from "../../../shared/src/taming";
import { Point } from "../../../shared/src/utils";
import { cameraPosition } from "../camera";

export function createPlayerDataPacket(): ArrayBuffer {
   // Position, rotation
   let lengthBytes = 4 * Float32Array.BYTES_PER_ELEMENT;
   // Previous position and acceleration
   lengthBytes += 4 * Float32Array.BYTES_PER_ELEMENT;
   // Movement intention
   lengthBytes += 2 * Float32Array.BYTES_PER_ELEMENT;
   // Previous relative angle, and angular acceleration
   lengthBytes += 2 * Float32Array.BYTES_PER_ELEMENT;
   // window size
   lengthBytes += 2 * Float32Array.BYTES_PER_ELEMENT;
   // inventory shit
   lengthBytes += 3 * Float32Array.BYTES_PER_ELEMENT;
   // other random shit
   lengthBytes += 2 * Float32Array.BYTES_PER_ELEMENT;
   
   lengthBytes = alignLengthBytes(lengthBytes);
   
   const packet = new Packet(PacketType.playerData, lengthBytes);
   
   const transformComponent = TransformComponentArray.getComponent(playerInstance!);
   const playerHitbox = transformComponent.hitboxes[0];
   packet.writeNumber(playerHitbox.box.position.x);
   packet.writeNumber(playerHitbox.box.position.y);
   packet.writeNumber(playerHitbox.box.relativeAngle);

   packet.writeNumber(playerHitbox.previousPosition.x);
   packet.writeNumber(playerHitbox.previousPosition.y);
   packet.writeNumber(playerHitbox.acceleration.x);
   packet.writeNumber(playerHitbox.acceleration.y);

   const movementIntention = getPlayerMoveIntention();
   packet.writeNumber(movementIntention.x);
   packet.writeNumber(movementIntention.y);

   packet.writeNumber(playerHitbox.previousRelativeAngle);
   packet.writeNumber(playerHitbox.angularAcceleration);

   packet.writeNumber(windowWidth);
   packet.writeNumber(windowHeight);

   packet.writeNumber(getHotbarSelectedItemSlot());
   packet.writeNumber(getInstancePlayerAction(InventoryName.hotbar));
   packet.writeNumber(getInstancePlayerAction(InventoryName.offhand));

   let interactingEntityID = 0;
   const selectedEntityID = getSelectedEntityID();

   if (entityExists(selectedEntityID)) {
      const entityType = getEntityType(selectedEntityID);
      if (entityType === EntityType.tribeWorker || entityType === EntityType.tribeWarrior) {
         interactingEntityID = selectedEntityID;
      }
   }

   packet.writeNumber(interactingEntityID);
   
   let gameDataOptions = 0;
   if (OPTIONS.showPathfindingNodes) {
      gameDataOptions |= GameDataPacketOptions.sendVisiblePathfindingNodeOccupances;
   }
   if (OPTIONS.showSafetyNodes) {
      gameDataOptions |= GameDataPacketOptions.sendVisibleSafetyNodes;
   }
   if (OPTIONS.showBuildingPlans) {
      gameDataOptions |= GameDataPacketOptions.sendVisibleBuildingPlans;
   }
   if (OPTIONS.showBuildingSafetys) {
      gameDataOptions |= GameDataPacketOptions.sendVisibleBuildingSafetys;
   }
   if (OPTIONS.showRestrictedAreas) {
      gameDataOptions |= GameDataPacketOptions.sendVisibleRestrictedBuildingAreas;
   }
   if (OPTIONS.showWallConnections) {
      gameDataOptions |= GameDataPacketOptions.sendVisibleWallConnections;
   }
   if (OPTIONS.showSubtileSupports) {
      gameDataOptions |= GameDataPacketOptions.sendSubtileSupports;
   }
   if (OPTIONS.showLightLevels) {
      gameDataOptions |= GameDataPacketOptions.sendLightLevels;
   }
   
   packet.writeNumber(gameDataOptions);
   
   return packet.buffer;
}

export function createActivatePacket(): ArrayBuffer {
   const packet = new Packet(PacketType.activate, Float32Array.BYTES_PER_ELEMENT);
   return packet.buffer;
}

export function createSyncRequestPacket(): ArrayBuffer {
   const packet = new Packet(PacketType.syncRequest, Float32Array.BYTES_PER_ELEMENT);
   return packet.buffer;
}

export function createAttackPacket(): ArrayBuffer {
   const transformComponent = TransformComponentArray.getComponent(playerInstance!);
   const playerHitbox = transformComponent.hitboxes[0];
   
   const packet = new Packet(PacketType.attack, 3 * Float32Array.BYTES_PER_ELEMENT);

   packet.writeNumber(getHotbarSelectedItemSlot());
   packet.writeNumber(playerHitbox.box.angle);
   
   return packet.buffer;
}

export function sendDevGiveItemPacket(itemType: ItemType, amount: number): void {
   const packet = new Packet(PacketType.devGiveItem, 3 * Float32Array.BYTES_PER_ELEMENT);

   packet.writeNumber(itemType);
   packet.writeNumber(amount);

   Client.sendPacket(packet.buffer);
}

export function sendRespawnPacket(): void {
   const packet = new Packet(PacketType.respawn, Float32Array.BYTES_PER_ELEMENT);
   Client.sendPacket(packet.buffer);
}

export function sendStartItemUsePacket(): void {
   const packet = new Packet(PacketType.startItemUse, 2 * Float32Array.BYTES_PER_ELEMENT);
   
   packet.writeNumber(getHotbarSelectedItemSlot());

   Client.sendPacket(packet.buffer);
}

export function sendItemUsePacket(): void {
   const packet = new Packet(PacketType.useItem, 2 * Float32Array.BYTES_PER_ELEMENT);
   
   packet.writeNumber(getHotbarSelectedItemSlot());

   Client.sendPacket(packet.buffer);
}

export function sendStopItemUsePacket(): void {
   const packet = new Packet(PacketType.stopItemUse, Float32Array.BYTES_PER_ELEMENT);
   Client.sendPacket(packet.buffer);
}

export function sendItemDropPacket(inventoryName: InventoryName, itemSlot: number, dropAmount: number, throwDirection: number): void {
   const packet = new Packet(PacketType.dropItem, 5 * Float32Array.BYTES_PER_ELEMENT);

   packet.writeNumber(inventoryName);
   packet.writeNumber(itemSlot);
   packet.writeNumber(dropAmount);
   packet.writeNumber(throwDirection);

   Client.sendPacket(packet.buffer);
}


export function sendItemPickupPacket(entityID: number, inventoryName: InventoryName, itemSlot: number, amount: number): void {
   const packet = new Packet(PacketType.itemPickup, 5 * Float32Array.BYTES_PER_ELEMENT);

   packet.writeNumber(entityID);
   packet.writeNumber(inventoryName);
   packet.writeNumber(itemSlot);
   packet.writeNumber(amount);

   Client.sendPacket(packet.buffer);
}

export function sendItemReleasePacket(entityID: number, inventoryName: InventoryName, itemSlot: number, amount: number): void {
   const packet = new Packet(PacketType.itemRelease, 5 * Float32Array.BYTES_PER_ELEMENT);

   packet.writeNumber(entityID);
   packet.writeNumber(inventoryName);
   packet.writeNumber(itemSlot);
   packet.writeNumber(amount);

   Client.sendPacket(packet.buffer);
}

export function sendEntitySummonPacket(entityType: EntityType, x: number, y: number, rotation: number): void {
   const packet = new Packet(PacketType.summonEntity, 5 * Float32Array.BYTES_PER_ELEMENT);

   packet.writeNumber(entityType);
   packet.writeNumber(x);
   packet.writeNumber(y);
   packet.writeNumber(rotation);

   Client.sendPacket(packet.buffer);
}

export function sendToggleSimulationPacket(isSimulating: boolean): void {
   const packet = new Packet(PacketType.toggleSimulation, 2 * Float32Array.BYTES_PER_ELEMENT);

   packet.writeBool(isSimulating);

   Client.sendPacket(packet.buffer);
}

export function sendPlaceBlueprintPacket(structure: Entity, blueprintType: BlueprintType): void {
   const packet = new Packet(PacketType.placeBlueprint, 3 * Float32Array.BYTES_PER_ELEMENT);

   packet.writeNumber(structure);
   packet.writeNumber(blueprintType);

   Client.sendPacket(packet.buffer);
}

export function sendCraftItemPacket(recipeIndex: number): void {
   const packet = new Packet(PacketType.craftItem, 2 * Float32Array.BYTES_PER_ELEMENT);

   packet.writeNumber(recipeIndex);

   Client.sendPacket(packet.buffer);
}

export function sendSetDebugEntityPacket(entity: Entity): void {
   const packet = new Packet(PacketType.devSetDebugEntity, 2 * Float32Array.BYTES_PER_ELEMENT);

   packet.writeNumber(entity);

   Client.sendPacket(packet.buffer);
}

export function sendAscendPacket(): void {
   const packet = new Packet(PacketType.ascend, Float32Array.BYTES_PER_ELEMENT);
   Client.sendPacket(packet.buffer);
}

export function sendTPTOEntityPacket(targetEntity: Entity): void {
   const packet = new Packet(PacketType.devTPToEntity, 2 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(targetEntity);
   Client.sendPacket(packet.buffer);
}

export function sendSpectateEntityPacket(entity: Entity): void {
   const packet = new Packet(PacketType.devSpectateEntity, 2 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(entity);
   Client.sendPacket(packet.buffer);
}

export function sendSetAutogiveBaseResourcesPacket(tribeID: number, autogiveBaseResource: boolean): void {
   const packet = new Packet(PacketType.devSetAutogiveBaseResource, 3 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(tribeID);
   packet.writeBool(autogiveBaseResource);
   Client.sendPacket(packet.buffer);
}

export function sendStructureInteractPacket(structureID: number, interactData: number): void {
   const packet = new Packet(PacketType.structureInteract, 3 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(structureID);
   packet.writeNumber(interactData);
   Client.sendPacket(packet.buffer);
}

export function sendUnlockTechPacket(techID: TechID): void {
   const packet = new Packet(PacketType.unlockTech, 2 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(techID);
   Client.sendPacket(packet.buffer);
}

export function sendStudyTechPacket(studyAmount: number): void {
   const packet = new Packet(PacketType.studyTech, 2 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(studyAmount);
   Client.sendPacket(packet.buffer);
}

export function sendSelectTechPacket(techID: TechID): void {
   const packet = new Packet(PacketType.selectTech, 2 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(techID);
   Client.sendPacket(packet.buffer);
}

export function sendAnimalStaffFollowCommandPacket(entity: Entity): void {
   const packet = new Packet(PacketType.animalStaffFollowCommand, 2 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(entity);
   Client.sendPacket(packet.buffer);
}

export function sendMountCarrySlotPacket(mount: Entity, carrySlotIdx: number): void {
   const packet = new Packet(PacketType.mountCarrySlot, 3 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(mount);
   packet.writeNumber(carrySlotIdx);
   Client.sendPacket(packet.buffer);
}

export function sendDismountCarrySlotPacket(): void {
   const packet = new Packet(PacketType.dismountCarrySlot, Float32Array.BYTES_PER_ELEMENT);
   Client.sendPacket(packet.buffer);
}

export function sendPickUpEntityPacket(entity: Entity): void {
   const packet = new Packet(PacketType.pickUpEntity, 2 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(entity);
   Client.sendPacket(packet.buffer);
}

export function sendModifyBuildingPacket(structure: Entity, data: number): void {
   const packet = new Packet(PacketType.modifyBuilding, 3 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(structure);
   packet.writeNumber(data);
   Client.sendPacket(packet.buffer);
}

export function sendSetMoveTargetPositionPacket(entity: Entity, targetX: number, targetY: number): void {
   const packet = new Packet(PacketType.setMoveTargetPosition, 4 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(entity);
   packet.writeNumber(targetX);
   packet.writeNumber(targetY);
   Client.sendPacket(packet.buffer);
}

export function sendSetCarryTargetPacket(entity: Entity, carryTarget: Entity): void {
   const packet = new Packet(PacketType.setCarryTarget, 3 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(entity);
   packet.writeNumber(carryTarget);
   Client.sendPacket(packet.buffer);
}

export function sendSelectRiderDepositLocationPacket(entity: Entity, depositLocation: Point): void {
   const packet = new Packet(PacketType.selectRiderDepositLocation, 4 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(entity);
   packet.writePoint(depositLocation);
   Client.sendPacket(packet.buffer);
}

export function sendSetAttackTargetPacket(entity: Entity, attackTarget: Entity): void {
   const packet = new Packet(PacketType.setAttackTarget, 3 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(entity);
   packet.writeNumber(attackTarget);
   Client.sendPacket(packet.buffer);
}

export function sendCompleteTamingTierPacket(entity: Entity): void {
   const packet = new Packet(PacketType.completeTamingTier, 2 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(entity);
   Client.sendPacket(packet.buffer);
}

export function sendForceCompleteTamingTierPacket(entity: Entity): void {
   const packet = new Packet(PacketType.forceCompleteTamingTier, 2 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(entity);
   Client.sendPacket(packet.buffer);
}

export function sendAcquireTamingSkillPacket(entity: Entity, skillID: TamingSkillID): void {
   const packet = new Packet(PacketType.acquireTamingSkill, 3 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(entity);
   packet.writeNumber(skillID);
   Client.sendPacket(packet.buffer);
}

export function sendForceAcquireTamingSkillPacket(entity: Entity, skillID: TamingSkillID): void {
   const packet = new Packet(PacketType.forceAcquireTamingSkill, 3 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(entity);
   packet.writeNumber(skillID);
   Client.sendPacket(packet.buffer);
}

export function sendSetSpectatingPositionPacket(): void {
   const packet = new Packet(PacketType.setSpectatingPosition, 3 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(cameraPosition.x);
   packet.writeNumber(cameraPosition.y);
   Client.sendPacket(packet.buffer);
}

export function sendDevSetViewedSpawnDistributionPacket(entityType: EntityType | -1): void {
   const packet = new Packet(PacketType.devSetViewedSpawnDistribution, 2 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(entityType);
   Client.sendPacket(packet.buffer);
}

export function sendSetSignMessagePacket(entity: Entity, message: string): void {
   const packet = new Packet(PacketType.setSignMessage, 2 * Float32Array.BYTES_PER_ELEMENT + getStringLengthBytes(message));
   packet.writeNumber(entity);
   packet.writeString(message);
   Client.sendPacket(packet.buffer);
}

export function sendRenameAnimalPacket(entity: Entity, name: string): void {
   const packet = new Packet(PacketType.renameAnimal, 2 * Float32Array.BYTES_PER_ELEMENT + getStringLengthBytes(name));
   packet.writeNumber(entity);
   packet.writeString(name);
   Client.sendPacket(packet.buffer);
}

export function sendChatMessagePacket(message: string): void {
   const packet = new Packet(PacketType.chatMessage, Float32Array.BYTES_PER_ELEMENT + getStringLengthBytes(message));
   packet.writeString(message);
   Client.sendPacket(packet.buffer);
}