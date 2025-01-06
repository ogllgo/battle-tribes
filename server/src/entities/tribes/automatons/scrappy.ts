import { createHitbox, HitboxCollisionType } from "../../../../../shared/src/boxes/boxes";
import CircularBox from "../../../../../shared/src/boxes/CircularBox";
import { HitboxCollisionBit, DEFAULT_HITBOX_COLLISION_MASK } from "../../../../../shared/src/collision";
import { ServerComponentType } from "../../../../../shared/src/components";
import { EntityType } from "../../../../../shared/src/entities";
import { Point } from "../../../../../shared/src/utils";
import { EntityConfig } from "../../../components";
import { HealthComponent } from "../../../components/HealthComponent";
import { InventoryComponent } from "../../../components/InventoryComponent";
import { InventoryUseComponent } from "../../../components/InventoryUseComponent";
import { PhysicsComponent } from "../../../components/PhysicsComponent";
import { ScrappyComponent } from "../../../components/ScrappyComponent";
import { StatusEffectComponent } from "../../../components/StatusEffectComponent";
import { TransformComponent } from "../../../components/TransformComponent";
import { TribeComponent } from "../../../components/TribeComponent";
import { TribeMemberComponent } from "../../../components/TribeMemberComponent";
import Tribe from "../../../Tribe";
import { generateScrappyName } from "../../../tribesman-names";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.tribe
   | ServerComponentType.tribeMember
   | ServerComponentType.inventory
   | ServerComponentType.inventoryUse
   | ServerComponentType.scrappy;

export function createScrappyConfig(tribe: Tribe): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent();
   const hitbox = createHitbox(new CircularBox(new Point(0, 0), 0, 20), 0.8, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox, null);
   
   const physicsComponent = new PhysicsComponent();
   physicsComponent.traction = 1.4;

   const healthComponent = new HealthComponent(10);

   const statusEffectComponent = new StatusEffectComponent(0);

   const tribeComponent = new TribeComponent(tribe);

   const tribeMemberComponent = new TribeMemberComponent(generateScrappyName());

   const inventoryComponent = new InventoryComponent();

   const inventoryUseComponent = new InventoryUseComponent();

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
         [ServerComponentType.inventory]: inventoryComponent,
         [ServerComponentType.inventoryUse]: inventoryUseComponent,
         [ServerComponentType.scrappy]: scrappyComponent
      },
      lights: []
   };
}