import { DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { EntityType, Entity } from "battletribes-shared/entities";
import { Point } from "battletribes-shared/utils";
import { Settings } from "battletribes-shared/settings";
import { HealthComponent } from "../../components/HealthComponent";
import { YetiComponent, YetiComponentArray } from "../../components/YetiComponent";
import Layer, { getTileIndexIncludingEdges } from "../../Layer";
import { PhysicsComponent } from "../../components/PhysicsComponent";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../../components";
import { TransformComponent } from "../../components/TransformComponent";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import WanderAI from "../../ai/WanderAI";
import { AIHelperComponent, AIType } from "../../components/AIHelperComponent";
import { Biome } from "battletribes-shared/biomes";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.aiHelper
   | ServerComponentType.yeti;

export const YETI_SNOW_THROW_COOLDOWN = 7;

export enum SnowThrowStage {
   windup,
   hold,
   return
}

function positionIsValidCallback(entity: Entity, layer: Layer, x: number, y: number): boolean {
   const tileX = Math.floor(x / Settings.TILE_SIZE);
   const tileY = Math.floor(y / Settings.TILE_SIZE);
   const tileIndex = getTileIndexIncludingEdges(tileX, tileY);

   const yetiComponent = YetiComponentArray.getComponent(entity);
   return !layer.positionHasWall(x, y) && layer.getBiomeAtPosition(x, y) === Biome.tundra && yetiComponent.territory.includes(tileIndex);
}

export function createYetiConfig(): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent();
   const hitbox = createHitbox(new CircularBox(new Point(0, 0), 0, 64), 3, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox, null);
   
   const physicsComponent = new PhysicsComponent();
   
   const healthComponent = new HealthComponent(100);
   
   const statusEffectComponent = new StatusEffectComponent(0);
   
   const aiHelperComponent = new AIHelperComponent(500);
   aiHelperComponent.ais[AIType.wander] = new WanderAI(100, Math.PI * 1.5, 0.6, positionIsValidCallback);
   
   // @Incomplete?
   const yetiComponent = new YetiComponent([]);
   
   return {
      entityType: EntityType.yeti,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.aiHelper]: aiHelperComponent,
         [ServerComponentType.yeti]: yetiComponent
      }
   };
}