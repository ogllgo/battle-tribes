import { Biome } from "../../../../shared/src/biomes";
import { createAbsolutePivotPoint } from "../../../../shared/src/boxes/BaseBox";
import { HitboxCollisionType, HitboxFlag } from "../../../../shared/src/boxes/boxes";
import CircularBox from "../../../../shared/src/boxes/CircularBox";
import RectangularBox from "../../../../shared/src/boxes/RectangularBox";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/src/collision";
import { ServerComponentType } from "../../../../shared/src/components";
import { Entity, EntityType } from "../../../../shared/src/entities";
import { ItemType } from "../../../../shared/src/items/items";
import { Point, randInt, rotatePoint } from "../../../../shared/src/utils";
import { accelerateEntityToPosition, turnToPosition } from "../../ai-shared";
import WanderAI from "../../ai/WanderAI";
import { ChildConfigAttachInfo, EntityConfig } from "../../components";
import { AIHelperComponent, AIType } from "../../components/AIHelperComponent";
import { EnergyStomachComponent } from "../../components/EnergyStomachComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { LootComponent, registerEntityLootOnDeath } from "../../components/LootComponent";
import { PhysicsComponent } from "../../components/PhysicsComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { TamingComponent } from "../../components/TamingComponent";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { TukmokComponent } from "../../components/TukmokComponent";
import { Hitbox } from "../../hitboxes";
import Layer from "../../Layer";
import { createTukmokSpurConfig } from "./tukmok-spur";
import { createTukmokTailConfig } from "./tukmok-tail";
import { createTukmokTrunkConfig } from "./tukmok-trunk";

registerEntityLootOnDeath(EntityType.tukmok, {
   itemType: ItemType.rawTukmokMeat,
   getAmount: () => randInt(25, 36)
});
registerEntityLootOnDeath(EntityType.tukmok, {
   itemType: ItemType.tukmokFurHide,
   getAmount: () => randInt(9, 15)
});
registerEntityLootOnDeath(EntityType.tukmok, {
   itemType: ItemType.ivoryTusk,
   getAmount: () => Math.random() < 2/3 ? 1 : 0
});

const moveFunc = (tukmok: Entity, pos: Point, acceleration: number): void => {
   accelerateEntityToPosition(tukmok, pos, acceleration);
}

const turnFunc = (tukmok: Entity, pos: Point, turnSpeed: number, damping: number): void => {
   turnToPosition(tukmok, pos, turnSpeed, damping);
}

function wanderPositionIsValid(_entity: Entity, layer: Layer, x: number, y: number): boolean {
   const biome = layer.getBiomeAtPosition(x, y);
   return biome === Biome.tundra;
}

export function createTukmokConfig(position: Point, angle: number): EntityConfig {
   const transformComponent = new TransformComponent();

   const bodyHitbox = new Hitbox(transformComponent, null, true, new RectangularBox(position, new Point(0, 0), angle, 104, 176), 8, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.TUKMOK_BODY]);
   addHitboxToTransformComponent(transformComponent, bodyHitbox);

   const headOffset = new Point(0, 108);
   const headPosition = position.copy();
   headPosition.add(rotatePoint(headOffset, angle));
   const headHitbox = new Hitbox(transformComponent, bodyHitbox, true, new CircularBox(headPosition, headOffset, 0, 28), 2.2, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.TUKMOK_HEAD]);
   headHitbox.box.pivot = createAbsolutePivotPoint(0, -20);
   addHitboxToTransformComponent(transformComponent, headHitbox);

   // 
   // Children
   // 

   const childConfigs = new Array<ChildConfigAttachInfo>();

   // Head spurs
   for (let i = 0; i < 2; i++) {
      const sideIsFlipped = i === 0;
      
      const offset = new Point(38, 58);
      const spurPosition = position.copy();
      // @Hack
      const _offset = new Point(offset.x * (sideIsFlipped ? -1 : 1), offset.y);
      spurPosition.add(rotatePoint(_offset, angle));
      const trunkConfig = createTukmokSpurConfig(spurPosition, 0, offset, HitboxFlag.TUKMOK_SPUR_HEAD, sideIsFlipped);
      childConfigs.push({
         entityConfig: trunkConfig,
         attachedHitbox: trunkConfig.components[ServerComponentType.transform]!.hitboxes[0],
         parentHitbox: headHitbox,
         isPartOfParent: true
      });
   }

   const shoulderSpurLeftFrontOffset = new Point(-58, 92);
   const shoulderSpurLeftFrontPosition = position.copy();
   shoulderSpurLeftFrontPosition.add(rotatePoint(shoulderSpurLeftFrontOffset, angle));
   const shoulderSpurLeftFrontConfig = createTukmokSpurConfig(shoulderSpurLeftFrontPosition, -Math.PI * 0.05, shoulderSpurLeftFrontOffset, HitboxFlag.TUKMOK_SPUR_SHOULDER_LEFT_FRONT, false);
   childConfigs.push({
      entityConfig: shoulderSpurLeftFrontConfig,
      attachedHitbox: shoulderSpurLeftFrontConfig.components[ServerComponentType.transform]!.hitboxes[0],
      parentHitbox: bodyHitbox,
      isPartOfParent: true
   });

   const shoulderSpurLeftBackOffset = new Point(-70, 76);
   const shoulderSpurLeftBackPosition = position.copy();
   shoulderSpurLeftBackPosition.add(rotatePoint(shoulderSpurLeftBackOffset, angle));
   const shoulderSpurLeftBackConfig = createTukmokSpurConfig(shoulderSpurLeftBackPosition, 0, shoulderSpurLeftBackOffset, HitboxFlag.TUKMOK_SPUR_SHOULDER_LEFT_BACK, false);
   childConfigs.push({
      entityConfig: shoulderSpurLeftBackConfig,
      attachedHitbox: shoulderSpurLeftBackConfig.components[ServerComponentType.transform]!.hitboxes[0],
      parentHitbox: bodyHitbox,
      isPartOfParent: true
   });

   const shoulderSpurRightFrontOffset = new Point(56, 80);
   const shoulderSpurRightFrontPosition = position.copy();
   shoulderSpurLeftFrontPosition.add(rotatePoint(shoulderSpurRightFrontOffset, angle));
   const shoulderSpurRightFrontConfig = createTukmokSpurConfig(shoulderSpurRightFrontPosition, -Math.PI * 0.04, shoulderSpurRightFrontOffset, HitboxFlag.TUKMOK_SPUR_SHOULDER_RIGHT_FRONT, false);
   childConfigs.push({
      entityConfig: shoulderSpurRightFrontConfig,
      attachedHitbox: shoulderSpurRightFrontConfig.components[ServerComponentType.transform]!.hitboxes[0],
      parentHitbox: bodyHitbox,
      isPartOfParent: true
   });

   const shoulderSpurRightBackOffset = new Point(68, 62);
   const shoulderSpurRightBackPosition = position.copy();
   shoulderSpurRightBackPosition.add(rotatePoint(shoulderSpurRightBackOffset, angle));
   const shoulderSpurRightBackConfig = createTukmokSpurConfig(shoulderSpurRightBackPosition, Math.PI * 0.08, shoulderSpurRightBackOffset, HitboxFlag.TUKMOK_SPUR_SHOULDER_RIGHT_BACK, false);
   childConfigs.push({
      entityConfig: shoulderSpurRightBackConfig,
      attachedHitbox: shoulderSpurRightBackConfig.components[ServerComponentType.transform]!.hitboxes[0],
      parentHitbox: bodyHitbox,
      isPartOfParent: true
   });

   const trunkOffset = new Point(0, 26);
   const trunkPosition = position.copy();
   trunkPosition.add(rotatePoint(trunkOffset, angle));
   const trunkConfig = createTukmokTrunkConfig(trunkPosition, angle, trunkOffset);
   childConfigs.push({
      entityConfig: trunkConfig,
      attachedHitbox: trunkConfig.components[ServerComponentType.transform]!.hitboxes[0],
      parentHitbox: headHitbox,
      isPartOfParent: true
   });

   const tailOffset = new Point(0, -100);
   const tailPosition = position.copy();
   tailPosition.add(rotatePoint(tailOffset, angle));
   const tailConfig = createTukmokTailConfig(tailPosition, angle, tailOffset);
   childConfigs.push({
      entityConfig: tailConfig,
      attachedHitbox: tailConfig.components[ServerComponentType.transform]!.hitboxes[0],
      parentHitbox: bodyHitbox,
      isPartOfParent: true
   });

   const physicsComponent = new PhysicsComponent();

   const healthComponent = new HealthComponent(250 / 250);
   
   const statusEffectComponent = new StatusEffectComponent(0);

   const aiHelperComponent = new AIHelperComponent(headHitbox, 560, moveFunc, turnFunc);
   aiHelperComponent.ais[AIType.wander] = new WanderAI(400, 1 * Math.PI, 0.6, 0.35, wanderPositionIsValid);
   
   const energyStomachComponent = new EnergyStomachComponent(800, 4, 5);
   
   const lootComponent = new LootComponent();

   const tamingComponent = new TamingComponent();

   const tukmokComponent = new TukmokComponent();
   
   return {
      entityType: EntityType.tukmok,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.aiHelper]: aiHelperComponent,
         [ServerComponentType.energyStomach]: energyStomachComponent,
         [ServerComponentType.loot]: lootComponent,
         [ServerComponentType.taming]: tamingComponent,
         [ServerComponentType.tukmok]: tukmokComponent
      },
      lights: [],
      childConfigs: childConfigs
   };
}