import { Entity } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { randInt } from "battletribes-shared/utils";
import { entityHasReachedPosition } from "../ai-shared";
import { AIHelperComponentArray } from "../components/AIHelperComponent";
import { TransformComponentArray } from "../components/TransformComponent";
import Layer from "../Layer";
import { getEntityAgeTicks, getEntityLayer } from "../world";
import { Hitbox } from "../hitboxes";

const enum Vars {
   POSITION_RECORD_INTERVAL = Settings.TPS
}

export type WanderAITileIsValidCallback = (entity: Entity, layer: Layer, x: number, y: number) => boolean;

export default class WanderAI {
   public acceleration: number;
   private readonly turnSpeed: number;
   private readonly wanderRate: number;

   // If these are set to -1, the wander AI has no current target position
   public targetPositionX = -1;
   public targetPositionY = -1;

   private lastRecordedPositionX = -1;
   private lastRecordedPositionY = -1;
   
   private readonly positionIsValidCallback: WanderAITileIsValidCallback;

   constructor(acceleration: number, turnSpeed: number, wanderRate: number, positionIsValidCallback: WanderAITileIsValidCallback) {
      this.acceleration = acceleration;
      this.turnSpeed = turnSpeed;
      this.wanderRate = wanderRate;
      this.positionIsValidCallback = positionIsValidCallback;
   }

   private shouldTryAndWander(hitbox: Hitbox): boolean {
      return hitbox.velocity.x === 0 && hitbox.velocity.y === 0 && Math.random() < this.wanderRate / Settings.TPS;
   }

   public update(entity: Entity): void {
      const transformComponent = TransformComponentArray.getComponent(entity);
      // @Hack
      const entityHitbox = transformComponent.hitboxes[0];
      
      if (getEntityAgeTicks(entity) % Vars.POSITION_RECORD_INTERVAL === 0) {
         // If the entity hasn't moved enough since the last position check-in, clear the target as they are most likely stuck
         if (this.targetPositionX !== -1) {
            const dx = entityHitbox.box.position.x - this.lastRecordedPositionX;
            const dy = entityHitbox.box.position.y - this.lastRecordedPositionY;
            const positionDelta = Math.sqrt(dx * dx + dy * dy);
            if (positionDelta < 10) {
               this.targetPositionX = -1;
            }
         }
         
         this.lastRecordedPositionX = entityHitbox.box.position.x;
         this.lastRecordedPositionY = entityHitbox.box.position.y;
      }
      
      if (this.targetPositionX !== -1) {
         if (entityHasReachedPosition(entity, this.targetPositionX, this.targetPositionY)) {
            this.targetPositionX = -1;
         }
      } else if (this.shouldTryAndWander(entityHitbox)) {
         const layer = getEntityLayer(entity);

         const transformComponent = TransformComponentArray.getComponent(entity);
         const aiHelperComponent = AIHelperComponentArray.getComponent(entity);
         
         const minTileX = Math.max(Math.floor((entityHitbox.box.position.x - aiHelperComponent.visionRange) / Settings.TILE_SIZE), 0);
         const maxTileX = Math.min(Math.floor((entityHitbox.box.position.x + aiHelperComponent.visionRange) / Settings.TILE_SIZE), Settings.BOARD_DIMENSIONS - 1);
         const minTileY = Math.max(Math.floor((entityHitbox.box.position.y - aiHelperComponent.visionRange) / Settings.TILE_SIZE), 0);
         const maxTileY = Math.min(Math.floor((entityHitbox.box.position.y + aiHelperComponent.visionRange) / Settings.TILE_SIZE), Settings.BOARD_DIMENSIONS - 1);
         
         let attempts = 0;
         let x: number;
         let y: number;
         let isValid = false;

         // @Speed: Worst-case this iterates 2500 (!!) times!!!
         while (attempts++ < 50) {
            let attempts = 0;
            let tileX: number;
            let tileY: number;
            do {
               tileX = randInt(minTileX, maxTileX);
               tileY = randInt(minTileY, maxTileY);
            } while (++attempts <= 50 && Math.pow(entityHitbox.box.position.x - (tileX + 0.5) * Settings.TILE_SIZE, 2) + Math.pow(entityHitbox.box.position.y - (tileY + 0.5) * Settings.TILE_SIZE, 2) > aiHelperComponent.visionRange * aiHelperComponent.visionRange);
         
            x = (tileX + Math.random()) * Settings.TILE_SIZE;
            y = (tileY + Math.random()) * Settings.TILE_SIZE;

            if (this.positionIsValidCallback(entity, layer, x, y)) {
               isValid = true;
               break;
            }
         }

         if (isValid) {
            this.targetPositionX = x!;
            this.targetPositionY = y!;
         }
      }
   }
}