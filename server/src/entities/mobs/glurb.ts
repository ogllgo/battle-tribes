import { ServerComponentType } from "battletribes-shared/components";
import { assert, Point, randInt } from "battletribes-shared/utils";
import { EntityType } from "battletribes-shared/entities";
import { DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { createHitbox, Hitbox, HitboxCollisionType, HitboxFlag } from "battletribes-shared/boxes/boxes";
import { PhysicsComponent } from "../../components/PhysicsComponent";
import { GlurbComponent } from "../../components/GlurbComponent";
import { StatusEffect } from "../../../../shared/src/status-effects";
import { EntityConfig, LightCreationInfo } from "../../components";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { TransformComponent } from "../../components/TransformComponent";
import CircularBox from "../../../../shared/src/boxes/CircularBox";
import { AIHelperComponent } from "../../components/AIHelperComponent";
import { createLight } from "../../light-levels";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.aiHelper
   | ServerComponentType.glurb;
   
export function createGlurbConfig(): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent();

   const lights = new Array<LightCreationInfo>();
   
   let lastHitbox: Hitbox | undefined;
   const numSegments = randInt(3, 5);
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
      
      const offsetY = i * -30;
      
      const hitbox = createHitbox(new CircularBox(new Point(0, offsetY), 0, radius), mass, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, flags);

      if (i === 0) {
         transformComponent.addStaticHitbox(hitbox, null);
      } else {
         assert(typeof lastHitbox !== "undefined");
         transformComponent.addTetheredHitbox(hitbox, lastHitbox, 30, 15, 0.5, null)
      }

      let lightIntensity: number;
      let lightRadius: number;
      if (i === 0) {
         // Head segment
         lightIntensity = 0.35;
         lightRadius = 6;
      } else if (i < numSegments - 1) {
         // Middle segment
         lightIntensity = 0.4;
         lightRadius = 8;
      } else {
         // Tail segment
         lightIntensity = 0.3;
         lightRadius = 4;
      }
      
      const light = createLight(new Point(0, 0), lightIntensity, 0.8, lightRadius, 1, 0.2, 0.9);
      lights.push({
         light: light,
         attachedHitbox: hitbox
      });

      lastHitbox = hitbox;
   }

   const physicsComponent = new PhysicsComponent();
   
   const healthComponent = new HealthComponent(10);

   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.burning);

   const aiHelperComponent = new AIHelperComponent(280);

   const glurbComponent = new GlurbComponent();
   
   return {
      entityType: EntityType.glurb,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.aiHelper]: aiHelperComponent,
         [ServerComponentType.glurb]: glurbComponent
      },
      lights: lights
   };
}