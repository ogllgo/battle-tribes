import { Entity } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { randInt } from "battletribes-shared/utils";
import { entityHasReachedPosition } from "../ai-shared";
import { AIHelperComponentArray } from "../components/AIHelperComponent";
import { TransformComponent, TransformComponentArray } from "../components/TransformComponent";
import Layer from "../Layer";
import { getEntityLayer } from "../world";

export type WanderAITileIsValidCallback = (entity: Entity, layer: Layer, x: number, y: number) => boolean;

export default class WanderAI {
   public acceleration: number;
   private readonly turnSpeed: number;
   private readonly wanderRate: number;

   // If these are set to -1, the wander AI has no current target position
   targetPositionX = -1;
   targetPositionY = -1;
   
   private readonly positionIsValidCallback: WanderAITileIsValidCallback;

   constructor(acceleration: number, turnSpeed: number, wanderRate: number, positionIsValidCallback: WanderAITileIsValidCallback) {
      this.acceleration = acceleration;
      this.turnSpeed = turnSpeed;
      this.wanderRate = wanderRate;
      this.positionIsValidCallback = positionIsValidCallback;
   }

   private shouldTryAndWander(transformComponent: TransformComponent): boolean {
      return transformComponent.selfVelocity.x === 0 && transformComponent.selfVelocity.y === 0 && Math.random() < this.wanderRate / Settings.TPS;
   }

   public update(entity: Entity): void {
      const transformComponent = TransformComponentArray.getComponent(entity);
      
      if (this.targetPositionX !== -1) {
         if (entityHasReachedPosition(entity, this.targetPositionX, this.targetPositionY)) {
            this.targetPositionX = -1;
         }
      } else if (this.shouldTryAndWander(transformComponent)) {
         const layer = getEntityLayer(entity);

         const transformComponent = TransformComponentArray.getComponent(entity);
         const aiHelperComponent = AIHelperComponentArray.getComponent(entity);
         
         const minTileX = Math.max(Math.floor((transformComponent.position.x - aiHelperComponent.visionRange) / Settings.TILE_SIZE), 0);
         const maxTileX = Math.min(Math.floor((transformComponent.position.x + aiHelperComponent.visionRange) / Settings.TILE_SIZE), Settings.BOARD_DIMENSIONS - 1);
         const minTileY = Math.max(Math.floor((transformComponent.position.y - aiHelperComponent.visionRange) / Settings.TILE_SIZE), 0);
         const maxTileY = Math.min(Math.floor((transformComponent.position.y + aiHelperComponent.visionRange) / Settings.TILE_SIZE), Settings.BOARD_DIMENSIONS - 1);
         
         let attempts = 0;
         let x: number;
         let y: number;
         // @Speed: Worst-case this iterates 2500 (!!) times!!!
         do {
            let attempts = 0;
            let tileX: number;
            let tileY: number;
            do {
               tileX = randInt(minTileX, maxTileX);
               tileY = randInt(minTileY, maxTileY);
            } while (++attempts <= 50 && Math.pow(transformComponent.position.x - (tileX + 0.5) * Settings.TILE_SIZE, 2) + Math.pow(transformComponent.position.y - (tileY + 0.5) * Settings.TILE_SIZE, 2) > aiHelperComponent.visionRange * aiHelperComponent.visionRange);
         
            x = (tileX + Math.random()) * Settings.TILE_SIZE;
            y = (tileY + Math.random()) * Settings.TILE_SIZE;
         } while (++attempts <= 50 && !this.positionIsValidCallback(entity, layer, x, y));

         this.targetPositionX = x;
         this.targetPositionY = y;
      }
   }
}