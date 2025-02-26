import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "../../shared/src/collision";
import { EntityComponents, ServerComponentType, BuildingMaterial } from "../../shared/src/components";
import { PacketReader } from "../../shared/src/packets";
import { StructureType } from "../../shared/src/structures";
import { distance, Point } from "../../shared/src/utils";
import Board from "./Board";
import { ClientHitbox } from "./boxes";
import { createBarrelComponentParams } from "./entity-components/server-components/BarrelComponent";
import { createBracingsComponentParams } from "./entity-components/server-components/BracingsComponent";
import { createBuildingMaterialComponentParams } from "./entity-components/server-components/BuildingMaterialComponent";
import { createCampfireComponentParams } from "./entity-components/server-components/CampfireComponent";
import { createCookingComponentParams } from "./entity-components/server-components/CookingComponent";
import { createFireTorchComponentParams } from "./entity-components/server-components/FireTorchComponent";
import { createFurnaceComponentParams } from "./entity-components/server-components/FurnaceComponent";
import { createHealthComponentParams } from "./entity-components/server-components/HealthComponent";
import { createInventoryComponentParams } from "./entity-components/server-components/InventoryComponent";
import { createSlurbTorchComponentParams } from "./entity-components/server-components/SlurbTorchComponent";
import { createSpikesComponentParams } from "./entity-components/server-components/SpikesComponent";
import { createStatusEffectComponentParams } from "./entity-components/server-components/StatusEffectComponent";
import { createStructureComponentParams } from "./entity-components/server-components/StructureComponent";
import { createTransformComponentParams, padCircularHitboxData, padRectangularHitboxData, readCircularHitboxFromData, readRectangularHitboxFromData } from "./entity-components/server-components/TransformComponent";
import { createTribeComponentParams } from "./entity-components/server-components/TribeComponent";
import { EntityRenderInfo, updateEntityRenderInfoRenderData } from "./EntityRenderInfo";
import Game from "./Game";
import Layer from "./Layer";
import OPTIONS from "./options";
import { thingIsVisualRenderPart } from "./render-parts/render-parts";
import { addGhostRenderInfo, removeGhostRenderInfo } from "./rendering/webgl/entity-ghost-rendering";
import { playerTribe } from "./tribes";
import { createEntity, EntityPreCreationInfo, EntityServerComponentParams, layers } from "./world";

export interface VirtualBuilding {
   readonly entityType: StructureType;
   readonly id: number;
   readonly layer: Layer;
   readonly position: Readonly<Point>;
   readonly rotation: number;
   readonly hitboxes: ReadonlyArray<ClientHitbox>;
   readonly renderInfo: EntityRenderInfo;
}

export interface VirtualBuildingSafetySimulation {
   readonly virtualBuilding: VirtualBuilding;
   readonly safety: number;
}

export interface GhostBuildingPlan {
   readonly virtualBuilding: VirtualBuilding;
   readonly virtualBuildingsMap: Map<number, VirtualBuildingSafetySimulation>;
   lastUpdateTicks: number;
}

const ghostBuildingPlans = new Map<number, GhostBuildingPlan>();

const padVirtualBuildingData = (reader: PacketReader): void => {
   reader.padOffset(5 * Float32Array.BYTES_PER_ELEMENT);

   const numHitboxes = reader.readNumber();
   for (let i = 0; i < numHitboxes; i++) {
      const isCircular = reader.readBoolean();
      reader.padOffset(3);

      reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
      
      if (isCircular) {
         padCircularHitboxData(reader);
      } else {
         padRectangularHitboxData(reader);
      }
   }
}

const readVirtualBuildingFromData = (reader: PacketReader, virtualBuildingID: number): VirtualBuilding => {
   const entityType = reader.readNumber() as StructureType;
   const layerDepth = reader.readNumber();
   const x = reader.readNumber();
   const y = reader.readNumber();
   const rotation = reader.readNumber();
   
   const layer = layers[layerDepth];

   // Hitboxes
   const hitboxes = new Array<ClientHitbox>();
   const numHitboxes = reader.readNumber();
   for (let i = 0; i < numHitboxes; i++) {
      const isCircular = reader.readBoolean();
      reader.padOffset(3);

      const localID = reader.readNumber();
      
      let hitbox: ClientHitbox;
      if (isCircular) {
         hitbox = readCircularHitboxFromData(reader, [], localID);
      } else {
         hitbox = readRectangularHitboxFromData(reader, [], localID);
      }
      hitboxes.push(hitbox);
   }

   // @Copynpaste @Hack

   const components = {} as EntityServerComponentParams;

   // @Hack @Cleanup: make the client and server use the some component params system
   const componentTypes = EntityComponents[entityType];
   for (let i = 0; i < componentTypes.length; i++) {
      const componentType = componentTypes[i];

      switch (componentType) {
         case ServerComponentType.transform: {
            const transformComponentParams = createTransformComponentParams(
               new Point(x, y),
               new Point(0, 0),
               new Point(0, 0),
               rotation,
               rotation,
               hitboxes.slice(),
               [],
               hitboxes.slice(),
               COLLISION_BITS.default,
               DEFAULT_COLLISION_MASK,
               0,
               0,
               []
            );

            components[componentType] = transformComponentParams;
            break;
         }
         case ServerComponentType.health: {
            const params = createHealthComponentParams(0, 0);
            components[componentType] = params;
            break;
         }
         case ServerComponentType.statusEffect: {
            const params = createStatusEffectComponentParams([]);
            components[componentType] = params;
            break;
         }
         case ServerComponentType.structure: {
            components[componentType] = createStructureComponentParams(false, []);
            break;
         }
         case ServerComponentType.tribe: {
            components[componentType] = createTribeComponentParams(playerTribe.id);
            break;
         }
         case ServerComponentType.buildingMaterial: {
            components[componentType] = createBuildingMaterialComponentParams(BuildingMaterial.wood);
            break;
         }
         case ServerComponentType.bracings: {
            components[componentType] = createBracingsComponentParams();
            break;
         }
         case ServerComponentType.inventory: {
            components[componentType] = createInventoryComponentParams({});
            break;
         }
         case ServerComponentType.cooking: {
            components[componentType] = createCookingComponentParams(0, false);
            break;
         }
         case ServerComponentType.campfire: {
            components[componentType] = createCampfireComponentParams();
            break;
         }
         case ServerComponentType.furnace: {
            components[componentType] = createFurnaceComponentParams();
            break;
         }
         case ServerComponentType.spikes: {
            components[componentType] = createSpikesComponentParams(false);
            break;
         }
         case ServerComponentType.fireTorch: {
            components[componentType] = createFireTorchComponentParams();
            break;
         }
         case ServerComponentType.slurbTorch: {
            components[componentType] = createSlurbTorchComponentParams();
            break;
         }
         case ServerComponentType.barrel: {
            components[componentType] = createBarrelComponentParams();
            break;
         }
         case ServerComponentType.researchBench: {
            components[componentType] = {
               isOccupied: false
            };
            break;
         }
         case ServerComponentType.totemBanner: {
            components[componentType] = {
               banners: []
            };
            break;
         }
         case ServerComponentType.hut: {
            components[componentType] = {
               doorSwingAmount: 0,
               isRecalling: false
            };
            break;
         }
         default: {
            throw new Error(ServerComponentType[componentType]);
         }
      }
   }

   const preCreationInfo: EntityPreCreationInfo<ServerComponentType> = {
      serverComponentTypes: componentTypes,
      serverComponentParams: components
   };

   // Create the entity
   const creationInfo = createEntity(0, entityType, layer, preCreationInfo);

   const renderInfo = creationInfo.renderInfo;

   // Modify all the render part's opacity
   for (let i = 0; i < renderInfo.allRenderThings.length; i++) {
      const renderThing = renderInfo.allRenderThings[i];
      if (thingIsVisualRenderPart(renderThing)) {
         renderThing.opacity *= 0.5;
      }
   }

   // @Hack: Manually set the render info's position and rotation
   const transformComponentParams = components[ServerComponentType.transform]!;
   renderInfo.renderPosition.x = transformComponentParams.position.x;
   renderInfo.renderPosition.y = transformComponentParams.position.y;
   renderInfo.rotation = transformComponentParams.rotation;
   updateEntityRenderInfoRenderData(renderInfo);

   return {
      entityType: entityType,
      id: virtualBuildingID,
      layer: layer,
      position: new Point(x, y),
      rotation: rotation,
      hitboxes: hitboxes,
      renderInfo: renderInfo
   };
}

export function readGhostVirtualBuildings(reader: PacketReader): void {
   while (reader.readBoolean()) {
      reader.padOffset(3);

      const virtualBuildingID = reader.readNumber();

      const existingGhostBuildingPlan = ghostBuildingPlans.get(virtualBuildingID);
      if (typeof existingGhostBuildingPlan !== "undefined") {
         padVirtualBuildingData(reader);

         const numPotentialPlans = reader.readNumber();
         for (let i = 0; i < numPotentialPlans; i++) {
            reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
            padVirtualBuildingData(reader);
            reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
         }

         existingGhostBuildingPlan.lastUpdateTicks = Board.serverTicks;
      } else {
         const virtualBuilding = readVirtualBuildingFromData(reader, virtualBuildingID);
   
         const virtualBuildingSafetySimulationMap = new Map<number, VirtualBuildingSafetySimulation>();
         const numPotentialPlans = reader.readNumber();
         for (let i = 0; i < numPotentialPlans; i++) {
            const virtualBuildingID = reader.readNumber();
            const virtualBuilding = readVirtualBuildingFromData(reader, virtualBuildingID);
         
            const safety = reader.readNumber();
   
            const VirtualBuildingSafetySimulation: VirtualBuildingSafetySimulation = {
               virtualBuilding: virtualBuilding,
               safety: safety
            };
            virtualBuildingSafetySimulationMap.set(virtualBuilding.id, VirtualBuildingSafetySimulation);
         }
   
         const ghostBuildingPlan: GhostBuildingPlan = {
            virtualBuilding: virtualBuilding,
            virtualBuildingsMap: virtualBuildingSafetySimulationMap,
            lastUpdateTicks: Board.serverTicks
         };
         ghostBuildingPlans.set(virtualBuilding.id, ghostBuildingPlan);
      }
   }
   reader.padOffset(3);
}

export function getVisibleBuildingPlan(): GhostBuildingPlan | null {
   if (Game.cursorX === null || Game.cursorY === null) {
      return null;
   }
   
   let closestGhostBuildingPlan: GhostBuildingPlan | undefined;
   let minDist = 64;
   for (const pair of ghostBuildingPlans) {
      const ghostBuildingPlan = pair[1];
      const virtualBuilding = ghostBuildingPlan.virtualBuilding;
      
      const dist = distance(Game.cursorX, Game.cursorY, virtualBuilding.position.x, virtualBuilding.position.y);
      if (dist < minDist) {
         minDist = dist;
         closestGhostBuildingPlan = ghostBuildingPlan;
      }
   }

   if (typeof closestGhostBuildingPlan !== "undefined") {
      return closestGhostBuildingPlan;
   }
   return null;
}

export function pruneGhostBuildingPlans(): void {
   for (const pair of ghostBuildingPlans) {
      const ghostBuildingInfo = pair[1];
      if (ghostBuildingInfo.lastUpdateTicks !== Board.serverTicks) {
         removeGhostRenderInfo(ghostBuildingInfo.virtualBuilding.renderInfo);
         ghostBuildingPlans.delete(pair[0]);
      }
   }
}