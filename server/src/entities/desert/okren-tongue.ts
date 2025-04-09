import { ServerComponentType } from "../../../../shared/src/components";
import { EntityType } from "../../../../shared/src/entities";
import { Point } from "../../../../shared/src/utils";
import { EntityConfig } from "../../components";
import { HealthComponent } from "../../components/HealthComponent";
import { OkrenTongueComponent } from "../../components/OkrenTongueComponent";
import { PhysicsComponent } from "../../components/PhysicsComponent";
import { TransformComponent } from "../../components/TransformComponent";
import { Hitbox, HitboxAngularTether } from "../../hitboxes";
import { createOkrenTongueTipConfig } from "./okren-tongue-tip";

export function createOkrenTongueConfig(position: Point, angle: number, okrenHitbox: Hitbox): EntityConfig {
   const transformComponent = new TransformComponent();
      
   const physicsComponent = new PhysicsComponent();
   
   const healthComponent = new HealthComponent(99);

   const okrenTongueComponent = new OkrenTongueComponent();
   
   const tongueTipConfig = createOkrenTongueTipConfig(position, angle);

   // Restrict the new base entity to match the direction of the okren
   const tongueTipHitbox = tongueTipConfig.components[ServerComponentType.transform]!.children[0] as Hitbox;
   // @Copynpaste
   const angularTether: HitboxAngularTether = {
      originHitbox: okrenHitbox,
      springConstant: 1,
      angularDamping: 0.5,
      padding: 0
   };
   tongueTipHitbox.angularTethers.push(angularTether);
   
   return {
      entityType: EntityType.okrenTongue,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.okrenTongue]: okrenTongueComponent
      },
      lights: [],
      childConfigs: [tongueTipConfig]
   };
}