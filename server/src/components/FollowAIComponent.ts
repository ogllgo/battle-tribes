import { ServerComponentType } from "battletribes-shared/components";
import { Settings } from "battletribes-shared/settings";
import { getDistanceFromPointToEntity, moveEntityToPosition, turnToPosition, willStopAtDesiredDistance } from "../ai-shared";
import { ComponentArray } from "./ComponentArray";
import { Entity, EntityType } from "battletribes-shared/entities";
import { TransformComponentArray } from "./TransformComponent";
import { Packet } from "battletribes-shared/packets";
import { entityExists, getEntityType } from "../world";
import { applyAcceleration, Hitbox } from "../hitboxes";

export class FollowAIComponent {
   /** ID of the followed entity */
   public followTargetID = 0;
   public followCooldownTicks: number;
   /** Keeps track of how long the mob has been interested in its target */
   public interestTimer = 0;
   public currentTargetIsForgettable = true;

   public readonly followChancePerSecond: number;
   public readonly followDistance: number;

   constructor(followCooldownTicks: number, followChancePerSecond: number, followDistance: number) {
      this.followCooldownTicks = followCooldownTicks;
      this.followChancePerSecond = followChancePerSecond;
      this.followDistance = followDistance;
   }
}

export const FollowAIComponentArray = new ComponentArray<FollowAIComponent>(ServerComponentType.followAI, true, getDataLength, addDataToPacket);

export function updateFollowAIComponent(entity: Entity, visibleEntities: ReadonlyArray<Entity>, interestDuration: number): void {
   const followAIComponent = FollowAIComponentArray.getComponent(entity);

   if (followAIComponent.followCooldownTicks > 0) {
      followAIComponent.followCooldownTicks--;
   }

   if (!entityExists(followAIComponent.followTargetID)) {
      return;
   }
   
   // Make sure the follow target is still within the vision range
   if (!visibleEntities.includes(followAIComponent.followTargetID)) {
      followAIComponent.followTargetID = 0;
      followAIComponent.interestTimer = 0;
      return;
   }
   
   if (followAIComponent.currentTargetIsForgettable) {
      followAIComponent.interestTimer += Settings.I_TPS;
      if (followAIComponent.interestTimer >= interestDuration) {
         followAIComponent.followTargetID = 0;
      }
   }
}

export function followAISetFollowTarget(entity: Entity, followedEntity: Entity, newFollowCooldownTicks: number, isForgettable: boolean): void {
   const followAIComponent = FollowAIComponentArray.getComponent(entity);
   followAIComponent.followTargetID = followedEntity;
   followAIComponent.followCooldownTicks = newFollowCooldownTicks;
   followAIComponent.interestTimer = 0;
   followAIComponent.currentTargetIsForgettable = isForgettable;

   // @Temporary: now that cow uses custom move func.
   //    - will want to go through all places which call this and make them handle the movement themselves
   // const followedEntityTransformComponent = TransformComponentArray.getComponent(followedEntity);
   // const followedEntityHitbox = followedEntityTransformComponent.children[0] as Hitbox;
   // moveEntityToPosition(entity, followedEntityHitbox.box.position.x, followedEntityHitbox.box.position.y, acceleration, turnSpeed);
};

export function continueFollowingEntity(entity: Entity, followTarget: Entity, acceleration: number, turnSpeed: number): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const followAIComponent = FollowAIComponentArray.getComponent(entity);

   const entityHitbox = transformComponent.children[0] as Hitbox;
   
   const followTargetTransformComponent = TransformComponentArray.getComponent(followTarget);
   const followTargetHitbox = followTargetTransformComponent.children[0] as Hitbox;
   
   // @Incomplete: do getDistanceBetweenEntities
   // @Hack: not right - assumes 1 circular hitbox with radius of 32
   // @Hack: This so asssss, should call a function to find the distance between entities instead
   let radius: number;
   if (getEntityType(entity) === EntityType.krumblid) {
      radius = 12;
   } else {
      radius = 32;
   }
   const distance = getDistanceFromPointToEntity(followTargetHitbox.box.position, transformComponent) - radius;
   if (willStopAtDesiredDistance(entityHitbox, followAIComponent.followDistance, distance - 4)) {
      // Too close, move backwards!
      turnToPosition(entity, followTargetHitbox.box.position.x, followTargetHitbox.box.position.y, turnSpeed);

      const moveDirection = entityHitbox.box.position.calculateAngleBetween(followTargetHitbox.box.position) + Math.PI;
      const accelerationX = acceleration * Math.sin(moveDirection);
      const accelerationY = acceleration * Math.cos(moveDirection);
      applyAcceleration(entity, entityHitbox, accelerationX, accelerationY);
   }
   if (willStopAtDesiredDistance(entityHitbox, followAIComponent.followDistance, distance)) {
      turnToPosition(entity, followTargetHitbox.box.position.x, followTargetHitbox.box.position.y, turnSpeed);
   } else {
      moveEntityToPosition(entity, followTargetHitbox.box.position.x, followTargetHitbox.box.position.y, acceleration, turnSpeed);
   }
}

export function entityWantsToFollow(followAIComponent: FollowAIComponent): boolean {
   return followAIComponent.followCooldownTicks === 0 && Math.random() < followAIComponent.followChancePerSecond / Settings.TPS;
}

function getDataLength(): number {
   return 3 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const followAIComponent = FollowAIComponentArray.getComponent(entity);

   packet.addNumber(followAIComponent.followTargetID);
   packet.addNumber(followAIComponent.followCooldownTicks);
   packet.addNumber(followAIComponent.interestTimer);
}