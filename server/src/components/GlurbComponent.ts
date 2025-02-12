import { ServerComponentType } from "../../../shared/src/components";
import { Entity, EntityType } from "../../../shared/src/entities";
import { ItemType } from "../../../shared/src/items/items";
import { Settings } from "../../../shared/src/settings";
import { angle, lerp, UtilVars } from "../../../shared/src/utils";
import { stopEntity, turnAngle } from "../ai-shared";
import { CollisionVars, entitiesAreColliding } from "../collision";
import { createItemEntityConfig } from "../entities/item-entity";
import { createEntity } from "../Entity";
import { destroyEntity, getEntityAgeTicks, getEntityLayer, getEntityType } from "../world";
import { AIHelperComponentArray } from "./AIHelperComponent";
import { ComponentArray } from "./ComponentArray";
import { PhysicsComponentArray } from "./PhysicsComponent";
import { TransformComponentArray, getRandomPositionInBox } from "./TransformComponent";

export class GlurbComponent {}

export const GlurbComponentArray = new ComponentArray<GlurbComponent>(ServerComponentType.glurb, true, getDataLength, addDataToPacket);
GlurbComponentArray.onTick = {
   func: onTick,
   tickInterval: 1
};
GlurbComponentArray.preRemove = preRemove;

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(): void {}

const getAcceleration = (glurb: Entity): number => {
   const age = getEntityAgeTicks(glurb);
   
   const u = (Math.sin(age * Settings.I_TPS * 6.5) + 1) * 0.5;
   // @Hack: Since we are doing velocity here not acceleration
   // return lerp(140, 550, u);
   return lerp(125, 250, u);
}

const move = (glurb: Entity, targetEntity: Entity): void => {
   const transformComponent = TransformComponentArray.getComponent(glurb);
   const headHitbox = transformComponent.hitboxes[0];

   const targetTransformComponent = TransformComponentArray.getComponent(targetEntity);

   const headTargetDirection = angle(targetTransformComponent.position.x - headHitbox.box.position.x, targetTransformComponent.position.y - headHitbox.box.position.y);

   headHitbox.box.relativeRotation = turnAngle(headHitbox.box.relativeRotation, headTargetDirection - transformComponent.relativeRotation, UtilVars.PI);
   
   const acceleration = getAcceleration(glurb) * 0.5 * Settings.I_TPS;
   const moveX = acceleration * Math.sin(headTargetDirection - transformComponent.relativeRotation);
   const moveY = acceleration * Math.cos(headTargetDirection - transformComponent.relativeRotation);

   headHitbox.box.offset.x += moveX;
   headHitbox.box.offset.y += moveY;
}

function onTick(glurb: Entity): void {
   const aiHelperComponent = AIHelperComponentArray.getComponent(glurb);

   for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
      const entity = aiHelperComponent.visibleEntities[i];
      if (getEntityType(entity) === EntityType.itemEntity) {
         move(glurb, entity);

         if (entitiesAreColliding(glurb, entity) !== CollisionVars.NO_COLLISION) {
            destroyEntity(entity);
         }
         
         return;
      }
   }

   for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
      const entity = aiHelperComponent.visibleEntities[i];
      if (getEntityType(entity) === EntityType.player) {
         move(glurb, entity);
         
         return;
      }
   }

   const physicsComponent = PhysicsComponentArray.getComponent(glurb);
   stopEntity(physicsComponent);
}

function preRemove(glurb: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(glurb);
   const layer = getEntityLayer(glurb);

   for (const hitbox of transformComponent.hitboxes) {
      const position = getRandomPositionInBox(hitbox.box);
      
      const config = createItemEntityConfig(ItemType.slurb, 1, null);
      config.components[ServerComponentType.transform].position.x = position.x;
      config.components[ServerComponentType.transform].position.y = position.y;
      config.components[ServerComponentType.transform].relativeRotation = 2 * Math.PI * Math.random();
      createEntity(config, layer, 0);
   }
}