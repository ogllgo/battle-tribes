import { ServerComponentType } from "../../../shared/src/components";
import { Entity, EntityType } from "../../../shared/src/entities";
import { EntityTickEvent, EntityTickEventType } from "../../../shared/src/entity-events";
import { InventoryName } from "../../../shared/src/items/items";
import { Settings } from "../../../shared/src/settings";
import { randFloat } from "../../../shared/src/utils";
import { throwItem } from "../entities/tribes/tribe-member";
import { registerEntityTickEvent } from "../server/player-clients";
import { getEntityType } from "../world";
import { runAssignmentAI } from "./AIAssignmentComponent";
import { AIHelperComponentArray } from "./AIHelperComponent";
import { ComponentArray } from "./ComponentArray";
import { getInventory, InventoryComponentArray } from "./InventoryComponent";
import { PhysicsComponentArray } from "./PhysicsComponent";
import { TransformComponentArray } from "./TransformComponent";
import { getEntityRelationship, EntityRelationship } from "./TribeComponent";

const enum Vars {
   MIN_ACCIDENT_INTERVAL = 2 * Settings.TPS,
   MAX_ACCIDENT_INTERVAL = 4 * Settings.TPS
}

export class ScrappyComponent {
   public accidentTimer = randFloat(Vars.MIN_ACCIDENT_INTERVAL, Vars.MAX_ACCIDENT_INTERVAL);
}

export const ScrappyComponentArray = new ComponentArray<ScrappyComponent>(ServerComponentType.scrappy, true, getDataLength, addDataToPacket);
ScrappyComponentArray.onTick = {
   func: onTick,
   tickInterval: 1
};

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(): void {}

function onTick(scrappy: Entity): void {
   // @Copynpaste

   const aiHelperComponent = AIHelperComponentArray.getComponent(scrappy);

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

      switch (getEntityRelationship(scrappy, entity)) {
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
   
   runAssignmentAI(scrappy, visibleItemEntities);

   const scrappyComponent = ScrappyComponentArray.getComponent(scrappy);
   scrappyComponent.accidentTimer--;
   if (scrappyComponent.accidentTimer <= 0) {
      scrappyComponent.accidentTimer = randFloat(Vars.MIN_ACCIDENT_INTERVAL, Vars.MAX_ACCIDENT_INTERVAL);

      const inventoryComponent = InventoryComponentArray.getComponent(scrappy);
      const hotbar = getInventory(inventoryComponent, InventoryName.hotbar);
      
      let hasAccident = false;
      if (hotbar.hasItem(1) && Math.random() < 0.7) {
         hasAccident = true;

         // Drop the item
         const transformComponent = TransformComponentArray.getComponent(scrappy);
         throwItem(scrappy, InventoryName.hotbar, 1, 99, transformComponent.rotation + randFloat(-0.3, 0.3));
      } else {
         const physicsComponent = PhysicsComponentArray.getComponent(scrappy);
         const vx = physicsComponent.selfVelocity.x + physicsComponent.externalVelocity.x;
         const vy = physicsComponent.selfVelocity.y + physicsComponent.externalVelocity.y;
         const vel = Math.sqrt(vx * vx + vy * vy);

         if (vel > 100) {
            hasAccident = true;
            physicsComponent.selfVelocity.x *= 0.3;
            physicsComponent.selfVelocity.y *= 0.3;
         }
      }
      
      if (hasAccident) {
         const tickEvent: EntityTickEvent = {
            entityID: scrappy,
            type: EntityTickEventType.automatonAccident,
            data: 0
         };
         registerEntityTickEvent(scrappy, tickEvent);
      }
   }
}