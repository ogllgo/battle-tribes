import { DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { Entity, EntityType } from "battletribes-shared/entities";
import { Point } from "battletribes-shared/utils";
import { HealthComponent, HealthComponentArray } from "../../components/HealthComponent";
import { FishComponent, FishComponentArray } from "../../components/FishComponent";
import { registerAttackingEntity } from "../../ai/escape-ai";
import { TribeMemberComponentArray } from "../../components/TribeMemberComponent";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../../components";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import RectangularBox from "battletribes-shared/boxes/RectangularBox";
import WanderAI from "../../ai/WanderAI";
import { AIHelperComponent, AIType } from "../../components/AIHelperComponent";
import { TileType } from "battletribes-shared/tiles";
import Layer from "../../Layer";
import { Settings } from "battletribes-shared/settings";
import { TransformComponent, TransformComponentArray } from "../../components/TransformComponent";
import { PhysicsComponent } from "../../components/PhysicsComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { EscapeAIComponent } from "../../components/EscapeAIComponent";
import { Biome } from "../../../../shared/src/biomes";

const enum Vars {
   TILE_VALIDATION_PADDING = 20
}

export const enum FishVars {
   VISION_RANGE = 200
}

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.aiHelper
   | ServerComponentType.escapeAI
   | ServerComponentType.fish;

const FISH_WIDTH = 7 * 4;
const FISH_HEIGHT = 14 * 4;

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

function tileIsValidCallback(entity: Entity, layer: Layer, x: number, y: number): boolean {
   if (!layer.positionHasWall(x, y) || layer.getBiomeAtPosition(x, y) !== Biome.river) {
      return false;
   }

   if (!positionIsOnlyNearWater(layer, x, y)) {
      return false;
   }

   const transformComponent = TransformComponentArray.getComponent(entity);
   if (!layer.tileRaytraceMatchesTileTypes(transformComponent.position.x, transformComponent.position.y, x, y, [TileType.water])) {
      return false;
   }

   return true;
}

export function createFishConfig(): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent();
   const hitbox = createHitbox(new RectangularBox(new Point(0, 0), FISH_WIDTH, FISH_HEIGHT, 0), 0.5, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox, null);

   const physicsComponent = new PhysicsComponent();

   const healthComponent = new HealthComponent(5);

   const statusEffectComponent = new StatusEffectComponent(0);

   const aiHelperComponent = new AIHelperComponent(FishVars.VISION_RANGE);
   aiHelperComponent.ais[AIType.wander] = new WanderAI(200, Math.PI, 0.6, tileIsValidCallback);

   const escapeAIComponent = new EscapeAIComponent();

   const fishComponent = new FishComponent();

   return {
      entityType: EntityType.fish,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.aiHelper]: aiHelperComponent,
         [ServerComponentType.escapeAI]: escapeAIComponent,
         [ServerComponentType.fish]: fishComponent
      }
   };
}

// @Cleanup: shouldn't be exported
export function unfollowLeader(fish: Entity, leader: Entity): void {
   const tribeMemberComponent = TribeMemberComponentArray.getComponent(leader);
   const idx = tribeMemberComponent.fishFollowerIDs.indexOf(fish);
   if (idx !== -1) {
      tribeMemberComponent.fishFollowerIDs.splice(idx, 1);
   }
}

export function onFishLeaderHurt(fish: Entity, attackingEntity: Entity): void {
   if (HealthComponentArray.hasComponent(attackingEntity)) {
      const fishComponent = FishComponentArray.getComponent(fish);
      fishComponent.attackTargetID = attackingEntity;
   }
}

export function onFishHurt(fish: Entity, attackingEntity: Entity): void {
   registerAttackingEntity(fish, attackingEntity);
}