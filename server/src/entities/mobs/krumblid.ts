import { COLLISION_BITS, DEFAULT_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { Entity, EntityType } from "battletribes-shared/entities";
import { Point, randInt, UtilVars } from "battletribes-shared/utils";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../../components";
import { HitboxCollisionType, HitboxFlag } from "battletribes-shared/boxes/boxes";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import WanderAI from "../../ai/WanderAI";
import { Biome } from "battletribes-shared/biomes";
import Layer from "../../Layer";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { PhysicsComponent } from "../../components/PhysicsComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { AIHelperComponent, AIType } from "../../components/AIHelperComponent";
import { EscapeAI } from "../../ai/EscapeAI";
import { FollowAI } from "../../ai/FollowAI";
import { KrumblidComponent } from "../../components/KrumblidComponent";
import { AttackingEntitiesComponent } from "../../components/AttackingEntitiesComponent";
import { Settings } from "../../../../shared/src/settings";
import { LootComponent, registerEntityLootOnDeath } from "../../components/LootComponent";
import { ItemType } from "../../../../shared/src/items/items";
import { createHitbox } from "../../hitboxes";
import { HungerComponent } from "../../components/HungerComponent";
import RectangularBox from "../../../../shared/src/boxes/RectangularBox";
import { moveEntityToPosition } from "../../ai-shared";
import { SandBallingAI } from "../../ai/SandBallingAI";

registerEntityLootOnDeath(EntityType.krumblid, [
   {
      itemType: ItemType.leather,
      getAmount: () => randInt(2, 3)
   }
]);

function wanderPositionIsValid(_entity: Entity, layer: Layer, x: number, y: number): boolean {
   const biome = layer.getBiomeAtPosition(x, y);
   return biome === Biome.desert || biome === Biome.desertOasis;
}

const move = (krumblid: Entity, acceleration: number, turnSpeed: number, x: number, y: number): void => {
   moveEntityToPosition(krumblid, x, y, acceleration, turnSpeed);
}

export function createKrumblidConfig(position: Point, angle: number): EntityConfig {
   const transformComponent = new TransformComponent();
   
   const bodyHitbox = createHitbox(transformComponent, null, new CircularBox(position, new Point(0, 0), angle, 24), 0.75, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_COLLISION_MASK & ~COLLISION_BITS.cactus, [HitboxFlag.KRUMBLID_BODY]);
   addHitboxToTransformComponent(transformComponent, bodyHitbox);
   
   // Mandibles
   for (let i = 0; i < 2; i++) {
      const sideIsFlipped = i === 1;
      
      const offset = new Point(12, 27);
      const position = bodyHitbox.box.position.copy();
      position.add(offset);
      const mandibleHitbox = createHitbox(transformComponent, bodyHitbox, new RectangularBox(position, offset, Math.PI * 0.1, 12, 16), 0.1, HitboxCollisionType.soft, COLLISION_BITS.default, DEFAULT_COLLISION_MASK & ~COLLISION_BITS.cactus, [HitboxFlag.KRUMBLID_MANDIBLE]);
      mandibleHitbox.box.flipX = sideIsFlipped;
      // @Hack
      mandibleHitbox.box.totalFlipXMultiplier = sideIsFlipped ? -1 : 1;
      addHitboxToTransformComponent(transformComponent, mandibleHitbox);
   }
   
   const physicsComponent = new PhysicsComponent();
   
   const healthComponent = new HealthComponent(15);
   
   const statusEffectComponent = new StatusEffectComponent(0);

   const aiHelperComponent = new AIHelperComponent(bodyHitbox, 224, move);
   aiHelperComponent.ais[AIType.wander] = new WanderAI(200, 2 * Math.PI, 0.25, wanderPositionIsValid);
   aiHelperComponent.ais[AIType.escape] = new EscapeAI(700, 2 * Math.PI);
   aiHelperComponent.ais[AIType.follow] = new FollowAI(8 * Settings.TPS, 16 * Settings.TPS, 0.05, 34);
   aiHelperComponent.ais[AIType.sandBalling] = new SandBallingAI(200, 2 * Math.PI);

   const attackingEntitiesComponent = new AttackingEntitiesComponent(5 * Settings.TPS);
   
   const lootComponent = new LootComponent();

   const hungerComponent = new HungerComponent(300, 1);
   
   const krumblidComponent = new KrumblidComponent();
   
   return {
      entityType: EntityType.krumblid,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.aiHelper]: aiHelperComponent,
         [ServerComponentType.attackingEntities]: attackingEntitiesComponent,
         [ServerComponentType.loot]: lootComponent,
         [ServerComponentType.hunger]: hungerComponent,
         [ServerComponentType.krumblid]: krumblidComponent
      },
      lights: []
   };
}