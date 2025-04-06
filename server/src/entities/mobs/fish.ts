import { DEFAULT_COLLISION_MASK, CollisionBit } from "battletribes-shared/collision";
import { Entity, EntityType, FishColour } from "battletribes-shared/entities";
import { angle, customTickIntervalHasPassed, Point, UtilVars } from "battletribes-shared/utils";
import { HealthComponent, HealthComponentArray } from "../../components/HealthComponent";
import { FishComponent, FishComponentArray } from "../../components/FishComponent";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../../components";
import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import RectangularBox from "battletribes-shared/boxes/RectangularBox";
import WanderAI from "../../ai/WanderAI";
import { AIHelperComponent, AIType } from "../../components/AIHelperComponent";
import { TileType } from "battletribes-shared/tiles";
import Layer from "../../Layer";
import { Settings } from "battletribes-shared/settings";
import { addHitboxToTransformComponent, TransformComponent, TransformComponentArray } from "../../components/TransformComponent";
import { PhysicsComponent } from "../../components/PhysicsComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { EscapeAI } from "../../ai/EscapeAI";
import { Biome } from "../../../../shared/src/biomes";
import { AttackingEntitiesComponent } from "../../components/AttackingEntitiesComponent";
import { LootComponent, registerEntityLootOnDeath } from "../../components/LootComponent";
import { ItemType } from "../../../../shared/src/items/items";
import { applyAcceleration, createHitbox, getHitboxTile, Hitbox, setHitboxIdealAngle } from "../../hitboxes";
import { getEntityLayer } from "../../world";

const enum Vars {
   TURN_SPEED = UtilVars.PI / 1.5,
   LUNGE_FORCE = 200,
   LUNGE_INTERVAL = 1
}

const enum Vars {
   TILE_VALIDATION_PADDING = 20
}

registerEntityLootOnDeath(EntityType.fish, [
   {
      itemType: ItemType.raw_fish,
      getAmount: () => 1
   }
]);

const positionIsOnlyNearWater = (layer: Layer, x: number, y: number): boolean => {
   const minTileX = Math.max(Math.floor((x - Vars.TILE_VALIDATION_PADDING) / Settings.TILE_SIZE), 0);
   const maxTileX = Math.min(Math.floor((x + Vars.TILE_VALIDATION_PADDING) / Settings.TILE_SIZE), Settings.BOARD_DIMENSIONS - 1);
   const minTileY = Math.max(Math.floor((y - Vars.TILE_VALIDATION_PADDING) / Settings.TILE_SIZE), 0);
   const maxTileY = Math.min(Math.floor((y + Vars.TILE_VALIDATION_PADDING) / Settings.TILE_SIZE), Settings.BOARD_DIMENSIONS - 1);

   for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
      for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
         if (layer.getTileXYBiome(tileX, tileY) !== Biome.river) {
            return false;
         }
      }
   }

   return true;
}

function wanderTargetIsValid(fish: Entity, layer: Layer, x: number, y: number): boolean {
   if (layer.getBiomeAtPosition(x, y) !== Biome.river) {
      return false;
   }

   if (!positionIsOnlyNearWater(layer, x, y)) {
      return false;
   }

   const transformComponent = TransformComponentArray.getComponent(fish);
   const fishHitbox = transformComponent.children[0] as Hitbox;
   
   if (!layer.tileRaytraceMatchesTileTypes(fishHitbox.box.position.x, fishHitbox.box.position.y, x, y, [TileType.water])) {
      return false;
   }

   return true;
}

const move = (fish: Entity, acceleration: number, turnSpeed: number, x: number, y: number): void => {
   const transformComponent = TransformComponentArray.getComponent(fish);
   const fishHitbox = transformComponent.children[0] as Hitbox;

   const direction = angle(x - fishHitbox.box.position.x, y - fishHitbox.box.position.y);

   const layer = getEntityLayer(fish);
   
   const tileIndex = getHitboxTile(fishHitbox);
   if (layer.tileTypes[tileIndex] === TileType.water) {
      // Swim on water
      const accelerationX = 40 * Math.sin(direction);
      const accelerationY = 40 * Math.cos(direction);
      applyAcceleration(fish, fishHitbox, accelerationX, accelerationY);

      setHitboxIdealAngle(fishHitbox, direction, Vars.TURN_SPEED, false);
   } else {
      // 
      // Lunge on land
      // 

      const fishComponent = FishComponentArray.getComponent(fish);
      if (customTickIntervalHasPassed(fishComponent.secondsOutOfWater * Settings.TPS, Vars.LUNGE_INTERVAL)) {
         
         fishHitbox.velocity.x += Vars.LUNGE_FORCE * Math.sin(direction);
         fishHitbox.velocity.y += Vars.LUNGE_FORCE * Math.cos(direction);
         if (direction !== fishHitbox.box.angle) {
            fishHitbox.box.angle = direction;
            transformComponent.isDirty = true;
         }
      }
   }
}

export function createFishConfig(position: Point, rotation: number, colour: FishColour): EntityConfig {
   const transformComponent = new TransformComponent();

   const hitbox = createHitbox(transformComponent, null, new RectangularBox(position, new Point(0, 0), rotation, 28, 56), 0.5, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   addHitboxToTransformComponent(transformComponent, hitbox);

   const physicsComponent = new PhysicsComponent();

   const healthComponent = new HealthComponent(5);

   const statusEffectComponent = new StatusEffectComponent(0);

   const aiHelperComponent = new AIHelperComponent(hitbox, 200, move);
   aiHelperComponent.ais[AIType.wander] = new WanderAI(200, Math.PI, 0.6, wanderTargetIsValid);
   aiHelperComponent.ais[AIType.escape] = new EscapeAI(200, Math.PI * 2/3);

   const attackingEntitiesComponent = new AttackingEntitiesComponent(3 * Settings.TPS);
   
   const lootComponent = new LootComponent();
   
   const fishComponent = new FishComponent(colour);

   return {
      entityType: EntityType.fish,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.aiHelper]: aiHelperComponent,
         [ServerComponentType.attackingEntities]: attackingEntitiesComponent,
         [ServerComponentType.loot]: lootComponent,
         [ServerComponentType.fish]: fishComponent
      },
      lights: []
   };
}

export function onFishLeaderHurt(fish: Entity, attackingEntity: Entity): void {
   if (HealthComponentArray.hasComponent(attackingEntity)) {
      const fishComponent = FishComponentArray.getComponent(fish);
      fishComponent.attackTargetID = attackingEntity;
   }
}