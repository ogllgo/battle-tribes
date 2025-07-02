import { DecorationType, ServerComponentType } from "battletribes-shared/components";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "battletribes-shared/collision";
import { Entity, EntityType } from "battletribes-shared/entities";
import { Point, randInt } from "battletribes-shared/utils";
import { Box, HitboxCollisionType, HitboxFlag } from "battletribes-shared/boxes/boxes";
import RectangularBox from "battletribes-shared/boxes/RectangularBox";
import { EntityConfig } from "../../components";
import { TransformComponent, addHitboxToTransformComponent } from "../../components/TransformComponent";
import { createHitbox } from "../../hitboxes";
import { HealthComponent } from "../../components/HealthComponent";
import CircularBox from "../../../../shared/src/boxes/CircularBox";
import { SnobeComponent } from "../../components/SnobeComponent";
import { PhysicsComponent } from "../../components/PhysicsComponent";
import { AIHelperComponent, AIType } from "../../components/AIHelperComponent";
import { accelerateEntityToPosition, turnToPosition } from "../../ai-shared";
import { EscapeAI } from "../../ai/EscapeAI";
import { AttackingEntitiesComponent } from "../../components/AttackingEntitiesComponent";
import { Settings } from "../../../../shared/src/settings";
import { tetherHitboxes } from "../../tethers";

const moveFunc = (krumblid: Entity, pos: Point, acceleration: number): void => {
   accelerateEntityToPosition(krumblid, pos, acceleration);
}

const turnFunc = (krumblid: Entity, pos: Point, turnSpeed: number, turnDamping: number): void => {
   turnToPosition(krumblid, pos, turnSpeed, turnDamping);
}

export function createSnobeConfig(position: Point, angle: number): EntityConfig {
   const transformComponent = new TransformComponent();

   const bodyHitbox = createHitbox(transformComponent, null, new CircularBox(position, new Point(0, 0), angle, 24), 0.65, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.SNOBE_BODY]);
   addHitboxToTransformComponent(transformComponent, bodyHitbox);
   
   const idealButtDistance = 20;
   const buttOffset = new Point(0, -idealButtDistance);
   const buttPosition = position.copy();
   buttPosition.add(buttOffset);
   const buttHitbox = createHitbox(transformComponent, null, new CircularBox(buttPosition, new Point(0, 0), 0, 12), 0.15, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.SNOBE_BUTT]);
   addHitboxToTransformComponent(transformComponent, buttHitbox);
   
   tetherHitboxes(buttHitbox, bodyHitbox, transformComponent, transformComponent, idealButtDistance, 25, 1);
   // @Hack: method of adding
   buttHitbox.angularTethers.push({
      originHitbox: bodyHitbox,
      idealAngle: Math.PI,
      springConstant: 18,
      damping: 0,
      padding: Math.PI * 0.06
   });

   // const buttButtOffset = new Point(0, -10);
   // const buttButtPosition = buttPosition.copy();
   // buttButtPosition.add(buttButtOffset);
   // const buttButtHitbox = createHitbox(transformComponent, buttHitbox, new CircularBox(buttButtPosition, buttButtOffset, 0, 8), 0.1, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.SNOBE_BUTT_BUTT]);
   // addHitboxToTransformComponent(transformComponent, buttButtHitbox);

   for (let i = 0; i < 2; i++) {
      const sideIsFlipped = i === 0;

      const earOffset = new Point(20, -8);
      const earPosition = position.copy();
      earPosition.add(earOffset);
      const earHitbox = createHitbox(transformComponent, bodyHitbox, new CircularBox(earPosition, earOffset, -Math.PI * 0.2, 8), 0.05, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.SNOBE_EAR]);
      earHitbox.box.flipX = sideIsFlipped;
      // @Hack
      earHitbox.box.totalFlipXMultiplier = sideIsFlipped ? -1 : 1;
      addHitboxToTransformComponent(transformComponent, earHitbox);
   }
   
   const physicsComponent = new PhysicsComponent();
   
   const healthComponent = new HealthComponent(10);
   
   const aiHelperComponent = new AIHelperComponent(bodyHitbox, 200, moveFunc, turnFunc);
   aiHelperComponent.ais[AIType.escape] = new EscapeAI(1600, 8 * Math.PI, 0.6, 5);

   const attackingEntitiesComponent = new AttackingEntitiesComponent(5 * Settings.TPS);
   
   const snobeComponent = new SnobeComponent();
   
   return {
      entityType: EntityType.snobe,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.aiHelper]: aiHelperComponent,
         [ServerComponentType.attackingEntities]: attackingEntitiesComponent,
         [ServerComponentType.snobe]: snobeComponent
      },
      lights: []
   };
}