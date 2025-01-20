import { ServerComponentType } from "../../../shared/src/components";
import { Entity, EntityType } from "../../../shared/src/entities";
import { registerEntityTickEvent } from "../server/player-clients";
import { getEntityType } from "../world";
import { runAssignmentAI } from "./AIAssignmentComponent";
import { AIHelperComponentArray } from "./AIHelperComponent";
import { ComponentArray } from "./ComponentArray";
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
   
   runAssignmentAI(cogwalker, visibleItemEntities);
}