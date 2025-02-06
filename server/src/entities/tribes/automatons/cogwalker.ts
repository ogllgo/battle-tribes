import { createCogwalkerHitboxes } from "../../../../../shared/src/boxes/entity-hitbox-creation";
import { ServerComponentType } from "../../../../../shared/src/components";
import { EntityType } from "../../../../../shared/src/entities";
import { EntityConfig } from "../../../components";
import { AIAssignmentComponent } from "../../../components/AIAssignmentComponent";
import { AIHelperComponent } from "../../../components/AIHelperComponent";
import { CogwalkerComponent } from "../../../components/CogwalkerComponent";
import { HealthComponent } from "../../../components/HealthComponent";
import { InventoryComponent } from "../../../components/InventoryComponent";
import { InventoryUseComponent } from "../../../components/InventoryUseComponent";
import { PatrolAIComponent } from "../../../components/PatrolAIComponent";
import { PhysicsComponent } from "../../../components/PhysicsComponent";
import { StatusEffectComponent } from "../../../components/StatusEffectComponent";
import { TransformComponent } from "../../../components/TransformComponent";
import { TribeComponent } from "../../../components/TribeComponent";
import { TribeMemberComponent } from "../../../components/TribeMemberComponent";
import { TribesmanAIComponent } from "../../../components/TribesmanAIComponent";
import { addHumanoidInventories } from "../../../inventories";
import Tribe from "../../../Tribe";
import { generateCogwalkerName } from "../../../tribesman-names";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.tribe
   | ServerComponentType.tribeMember
   // @Hack @Temporary?
   | ServerComponentType.tribesmanAI
   | ServerComponentType.aiHelper
   | ServerComponentType.aiAssignment
   | ServerComponentType.patrolAI
   | ServerComponentType.inventory
   | ServerComponentType.inventoryUse
   | ServerComponentType.cogwalker;

export function createCogwalkerConfig(tribe: Tribe): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent(0);
   transformComponent.addHitboxes(createCogwalkerHitboxes(), null);
   
   const physicsComponent = new PhysicsComponent();
   physicsComponent.traction = 1.4;

   const healthComponent = new HealthComponent(25);

   const statusEffectComponent = new StatusEffectComponent(0);

   const tribeComponent = new TribeComponent(tribe);

   const tribeMemberComponent = new TribeMemberComponent(generateCogwalkerName(tribe));

   const tribesmanAIComponent = new TribesmanAIComponent();

   const aiHelperComponent = new AIHelperComponent(400);

   const aiAssignmentComponent = new AIAssignmentComponent();

   const patrolAIComponent = new PatrolAIComponent();

   const inventoryComponent = new InventoryComponent();

   const inventoryUseComponent = new InventoryUseComponent();

   addHumanoidInventories(inventoryComponent, inventoryUseComponent, EntityType.cogwalker);

   const cogwalkerComponent = new CogwalkerComponent();

   return {
      entityType: EntityType.cogwalker,
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
         [ServerComponentType.cogwalker]: cogwalkerComponent
      },
      lights: []
   };
}