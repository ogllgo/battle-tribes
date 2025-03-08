import { ServerComponentType } from "../../../shared/src/components";
import { Entity, EntityType } from "../../../shared/src/entities";
import { ItemType } from "../../../shared/src/items/items";
import { Settings } from "../../../shared/src/settings";
import { angle, lerp, Point } from "../../../shared/src/utils";
import { CollisionVars, entitiesAreColliding } from "../collision-detection";
import { createItemEntityConfig } from "../entities/item-entity";
import { createEntity } from "../Entity";
import { applyAcceleration, setHitboxIdealAngle } from "../hitboxes";
import { undergroundLayer } from "../layers";
import { destroyEntity, getEntityAgeTicks, getEntityType } from "../world";
import { AIHelperComponentArray } from "./AIHelperComponent";
import { AttackingEntitiesComponentArray } from "./AttackingEntitiesComponent";
import { ComponentArray } from "./ComponentArray";
import { GlurbSegmentComponentArray } from "./GlurbSegmentComponent";
import { ItemComponentArray } from "./ItemComponent";
import { TransformComponentArray } from "./TransformComponent";

export class GlurbHeadSegmentComponent {
   // @Hack
   public readonly allSegments = new Array<Entity>();
}

export const GlurbHeadSegmentComponentArray = new ComponentArray<GlurbHeadSegmentComponent>(ServerComponentType.glurbHeadSegment, true, getDataLength, addDataToPacket);
GlurbHeadSegmentComponentArray.onTick = {
   func: onTick,
   tickInterval: 1
};

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(): void {}

const getAcceleration = (glurb: Entity): number => {
   const age = getEntityAgeTicks(glurb);
   
   const u = (Math.sin(age * Settings.I_TPS * 6.5) + 1) * 0.5;
   return lerp(200, 450, u);
}

const move = (glurb: Entity, targetPosition: Point): void => {
   const glurbHeadSegmentComponent = GlurbHeadSegmentComponentArray.getComponent(glurb);
   const acceleration = getAcceleration(glurb);

   for (const glurbSegment of glurbHeadSegmentComponent.allSegments) {
      const transformComponent = TransformComponentArray.getComponent(glurbSegment);
      const hitbox = transformComponent.hitboxes[0];
   
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
   const targetHitbox = targetTransformComponent.hitboxes[0];
   move(glurb, targetHitbox.box.position);
}

function onTick(glurb: Entity): void {
   const glurbTransformComponent = TransformComponentArray.getComponent(glurb);
   const glurbHitbox = glurbTransformComponent.hitboxes[0];
   
   const attackingEntitiesComponent = AttackingEntitiesComponentArray.getComponent(glurb);
   for (const pair of attackingEntitiesComponent.attackingEntities) {
      const attacker = pair[0];
      const attackerTransformComponent = TransformComponentArray.getComponent(attacker);
      const attackerHitbox = attackerTransformComponent.hitboxes[0];

      // Run away!!
      const targetX = glurbHitbox.box.position.x * 2 - attackerHitbox.box.position.x;
      const targetY = glurbHitbox.box.position.y * 2 - attackerHitbox.box.position.y;
      move(glurb, new Point(targetX, targetY));
      return;
   }
   
   const aiHelperComponent = AIHelperComponentArray.getComponent(glurb);

   for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
      const entity = aiHelperComponent.visibleEntities[i];
      if (getEntityType(entity) === EntityType.itemEntity) {
         const itemEntityComponent = ItemComponentArray.getComponent(entity);
         if (itemEntityComponent.itemType === ItemType.slurb){
            continue;
         }
         
         moveToEntity(glurb, entity);

         if (entitiesAreColliding(glurb, entity) !== CollisionVars.NO_COLLISION) {
            destroyEntity(entity);

            const x = glurbHitbox.box.position.x + 10 * Math.sin(glurbHitbox.box.angle);
            const y = glurbHitbox.box.position.y + 10 * Math.cos(glurbHitbox.box.angle);
            
            const config = createItemEntityConfig(new Point(x, y), 2 * Math.PI * Math.random(), ItemType.slurb, 1, null);
            const itemEntityHitbox = config.components[ServerComponentType.transform]!.hitboxes[0];
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
         moveToEntity(glurb, entity);
         
         return;
      }
   }
}