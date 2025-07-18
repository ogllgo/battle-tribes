import { ServerComponentType } from "../../../../shared/src/components";
import { Entity, EntityType } from "../../../../shared/src/entities";
import { Point, polarVec2 } from "../../../../shared/src/utils";
import { EntityConfig } from "../../components";
import { HealthComponent } from "../../components/HealthComponent";
import { OkrenTongueComponent } from "../../components/OkrenTongueComponent";
import { PhysicsComponent } from "../../components/PhysicsComponent";
import { TransformComponent } from "../../components/TransformComponent";
import { addHitboxVelocity, Hitbox, HitboxAngularTether } from "../../hitboxes";
import { createOkrenTongueTipConfig } from "./okren-tongue-tip";

export function createOkrenTongueConfig(position: Point, angle: number, okrenHitbox: Hitbox, target: Entity): EntityConfig {
   const transformComponent = new TransformComponent();
      
   const physicsComponent = new PhysicsComponent();
   
   const healthComponent = new HealthComponent(99);

   const okrenTongueComponent = new OkrenTongueComponent(target);
   
   const tongueTipConfig = createOkrenTongueTipConfig(position, angle);

   // Restrict the new base entity to match the direction of the okren
   const tongueTipHitbox = tongueTipConfig.components[ServerComponentType.transform]!.hitboxes[0];
   // @Copynpaste
   const angularTether: HitboxAngularTether = {
      originHitbox: okrenHitbox,
      idealAngle: 0,
      springConstant: 1/60,
      damping: 0.5,
      padding: 0,
      idealHitboxAngleOffset: 0
   };
   tongueTipHitbox.angularTethers.push(angularTether);
   
   // @Copynpaste
   // Apply some initial velocity
   addHitboxVelocity(tongueTipHitbox, polarVec2(200, okrenHitbox.box.angle));
   
   return {
      entityType: EntityType.okrenTongue,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.okrenTongue]: okrenTongueComponent
      },
      lights: [],
      childConfigs: [{
         entityConfig: tongueTipConfig,
         attachedHitbox: tongueTipHitbox,
         parentHitbox: okrenHitbox,
            isPartOfParent: true
      }]
   };
}