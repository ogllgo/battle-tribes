import { BlueprintType, BuildingMaterial, ServerComponentType } from "battletribes-shared/components";
import { Entity } from "battletribes-shared/entities";
import { ComponentArray } from "./ComponentArray";
import { getBlueprintEntityType } from "../entities/blueprint-entity";
import { StructureComponentArray } from "./StructureComponent";
import { calculateEntityPlaceInfo } from "battletribes-shared/structures";
import { TribeComponentArray } from "./TribeComponent";
import { BuildingMaterialComponentArray, upgradeMaterial } from "./BuildingMaterialComponent";
import { HutComponentArray } from "./HutComponent";
import { Item, ITEM_INFO_RECORD, HammerItemInfo, HammerItemType } from "battletribes-shared/items/items";
import { TransformComponentArray } from "./TransformComponent";
import { createDoorConfig } from "../entities/structures/door";
import { createEntity } from "../Entity";
import { createEmbrasureConfig } from "../entities/structures/embrasure";
import { createBallistaConfig } from "../entities/structures/ballista";
import { createSlingTurretConfig } from "../entities/structures/sling-turret";
import { createTunnelConfig } from "../entities/structures/tunnel";
import { createFenceGateConfig } from "../entities/structures/fence-gate";
import { createWarriorHutConfig } from "../entities/structures/warrior-hut";
import { Packet } from "battletribes-shared/packets";
import { destroyEntity, getEntityLayer } from "../world";
import { getLayerInfo } from "../layers";
import { createScrappyConfig } from "../entities/tribes/automatons/scrappy";
import { createCogwalkerConfig } from "../entities/tribes/automatons/cogwalker";
import { registerDirtyEntity } from "../server/player-clients";

const STRUCTURE_WORK_REQUIRED: Record<BlueprintType, number> = {
   [BlueprintType.woodenDoor]: 3,
   [BlueprintType.stoneDoor]: 3,
   [BlueprintType.stoneDoorUpgrade]: 3,
   [BlueprintType.woodenEmbrasure]: 5,
   [BlueprintType.stoneEmbrasure]: 5,
   [BlueprintType.stoneEmbrasureUpgrade]: 5,
   [BlueprintType.woodenTunnel]: 3,
   [BlueprintType.stoneTunnel]: 3,
   [BlueprintType.stoneTunnelUpgrade]: 3,
   [BlueprintType.ballista]: 25,
   [BlueprintType.slingTurret]: 10,
   [BlueprintType.stoneWall]: 5,
   [BlueprintType.stoneFloorSpikes]: 3,
   [BlueprintType.stoneWallSpikes]: 3,
   [BlueprintType.warriorHutUpgrade]: 25,
   [BlueprintType.fenceGate]: 3,
   [BlueprintType.stoneBracings]: 2,
   [BlueprintType.scrappy]: 10,
   [BlueprintType.cogwalker]: 20,
};

export class BlueprintComponent {
   public readonly blueprintType: BlueprintType;
   public workProgress = 0;
   public associatedEntityID: Entity;
   public readonly virtualEntityID: Entity = 0;

   constructor(blueprintType: BlueprintType, associatedEntityID: Entity) {
      this.blueprintType = blueprintType;
      this.associatedEntityID = associatedEntityID;
   }
}

export const BlueprintComponentArray = new ComponentArray<BlueprintComponent>(ServerComponentType.blueprint, true, getDataLength, addDataToPacket);
BlueprintComponentArray.onJoin = onJoin;

function onJoin(entityID: Entity): void {
   const blueprintComponent = BlueprintComponentArray.getComponent(entityID);

   if (StructureComponentArray.hasComponent(blueprintComponent.associatedEntityID)) {
      const structureComponent = StructureComponentArray.getComponent(blueprintComponent.associatedEntityID);
      structureComponent.activeBlueprint = entityID;
   }
}

const upgradeBuilding = (building: Entity): void => {
   const materialComponent = BuildingMaterialComponentArray.getComponent(building);
   if (materialComponent.material < BuildingMaterial.stone) {
      upgradeMaterial(building, materialComponent);
   }
}

const completeBlueprint = (blueprintEntity: Entity, blueprintComponent: BlueprintComponent): void => {
   const transformComponent = TransformComponentArray.getComponent(blueprintEntity);
   const tribeComponent = TribeComponentArray.getComponent(blueprintEntity);
   const tribe = tribeComponent.tribe;
   
   destroyEntity(blueprintEntity);

   const entityType = getBlueprintEntityType(blueprintComponent.blueprintType);
   const position = transformComponent.position.copy();
   const layer = getEntityLayer(blueprintEntity);

   const placeInfo = calculateEntityPlaceInfo(position, transformComponent.rotation, entityType, getLayerInfo(layer));
   
   // @Copynpaste
   switch (blueprintComponent.blueprintType) {
      case BlueprintType.woodenDoor: {
         const config = createDoorConfig(tribe, BuildingMaterial.wood, placeInfo.connections, null);
         config.components[ServerComponentType.transform].position.x = transformComponent.position.x;
         config.components[ServerComponentType.transform].position.y = transformComponent.position.y;
         config.components[ServerComponentType.transform].rotation = transformComponent.rotation;
         createEntity(config, getEntityLayer(blueprintEntity), 0);
         return;
      }
      case BlueprintType.stoneDoor: {
         const config = createDoorConfig(tribe, BuildingMaterial.stone, placeInfo.connections, null);
         config.components[ServerComponentType.transform].position.x = transformComponent.position.x;
         config.components[ServerComponentType.transform].position.y = transformComponent.position.y;
         config.components[ServerComponentType.transform].rotation = transformComponent.rotation;
         createEntity(config, getEntityLayer(blueprintEntity), 0);
         return;
      }
      case BlueprintType.woodenEmbrasure: {
         const config = createEmbrasureConfig(tribe, BuildingMaterial.wood, placeInfo.connections, null);
         config.components[ServerComponentType.transform].position.x = transformComponent.position.x;
         config.components[ServerComponentType.transform].position.y = transformComponent.position.y;
         config.components[ServerComponentType.transform].rotation = transformComponent.rotation;
         createEntity(config, getEntityLayer(blueprintEntity), 0);
         return;
      }
      case BlueprintType.stoneEmbrasure: {
         const config = createEmbrasureConfig(tribe, BuildingMaterial.stone, placeInfo.connections, null);
         config.components[ServerComponentType.transform].position.x = transformComponent.position.x;
         config.components[ServerComponentType.transform].position.y = transformComponent.position.y;
         config.components[ServerComponentType.transform].rotation = transformComponent.rotation;
         createEntity(config, getEntityLayer(blueprintEntity), 0);
         return;
      }
      case BlueprintType.ballista: {
         const config = createBallistaConfig(tribe, placeInfo.connections, null);
         config.components[ServerComponentType.transform].position.x = transformComponent.position.x;
         config.components[ServerComponentType.transform].position.y = transformComponent.position.y;
         config.components[ServerComponentType.transform].rotation = transformComponent.rotation;
         createEntity(config, getEntityLayer(blueprintEntity), 0);
         return;
      }
      case BlueprintType.slingTurret: {
         const config = createSlingTurretConfig(tribe, placeInfo.connections, null);
         config.components[ServerComponentType.transform].position.x = transformComponent.position.x;
         config.components[ServerComponentType.transform].position.y = transformComponent.position.y;
         config.components[ServerComponentType.transform].rotation = transformComponent.rotation;
         createEntity(config, getEntityLayer(blueprintEntity), 0);
         return;
      }
      case BlueprintType.woodenTunnel: {
         const config = createTunnelConfig(tribe, BuildingMaterial.wood, placeInfo.connections, null);
         config.components[ServerComponentType.transform].position.x = transformComponent.position.x;
         config.components[ServerComponentType.transform].position.y = transformComponent.position.y;
         config.components[ServerComponentType.transform].rotation = transformComponent.rotation;
         createEntity(config, getEntityLayer(blueprintEntity), 0);
         return;
      }
      case BlueprintType.stoneTunnel: {
         const config = createTunnelConfig(tribe, BuildingMaterial.stone, placeInfo.connections, null);
         config.components[ServerComponentType.transform].position.x = transformComponent.position.x;
         config.components[ServerComponentType.transform].position.y = transformComponent.position.y;
         config.components[ServerComponentType.transform].rotation = transformComponent.rotation;
         createEntity(config, getEntityLayer(blueprintEntity), 0);
         return;
      }
      case BlueprintType.scrappy: {
         const config = createScrappyConfig(tribe);
         config.components[ServerComponentType.transform].position.x = transformComponent.position.x;
         config.components[ServerComponentType.transform].position.y = transformComponent.position.y;
         config.components[ServerComponentType.transform].rotation = transformComponent.rotation;
         createEntity(config, getEntityLayer(blueprintEntity), 0);
         return;
      }
      case BlueprintType.cogwalker: {
         const config = createCogwalkerConfig(tribe);
         config.components[ServerComponentType.transform].position.x = transformComponent.position.x;
         config.components[ServerComponentType.transform].position.y = transformComponent.position.y;
         config.components[ServerComponentType.transform].rotation = transformComponent.rotation;
         createEntity(config, getEntityLayer(blueprintEntity), 0);
         return;
      }
      case BlueprintType.fenceGate: {
         const config = createFenceGateConfig(tribe, placeInfo.connections, null);
         config.components[ServerComponentType.transform].position.x = transformComponent.position.x;
         config.components[ServerComponentType.transform].position.y = transformComponent.position.y;
         config.components[ServerComponentType.transform].rotation = transformComponent.rotation;
         createEntity(config, getEntityLayer(blueprintEntity), 0);

         destroyEntity(blueprintComponent.associatedEntityID);
         
         return;
      }
      case BlueprintType.warriorHutUpgrade: {
         const config = createWarriorHutConfig(tribe, placeInfo.connections, null);
         config.components[ServerComponentType.transform].position.x = transformComponent.position.x;
         config.components[ServerComponentType.transform].position.y = transformComponent.position.y;
         config.components[ServerComponentType.transform].rotation = transformComponent.rotation;
         const hut = createEntity(config, getEntityLayer(blueprintEntity), 0);

         // Remove the previous hut
         destroyEntity(blueprintComponent.associatedEntityID);

         // @Cleanup @Incomplete: should this be done here? Probably should be done on join.
         // Transfer the worker to the warrior hut
         const hutComponent = HutComponentArray.getComponent(blueprintComponent.associatedEntityID);
         if (hutComponent.hasTribesman) {
            tribeComponent.tribe.instantRespawnTribesman(hut);
         }

         return;
      }
      case BlueprintType.stoneWall:
      case BlueprintType.stoneDoorUpgrade:
      case BlueprintType.stoneEmbrasureUpgrade:
      case BlueprintType.stoneTunnelUpgrade:
      case BlueprintType.stoneFloorSpikes:
      case BlueprintType.stoneWallSpikes:
      case BlueprintType.stoneBracings: {
         upgradeBuilding(blueprintComponent.associatedEntityID);
         return;
      }
      default: {
         const unreachable: never = blueprintComponent.blueprintType;
         return unreachable;
      }
   }
}

export function doBlueprintWork(blueprintEntity: Entity, itemType: HammerItemType): void {
   const blueprintComponent = BlueprintComponentArray.getComponent(blueprintEntity);
   
   const hammerItemInfo = ITEM_INFO_RECORD[itemType];
   blueprintComponent.workProgress += hammerItemInfo.workAmount;
   if (blueprintComponent.workProgress >= STRUCTURE_WORK_REQUIRED[blueprintComponent.blueprintType]) {
      // Construct the building
      completeBlueprint(blueprintEntity, blueprintComponent);
   }

   registerDirtyEntity(blueprintEntity);
}

function getDataLength(): number {
   return 4 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const blueprintComponent = BlueprintComponentArray.getComponent(entity);

   packet.addNumber(blueprintComponent.blueprintType);
   packet.addNumber(blueprintComponent.workProgress / STRUCTURE_WORK_REQUIRED[blueprintComponent.blueprintType]);
   packet.addNumber(blueprintComponent.associatedEntityID);
}