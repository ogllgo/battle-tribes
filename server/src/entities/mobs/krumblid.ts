import { DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { Entity, EntityType } from "battletribes-shared/entities";
import { Point, randInt } from "battletribes-shared/utils";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../../components";
import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import WanderAI from "../../ai/WanderAI";
import { Biome } from "battletribes-shared/biomes";
import Layer from "../../Layer";
import { TransformComponent } from "../../components/TransformComponent";
import { PhysicsComponent } from "../../components/PhysicsComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { AIHelperComponent, AIType } from "../../components/AIHelperComponent";
import { EscapeAIComponent } from "../../components/EscapeAIComponent";
import { FollowAIComponent } from "../../components/FollowAIComponent";
import { KrumblidComponent } from "../../components/KrumblidComponent";
import { AttackingEntitiesComponent } from "../../components/AttackingEntitiesComponent";
import { Settings } from "../../../../shared/src/settings";
import { LootComponent, registerEntityLootOnDeath } from "../../components/LootComponent";
import { ItemType } from "../../../../shared/src/items/items";
import { createHitbox } from "../../hitboxes";

export const enum KrumblidVars {
   MIN_FOLLOW_COOLDOWN = 7,
   MAX_FOLLOW_COOLDOWN = 9
}

registerEntityLootOnDeath(EntityType.krumblid, [
   {
      itemType: ItemType.leather,
      getAmount: () => randInt(2, 3)
   }
]);

function positionIsValidCallback(_entity: Entity, layer: Layer, x: number, y: number): boolean {
   return !layer.positionHasWall(x, y) && layer.getBiomeAtPosition(x, y) === Biome.desert;
}

export function createKrumblidConfig(position: Point, rotation: number): EntityConfig {
   const transformComponent = new TransformComponent(0);
   
   const hitbox = createHitbox(transformComponent, null, new CircularBox(position, new Point(0, 0), rotation, 24), 0.75, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox, null);
   
   const physicsComponent = new PhysicsComponent();
   
   const healthComponent = new HealthComponent(15);
   
   const statusEffectComponent = new StatusEffectComponent(0);

   const aiHelperComponent = new AIHelperComponent(hitbox, 224);
   aiHelperComponent.ais[AIType.wander] = new WanderAI(200, 2 * Math.PI, 0.25, positionIsValidCallback);

   const attackingEntitiesComponent = new AttackingEntitiesComponent(5 * Settings.TPS);
   
   const escapeAIComponent = new EscapeAIComponent(700, 2 * Math.PI);
   
   const followAIComponent = new FollowAIComponent(randInt(KrumblidVars.MIN_FOLLOW_COOLDOWN, KrumblidVars.MAX_FOLLOW_COOLDOWN), 0.3, 50);
   
   const lootComponent = new LootComponent();
   
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
         [ServerComponentType.escapeAI]: escapeAIComponent,
         [ServerComponentType.followAI]: followAIComponent,
         [ServerComponentType.loot]: lootComponent,
         [ServerComponentType.krumblid]: krumblidComponent
      },
      lights: []
   };
}