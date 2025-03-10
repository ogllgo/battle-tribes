import { HitboxCollisionType, HitboxFlag } from "battletribes-shared/boxes/boxes";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import { DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { ServerComponentType } from "battletribes-shared/components";
import { Entity, EntityType } from "battletribes-shared/entities";
import { Point, TileIndex } from "battletribes-shared/utils";
import GuardianAI from "../../ai/GuardianAI";
import GuardianCrystalBurstAI from "../../ai/GuardianCrystalBurstAI";
import GuardianCrystalSlamAI from "../../ai/GuardianCrystalSlamAI";
import GuardianSpikyBallSummonAI from "../../ai/GuardianSpikyBallSummonAI";
import WanderAI from "../../ai/WanderAI";
import { EntityConfig } from "../../components";
import { AIHelperComponent, AIType } from "../../components/AIHelperComponent";
import { getGuardianLimbOrbitRadius, GuardianComponent, GuardianComponentArray } from "../../components/GuardianComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { PhysicsComponent } from "../../components/PhysicsComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import Layer from "../../Layer";
import { createHitbox } from "../../hitboxes";

function tileIsValidCallback(entity: Entity, _layer: Layer, tileIndex: TileIndex): boolean {
   const guardianComponent = GuardianComponentArray.getComponent(entity);
   return guardianComponent.homeTiles.includes(tileIndex);
}

export function createGuardianConfig(position: Point, rotation: number, homeTiles: ReadonlyArray<TileIndex>): EntityConfig {
   const transformComponent = new TransformComponent();

   // Head
   const headHitbox = createHitbox(transformComponent, null, new CircularBox(position, new Point(0, 0), rotation, 40), 1.5, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   addHitboxToTransformComponent(transformComponent, headHitbox);

   // Limbs
   const limbOrbitRadius = getGuardianLimbOrbitRadius();
   for (let i = 0; i < 2; i++) {
      const hitbox = createHitbox(transformComponent, headHitbox, new CircularBox(new Point(0, 0), new Point(limbOrbitRadius * (i === 0 ? 1 : -1), 0), 0, 14), 0.7, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, [HitboxFlag.GUARDIAN_LIMB_HITBOX, HitboxFlag.IGNORES_WALL_COLLISIONS]);
      addHitboxToTransformComponent(transformComponent, hitbox);
   }
   
   const physicsComponent = new PhysicsComponent();
   
   const healthComponent = new HealthComponent(60);
   
   const statusEffectComponent = new StatusEffectComponent(0);
   
   const aiHelperComponent = new AIHelperComponent(headHitbox, 300);
   aiHelperComponent.ais[AIType.wander] =                  new WanderAI(200, Math.PI * 0.5, 0.6, tileIsValidCallback),
   aiHelperComponent.ais[AIType.guardian] =                new GuardianAI(280, Math.PI * 0.5),
   aiHelperComponent.ais[AIType.guardianCrystalSlam] =     new GuardianCrystalSlamAI(200, Math.PI * 0.3),
   aiHelperComponent.ais[AIType.guardianCrystalBurst] =    new GuardianCrystalBurstAI(Math.PI * 0.5),
   aiHelperComponent.ais[AIType.guardianSpikyBallSummon] = new GuardianSpikyBallSummonAI(Math.PI * 0.5)
   
   const guardianComponent = new GuardianComponent(homeTiles);
   
   return {
      entityType: EntityType.guardian,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.aiHelper]: aiHelperComponent,
         [ServerComponentType.guardian]: guardianComponent
      },
      lights: []
   };
}