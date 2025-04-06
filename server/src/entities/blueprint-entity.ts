import { CollisionBit } from "battletribes-shared/collision";
import { BlueprintType, ServerComponentType } from "battletribes-shared/components";
import { Entity, EntityType } from "battletribes-shared/entities";
import { EntityConfig } from "../components";
import { addHitboxToTransformComponent, entityChildIsHitbox, TransformComponent, TransformComponentArray } from "../components/TransformComponent";
import { HealthComponent } from "../components/HealthComponent";
import { BlueprintComponent } from "../components/BlueprintComponent";
import Tribe from "../Tribe";
import { TribeComponent } from "../components/TribeComponent";
import { HitboxCollisionType } from "../../../shared/src/boxes/boxes";
import { StructureComponent } from "../components/StructureComponent";
import { VirtualStructure } from "../tribesman-ai/building-plans/TribeBuildingLayer";
import { Point } from "../../../shared/src/utils";
import { cloneHitbox } from "../hitboxes";
import { createStructureConfig } from "../structure-placement";

// @Incomplete: Remove if the associated entity is removed

export function getBlueprintEntityType(blueprintType: BlueprintType): EntityType {
   switch (blueprintType) {
      case BlueprintType.woodenTunnel:
      case BlueprintType.stoneTunnel:
      case BlueprintType.stoneTunnelUpgrade: return EntityType.tunnel;
      case BlueprintType.woodenEmbrasure:
      case BlueprintType.stoneEmbrasure:
      case BlueprintType.stoneEmbrasureUpgrade: return EntityType.embrasure;
      case BlueprintType.woodenDoor:
      case BlueprintType.stoneDoor:
      case BlueprintType.stoneDoorUpgrade: return EntityType.door;
      case BlueprintType.ballista: return EntityType.ballista;
      case BlueprintType.slingTurret: return EntityType.slingTurret;
      case BlueprintType.stoneWall: return EntityType.wall;
      case BlueprintType.stoneFloorSpikes: return EntityType.floorSpikes;
      case BlueprintType.stoneWallSpikes: return EntityType.wallSpikes;
      case BlueprintType.warriorHutUpgrade: return EntityType.warriorHut;
      case BlueprintType.fenceGate: return EntityType.fenceGate;
      case BlueprintType.stoneBracings: return EntityType.bracings;
      case BlueprintType.scrappy: return EntityType.scrappy;
      case BlueprintType.cogwalker: return EntityType.cogwalker;
   }
}

export function createBlueprintEntityConfig(position: Point, rotation: number, tribe: Tribe, blueprintType: BlueprintType, associatedEntityID: Entity, virtualStructure: VirtualStructure | null): EntityConfig {
   const transformComponent = new TransformComponent();
   transformComponent.collisionBit = CollisionBit.none;
   transformComponent.collisionMask = 0;

   if (associatedEntityID !== 0) {
      const structureTransformComponent = TransformComponentArray.getComponent(associatedEntityID);

      for (const structureHitbox of structureTransformComponent.children) {
         if (!entityChildIsHitbox(structureHitbox)) {
            continue;
         }

         const hitbox = cloneHitbox(transformComponent, structureHitbox);
         hitbox.mass = 0;
         hitbox.collisionType = HitboxCollisionType.soft;
         addHitboxToTransformComponent(transformComponent, hitbox);
      }
   } else {
      const entityType = getBlueprintEntityType(blueprintType);
      const entityConfig = createStructureConfig(tribe, entityType, position, rotation, []);

      const transformComponentParams = entityConfig.components[ServerComponentType.transform]!;
      for (const hitbox of transformComponentParams.children) {
         if (!entityChildIsHitbox(hitbox)) {
            continue;
         }
         
         hitbox.mass = 0;
         hitbox.collisionType = HitboxCollisionType.soft;
         addHitboxToTransformComponent(transformComponent, hitbox);
      }
   }

   const healthComponent = new HealthComponent(5);
   
   // @Incomplete: connection info?
   const structureComponent = new StructureComponent([], virtualStructure);
   
   const blueprintComponent = new BlueprintComponent(blueprintType, associatedEntityID);

   const tribeComponent = new TribeComponent(tribe);
   
   return {
      entityType: EntityType.blueprintEntity,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.structure]: structureComponent,
         [ServerComponentType.blueprint]: blueprintComponent,
         [ServerComponentType.tribe]: tribeComponent
      },
      lights: []
   };
}