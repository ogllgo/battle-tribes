import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../components";
import { Colour, Point, randFloat, randInt } from "battletribes-shared/utils";
import { EntityType } from "battletribes-shared/entities";
import { DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import RectangularBox from "battletribes-shared/boxes/RectangularBox";
import { addHitboxToTransformComponent, TransformComponent } from "../components/TransformComponent";
import { LayeredRodComponent } from "../components/LayeredRodComponent";
import { createHitbox } from "../hitboxes";
import { TileType } from "../../../shared/src/tiles";
   
export function createGrassStrandConfig(position: Point, rotation: number, tileType: TileType): EntityConfig {
   const transformComponent = new TransformComponent();
   const hitbox = createHitbox(transformComponent, null, new RectangularBox(position, new Point(0, 0), rotation, 4, 4), 0, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   addHitboxToTransformComponent(transformComponent, hitbox);
   
   let numLayers: number;
   let colour: Colour;
   if (tileType === TileType.grass) {
      numLayers = randInt(2, 5);
      colour = {
         r: randFloat(0.4, 0.5),
         g: randFloat(0.83, 0.95),
         b: randFloat(0.2, 0.3),
         a: 1
      };
   } else {
      numLayers = randInt(2, 3);
      colour = {
         r: randFloat(230/255, 238/255),
         g: randFloat(220/255, 232/255),
         b: randFloat(156/255, 161/255),
         a: 1
      };
   }

   const layeredRodComponent = new LayeredRodComponent(numLayers, colour);
   
   return {
      entityType: EntityType.grassStrand,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.layeredRod]: layeredRodComponent
      },
      lights: []
   };
}