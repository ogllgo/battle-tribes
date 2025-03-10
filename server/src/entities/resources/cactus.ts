import { COLLISION_BITS, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { CactusFlowerSize, EntityType } from "battletribes-shared/entities";
import { randInt, randFloat, Point } from "battletribes-shared/utils";
import { HealthComponent } from "../../components/HealthComponent";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../../components";
import { StatusEffect } from "battletribes-shared/status-effects";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { CactusComponent, CactusFlower } from "../../components/CactusComponent";
import { ItemType } from "../../../../shared/src/items/items";
import { LootComponent, registerEntityLootOnDeath } from "../../components/LootComponent";
import { createHitbox } from "../../hitboxes";

const RADIUS = 40;
/** Amount the hitbox is brought in. */
const HITBOX_PADDING = 3;

registerEntityLootOnDeath(EntityType.cactus, [
   {
      itemType: ItemType.cactus_spine,
      getAmount: () => randInt(2, 5)
   }
]);

export function createCactusConfig(position: Point, rotation: number): EntityConfig {
   const transformComponent = new TransformComponent();
   transformComponent.collisionBit = COLLISION_BITS.cactus;

   // Root hitbox
   const rootHitbox = createHitbox(transformComponent, null, new CircularBox(position, new Point(0, 0), rotation, RADIUS - HITBOX_PADDING), 1, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   addHitboxToTransformComponent(transformComponent, rootHitbox);

   const flowers = new Array<CactusFlower>();

   // Root hitbox flowers
   let numFlowers = 1;
   while (Math.random() < 0.35 && numFlowers < 5) {
      numFlowers++;
   }
   for (let i = 0; i < numFlowers; i++) {
      const flowerOffsetMagnitude = randFloat(10, 30);
      const flowerOffsetDirection = 2 * Math.PI / 8 * randInt(0, 7);

      flowers.push({
         parentHitboxLocalID: rootHitbox.localID,
         offsetX: flowerOffsetMagnitude * Math.sin(flowerOffsetDirection),
         offsetY: flowerOffsetMagnitude * Math.cos(flowerOffsetDirection),
         angle: 2 * Math.PI * Math.random(),
         flowerType: randInt(0, 4),
         size: randInt(0, 1),
      });
   }

   // Low chance for 0 limbs
   // High chance for 1 limb
   // Less chance for 2 limbs
   // Less chance for 3 limbs
   let numLimbs = 0;
   while (Math.random() < 4/5 - numLimbs/5 && numLimbs < 3) {
      numLimbs++;
   }
   
   // Limbs
   for (let i = 0; i < numLimbs; i++) {
      const box = new CircularBox(new Point(0, 0), Point.fromVectorForm(37, Math.random()), 0, 18);
      const hitbox = createHitbox(transformComponent, rootHitbox, box, 0.4, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
      addHitboxToTransformComponent(transformComponent, hitbox);

      if (Math.random() < 0.45) {
         const flowerOffsetMagnitude = randFloat(6, 10);
         const flowerOffsetDirection = 2 * Math.PI * Math.random();

         flowers.push({
            parentHitboxLocalID: hitbox.localID,
            offsetX: flowerOffsetMagnitude * Math.sin(flowerOffsetDirection),
            offsetY: flowerOffsetMagnitude * Math.cos(flowerOffsetDirection),
            angle: 2 * Math.PI * Math.random(),
            flowerType: randInt(0, 3),
            size: CactusFlowerSize.small
         });
      }
   }

   const healthComponent = new HealthComponent(15);

   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding);

   const lootComponent = new LootComponent();
   
   const cactusComponent = new CactusComponent(flowers);

   return {
      entityType: EntityType.cactus,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.loot]: lootComponent,
         [ServerComponentType.cactus]: cactusComponent
      },
      lights: []
   };
}