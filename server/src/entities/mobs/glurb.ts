import { ServerComponentType } from "battletribes-shared/components";
import { Point, randInt } from "battletribes-shared/utils";
import { EntityType } from "battletribes-shared/entities";
import { DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { createHitbox, HitboxCollisionType, HitboxFlag } from "battletribes-shared/boxes/boxes";
import { CollisionGroup } from "battletribes-shared/collision-groups";
import { PhysicsComponent } from "../../components/PhysicsComponent";
import { GlurbComponent } from "../../components/GlurbComponent";
import { StatusEffect } from "../../../../shared/src/status-effects";
import { EntityConfig } from "../../components";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { TransformComponent } from "../../components/TransformComponent";
import CircularBox from "../../../../shared/src/boxes/CircularBox";
import { addTetheredHitboxRestriction, TetheredHitboxComponent, TetheredHitboxRestriction } from "../../components/TetheredHitboxComponent";
import { AIHelperComponent } from "../../components/AIHelperComponent";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.tetheredHitbox
   | ServerComponentType.physics
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.aiHelper
   | ServerComponentType.glurb;
   
export function createGlurbConfig(): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent(CollisionGroup.default);
   const tetheredHitboxComponent = new TetheredHitboxComponent(15, 0.5);
   
   const numSegments = 5;
   // const numSegments = randInt(3, 5);
   for (let i = 0; i < numSegments; i++) {
      let radius: number;
      let flags: Array<HitboxFlag>;
      let mass: number;
      if (i === 0) {
         // Head segment
         radius = 24;
         flags = [HitboxFlag.GLURB_HEAD_SEGMENT];
         mass = 0.6;
      } else if (i < numSegments - 1) {
         // Middle segment
         radius = 28;
         flags = [];
         mass = 0.8;
      } else {
         // Tail segment
         radius = 20;
         flags = [HitboxFlag.GLURB_TAIL_SEGMENT];
         mass = 0.4;
      }
      
      const offsetY = i * -30 + numSegments * 30 / 2;
      
      const hitbox = createHitbox(new CircularBox(new Point(0, offsetY), 0, radius), mass, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, flags);
      transformComponent.addHitbox(hitbox, null);

      // @Hack
      const restriction: TetheredHitboxRestriction = {
         hitbox: hitbox,
         idealDistance: 30,
         velocityX: 0,
         velocityY: 0
      };
      addTetheredHitboxRestriction(tetheredHitboxComponent, restriction);
   }

   const physicsComponent = new PhysicsComponent();
   
   const healthComponent = new HealthComponent(5);

   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.burning);

   const aiHelperComponent = new AIHelperComponent(280);

   const glurbComponent = new GlurbComponent();
   
   return {
      entityType: EntityType.glurb,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.tetheredHitbox]: tetheredHitboxComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.aiHelper]: aiHelperComponent,
         [ServerComponentType.glurb]: glurbComponent
      }
   };
}