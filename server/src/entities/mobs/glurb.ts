import { ServerComponentType } from "battletribes-shared/components";
import { Point, randInt } from "battletribes-shared/utils";
import { EntityType } from "battletribes-shared/entities";
import { StatusEffect } from "../../../../shared/src/status-effects";
import { EntityConfig } from "../../components";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { createGlurbHeadSegmentConfig } from "./glurb-head-segment";
import { createGlurbBodySegmentConfig } from "./glurb-body-segment";
import { Hitbox } from "../../hitboxes";
import { TamingComponent } from "../../components/TamingComponent";
import { registerEntityTamingSpec } from "../../taming-specs";
import { getTamingSkill, TamingSkillID } from "../../../../shared/src/taming";
import { ItemType } from "../../../../shared/src/items/items";
import { TransformComponent } from "../../components/TransformComponent";
import { Settings } from "../../../../shared/src/settings";
import { AttackingEntitiesComponent } from "../../components/AttackingEntitiesComponent";
import { createGlurbTailSegmentConfig } from "./glurb-tail-segment";

registerEntityTamingSpec(EntityType.glurb, {
   maxTamingTier: 1,
   skillNodes: [
      {
         skill: getTamingSkill(TamingSkillID.follow),
         x: -13,
         y: 10
      },
      {
         skill: getTamingSkill(TamingSkillID.dulledPainReceptors),
         x: 13,
         y: 10
      }
   ],
   foodItemType: ItemType.berry,
   tierFoodRequirements: {
      0: 0,
      1: 5
   }
});

export function createGlurbConfig(x: number, y: number, rotation: number): EntityConfig {
   // @Incomplete: Will always have same offset shape! Straight, going upwards!

   const transformComponent = new TransformComponent();
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.burning);

   const attackingEntitiesComponent = new AttackingEntitiesComponent(Settings.TPS * 6);

   const tamingComponent = new TamingComponent();

   const childConfigs = new Array<EntityConfig>();

   let currentX = x;
   let currentY = y;
   
   let lastHitbox: Hitbox | undefined;
   const numSegments = randInt(3, 5);
   for (let i = 0; i < numSegments; i++) {
      currentY -= 30;
      
      let config: EntityConfig;
      if (i === 0) {
         config = createGlurbHeadSegmentConfig(new Point(currentX, currentY), 2 * Math.PI * Math.random());
      } else if (i < numSegments - 1) {
         config = createGlurbBodySegmentConfig(new Point(currentX, currentY), 2 * Math.PI * Math.random(), lastHitbox!);
      } else {
         config = createGlurbTailSegmentConfig(new Point(currentX, currentY), 2 * Math.PI * Math.random(), lastHitbox!);
      }
      
      const segmentTransformComponent = config.components[ServerComponentType.transform]!;
      lastHitbox = segmentTransformComponent.children[0] as Hitbox;

      childConfigs.push(config);
   }
   
   const rootEntityConfig: EntityConfig = {
      entityType: EntityType.glurb,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.attackingEntities]: attackingEntitiesComponent,
         [ServerComponentType.taming]: tamingComponent
      },
      lights: [],
      childConfigs: childConfigs
   };

   return rootEntityConfig;
}













// @TEMPORARY: REMOVE THESE RAMBLINGS!




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

- multies can have components too


*/