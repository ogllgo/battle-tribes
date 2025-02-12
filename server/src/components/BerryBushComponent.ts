import { ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";
import { Entity } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { Packet } from "battletribes-shared/packets";
import { registerDirtyEntity } from "../server/player-clients";
import { ItemType } from "../../../shared/src/items/items";
import { Point, positionIsInWorld } from "../../../shared/src/utils";
import { createItemEntityConfig } from "../entities/item-entity";
import { createEntity } from "../Entity";
import { getEntityLayer } from "../world";
import { TransformComponentArray } from "./TransformComponent";

const enum Vars {
   /** Number of seconds it takes for a berry bush to regrow one of its berries */
   BERRY_GROW_TIME = 30
}

export class BerryBushComponent {
   public numBerries = 0;
   public berryGrowTimer = 0;
}

export const BerryBushComponentArray = new ComponentArray<BerryBushComponent>(ServerComponentType.berryBush, true, getDataLength, addDataToPacket);
BerryBushComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};
BerryBushComponentArray.onTakeDamage = onTakeDamage;

function onTick(entity: Entity): void {
   const berryBushComponent = BerryBushComponentArray.getComponent(entity);
   if (berryBushComponent.numBerries >= 5) {
      return;
   }

   berryBushComponent.berryGrowTimer += Settings.I_TPS;
   if (berryBushComponent.berryGrowTimer >= Vars.BERRY_GROW_TIME) {
      // Grow a new berry
      berryBushComponent.berryGrowTimer = 0;
      berryBushComponent.numBerries++;
      registerDirtyEntity(entity);
   }
}

function getDataLength(): number {
   return 2 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const berryComponent = BerryBushComponentArray.getComponent(entity);

   packet.addNumber(berryComponent.numBerries);
}

export function dropBerryOverEntity(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   
   // Generate new spawn positions until we find one inside the board
   let position: Point;
   let spawnDirection: number;
   do {
      // @Speed: Garbage collection
      position = transformComponent.position.copy();

      spawnDirection = 2 * Math.PI * Math.random();
      const spawnOffset = Point.fromVectorForm(40, spawnDirection);

      position.add(spawnOffset);
   } while (!positionIsInWorld(position.x, position.y));

   const velocityDirectionOffset = (Math.random() - 0.5) * Math.PI * 0.15;

   const config = createItemEntityConfig(ItemType.berry, 1, null);
   config.components[ServerComponentType.transform].position.x = position.x;
   config.components[ServerComponentType.transform].position.y = position.y;
   config.components[ServerComponentType.transform].relativeRotation = 2 * Math.PI * Math.random();
   config.components[ServerComponentType.physics].externalVelocity.x = 40 * Math.sin(spawnDirection + velocityDirectionOffset);
   config.components[ServerComponentType.physics].externalVelocity.y = 40 * Math.cos(spawnDirection + velocityDirectionOffset);
   createEntity(config, getEntityLayer(entity), 0);
}

export function dropBerry(berryBush: Entity, multiplier: number): void {
   const berryBushComponent = BerryBushComponentArray.getComponent(berryBush);
   if (berryBushComponent.numBerries === 0) {
      return;
   }

   for (let i = 0; i < multiplier; i++) {
      dropBerryOverEntity(berryBush);
   }

   berryBushComponent.numBerries--;
   registerDirtyEntity(berryBush);
}

function onTakeDamage(entity: Entity): void {
   dropBerry(entity, 1);
}