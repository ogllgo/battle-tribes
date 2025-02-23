import { DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { EntityType, Entity } from "battletribes-shared/entities";
import { getTileIndexIncludingEdges, Point } from "battletribes-shared/utils";
import { Settings } from "battletribes-shared/settings";
import { HealthComponent } from "../../components/HealthComponent";
import { YetiComponent, YetiComponentArray } from "../../components/YetiComponent";
import Layer from "../../Layer";
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
import { AttackingEntitiesComponent } from "../../components/AttackingEntitiesComponent";
import { TamingComponent } from "../../components/TamingComponent";
import { TamingSkillID } from "../../../../shared/src/taming";
import { ItemType } from "../../../../shared/src/items/items";
import { registerEntityTamingSpec } from "../../taming-specs";
import { createCarrySlot, RideableComponent } from "../../components/RideableComponent";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.aiHelper
   | ServerComponentType.attackingEntities
   | ServerComponentType.rideable
   | ServerComponentType.taming
   | ServerComponentType.yeti;

export const YETI_SNOW_THROW_COOLDOWN = 7;

export enum SnowThrowStage {
   windup,
   hold,
   return
}

registerEntityTamingSpec(EntityType.yeti, {
   maxTamingTier: 3,
   skills: [TamingSkillID.follow, TamingSkillID.riding, TamingSkillID.move, TamingSkillID.carry, TamingSkillID.attack],
   foodItemType: ItemType.raw_beef,
   tierFoodRequirements: {
      0: 0,
      1: 10,
      2: 30,
      3: 70
   }
});

function positionIsValidCallback(entity: Entity, layer: Layer, x: number, y: number): boolean {
   const tileX = Math.floor(x / Settings.TILE_SIZE);
   const tileY = Math.floor(y / Settings.TILE_SIZE);
   const tileIndex = getTileIndexIncludingEdges(tileX, tileY);

   const yetiComponent = YetiComponentArray.getComponent(entity);
   return !layer.positionHasWall(x, y) && layer.getBiomeAtPosition(x, y) === Biome.tundra && yetiComponent.territory.includes(tileIndex);
}

export function createYetiConfig(): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent(0);
   const hitbox = createHitbox(new CircularBox(null, new Point(0, 0), 0, 64), 3, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox, null);
   
   const physicsComponent = new PhysicsComponent();
   
   const healthComponent = new HealthComponent(100);
   
   const statusEffectComponent = new StatusEffectComponent(0);
   
   const aiHelperComponent = new AIHelperComponent(500);
   aiHelperComponent.ais[AIType.wander] = new WanderAI(100, Math.PI * 1.5, 0.6, positionIsValidCallback);
   
   const attackingEntitiesComponent = new AttackingEntitiesComponent(5 * Settings.TPS);
   
   const rideableComponent = new RideableComponent();
   rideableComponent.carrySlots.push(createCarrySlot(0, 0, 64, 0));
   
   const tamingComponent = new TamingComponent();
   
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
         [ServerComponentType.attackingEntities]: attackingEntitiesComponent,
         [ServerComponentType.rideable]: rideableComponent,
         [ServerComponentType.taming]: tamingComponent,
         [ServerComponentType.yeti]: yetiComponent
      },
      lights: []
   };
}