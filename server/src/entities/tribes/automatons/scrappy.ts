import { createScrappyHitboxes } from "../../../../../shared/src/boxes/entity-hitbox-creation";
import { ServerComponentType } from "../../../../../shared/src/components";
import { EntityType } from "../../../../../shared/src/entities";
import { EntityConfig } from "../../../components";
import { AIAssignmentComponent } from "../../../components/AIAssignmentComponent";
import { AIHelperComponent } from "../../../components/AIHelperComponent";
import { DamageBoxComponent } from "../../../components/DamageBoxComponent";
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
import { addHumanoidInventories } from "../../../inventories";
import Tribe from "../../../Tribe";
import { generateScrappyName } from "../../../tribesman-names";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.tribe
   | ServerComponentType.tribeMember
   | ServerComponentType.aiHelper
   | ServerComponentType.aiAssignment
   | ServerComponentType.patrolAI
   | ServerComponentType.inventory
   | ServerComponentType.inventoryUse
   | ServerComponentType.damageBox
   | ServerComponentType.scrappy;

export function createScrappyConfig(tribe: Tribe): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent();
   transformComponent.addHitboxes(createScrappyHitboxes(), null);
   
   const physicsComponent = new PhysicsComponent();
   physicsComponent.traction = 1.4;

   const healthComponent = new HealthComponent(10);

   const statusEffectComponent = new StatusEffectComponent(0);

   const tribeComponent = new TribeComponent(tribe);

   const tribeMemberComponent = new TribeMemberComponent(generateScrappyName(tribe));
   
   const aiHelperComponent = new AIHelperComponent(300);

   const aiAssignmentComponent = new AIAssignmentComponent();

   const patrolAIComponent = new PatrolAIComponent();

   const inventoryComponent = new InventoryComponent();

   const inventoryUseComponent = new InventoryUseComponent();

   addHumanoidInventories(inventoryComponent, inventoryUseComponent, EntityType.scrappy);

   const damageBoxComponent = new DamageBoxComponent();

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
         [ServerComponentType.aiHelper]: aiHelperComponent,
         [ServerComponentType.aiAssignment]: aiAssignmentComponent,
         [ServerComponentType.patrolAI]: patrolAIComponent,
         [ServerComponentType.inventory]: inventoryComponent,
         [ServerComponentType.inventoryUse]: inventoryUseComponent,
         [ServerComponentType.damageBox]: damageBoxComponent,
         [ServerComponentType.scrappy]: scrappyComponent
      },
      lights: []
   };
}