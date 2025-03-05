import { HitboxCollisionType } from "../../../../../shared/src/boxes/boxes";
import CircularBox from "../../../../../shared/src/boxes/CircularBox";
import { HitboxCollisionBit, DEFAULT_HITBOX_COLLISION_MASK } from "../../../../../shared/src/collision";
import { ServerComponentType } from "../../../../../shared/src/components";
import { EntityType } from "../../../../../shared/src/entities";
import { Point } from "../../../../../shared/src/utils";
import { EntityConfig } from "../../../components";
import { AIAssignmentComponent } from "../../../components/AIAssignmentComponent";
import { AIHelperComponent } from "../../../components/AIHelperComponent";
import { HealthComponent } from "../../../components/HealthComponent";
import { InventoryComponent } from "../../../components/InventoryComponent";
import { InventoryUseComponent } from "../../../components/InventoryUseComponent";
import { PatrolAIComponent } from "../../../components/PatrolAIComponent";
import { PhysicsComponent } from "../../../components/PhysicsComponent";
import { ScrappyComponent } from "../../../components/ScrappyComponent";
import { StatusEffectComponent } from "../../../components/StatusEffectComponent";
import { TransformComponent } from "../../../components/TransformComponent";
import { TribeComponent } from "../../../components/TribeComponent";
import { TribeMemberComponent } from "../../../components/TribeMemberComponent";
import { TribesmanAIComponent } from "../../../components/TribesmanAIComponent";
import { createHitbox } from "../../../hitboxes";
import { addHumanoidInventories } from "../../../inventories";
import Tribe from "../../../Tribe";
import { generateScrappyName } from "../../../tribesman-names";

export function createScrappyConfig(position: Point, rotation: number, tribe: Tribe): EntityConfig {
   const transformComponent = new TransformComponent(0);

   const hitbox = createHitbox(transformComponent, null, new CircularBox(position, new Point(0, 0), rotation, 20), 0.75, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox, null);
   
   const physicsComponent = new PhysicsComponent();
   physicsComponent.traction = 1.4;

   const healthComponent = new HealthComponent(10);

   const statusEffectComponent = new StatusEffectComponent(0);

   const tribeComponent = new TribeComponent(tribe);

   const tribeMemberComponent = new TribeMemberComponent(generateScrappyName(tribe));

   const tribesmanAIComponent = new TribesmanAIComponent();
   
   const aiHelperComponent = new AIHelperComponent(transformComponent.hitboxes[0], 300);

   const aiAssignmentComponent = new AIAssignmentComponent();

   const patrolAIComponent = new PatrolAIComponent();

   const inventoryComponent = new InventoryComponent();

   const inventoryUseComponent = new InventoryUseComponent();

   addHumanoidInventories(inventoryComponent, inventoryUseComponent, EntityType.scrappy);

   const scrappyComponent = new ScrappyComponent();

   return {
      entityType: EntityType.scrappy,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.tribe]: tribeComponent,
         [ServerComponentType.tribeMember]: tribeMemberComponent,
         [ServerComponentType.tribesmanAI]: tribesmanAIComponent,
         [ServerComponentType.aiHelper]: aiHelperComponent,
         [ServerComponentType.aiAssignment]: aiAssignmentComponent,
         [ServerComponentType.patrolAI]: patrolAIComponent,
         [ServerComponentType.inventory]: inventoryComponent,
         [ServerComponentType.inventoryUse]: inventoryUseComponent,
         [ServerComponentType.scrappy]: scrappyComponent
      },
      lights: []
   };
}