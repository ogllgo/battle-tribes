import { ServerComponentType } from "../../../shared/src/components";
import { Entity, EntityType } from "../../../shared/src/entities";
import { ItemType } from "../../../shared/src/items/items";
import { Settings } from "../../../shared/src/settings";
import { angle, lerp, Point } from "../../../shared/src/utils";
import { CollisionVars, entitiesAreColliding } from "../collision-detection";
import { createItemEntityConfig } from "../entities/item-entity";
import { createEntity } from "../Entity";
import { applyAcceleration, Hitbox, setHitboxIdealAngle } from "../hitboxes";
import { undergroundLayer } from "../layers";
import { destroyEntity, getEntityAgeTicks, getEntityType } from "../world";
import { AIHelperComponentArray } from "./AIHelperComponent";
import { AttackingEntitiesComponentArray } from "./AttackingEntitiesComponent";
import { ComponentArray } from "./ComponentArray";
import { GlurbSegmentComponentArray } from "./GlurbSegmentComponent";
import { ItemComponentArray } from "./ItemComponent";
import { entityChildIsEntity, getFirstComponent, TransformComponentArray } from "./TransformComponent";

export class GlurbHeadSegmentComponent {}

export const GlurbHeadSegmentComponentArray = new ComponentArray<GlurbHeadSegmentComponent>(ServerComponentType.glurbHeadSegment, true, getDataLength, addDataToPacket);
GlurbHeadSegmentComponentArray.onTick = {
   func: onTick,
   tickInterval: 1
};

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}

const getAcceleration = (glurb: Entity): number => {
   const age = getEntityAgeTicks(glurb);
   
   const u = (Math.sin(age * Settings.I_TPS * 6.5) + 1) * 0.5;
   return lerp(200, 450, u);
}

const move = (head: Entity, targetPosition: Point): void => {
   const acceleration = getAcceleration(head);

   const headTransformComponent = TransformComponentArray.getComponent(head);

   const glurbTransformComponent = TransformComponentArray.getComponent(headTransformComponent.parentEntity);

   for (const child of glurbTransformComponent.children) {
      if (!entityChildIsEntity(child)) {
         continue;
      }

      const glurbSegment = child.attachedEntity;
      if (!GlurbSegmentComponentArray.hasComponent(glurbSegment)) {
         continue;
      }

      const transformComponent = TransformComponentArray.getComponent(glurbSegment);
      const hitbox = transformComponent.children[0] as Hitbox;
   
      let targetDirection: number;
      
      if (GlurbHeadSegmentComponentArray.hasComponent(glurbSegment)) {
         targetDirection = angle(targetPosition.x - hitbox.box.position.x, targetPosition.y - hitbox.box.position.y);
         setHitboxIdealAngle(hitbox, targetDirection, Math.PI);
      } else {
         // Move to next hitbox in chain
         const glurbSegmentComponent = GlurbSegmentComponentArray.getComponent(glurbSegment);
         targetDirection = hitbox.box.position.calculateAngleBetween(glurbSegmentComponent.nextHitbox.box.position);
      }
      
      const accelerationX = acceleration * Math.sin(targetDirection);
      const accelerationY = acceleration * Math.cos(targetDirection);
      applyAcceleration(glurbSegment, hitbox, accelerationX, accelerationY);
   }
}

const moveToEntity = (glurb: Entity, targetEntity: Entity): void => {
   const targetTransformComponent = TransformComponentArray.getComponent(targetEntity);
   const targetHitbox = targetTransformComponent.children[0] as Hitbox;
   move(glurb, targetHitbox.box.position);
}

function onTick(glurbHead: Entity): void {
   const glurbTransformComponent = TransformComponentArray.getComponent(glurbHead);
   const glurbHitbox = glurbTransformComponent.children[0] as Hitbox;
   
   const attackingEntitiesComponent = getFirstComponent(AttackingEntitiesComponentArray, glurbHead);
   for (const pair of attackingEntitiesComponent.attackingEntities) {
      const attacker = pair[0];
      const attackerTransformComponent = TransformComponentArray.getComponent(attacker);
      const attackerHitbox = attackerTransformComponent.children[0] as Hitbox;

      // Run away!!
      const targetX = glurbHitbox.box.position.x * 2 - attackerHitbox.box.position.x;
      const targetY = glurbHitbox.box.position.y * 2 - attackerHitbox.box.position.y;
      move(glurbHead, new Point(targetX, targetY));
      return;
   }
   
   const aiHelperComponent = AIHelperComponentArray.getComponent(glurbHead);

   for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
      const entity = aiHelperComponent.visibleEntities[i];
      if (getEntityType(entity) === EntityType.itemEntity) {
         const itemEntityComponent = ItemComponentArray.getComponent(entity);
         if (itemEntityComponent.itemType === ItemType.slurb){
            continue;
         }
         
         moveToEntity(glurbHead, entity);

         if (entitiesAreColliding(glurbHead, entity) !== CollisionVars.NO_COLLISION) {
            destroyEntity(entity);

            const x = glurbHitbox.box.position.x + 10 * Math.sin(glurbHitbox.box.angle);
            const y = glurbHitbox.box.position.y + 10 * Math.cos(glurbHitbox.box.angle);
            
            const config = createItemEntityConfig(new Point(x, y), 2 * Math.PI * Math.random(), ItemType.slurb, 1, null);
            const itemEntityHitbox = config.components[ServerComponentType.transform]!.children[0] as Hitbox;
            itemEntityHitbox.velocity.x = 50 * Math.sin(glurbHitbox.box.angle);
            itemEntityHitbox.velocity.y = 50 * Math.cos(glurbHitbox.box.angle);
            createEntity(config, undergroundLayer, 0);
         }
         
         return;
      }
   }

   for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
      const entity = aiHelperComponent.visibleEntities[i];
      if (getEntityType(entity) === EntityType.player) {
         moveToEntity(glurbHead, entity);
         
         return;
      }
   }
}