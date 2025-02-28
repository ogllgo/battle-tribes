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
   const transformComponent = new TransformComponent(0);

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
      
      const hitbox = createHitbox(new CircularBox(null, new Point(0, offsetY), 0, radius), mass, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, flags);

      transformComponent.addHitbox(hitbox, null);
      if (i > 0) {
         assert(typeof lastHitbox !== "undefined");
         transformComponent.addHitboxTether(hitbox, lastHitbox, 30, 15, 0.5);
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






/*


Entity = being


// PROS
- Would enable the drop-per-glurb-segment behaviours












// CONS
- Would require the introduction of multi-entities.
   - Multi-entities must be treated as one unit. 
- What if some multi-entity attacks something? The victim would need to know to attack all of the associated entities...
   - Fix: baseEntity (and change previous rootEntity to rootMount)
anything else better?


   - This could just be a special case for the glurb - the jungle monster can be a good ol singular entity



// ALTERNATIVES?
- heatlhcomponent per hitbox
   - register for entity or hitbox
   - problem: what if register for both entity and hitbox???


   any possible other uses?
      just to let each individual hitbox 
      are there any cases when hitboxes would need components other than health? 
         - storage component in automatons: inventory component should be per-hitbox
         - but that would also make it so that the whole automaton wouldn't get status-effected!
            - solution: just apply to the root entity
               - but that would be slow! Have to loop through the whole thing!!!!!
   
   this could be big for the automaton:
   - would enable each type of limb to have its own components.
      - if a health component is missing, and it isn't the root entity, it checks the root entity.


   enables much more complex entities.
   - could say in future video: That coding montage I showed actually layed the ground-work for it.

      what if we instead just let hitboxes have the events on them??
      - but they need data per


*/