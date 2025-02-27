import { DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { Entity, EntityType } from "battletribes-shared/entities";
import { Point } from "battletribes-shared/utils";
import { HealthComponent, HealthComponentArray } from "../../components/HealthComponent";
import { FishComponent, FishComponentArray } from "../../components/FishComponent";
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
import { AttackingEntitiesComponent } from "../../components/AttackingEntitiesComponent";
import { LootComponent, registerEntityLootOnDeath } from "../../components/LootComponent";
import { ItemType } from "../../../../shared/src/items/items";

const enum Vars {
   TILE_VALIDATION_PADDING = 20
}

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.aiHelper
   | ServerComponentType.attackingEntities
   | ServerComponentType.escapeAI
   | ServerComponentType.loot
   | ServerComponentType.fish;

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
   const transformComponent = new TransformComponent(0);
   const hitbox = createHitbox(new RectangularBox(null, new Point(0, 0), 28, 56, 0), 0.5, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox, null);

   const physicsComponent = new PhysicsComponent();

   const healthComponent = new HealthComponent(5);

   const statusEffectComponent = new StatusEffectComponent(0);

   const aiHelperComponent = new AIHelperComponent(200);
   aiHelperComponent.ais[AIType.wander] = new WanderAI(200, Math.PI, 0.6, tileIsValidCallback);

   const attackingEntitiesComponent = new AttackingEntitiesComponent(3 * Settings.TPS);
   
   const escapeAIComponent = new EscapeAIComponent(200, Math.PI * 2/3);

   const lootComponent = new LootComponent();
   
   const fishComponent = new FishComponent();

   return {
      entityType: EntityType.fish,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.aiHelper]: aiHelperComponent,
         [ServerComponentType.attackingEntities]: attackingEntitiesComponent,
         [ServerComponentType.escapeAI]: escapeAIComponent,
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