import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "../../shared/src/collision";
import { EntityComponents, ServerComponentType, BuildingMaterial } from "../../shared/src/components";
import { PacketReader } from "../../shared/src/packets";
import { StructureType } from "../../shared/src/structures";
import { distance, Point } from "../../shared/src/utils";
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
import { createTransformComponentParams, readCircularHitboxFromData, readRectangularHitboxFromData } from "./entity-components/server-components/TransformComponent";
import { TribeComponentArray, createTribeComponentParams } from "./entity-components/server-components/TribeComponent";
import { EntityRenderInfo } from "./EntityRenderInfo";
import Game from "./Game";
import Layer from "./Layer";
import OPTIONS from "./options";
import { thingIsVisualRenderPart } from "./render-parts/render-parts";
import { addGhostRenderInfo, removeGhostRenderInfo } from "./rendering/webgl/entity-ghost-rendering";
import { createEntity, EntityPreCreationInfo, EntityServerComponentParams, layers, playerInstance } from "./world";

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
}

/** Contains the virtual buildings for tribe building plans */
let plannedVirtualBuildingsMap = new Map<number, GhostBuildingPlan>();
let previousVisibleVirtualBuildings = new Set<VirtualBuilding>();

const readVirtualBuildingFromData = (reader: PacketReader): VirtualBuilding => {
   const entityType = reader.readNumber() as StructureType;
   const virtualBuildingID = reader.readNumber();
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
   

   const components: EntityServerComponentParams = {};

   // @Hack @Cleanup: make the client and server use the some component params system
   const componentTypes = EntityComponents[entityType];
   for (let i = 0; i < componentTypes.length; i++) {
      const componentType = componentTypes[i];

      switch (componentType) {
         case ServerComponentType.transform: {
            const transformComponentParams = createTransformComponentParams(
               new Point(x, y),
               rotation,
               hitboxes.slice(),
               [],
               hitboxes.slice(),
               COLLISION_BITS.default,
               DEFAULT_COLLISION_MASK
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
            // @Crash: when the player is dead, playerinstance will be null and this will cause a crash
            const playerTribeComponent = TribeComponentArray.getComponent(playerInstance!);
            
            components[componentType] = createTribeComponentParams(playerTribeComponent.tribeID);
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

   const preCreationInfo: EntityPreCreationInfo = {
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

export function readGhostVirtualBuildings(reader: PacketReader, virtualBuildings: Map<number, GhostBuildingPlan>): void {
   const hasVirtualBuilding = reader.readBoolean();
   reader.padOffset(3);
   if (hasVirtualBuilding) {
      const virtualBuilding = readVirtualBuildingFromData(reader);

      const virtualBuildingsMap = new Map<number, VirtualBuildingSafetySimulation>();
      const numPotentialPlans = reader.readNumber();
      for (let i = 0; i < numPotentialPlans; i++) {
         const virtualBuilding = readVirtualBuildingFromData(reader);
      
         const safety = reader.readNumber();

         const VirtualBuildingSafetySimulation: VirtualBuildingSafetySimulation = {
            virtualBuilding: virtualBuilding,
            safety: safety
         };
         virtualBuildingsMap.set(virtualBuilding.id, VirtualBuildingSafetySimulation);
      }

      const ghostBuildingPlan: GhostBuildingPlan = {
         virtualBuilding: virtualBuilding,
         virtualBuildingsMap: virtualBuildingsMap
      }
      virtualBuildings.set(virtualBuilding.id, ghostBuildingPlan);
   }

   const numChildren = reader.readNumber();
   for (let i = 0; i < numChildren; i++) {
      readGhostVirtualBuildings(reader, virtualBuildings);
   }
}

export function getVisibleBuildingPlan(): GhostBuildingPlan | null {
   if (Game.cursorX === null || Game.cursorY === null) {
      return null;
   }
   
   let closestGhostBuildingPlan: GhostBuildingPlan | undefined;
   let minDist = 64;
   for (const pair of plannedVirtualBuildingsMap) {
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

export function updateVirtualBuildings(newVirtualBuildingsMap: Map<number, GhostBuildingPlan>): void {
   // @Speed

   plannedVirtualBuildingsMap = newVirtualBuildingsMap;

   const visibleBuildingPlan = getVisibleBuildingPlan();

   const visibleVirtualBuildings = new Set<VirtualBuilding>();
   if (OPTIONS.showBuildingPlans) {
      if (visibleBuildingPlan === null) {
         for (const pair of plannedVirtualBuildingsMap) {
            const ghostBuildingPlan = pair[1];
            visibleVirtualBuildings.add(ghostBuildingPlan.virtualBuilding);
         }
      } else {
         for (const pair of visibleBuildingPlan.virtualBuildingsMap) {
            const virtualBuildingSafetySimulation = pair[1];
            visibleVirtualBuildings.add(virtualBuildingSafetySimulation.virtualBuilding);
         }
      }
   }

   // Check for removed virtual buildings
   for (const virtualBuilding of previousVisibleVirtualBuildings) {
      if (visibleVirtualBuildings.has(virtualBuilding)) {
         continue;
      }

      removeGhostRenderInfo(virtualBuilding.renderInfo);
   }
   
   // Add new virtual buildings
   for (const virtualBuilding of visibleVirtualBuildings) {
      if (previousVisibleVirtualBuildings.has(virtualBuilding)) {
         continue;
      }

      // Add render info for new virtual buildings
      const renderInfo = virtualBuilding.renderInfo;
      addGhostRenderInfo(renderInfo);

      // Manually set the render info's position and rotation
      renderInfo.renderPosition.x = virtualBuilding.position.x;
      renderInfo.renderPosition.y = virtualBuilding.position.y;
      renderInfo.rotation = virtualBuilding.rotation;
   }

   previousVisibleVirtualBuildings = visibleVirtualBuildings;
}