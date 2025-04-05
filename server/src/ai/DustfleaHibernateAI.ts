import CircularBox from "../../../shared/src/boxes/CircularBox";
import RectangularBox from "../../../shared/src/boxes/RectangularBox";
import { CollisionGroup, getEntityCollisionGroup } from "../../../shared/src/collision-groups";
import { Entity } from "../../../shared/src/entities";
import { Settings } from "../../../shared/src/settings";
import { clampToBoardDimensions, distance, Point, positionIsInWorld, randFloat } from "../../../shared/src/utils";
import { getEntitiesInRange } from "../ai-shared";
import { AIHelperComponent } from "../components/AIHelperComponent";
import { removeAttachedEntity, TransformComponentArray } from "../components/TransformComponent";
import { createDustfleaMorphCocoonConfig } from "../entities/desert/dustflea-morph-cocoon";
import { createEntity } from "../Entity";
import { Hitbox, stopHitboxTurning } from "../hitboxes";
import { destroyEntity, getEntityAgeTicks, getEntityLayer, getEntityType } from "../world";

export class DustfleaHibernateAI {
   public readonly acceleration: number;
   public readonly turnSpeed: number;
   
   public hibernateTargetPosition: Point | null = null;

   constructor(acceleration: number, turnSpeed: number) {
      this.acceleration = acceleration;
      this.turnSpeed = turnSpeed;
   }
}

const getRandomNearbyPosition = (dustflea: Entity): Point => {
   const dustfleaTransformComponent = TransformComponentArray.getComponent(dustflea);
   const dustfleaHitbox = dustfleaTransformComponent.children[0] as Hitbox;

   const RANGE = 600;
   
   let x: number;
   let y: number;
   do {
      x = dustfleaHitbox.box.position.x + randFloat(-RANGE, RANGE);
      y = dustfleaHitbox.box.position.y + randFloat(-RANGE, RANGE);
   } while (distance(dustfleaHitbox.box.position.x, dustfleaHitbox.box.position.y, x, y) > RANGE || !positionIsInWorld(x, y))

   return new Point(x, y);
}

const isValidHibernatePosition = (dustflea: Entity, position: Point): boolean => {
   // Make sure it isn't in a wall
   
   const WALL_CHECK_RANGE = 40;

   const dustfleaTransformComponent = TransformComponentArray.getComponent(dustflea);
   const dustfleaHitbox = dustfleaTransformComponent.children[0] as Hitbox;

   const minTileX = clampToBoardDimensions(Math.floor((dustfleaHitbox.box.position.x - WALL_CHECK_RANGE) / Settings.TPS));
   const maxTileX = clampToBoardDimensions(Math.floor((dustfleaHitbox.box.position.x + WALL_CHECK_RANGE) / Settings.TPS));
   const minTileY = clampToBoardDimensions(Math.floor((dustfleaHitbox.box.position.y - WALL_CHECK_RANGE) / Settings.TPS));
   const maxTileY = clampToBoardDimensions(Math.floor((dustfleaHitbox.box.position.y + WALL_CHECK_RANGE) / Settings.TPS));

   const testHitbox = new CircularBox(dustfleaHitbox.box.position.copy(), new Point(0, 0), 0, WALL_CHECK_RANGE);
   
   for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
      for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
            // @Speed
         const position = new Point((tileX + 0.5) * Settings.TILE_SIZE, (tileY + 0.5) * Settings.TILE_SIZE);
         const tileBox = new RectangularBox(position, new Point(0, 0), 0, Settings.TILE_SIZE, Settings.TILE_SIZE);
         if (testHitbox.isColliding(tileBox)) {
            return false;
         }
      }
   }

   const layer = getEntityLayer(dustflea);
   
   // make sure the hiberation place isn't occupied

   const ENTITY_OCCUPATION_CHECK_RANGE = 60;
   {
      const nearbyEntities = getEntitiesInRange(layer, dustfleaHitbox.box.position.x, dustfleaHitbox.box.position.y, ENTITY_OCCUPATION_CHECK_RANGE);
      for (const entity of nearbyEntities) {
         if (entity === dustflea) {
            continue;
         }

         const entityType = getEntityType(entity);
         const collisionGroup = getEntityCollisionGroup(entityType);
         if (collisionGroup !== CollisionGroup.none && collisionGroup !== CollisionGroup.decoration) {
            return false;
         }
      }
   }
   
   // Make sure there aren't too many entities in range

   const ENTITY_CHECK_RANGE = 130;
   const nearbyEntities = getEntitiesInRange(layer, dustfleaHitbox.box.position.x, dustfleaHitbox.box.position.y, ENTITY_CHECK_RANGE);

   let numEntities = 0;
   for (const entity of nearbyEntities) {
      if (entity === dustflea) {
         continue;
      }

      const entityType = getEntityType(entity);
      const collisionGroup = getEntityCollisionGroup(entityType);
      if (collisionGroup !== CollisionGroup.none && collisionGroup !== CollisionGroup.decoration) {
         numEntities++;
      }
   }

   if (numEntities >= 9) {
      return false;
   }

   return true;
}

export function runHibernateAI(dustflea: Entity, aiHelperComponent: AIHelperComponent, hibernateAI: DustfleaHibernateAI): void {
   // When the dustflea doesn't have a valid hibernate target position, go look for one
   if (hibernateAI.hibernateTargetPosition === null && getEntityAgeTicks(dustflea) % Settings.TPS === 0) {
      const potentialPosition = getRandomNearbyPosition(dustflea);
      if (isValidHibernatePosition(dustflea, potentialPosition)) {
         hibernateAI.hibernateTargetPosition = potentialPosition;
      }
   }

   const dustfleaTransformComponent = TransformComponentArray.getComponent(dustflea);
   // if the dustflea was previously latched onto a target or sitting on an object, unattach.
   if (dustfleaTransformComponent.rootEntity !== dustflea) {
      removeAttachedEntity(dustfleaTransformComponent.rootEntity, dustflea);
   }

   if (hibernateAI.hibernateTargetPosition !== null) {
      // go to it!
      aiHelperComponent.move(dustflea, hibernateAI.acceleration, hibernateAI.turnSpeed, hibernateAI.hibernateTargetPosition.x, hibernateAI.hibernateTargetPosition.y);

      const dustfleaHitbox = dustfleaTransformComponent.children[0] as Hitbox;
      if (dustfleaHitbox.box.position.calculateDistanceBetween(hibernateAI.hibernateTargetPosition) < 1) {
         destroyEntity(dustflea);

         const cocoonConfig = createDustfleaMorphCocoonConfig(dustfleaHitbox.box.position.copy(), 2 * Math.PI * Math.random());
         createEntity(cocoonConfig, getEntityLayer(dustflea), 0);
      }
   } else {
      // wandah
      
      // @Copynpaste!!
      // Wander AI
      const wanderAI = aiHelperComponent.getWanderAI();
      wanderAI.update(dustflea);
      if (wanderAI.targetPositionX !== -1) {
         aiHelperComponent.move(dustflea, 250, 2 * Math.PI, wanderAI.targetPositionX, wanderAI.targetPositionY);
      } else {
         const dustfleaHitbox = dustfleaTransformComponent.children[0] as Hitbox;
         stopHitboxTurning(dustfleaHitbox);
      }
   }
}