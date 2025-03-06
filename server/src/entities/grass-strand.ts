import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../components";
import { Colour, Point, randFloat, randInt } from "battletribes-shared/utils";
import { EntityType } from "battletribes-shared/entities";
import { DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import RectangularBox from "battletribes-shared/boxes/RectangularBox";
import { TransformComponent } from "../components/TransformComponent";
import { LayeredRodComponent } from "../components/LayeredRodComponent";
import { createHitbox } from "../hitboxes";
   
export function createGrassStrandConfig(position: Point, rotation: number): EntityConfig {
   const transformComponent = new TransformComponent(0);
   const hitbox = createHitbox(transformComponent, null, new RectangularBox(position, new Point(0, 0), rotation, 4, 4), 0, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox, null);
   
   const colour: Colour = {
      r: randFloat(0.4, 0.5),
      g: randFloat(0.83, 0.95),
      b: randFloat(0.2, 0.3),
      a: 1
   };
   const layeredRodComponent = new LayeredRodComponent(randInt(2, 5), colour);
   
   return {
      entityType: EntityType.grassStrand,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.layeredRod]: layeredRodComponent
      },
      lights: []
   };
}