import CircularBox from "../../../shared/src/boxes/CircularBox";
import RectangularBox from "../../../shared/src/boxes/RectangularBox";
import { CollisionGroup, getEntityCollisionGroup } from "../../../shared/src/collision-groups";
import { Entity } from "../../../shared/src/entities";
import { Settings } from "../../../shared/src/settings";
import { getSubtileIndex } from "../../../shared/src/subtiles";
import { clampToSubtileBoardDimensions, distance, Point, positionIsInWorld, randFloat } from "../../../shared/src/utils";
import { getEntitiesInRange } from "../ai-shared";
import { AIHelperComponent } from "../components/AIHelperComponent";
import { removeAttachedEntity, TransformComponentArray } from "../components/TransformComponent";
import { createDustfleaMorphCocoonConfig } from "../entities/desert/dustflea-morph-cocoon";
import { createEntity } from "../Entity";
import { Hitbox } from "../hitboxes";
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
   const layer = getEntityLayer(dustflea);
   
   // Make sure it isn't in a wall
   
   const WALL_CHECK_RANGE = 28;

   const minSubtileX = clampToSubtileBoardDimensions(Math.floor((position.x - WALL_CHECK_RANGE) / Settings.SUBTILE_SIZE));
   const maxSubtileX = clampToSubtileBoardDimensions(Math.floor((position.x + WALL_CHECK_RANGE) / Settings.SUBTILE_SIZE));
   const minSubtileY = clampToSubtileBoardDimensions(Math.floor((position.y - WALL_CHECK_RANGE) / Settings.SUBTILE_SIZE));
   const maxSubtileY = clampToSubtileBoardDimensions(Math.floor((position.y + WALL_CHECK_RANGE) / Settings.SUBTILE_SIZE));

   const testHitbox = new CircularBox(position.copy(), new Point(0, 0), 0, WALL_CHECK_RANGE);
   
   for (let subtileX = minSubtileX; subtileX <= maxSubtileX; subtileX++) {
      for (let subtileY = minSubtileY; subtileY <= maxSubtileY; subtileY++) {
         const subtileIndex = getSubtileIndex(subtileX, subtileY);
         if (layer.subtileIsWall(subtileIndex)) {
            // @Speed
            const position = new Point((subtileX + 0.5) * Settings.SUBTILE_SIZE, (subtileY + 0.5) * Settings.SUBTILE_SIZE);
            const tileBox = new RectangularBox(position, new Point(0, 0), 0, Settings.SUBTILE_SIZE, Settings.SUBTILE_SIZE);
            if (testHitbox.getCollisionResult(tileBox).isColliding) {
               return false;
            }
         }
      }
   }

   // make sure it is kinda close to a wall

   {
      const WALL_CHECK_RANGE = 44;

      const minSubtileX = clampToSubtileBoardDimensions(Math.floor((position.x - WALL_CHECK_RANGE) / Settings.SUBTILE_SIZE));
      const maxSubtileX = clampToSubtileBoardDimensions(Math.floor((position.x + WALL_CHECK_RANGE) / Settings.SUBTILE_SIZE));
      const minSubtileY = clampToSubtileBoardDimensions(Math.floor((position.y - WALL_CHECK_RANGE) / Settings.SUBTILE_SIZE));
      const maxSubtileY = clampToSubtileBoardDimensions(Math.floor((position.y + WALL_CHECK_RANGE) / Settings.SUBTILE_SIZE));

      const testHitbox = new CircularBox(position.copy(), new Point(0, 0), 0, WALL_CHECK_RANGE);
      
      let isNearWall = false;
      for (let subtileX = minSubtileX; subtileX <= maxSubtileX; subtileX++) {
         for (let subtileY = minSubtileY; subtileY <= maxSubtileY; subtileY++) {
            const subtileIndex = getSubtileIndex(subtileX, subtileY);
            if (layer.subtileIsWall(subtileIndex)) {
               // @Speed
               const position = new Point((subtileX + 0.5) * Settings.SUBTILE_SIZE, (subtileY + 0.5) * Settings.SUBTILE_SIZE);
               const tileBox = new RectangularBox(position, new Point(0, 0), 0, Settings.SUBTILE_SIZE, Settings.SUBTILE_SIZE);
               if (testHitbox.getCollisionResult(tileBox).isColliding) {
                  isNearWall = true;
               }
            }
         }
      }

      if (!isNearWall) {
         return false;
      }
   }

   // make sure the hiberation place isn't occupied

   const ENTITY_OCCUPATION_CHECK_RANGE = 60;
   {
      const nearbyEntities = getEntitiesInRange(layer, position.x, position.y, ENTITY_OCCUPATION_CHECK_RANGE);
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
   const nearbyEntities = getEntitiesInRange(layer, position.x, position.y, ENTITY_CHECK_RANGE);

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
   if (hibernateAI.hibernateTargetPosition === null && getEntityAgeTicks(dustflea) % Math.floor(Settings.TPS / 4) === 0) {
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
      }
   }
}