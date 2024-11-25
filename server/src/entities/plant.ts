import { COLLISION_BITS, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { PlanterBoxPlant, ServerComponentType } from "battletribes-shared/components";
import { Entity, EntityType } from "battletribes-shared/entities";
import { Point } from "battletribes-shared/utils";
import { PlantComponent } from "../components/PlantComponent";
import { EntityConfig } from "../components";
import { StatusEffect } from "battletribes-shared/status-effects";
import { TransformComponent } from "../components/TransformComponent";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import { HealthComponent } from "../components/HealthComponent";
import { StatusEffectComponent } from "../components/StatusEffectComponent";
   
type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.plant;

const PLANT_HEALTHS: Record<PlanterBoxPlant, number> = {
   [PlanterBoxPlant.tree]: 10,
   [PlanterBoxPlant.berryBush]: 10,
   [PlanterBoxPlant.iceSpikes]: 5,
};

export function createPlantConfig(plantType: PlanterBoxPlant, planterBox: Entity): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent();
   const hitbox = createHitbox(new CircularBox(new Point(0, 0), 0, 28), 0.3, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox, null);
   transformComponent.collisionBit = COLLISION_BITS.plants;

   const healthComponent = new HealthComponent(PLANT_HEALTHS[plantType]);

   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding);

   const plantComponent = new PlantComponent(plantType, planterBox);
   
   return {
      entityType: EntityType.plant,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.plant]: plantComponent
      }
   };
}