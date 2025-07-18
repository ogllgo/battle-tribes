import { ServerComponentType, TurretAmmoType } from "battletribes-shared/components";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import Board from "../../Board";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { PacketReader } from "battletribes-shared/packets";
import { TransformComponentArray } from "./TransformComponent";
import { EntityParams, getEntityRenderInfo } from "../../world";
import { Entity } from "../../../../shared/src/entities";
import ServerComponentArray from "../ServerComponentArray";
import { VisualRenderPart } from "../../render-parts/render-parts";
import { Hitbox } from "../../hitboxes";
import { EntityRenderInfo } from "../../EntityRenderInfo";

export interface AmmoBoxComponentParams {
   readonly ammoType: TurretAmmoType | null;
   readonly ammoRemaining: number;
}

interface IntermediateInfo {
   readonly ammoWarningRenderPart: VisualRenderPart | null;
}

export interface AmmoBoxComponent {
   ammoType: TurretAmmoType | null;
   ammoRemaining: number;

   ammoWarningRenderPart: VisualRenderPart | null;
}

const createAmmoWarningRenderPart = (parentHitbox: Hitbox): VisualRenderPart => {
   const renderPart = new TexturedRenderPart(
      parentHitbox,
      999,
      0,
      getTextureArrayIndex("entities/ballista/ammo-warning.png")
   );
   // @Incomplete? What is this supposed to be doing and does it achieve it?
   // I think it's just supposed to be going over the ammo box but without copying its rotation
   // renderPart.offset.x = rotateXAroundOrigin(BALLISTA_AMMO_BOX_OFFSET_X, BALLISTA_AMMO_BOX_OFFSET_Y, transformComponent.rotation);
   // renderPart.offset.y = rotateYAroundOrigin(BALLISTA_AMMO_BOX_OFFSET_X, BALLISTA_AMMO_BOX_OFFSET_Y, transformComponent.rotation);
   renderPart.inheritParentRotation = false;

   return renderPart;
}

export const AmmoBoxComponentArray = new ServerComponentArray<AmmoBoxComponent, AmmoBoxComponentParams, IntermediateInfo>(ServerComponentType.ammoBox, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: createIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData
});

const fillParams = (ammoType: TurretAmmoType | null, ammoRemaining: number): AmmoBoxComponentParams => {
   return {
      ammoType: ammoType,
      ammoRemaining: ammoRemaining
   };
}

export function createAmmoBoxComponentParams(): AmmoBoxComponentParams {
   return fillParams(null, 0);
}

function createParamsFromData(reader: PacketReader): AmmoBoxComponentParams {
   const ammoType = reader.readNumber();
   const ammoRemaining = reader.readNumber();
   return fillParams(ammoType, ammoRemaining);
}

function createIntermediateInfo(renderInfo: EntityRenderInfo, entityParams: EntityParams): IntermediateInfo {
   let ammoWarningRenderPart: VisualRenderPart | null;
   if (entityParams.serverComponentParams[ServerComponentType.ammoBox]!.ammoType === null) {
      const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
      const hitbox = transformComponentParams.hitboxes[0];
      
      ammoWarningRenderPart = createAmmoWarningRenderPart(hitbox);
      renderInfo.attachRenderPart(ammoWarningRenderPart);
   } else {
      ammoWarningRenderPart = null;
   }
   
   return {
      ammoWarningRenderPart: ammoWarningRenderPart
   };
}

function createComponent(entityParams: EntityParams, intermediateInfo: IntermediateInfo): AmmoBoxComponent {
   const ammoBoxComponentParams = entityParams.serverComponentParams[ServerComponentType.ammoBox]!;
   
   return {
      ammoType: ammoBoxComponentParams.ammoType,
      ammoRemaining: ammoBoxComponentParams.ammoRemaining,
      ammoWarningRenderPart: intermediateInfo.ammoWarningRenderPart
   };
}

function getMaxRenderParts(): number {
   return 1;
}

const updateAmmoType = (ammoBoxComponent: AmmoBoxComponent, entity: Entity, ammoType: TurretAmmoType | null): void => {
   if (ammoType === null) {
      ammoBoxComponent.ammoType = null;

      if (ammoBoxComponent.ammoWarningRenderPart === null) {
         const transformComponent = TransformComponentArray.getComponent(entity);
         const hitbox = transformComponent.hitboxes[0];
         
         ammoBoxComponent.ammoWarningRenderPart = new TexturedRenderPart(
            hitbox,
            999,
            0,
            getTextureArrayIndex("entities/ballista/ammo-warning.png")
         );
         // @Temporary @Incomplete
         // ammoBoxComponent.ammoWarningRenderPart.offset.x = rotateXAroundOrigin(BALLISTA_AMMO_BOX_OFFSET_X, BALLISTA_AMMO_BOX_OFFSET_Y, transformComponent.rotation);
         // ammoBoxComponent.ammoWarningRenderPart.offset.y = rotateYAroundOrigin(BALLISTA_AMMO_BOX_OFFSET_X, BALLISTA_AMMO_BOX_OFFSET_Y, transformComponent.rotation);
         ammoBoxComponent.ammoWarningRenderPart.inheritParentRotation = false;

         const renderInfo = getEntityRenderInfo(entity);
         renderInfo.attachRenderPart(ammoBoxComponent.ammoWarningRenderPart);
      }

      ammoBoxComponent.ammoWarningRenderPart.opacity = (Math.sin(Board.serverTicks / 15) * 0.5 + 0.5) * 0.4 + 0.4;
      
      return;
   }

   if (ammoBoxComponent.ammoWarningRenderPart !== null) {
      const renderInfo = getEntityRenderInfo(entity);
      renderInfo.removeRenderPart(ammoBoxComponent.ammoWarningRenderPart);
      ammoBoxComponent.ammoWarningRenderPart = null;
   }
   
   ammoBoxComponent.ammoType = ammoType;
}

function padData(reader: PacketReader): void {
   reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: Entity): void {
   const ammoBoxComponent = AmmoBoxComponentArray.getComponent(entity);
   
   const ammoType = reader.readNumber();
   const ammoRemaining = reader.readNumber();

   if (ammoBoxComponent.ammoRemaining === 0) {
      updateAmmoType(ammoBoxComponent, entity, null);
   } else {
      updateAmmoType(ammoBoxComponent, entity, ammoType);
   }

   ammoBoxComponent.ammoRemaining = ammoRemaining;
}