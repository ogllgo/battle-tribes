import { HitData } from "../../../../shared/src/client-server-types";
import { ServerComponentType } from "../../../../shared/src/components";
import { EntityID, EntityType } from "../../../../shared/src/entities";
import { angle } from "../../../../shared/src/utils";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { createLightWoodSpeckParticle, createWoodShardParticle } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playSound } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { getEntityRenderInfo, getEntityType } from "../../world";
import { ClientComponentType } from "../client-component-types";
import ClientComponentArray from "../ClientComponentArray";
import { EntityConfig } from "../ComponentArray";
import { WALL_TEXTURE_SOURCES } from "../server-components/BuildingMaterialComponent";
import { HealthComponentArray } from "../server-components/HealthComponent";
import { TransformComponentArray } from "../server-components/TransformComponent";

export interface WallComponentParams {}

interface RenderParts {}

export interface WallComponent {
   damageRenderPart: TexturedRenderPart | null;
}

const NUM_DAMAGE_STAGES = 6;

export const WallComponentArray = new ClientComponentArray<WallComponent, RenderParts>(ClientComponentType.wall, true, {
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   onTick: onTick,
   onHit: onHit,
   onDie: onDie
});

export function createWallComponentParams(): WallComponentParams {
   return {};
}

function createRenderParts(renderInfo: EntityRenderInfo, entityConfig: EntityConfig<ServerComponentType.buildingMaterial, never>): RenderParts {
   const buildingMaterialComponentParams = entityConfig.serverComponents[ServerComponentType.buildingMaterial];
   
   const renderPart = new TexturedRenderPart(
      null,
      0,
      0,
      getTextureArrayIndex(WALL_TEXTURE_SOURCES[buildingMaterialComponentParams.material])
   );
   renderPart.addTag("buildingMaterialComponent:material");

   renderInfo.attachRenderThing(renderPart);

   return {};
}

function createComponent(): WallComponent {
   return {
      damageRenderPart: null
   };
}

const updateDamageRenderPart = (entity: EntityID, health: number, maxHealth: number): void => {
   const wallComponent = WallComponentArray.getComponent(entity);
   
   // Max health can be 0 if it is an entity ghost
   let damageStage = maxHealth > 0 ? Math.ceil((1 - health / maxHealth) * NUM_DAMAGE_STAGES) : 0;
   if (damageStage === 0) {
      if (wallComponent.damageRenderPart !== null) {
         const renderInfo = getEntityRenderInfo(entity);
         renderInfo.removeRenderPart(wallComponent.damageRenderPart);
         wallComponent.damageRenderPart = null;
      }
      return;
   }
   // @Temporary: this is only here due to a bug which lets health go negative when attacking 25 health wooden wall with deepfrost axe (8 damage). remove when that bug is fixed
   if (damageStage > NUM_DAMAGE_STAGES) {
      damageStage = NUM_DAMAGE_STAGES;
   }
   
   const textureSource = "entities/wall/wooden-wall-damage-" + damageStage + ".png";
   if (wallComponent.damageRenderPart === null) {
      wallComponent.damageRenderPart = new TexturedRenderPart(
         null,
         1,
         0,
         getTextureArrayIndex(textureSource)
      );
      const renderInfo = getEntityRenderInfo(entity);
      renderInfo.attachRenderThing(wallComponent.damageRenderPart);
   } else {
      wallComponent.damageRenderPart.switchTextureSource(textureSource);
   }
}

function onTick(entity: EntityID): void {
   const healthComponent = HealthComponentArray.getComponent(entity);
   updateDamageRenderPart(entity, healthComponent.health, healthComponent.maxHealth);
}

function onHit(entity: EntityID, hitData: HitData): void {
   const transformComponent = TransformComponentArray.getComponent(entity);

   playSound("wooden-wall-hit.mp3", 0.3, 1, transformComponent.position);

   for (let i = 0; i < 6; i++) {
      createLightWoodSpeckParticle(transformComponent.position.x, transformComponent.position.y, 32);
   }

   for (let i = 0; i < 10; i++) {
      let offsetDirection = angle(hitData.hitPosition[0] - transformComponent.position.x, hitData.hitPosition[1] - transformComponent.position.y);
      offsetDirection += 0.2 * Math.PI * (Math.random() - 0.5);

      const spawnPositionX = transformComponent.position.x + 32 * Math.sin(offsetDirection);
      const spawnPositionY = transformComponent.position.y + 32 * Math.cos(offsetDirection);
      createLightWoodSpeckParticle(spawnPositionX, spawnPositionY, 5);
   }
}

// @Incomplete: doesn't play when removed by deconstruction
function onDie(entity: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(entity);

   // @Speed @Hack
   // Don't play death effects if the wall was replaced by a blueprint
   for (const chunk of transformComponent.chunks) {
      for (const entity of chunk.entities) {
         if (getEntityType(entity) !== EntityType.blueprintEntity) {
            continue;
         }

         const entityTransformComponent = TransformComponentArray.getComponent(entity);

         const dist = transformComponent.position.calculateDistanceBetween(entityTransformComponent.position);
         if (dist < 1) {
            return;
         }
      }
   }

   playSound("wooden-wall-break.mp3", 0.4, 1, transformComponent.position);

   for (let i = 0; i < 16; i++) {
      createLightWoodSpeckParticle(transformComponent.position.x, transformComponent.position.y, 32 * Math.random());
   }

   for (let i = 0; i < 8; i++) {
      createWoodShardParticle(transformComponent.position.x, transformComponent.position.y, 32);
   }
}