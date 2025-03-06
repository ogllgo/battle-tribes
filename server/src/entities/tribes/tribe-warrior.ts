import { DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { ScarInfo, ServerComponentType } from "battletribes-shared/components";
import { EntityType } from "battletribes-shared/entities";
import { TRIBE_INFO_RECORD, TribeType } from "battletribes-shared/tribes";
import { randInt, Point } from "battletribes-shared/utils";
import { TribesmanAIComponent } from "../../components/TribesmanAIComponent";
import { TribeComponent } from "../../components/TribeComponent";
import { EntityConfig } from "../../components";
import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import { HealthComponent } from "../../components/HealthComponent";
import { InventoryComponent } from "../../components/InventoryComponent";
import { InventoryUseComponent } from "../../components/InventoryUseComponent";
import { PhysicsComponent } from "../../components/PhysicsComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { TransformComponent } from "../../components/TransformComponent";
import { TribeMemberComponent } from "../../components/TribeMemberComponent";
import Tribe from "../../Tribe";
import { TribeWarriorComponent } from "../../components/TribeWarriorComponent";
import { AIHelperComponent } from "../../components/AIHelperComponent";
import { AIAssignmentComponent } from "../../components/AIAssignmentComponent";
import { PatrolAIComponent } from "../../components/PatrolAIComponent";
import { generateTribesmanName } from "../../tribesman-names";
import { TribesmanComponent } from "../../components/TribesmanComponent";
import { createHitbox } from "../../hitboxes";

const generateScars = (): ReadonlyArray<ScarInfo> => {
   let numScars = 1;
   while (Math.random() < 0.65 / numScars) {
      numScars++;
   }

   const scars = new Array<ScarInfo>();
   for (let i = 0; i < numScars; i++) {
      const offsetDirection = 2 * Math.PI * Math.random();
      const offsetMagnitude = 20 * Math.random();
      scars.push({
         offsetX: offsetMagnitude * Math.sin(offsetDirection),
         offsetY: offsetMagnitude * Math.cos(offsetDirection),
         rotation: Math.PI / 2 * randInt(0, 3),
         type: randInt(0, 1)
      });
   }
   return scars;
}

const getHitboxRadius = (tribeType: TribeType): number => {
   switch (tribeType) {
      case TribeType.barbarians:
      case TribeType.frostlings:
      case TribeType.goblins:
      case TribeType.plainspeople: {
         return 32;
      }
      case TribeType.dwarves: {
         return 28;
      }
   }
}

export function createTribeWarriorConfig(position: Point, rotation: number, tribe: Tribe): EntityConfig {
   const transformComponent = new TransformComponent(0);

   const hitbox = createHitbox(transformComponent, null, new CircularBox(position, new Point(0, 0), rotation, getHitboxRadius(tribe.tribeType)), 1.5, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox, null);
   
   const physicsComponent = new PhysicsComponent();
   physicsComponent.traction = 1.4;

   const tribeInfo = TRIBE_INFO_RECORD[tribe.tribeType];
   const healthComponent = new HealthComponent(tribeInfo.maxHealthPlayer);

   const statusEffectComponent = new StatusEffectComponent(0);

   const tribeComponent = new TribeComponent(tribe);

   const tribeMemberComponent = new TribeMemberComponent(generateTribesmanName(tribe.tribeType));

   const tribesmanComponent = new TribesmanComponent();
   
   const tribesmanAIComponent = new TribesmanAIComponent();

   const aiHelperComponent = new AIHelperComponent(transformComponent.hitboxes[0], 560);

   const aiAssignmentComponent = new AIAssignmentComponent();
   
   const patrolAIComponent = new PatrolAIComponent();
   
   const inventoryComponent = new InventoryComponent();

   const inventoryUseComponent = new InventoryUseComponent();

   const tribeWarriorComponent = new TribeWarriorComponent(generateScars());

   return {
      entityType: EntityType.tribeWarrior,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.tribe]: tribeComponent,
         [ServerComponentType.tribeMember]: tribeMemberComponent,
         [ServerComponentType.tribesman]: tribesmanComponent,
         [ServerComponentType.tribesmanAI]: tribesmanAIComponent,
         [ServerComponentType.aiHelper]: aiHelperComponent,
         [ServerComponentType.aiAssignment]: aiAssignmentComponent,
         [ServerComponentType.patrolAI]: patrolAIComponent,
         [ServerComponentType.inventory]: inventoryComponent,
         [ServerComponentType.inventoryUse]: inventoryUseComponent,
         [ServerComponentType.tribeWarrior]: tribeWarriorComponent
      },
      lights: []
   };
}