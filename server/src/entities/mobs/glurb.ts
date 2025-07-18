import { ServerComponentType } from "battletribes-shared/components";
import { Point, randAngle, randInt } from "battletribes-shared/utils";
import { EntityType } from "battletribes-shared/entities";
import { StatusEffect } from "../../../../shared/src/status-effects";
import { ChildConfigAttachInfo, EntityConfig } from "../../components";
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
import { GlurbComponent } from "../../components/GlurbComponent";

registerEntityTamingSpec(EntityType.glurb, {
   maxTamingTier: 1,
   skillNodes: [
      {
         skill: getTamingSkill(TamingSkillID.follow),
         x: -13,
         y: 10,
         parent: null,
         requiredTamingTier: 1
      },
      {
         skill: getTamingSkill(TamingSkillID.dulledPainReceptors),
         x: 13,
         y: 10,
         parent: null,
         requiredTamingTier: 1
      }
   ],
   foodItemType: ItemType.berry,
   tierFoodRequirements: {
      0: 0,
      1: 5
   }
});

export function createGlurbConfig(position: Point, angle: number): EntityConfig {
   // @Incomplete: Will always have same offset shape! Straight, going upwards!

   const transformComponent = new TransformComponent();
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.burning);

   const attackingEntitiesComponent = new AttackingEntitiesComponent(Settings.TPS * 6);

   const tamingComponent = new TamingComponent();

   const numSegments = randInt(3, 5);
   const glurbComponent = new GlurbComponent(numSegments);
   
   const childConfigs = new Array<ChildConfigAttachInfo>();

   let currentX = position.x;
   let currentY = position.y;
   
   let lastHitbox: Hitbox | undefined;
   let lastTransformComponent: TransformComponent | undefined;
   for (let i = 0; i < numSegments; i++) {
      currentY -= 30;
      
      let config: EntityConfig;
      if (i === 0) {
         config = createGlurbHeadSegmentConfig(new Point(currentX, currentY), randAngle());
      } else if (i < numSegments - 1) {
         config = createGlurbBodySegmentConfig(new Point(currentX, currentY), randAngle(), lastHitbox!, lastTransformComponent!);
      } else {
         config = createGlurbTailSegmentConfig(new Point(currentX, currentY), randAngle(), lastHitbox!, lastTransformComponent!);
      }
      
      const segmentTransformComponent = config.components[ServerComponentType.transform]!;
      const segmentHitbox = segmentTransformComponent.hitboxes[0];

      // @INCOMPLETE this will cause head to no worky
      if (typeof lastHitbox !== "undefined") {
         childConfigs.push({
            entityConfig: config,
            attachedHitbox: segmentHitbox,
            parentHitbox: lastHitbox,
            isPartOfParent: true
         });
      }

      lastHitbox = segmentHitbox;
      lastTransformComponent = segmentTransformComponent;
   }
   
   const rootEntityConfig: EntityConfig = {
      entityType: EntityType.glurb,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.attackingEntities]: attackingEntitiesComponent,
         [ServerComponentType.taming]: tamingComponent,
         [ServerComponentType.glurb]: glurbComponent
      },
      lights: [],
      childConfigs: childConfigs
   };

   return rootEntityConfig;
}