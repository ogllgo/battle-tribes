import { COLLISION_BITS, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { ServerComponentType } from "battletribes-shared/components";
import { Entity, EntityType } from "battletribes-shared/entities";
import { Point } from "battletribes-shared/utils";
import { StatusEffect } from "battletribes-shared/status-effects";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import { PlantedComponent } from "../../components/PlantedComponent";
import { EntityConfig } from "../../components";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { TransformComponent } from "../../components/TransformComponent";
import { BerryBushPlantedComponent } from "../../components/BerryBushPlantedComponent";
   
type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.planted
   | ServerComponentType.berryBushPlanted;

export function createBerryBushPlantedConfig(planterBox: Entity): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent();
   const hitbox = createHitbox(new CircularBox(new Point(0, 0), 0, 28), 0.3, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addStaticHitbox(hitbox, null);
   transformComponent.collisionBit = COLLISION_BITS.plants;

   const healthComponent = new HealthComponent(10);

   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding);

   const plantedComponent = new PlantedComponent(planterBox);

   const berryBushPlantedComponent = new BerryBushPlantedComponent();
   
   return {
      entityType: EntityType.berryBushPlanted,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.planted]: plantedComponent,
         [ServerComponentType.berryBushPlanted]: berryBushPlantedComponent
      },
      lights: []
   };
}