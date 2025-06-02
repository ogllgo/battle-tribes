import { ServerComponentType } from "battletribes-shared/components";
import { SnowThrowStage, YETI_SNOW_THROW_COOLDOWN } from "../entities/mobs/yeti";
import { ComponentArray } from "./ComponentArray";
import { DamageSource, Entity, EntityType, SnowballSize } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { Biome } from "battletribes-shared/biomes";
import { getAbsAngleDiff, getTileIndexIncludingEdges, getTileX, getTileY, Point, randFloat, randItem, TileIndex, tileIsInWorld, UtilVars } from "battletribes-shared/utils";
import { TransformComponentArray } from "./TransformComponent";
import { Packet } from "battletribes-shared/packets";
import { ItemType } from "battletribes-shared/items/items";
import { TribeType } from "battletribes-shared/tribes";
import { moveEntityToPosition } from "../ai-shared";
import { createSnowballConfig } from "../entities/snowball";
import { createEntity } from "../Entity";
import { AIHelperComponentArray } from "./AIHelperComponent";
import { HealthComponentArray, addLocalInvulnerabilityHash, canDamageEntity, hitEntity, healEntity } from "./HealthComponent";
import { ItemComponentArray } from "./ItemComponent";
import { TribeComponentArray } from "./TribeComponent";
import { destroyEntity, entityExists, getEntityAgeTicks, getEntityLayer, getEntityType } from "../world";
import { surfaceLayer } from "../layers";
import { AttackingEntitiesComponent, AttackingEntitiesComponentArray } from "./AttackingEntitiesComponent";
import { HitboxFlag } from "../../../shared/src/boxes/boxes";
import { AttackEffectiveness } from "../../../shared/src/entity-damage-types";
import { SnowballComponentArray } from "./SnowballComponent";
import { addSkillLearningProgress, TamingComponentArray } from "./TamingComponent";
import { applyStatusEffect } from "./StatusEffectComponent";
import { StatusEffect } from "../../../shared/src/status-effects";
import { TamingSkillID } from "../../../shared/src/taming";
import { StructureComponentArray } from "./StructureComponent";
import { mountCarrySlot, RideableComponentArray } from "./RideableComponent";
import { applyAbsoluteKnockback, applyKnockback, getHitboxTile, Hitbox, addHitboxVelocity, turnHitboxToAngle } from "../hitboxes";
import { entitiesAreColliding, CollisionVars } from "../collision-detection";

const enum Vars {
   SMALL_SNOWBALL_THROW_SPEED_MIN = 550,
   SMALL_SNOWBALL_THROW_SPEED_MAX = 650,
   LARGE_SNOWBALL_THROW_SPEED_MIN = 350,
   LARGE_SNOWBALL_THROW_SPEED_MAX = 450,
   SNOW_THROW_ARC = UtilVars.PI/5,
   SNOW_THROW_OFFSET = 64,
   SNOW_THROW_WINDUP_TIME = 1.25,
   SNOW_THROW_HOLD_TIME = 0.1,
   SNOW_THROW_RETURN_TIME = 0.6,
   
   TURN_SPEED = UtilVars.PI * 3/2,
   SLOW_TURN_SPEED = UtilVars.PI * 1.5/2,

   MEDIUM_ACCELERATION = 400,
   FAST_ACCELERATION = 700
}

const MIN_TERRITORY_SIZE = 200;
const MAX_TERRITORY_SIZE = 300;

/** Stores which tiles belong to which yetis' territories */
const yetiTerritoryTiles: Partial<Record<TileIndex, Entity>> = {};

export class YetiComponent {
   public readonly territory: ReadonlyArray<TileIndex>;

   public attackTarget: Entity = 0;
   public isThrowingSnow = false;
   public snowThrowStage: SnowThrowStage = SnowThrowStage.windup;
   public snowThrowAttackProgress = 1;
   public snowThrowCooldown = YETI_SNOW_THROW_COOLDOWN;
   public snowThrowHoldTimer = 0;

   constructor(territory: ReadonlyArray<TileIndex>) {
      this.territory = territory;
   }
}
export const YetiComponentArray = new ComponentArray<YetiComponent>(ServerComponentType.yeti, true, getDataLength, addDataToPacket);
YetiComponentArray.onJoin = onJoin;
YetiComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
},
YetiComponentArray.onRemove = onRemove;
YetiComponentArray.onHitboxCollision = onHitboxCollision;

const tileBelongsToYetiTerritory = (tileX: number, tileY: number): boolean => {
   const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
   return yetiTerritoryTiles.hasOwnProperty(tileIndex);
}

const tileIsValid = (territoryTiles: ReadonlyArray<TileIndex>, tileIndex: TileIndex): boolean => {
   const tileX = getTileX(tileIndex);
   const tileY = getTileY(tileIndex);
   
   // Make sure the tile is inside the board
   if (!tileIsInWorld(tileX, tileY)) {
      return false;
   }

   const biome = surfaceLayer.tileBiomes[tileIndex];
   return biome === Biome.tundra && !tileBelongsToYetiTerritory(tileX, tileY) && !territoryTiles.includes(tileIndex);
}

export function generateYetiTerritoryTiles(originTileX: number, originTileY: number): ReadonlyArray<TileIndex> {
   const territoryTiles = new Array<TileIndex>();
   // Tiles to expand the territory from
   const spreadTiles = new Array<TileIndex>();

   const originTileIndex = getTileIndexIncludingEdges(originTileX, originTileY);
   territoryTiles.push(originTileIndex);
   spreadTiles.push(originTileIndex);

   while (spreadTiles.length > 0) {
      // Pick a random tile to expand from
      const idx = Math.floor(Math.random() * spreadTiles.length);
      const tileIndex = spreadTiles[idx];

      const tileX = getTileX(tileIndex);
      const tileY = getTileY(tileIndex);

      const potentialTiles = [
         [tileX + 1, tileY],
         [tileX - 1, tileY],
         [tileX, tileY + 1],
         [tileX, tileY - 1]
      ];

      // Remove out of bounds tiles
      for (let i = 3; i >= 0; i--) {
         const tileCoordinates = potentialTiles[i];
         if (!tileIsInWorld(tileCoordinates[0], tileCoordinates[1])) {
            potentialTiles.splice(i, 1);
         }
      }

      let numValidTiles = 0;

      for (let i = potentialTiles.length - 1; i >= 0; i--) {
         const tileCoordinates = potentialTiles[i];
         const tileIndex = getTileIndexIncludingEdges(tileCoordinates[0], tileCoordinates[1]);
         if (tileIsValid(territoryTiles, tileIndex)) {
            numValidTiles++;
         } else {
            potentialTiles.splice(i, 1);
         }
      }

      if (numValidTiles === 0) {
         spreadTiles.splice(idx, 1);
      } else {
         // Pick a random tile to expand to
         const [tileX, tileY] = randItem(potentialTiles);
         const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
         territoryTiles.push(tileIndex);
         spreadTiles.push(tileIndex);
      }

      if (territoryTiles.length >= MAX_TERRITORY_SIZE) {
         break;
      }
   }

   return territoryTiles;
}

export function yetiTerritoryIsValid(territory: ReadonlyArray<TileIndex>): boolean {
   return territory.length >= MIN_TERRITORY_SIZE;
}

const removeYetiTerritory = (tileIndex: TileIndex): void => {
   delete yetiTerritoryTiles[tileIndex];
}

function onJoin(yeti: Entity): void {
   const yetiComponent = YetiComponentArray.getComponent(yeti);
   for (const tileIndex of yetiComponent.territory) {
      yetiTerritoryTiles[tileIndex] = yeti;
   }
}

const throwSnowball = (yeti: Entity, size: SnowballSize, throwAngle: number): void => {
   const transformComponent = TransformComponentArray.getComponent(yeti);
   const yetiHitbox = transformComponent.rootChildren[0] as Hitbox;
   
   const angle = throwAngle + randFloat(-Vars.SNOW_THROW_ARC, Vars.SNOW_THROW_ARC);
   
   const position = yetiHitbox.box.position.copy();
   position.x += Vars.SNOW_THROW_OFFSET * Math.sin(angle);
   position.y += Vars.SNOW_THROW_OFFSET * Math.cos(angle);

   let velocityMagnitude: number;
   if (size === SnowballSize.small) {
      velocityMagnitude = randFloat(Vars.SMALL_SNOWBALL_THROW_SPEED_MIN, Vars.SMALL_SNOWBALL_THROW_SPEED_MAX);
   } else {
      velocityMagnitude = randFloat(Vars.LARGE_SNOWBALL_THROW_SPEED_MIN, Vars.LARGE_SNOWBALL_THROW_SPEED_MAX);
   }

   const config = createSnowballConfig(position, 2 * Math.PI * Math.random(), yeti, size);

   const snowballHitbox = config.components[ServerComponentType.transform]!.children[0] as Hitbox;
   addHitboxVelocity(snowballHitbox, velocityMagnitude * Math.sin(angle), velocityMagnitude * Math.cos(angle));

   createEntity(config, getEntityLayer(yeti), 0);
}

const throwSnow = (yeti: Entity, target: Entity): void => {
   const transformComponent = TransformComponentArray.getComponent(yeti);
   const yetiHitbox = transformComponent.rootChildren[0] as Hitbox;
   
   const targetTransformComponent = TransformComponentArray.getComponent(target);
   // @Bug @Hack: Should instead pick from one of the visible hitboxes. There will be cases where the root hitbox isn't visible, but others are...
   const targetHitbox = targetTransformComponent.rootChildren[0] as Hitbox;
   
   const throwAngle = yetiHitbox.box.position.calculateAngleBetween(targetHitbox.box.position);

   // Large snowballs
   for (let i = 0; i < 2; i++) {
      throwSnowball(yeti, SnowballSize.large, throwAngle);
   }

   // Small snowballs
   for (let i = 0; i < 3; i++) {
      throwSnowball(yeti, SnowballSize.small, throwAngle);
   }

   // Kickback
   applyAbsoluteKnockback(yeti, yetiHitbox, 110, throwAngle + Math.PI);
}

const entityIsTargetted = (yeti: Entity, entity: Entity, attackingEntitiesComponent: AttackingEntitiesComponent, yetiComponent: YetiComponent): boolean => {
   const entityType = getEntityType(entity);

   // Don't chase entities without health or natural tundra resources or snowballs or frozen yetis who aren't attacking the yeti
   if (!HealthComponentArray.hasComponent(entity) || entityType === EntityType.iceSpikes || entityType === EntityType.snowball || (entityType === EntityType.frozenYeti && !attackingEntitiesComponent.attackingEntities.has(entity))) {
      return false;
   }
   
   // Don't chase frostlings which aren't attacking the yeti
   if ((entityType === EntityType.tribeWorker || entityType === EntityType.tribeWarrior || entityType === EntityType.player) && !attackingEntitiesComponent.attackingEntities.has(entity)) {
      const tribeComponent = TribeComponentArray.getComponent(entity);
      if (tribeComponent.tribe.tribeType === TribeType.frostlings) {
         return false;
      }
   }

   const entityTransformComponent = TransformComponentArray.getComponent(entity);
   // @Hack
   const hitbox = entityTransformComponent.children[0] as Hitbox;
   const entityTileIndex = getHitboxTile(hitbox);

   // Don't attack entities which aren't attacking the yeti and aren't encroaching on its territory
   if (!attackingEntitiesComponent.attackingEntities.has(entity) && !yetiComponent.territory.includes(entityTileIndex)) {
      return false;
   }

   // If tame, don't attack stuff belonging to the tame tribe
   if (TribeComponentArray.hasComponent(entity)) {
      const entityTribeComponent = TribeComponentArray.getComponent(entity);
      const tamingComponent = TamingComponentArray.getComponent(yeti);
      if (entityTribeComponent.tribe === tamingComponent.tameTribe) {
         return false;
      }
   }

   // @Hack: Don't attack structures place by frostlings. Ideally instead frostlings would just
   //    tame the yetis which have territory on tile they are going to place structures on.
   if (StructureComponentArray.hasComponent(entity)) {
      const tribeComponent = TribeComponentArray.getComponent(entity);
      if (tribeComponent.tribe.tribeType === TribeType.frostlings) {
         return false;
      }
   }

   return true;
}

// @Speed: hasComponent in here takes up about 1% of CPU time
const getYetiTarget = (yeti: Entity, visibleEntities: ReadonlyArray<Entity>): Entity | null => {
   const yetiComponent = YetiComponentArray.getComponent(yeti);
   const attackingEntitiesComponent = AttackingEntitiesComponentArray.getComponent(yeti);

   const attackingEntities = attackingEntitiesComponent.attackingEntities;
   
   let mostDamageDealt = 0;
   let target: Entity | null = null;
   for (let i = 0; i < visibleEntities.length; i++) {
      const entity = visibleEntities[i];
      if (!entityIsTargetted(yeti, entity, attackingEntitiesComponent, yetiComponent)) {
         continue;
      }
      
      const attackerInfo = attackingEntities.get(entity);
      if (typeof attackerInfo !== "undefined") {
         const damageDealt = attackerInfo.totalDamageFromEntity;
         if (damageDealt > mostDamageDealt) {
            mostDamageDealt = damageDealt;
            target = entity;
         }
      } else {
         // Attack targets which haven't dealt any damage (with the lowest priority)
         if (mostDamageDealt === 0) {
            target = entity;
         }
      }
   }

   return target;
}

// @Speed: there aren't that many yetis, and yet this takes like 1.5% of cpu time! get that down to like 0.1%
function onTick(yeti: Entity): void {
   const aiHelperComponent = AIHelperComponentArray.getComponent(yeti);
   const transformComponent = TransformComponentArray.getComponent(yeti);
   const yetiBodyHitbox = transformComponent.rootChildren[0] as Hitbox;

   const yetiComponent = YetiComponentArray.getComponent(yeti);

   const layer = getEntityLayer(yeti);
   const tileIndex = getHitboxTile(yetiBodyHitbox);
   if (layer.getTileBiome(tileIndex) !== Biome.tundra) {
      applyStatusEffect(yeti, StatusEffect.heatSickness, 2 * Settings.TPS);
   }
   
   // @INCOMPLETE: This used to rely on the acceleration of the carried entity, but that's gone now.
   // What will need to be done to return this to a functional state is to make all AI components report
   // what their current movement target is. (Use AIHelperComponent for now but add @Hack comment?)
   
   // // @Hack @Copynpaste
   // // When something is riding the cow, that entity controls the cow's movement
   // const rideableComponent = RideableComponentArray.getComponent(yeti);
   // const rider = rideableComponent.carrySlots[0].occupiedEntity;
   // // @Hack: the physics component check for the rider
   // if (entityExists(rider) && PhysicsComponentArray.hasComponent(rider)) {
   //    const riderPhysicsComponent = PhysicsComponentArray.getComponent(rider);
   //    const accelerationMagnitude = Math.sqrt(riderPhysicsComponent.acceleration.x * riderPhysicsComponent.acceleration.x + riderPhysicsComponent.acceleration.y * riderPhysicsComponent.acceleration.y);
   //    if (accelerationMagnitude > 0) {
   //       const normalisedAccelerationX = riderPhysicsComponent.acceleration.x / accelerationMagnitude;
   //       const normalisedAccelerationY = riderPhysicsComponent.acceleration.y / accelerationMagnitude;

   //       const targetX = yetiBodyHitbox.box.position.x + 400 * normalisedAccelerationX;
   //       const targetY = yetiBodyHitbox.box.position.y + 400 * normalisedAccelerationY;
   //       moveEntityToPosition(yeti, targetX, targetY, Vars.FAST_ACCELERATION, Vars.TURN_SPEED);
   //       return;
   //    }
   // }
   
   // Go to follow target if possible
   // @Copynpaste
   const tamingComponent = TamingComponentArray.getComponent(yeti);
   if (entityExists(tamingComponent.followTarget)) {
      const targetTransformComponent = TransformComponentArray.getComponent(tamingComponent.followTarget);
      const targetHitbox = targetTransformComponent.children[0] as Hitbox;
      moveEntityToPosition(yeti, targetHitbox.box.position.x, targetHitbox.box.position.y, Vars.MEDIUM_ACCELERATION, Vars.TURN_SPEED, 1);
      if (getEntityAgeTicks(yeti) % Settings.TPS === 0) {
         addSkillLearningProgress(tamingComponent, TamingSkillID.move, 1);
      }
      return;
   }
   
   // @Hack @Copynpaste
   // Pick up carry target
   if (entityExists(tamingComponent.carryTarget)) {
      const targetTransformComponent = TransformComponentArray.getComponent(tamingComponent.carryTarget);
      const targetHitbox = targetTransformComponent.children[0] as Hitbox;
      moveEntityToPosition(yeti, targetHitbox.box.position.x, targetHitbox.box.position.y, Vars.MEDIUM_ACCELERATION, Vars.TURN_SPEED, 1);

      // Force carry if colliding and head is looking at the carry target
      const targetDirection = yetiBodyHitbox.box.position.calculateAngleBetween(targetHitbox.box.position);
      if (getAbsAngleDiff(yetiBodyHitbox.box.angle, targetDirection) < 0.1 && entitiesAreColliding(yeti, tamingComponent.carryTarget) !== CollisionVars.NO_COLLISION) {
         const rideableComponent = RideableComponentArray.getComponent(yeti);
         const carrySlot = rideableComponent.carrySlots[0];
         mountCarrySlot(tamingComponent.carryTarget, yeti, carrySlot);
         tamingComponent.carryTarget = 0;
      }
      return;
   }

   if (yetiComponent.isThrowingSnow) {
      // If the target is dead or has run outside the yeti's vision range, cancel the attack
      if (!entityExists(yetiComponent.attackTarget) || !aiHelperComponent.visibleEntities.includes(yetiComponent.attackTarget)) {
         yetiComponent.snowThrowAttackProgress = 1;
         yetiComponent.attackTarget = 0;
         yetiComponent.isThrowingSnow = false;
      } else {
         const targetTransformComponent = TransformComponentArray.getComponent(yetiComponent.attackTarget);
         const targetHitbox = targetTransformComponent.children[0] as Hitbox;
         
         switch (yetiComponent.snowThrowStage) {
            case SnowThrowStage.windup: {
               yetiComponent.snowThrowAttackProgress -= Settings.I_TPS / Vars.SNOW_THROW_WINDUP_TIME;
               if (yetiComponent.snowThrowAttackProgress <= 0) {
                  throwSnow(yeti, yetiComponent.attackTarget!);
                  yetiComponent.snowThrowAttackProgress = 0;
                  yetiComponent.snowThrowCooldown = YETI_SNOW_THROW_COOLDOWN;
                  yetiComponent.snowThrowStage = SnowThrowStage.hold;
                  yetiComponent.snowThrowHoldTimer = 0;
               }

               const targetAngle = yetiBodyHitbox.box.position.calculateAngleBetween(targetHitbox.box.position);
               turnHitboxToAngle(yetiBodyHitbox, targetAngle, Vars.SLOW_TURN_SPEED, 0.5, false);
               return;
            }
            case SnowThrowStage.hold: {
               yetiComponent.snowThrowHoldTimer += Settings.I_TPS;
               if (yetiComponent.snowThrowHoldTimer >= Vars.SNOW_THROW_HOLD_TIME) {
                  yetiComponent.snowThrowStage = SnowThrowStage.return;
               }

               const targetAngle = yetiBodyHitbox.box.position.calculateAngleBetween(targetHitbox.box.position);
               turnHitboxToAngle(yetiBodyHitbox, targetAngle, Vars.SLOW_TURN_SPEED, 0.5, false);
               return;
            }
            case SnowThrowStage.return: {
               yetiComponent.snowThrowAttackProgress += Settings.I_TPS / Vars.SNOW_THROW_RETURN_TIME;
               if (yetiComponent.snowThrowAttackProgress >= 1) {
                  yetiComponent.snowThrowAttackProgress = 1;
                  yetiComponent.isThrowingSnow = false;
               }
            }
         }
      }
   } else if (yetiComponent.snowThrowCooldown === 0 && !yetiComponent.isThrowingSnow) {
      const target = getYetiTarget(yeti, aiHelperComponent.visibleEntities);
      if (target !== null) {
         yetiComponent.isThrowingSnow = true;
         yetiComponent.attackTarget = target;
         yetiComponent.snowThrowAttackProgress = 1;
         yetiComponent.snowThrowStage = SnowThrowStage.windup;
      }
   }

   yetiComponent.snowThrowCooldown -= Settings.I_TPS;
   if (yetiComponent.snowThrowCooldown < 0) {
      yetiComponent.snowThrowCooldown = 0;
   }

   // Chase AI
   const chaseTarget = getYetiTarget(yeti, aiHelperComponent.visibleEntities);
   if (chaseTarget !== null) {
      const targetTransformComponent = TransformComponentArray.getComponent(chaseTarget);
      const targetHitbox = targetTransformComponent.children[0] as Hitbox;
      moveEntityToPosition(yeti, targetHitbox.box.position.x, targetHitbox.box.position.y, 700, Vars.TURN_SPEED, 1);
      return;
   }

   // Eat raw beef
   {
      let minDist = Number.MAX_SAFE_INTEGER;
      let closestFoodItem: Entity | null = null;
      for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
         const entity = aiHelperComponent.visibleEntities[i];
         if (getEntityType(entity) !== EntityType.itemEntity) {
            continue;
         }

         const itemComponent = ItemComponentArray.getComponent(entity);
         if (itemComponent.itemType === ItemType.raw_beef || itemComponent.itemType === ItemType.raw_fish) {
            const entityTransformComponent = TransformComponentArray.getComponent(entity);
            const entityHitbox = entityTransformComponent.children[0] as Hitbox;
            
            const distance = yetiBodyHitbox.box.position.calculateDistanceBetween(entityHitbox.box.position);
            if (distance < minDist) {
               minDist = distance;
               closestFoodItem = entity;
            }
         }
      }
      if (closestFoodItem !== null) {
         const foodTransformComponent = TransformComponentArray.getComponent(closestFoodItem);
         const foodHitbox = foodTransformComponent.children[0] as Hitbox;
         
         moveEntityToPosition(yeti, foodHitbox.box.position.x, foodHitbox.box.position.y, 300, Vars.TURN_SPEED, 1);

         if (entitiesAreColliding(yeti, closestFoodItem) !== CollisionVars.NO_COLLISION) {
            healEntity(yeti, 3, yeti);
            destroyEntity(closestFoodItem);

            const tamingComponent = TamingComponentArray.getComponent(yeti);
            tamingComponent.foodEatenInTier++;
         }
         return;
      }
   }
   
   // Wander AI
   const wanderAI = aiHelperComponent.getWanderAI();
   wanderAI.update(yeti);
   if (wanderAI.targetPositionX !== -1) {
      const tileX = Math.floor(wanderAI.targetPositionX / Settings.TILE_SIZE);
      const tileY = Math.floor(wanderAI.targetPositionY / Settings.TILE_SIZE);
      if (getEntityLayer(yeti).getTileXYBiome(tileX, tileY) !== Biome.tundra) {
         throw new Error();
      }
      
      moveEntityToPosition(yeti, wanderAI.targetPositionX, wanderAI.targetPositionY, 300, 1.5 * Math.PI, 1);
   }
}

function onRemove(yeti: Entity): void {
   // Remove territory
   const yetiComponent = YetiComponentArray.getComponent(yeti);
   for (let i = 0; i < yetiComponent.territory.length; i++) {
      const tileIndex = yetiComponent.territory[i];
      removeYetiTerritory(tileIndex);
   }
}

function getDataLength(): number {
   return 2 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const yetiComponent = YetiComponentArray.getComponent(entity);
   packet.addBoolean(entityExists(yetiComponent.attackTarget));
   packet.padOffset(3);
   packet.addNumber(yetiComponent.snowThrowAttackProgress);
}

function onHitboxCollision(yeti: Entity, collidingEntity: Entity, affectedHitbox: Hitbox, collidingHitbox: Hitbox, collisionPoint: Point): void {
   // Body doesn't damage
   if (collidingHitbox.flags.includes(HitboxFlag.YETI_BODY)) {
      return;
   }
   
   const collidingEntityType = getEntityType(collidingEntity);
   
   // Don't damage ice spikes
   if (collidingEntityType === EntityType.iceSpikes) return;

   // Don't damage snowballs thrown by the yeti
   if (collidingEntityType === EntityType.snowball) {
      const snowballComponent = SnowballComponentArray.getComponent(collidingEntity);
      if (snowballComponent.yeti === yeti) {
         return;
      }
   }
   
   // Don't damage yetis which haven't damaged it
   const attackingEntitiesComponent = AttackingEntitiesComponentArray.getComponent(yeti);
   if ((collidingEntityType === EntityType.yeti || collidingEntityType === EntityType.frozenYeti) && !attackingEntitiesComponent.attackingEntities.has(collidingEntity)) {
      return;
   }

   const yetiComponent = YetiComponentArray.getComponent(yeti);
   if (!entityIsTargetted(yeti, collidingEntity, attackingEntitiesComponent, yetiComponent)) {
      return;
   }
   
   if (HealthComponentArray.hasComponent(collidingEntity)) {
      const healthComponent = HealthComponentArray.getComponent(collidingEntity);
      if (!canDamageEntity(healthComponent, "yeti")) {
         return;
      }

      const hitDirection = affectedHitbox.box.position.calculateAngleBetween(collidingHitbox.box.position);
      
      hitEntity(collidingEntity, collidingHitbox, yeti, 2, DamageSource.yeti, AttackEffectiveness.effective, collisionPoint, 0);
      applyKnockback(collidingEntity, collidingHitbox, 200, hitDirection);
      addLocalInvulnerabilityHash(collidingEntity, "yeti", 0.3);
   }
}