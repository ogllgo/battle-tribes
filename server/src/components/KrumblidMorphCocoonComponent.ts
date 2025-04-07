import CircularBox from "../../../shared/src/boxes/CircularBox";
import { ServerComponentType } from "../../../shared/src/components";
import { Entity } from "../../../shared/src/entities";
import { Packet } from "../../../shared/src/packets";
import { createKrumblidConfig } from "../entities/mobs/krumblid";
import { createEntity } from "../Entity";
import { Hitbox } from "../hitboxes";
import { destroyEntity, getEntityAgeTicks, getEntityLayer, ticksToGameHours } from "../world";
import { ComponentArray } from "./ComponentArray";
import { TransformComponentArray } from "./TransformComponent";

export class KrumblidMorphCocoonComponent {
   public stage = 1;
}

export const KrumblidMorphCocoonComponentArray = new ComponentArray<KrumblidMorphCocoonComponent>(ServerComponentType.krumblidMorphCocoon, true, getDataLength, addDataToPacket);
KrumblidMorphCocoonComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};

const NUM_STAGES = 4;

const getStage = (ageTicks: number): number => {
   const ageHours = ticksToGameHours(ageTicks);
   return 1 + Math.floor(ageHours / 12 * NUM_STAGES);
}

function onTick(cocoon: Entity): void {
   const krumblidMorphCocoonComponent = KrumblidMorphCocoonComponentArray.getComponent(cocoon);

   const ageTicks = getEntityAgeTicks(cocoon);
   const stage = getStage(ageTicks);
   if (stage > NUM_STAGES) {
      destroyEntity(cocoon);

      const transformComponent = TransformComponentArray.getComponent(cocoon);
      const hitbox = transformComponent.children[0] as Hitbox;
      
      const krumblidConfig = createKrumblidConfig(hitbox.box.position.copy(), hitbox.box.angle);
      createEntity(krumblidConfig, getEntityLayer(cocoon), 0);
   } else if (stage !== krumblidMorphCocoonComponent.stage) {
      krumblidMorphCocoonComponent.stage = stage;

      const transformComponent = TransformComponentArray.getComponent(cocoon);
      const hitbox = transformComponent.children[0] as Hitbox;
      (hitbox.box as CircularBox).radius += 4;
      transformComponent.isDirty = true;
   }
}

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const krumblidMorphCocoonComponent = KrumblidMorphCocoonComponentArray.getComponent(entity);
   packet.addNumber(krumblidMorphCocoonComponent.stage);
}