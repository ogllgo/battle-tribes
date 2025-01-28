import { ServerComponentType } from "../../../shared/src/components";
import { Entity, EntityType } from "../../../shared/src/entities";
import { EntityTickEvent, EntityTickEventType } from "../../../shared/src/entity-events";
import { InventoryName } from "../../../shared/src/items/items";
import { Settings } from "../../../shared/src/settings";
import { randFloat } from "../../../shared/src/utils";
import { throwItem } from "../entities/tribes/tribe-member";
import { registerEntityTickEvent } from "../server/player-clients";
import { getEntityAgeTicks, getEntityType } from "../world";
import { runAssignmentAI } from "./AIAssignmentComponent";
import { AIHelperComponentArray } from "./AIHelperComponent";
import { ComponentArray } from "./ComponentArray";
import { InventoryComponentArray, getInventory } from "./InventoryComponent";
import { PhysicsComponentArray } from "./PhysicsComponent";
import { TransformComponentArray } from "./TransformComponent";
import { EntityRelationship, getEntityRelationship } from "./TribeComponent";

export class CogwalkerComponent {}

export const CogwalkerComponentArray = new ComponentArray<CogwalkerComponent>(ServerComponentType.cogwalker, true, getDataLength, addDataToPacket);
CogwalkerComponentArray.onTick = {
   func: onTick,
   tickInterval: 1
};

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(): void {}

function onTick(cogwalker: Entity): void {
   // @Copynpaste

   const aiHelperComponent = AIHelperComponentArray.getComponent(cogwalker);

   const visibleEnemies = new Array<Entity>();
   const visibleEnemyBuildings = new Array<Entity>();
   const visibleHostileMobs = new Array<Entity>();
   const visibleItemEntities = new Array<Entity>();
   for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
      const entity = aiHelperComponent.visibleEntities[i];

      // @Temporary: may want to reintroduce
      // But use paths instead!! :D
      // if (!entityIsAccessible(tribesman, entity)) {
      //    continue;
      // }

      switch (getEntityRelationship(cogwalker, entity)) {
         case EntityRelationship.enemy: {
            visibleEnemies.push(entity);
            break;
         }
         case EntityRelationship.enemyBuilding: {
            visibleEnemyBuildings.push(entity);
            break;
         }
         case EntityRelationship.hostileMob: {
            visibleHostileMobs.push(entity);
            break;
         }
         case EntityRelationship.neutral: {
            if (getEntityType(entity) === EntityType.itemEntity) {
               visibleItemEntities.push(entity);
            }
            break;
         }
      }
   }
   
   // @Temporaryh
   // runAssignmentAI(cogwalker, visibleItemEntities);


   // @Hack @Copynpaste
   if (getEntityAgeTicks(cogwalker) % (Settings.TPS * 4) === 0) {
      let hasAccident = false;
      {
         const physicsComponent = PhysicsComponentArray.getComponent(cogwalker);
         const vx = physicsComponent.selfVelocity.x + physicsComponent.externalVelocity.x;
         const vy = physicsComponent.selfVelocity.y + physicsComponent.externalVelocity.y;
         const vel = Math.sqrt(vx * vx + vy * vy);

         if (vel > 100) {
            hasAccident = true;
            physicsComponent.selfVelocity.x = 0;
            physicsComponent.selfVelocity.y = 0;
         }
      }
      
      if (hasAccident) {
         const tickEvent: EntityTickEvent = {
            entityID: cogwalker,
            type: EntityTickEventType.automatonAccident,
            data: 0
         };
         registerEntityTickEvent(cogwalker, tickEvent);
      }
   }
}