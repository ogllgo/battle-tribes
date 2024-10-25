import { ServerComponentType, TurretAmmoType } from "battletribes-shared/components";
import { rotateXAroundOrigin, rotateYAroundOrigin } from "battletribes-shared/utils";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { BALLISTA_AMMO_BOX_OFFSET_X, BALLISTA_AMMO_BOX_OFFSET_Y } from "../../utils";
import Board from "../../Board";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { PacketReader } from "battletribes-shared/packets";
import { TransformComponentArray } from "./TransformComponent";
import { getEntityRenderInfo } from "../../world";
import { EntityID } from "../../../../shared/src/entities";
import ServerComponentArray from "../ServerComponentArray";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { RenderPart } from "../../render-parts/render-parts";
import { EntityConfig } from "../ComponentArray";

export interface AmmoBoxComponentParams {
   readonly ammoType: TurretAmmoType | null;
   readonly ammoRemaining: number;
}

export interface RenderParts {
   readonly ammoWarningRenderPart: RenderPart | null;
}

export interface AmmoBoxComponent {
   ammoType: TurretAmmoType | null;
   ammoRemaining: number;

   ammoWarningRenderPart: RenderPart | null;
}

const createAmmoWarningRenderPart = (): RenderPart => {
   const renderPart = new TexturedRenderPart(
      null,
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

export const AmmoBoxComponentArray = new ServerComponentArray<AmmoBoxComponent, AmmoBoxComponentParams, RenderParts>(ServerComponentType.ammoBox, true, {
   createParamsFromData: createParamsFromData,
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(reader: PacketReader): AmmoBoxComponentParams {
   const ammoType = reader.readNumber();
   const ammoRemaining = reader.readNumber();

   return {
      ammoType: ammoType,
      ammoRemaining: ammoRemaining
   };
}

function createRenderParts(renderInfo: EntityRenderInfo, entityConfig: EntityConfig<ServerComponentType.ammoBox, never>): RenderParts {
   let ammoWarningRenderPart: RenderPart | null;
   if (entityConfig.serverComponents[ServerComponentType.ammoBox].ammoType === null) {
      ammoWarningRenderPart = createAmmoWarningRenderPart();
      renderInfo.attachRenderThing(ammoWarningRenderPart);
   } else {
      ammoWarningRenderPart = null;
   }
   
   return {
      ammoWarningRenderPart: ammoWarningRenderPart
   };
}

function createComponent(entityConfig: EntityConfig<ServerComponentType.ammoBox, never>, renderParts: RenderParts): AmmoBoxComponent {
   const ammoBoxComponentParams = entityConfig.serverComponents[ServerComponentType.ammoBox];
   
   return {
      ammoType: ammoBoxComponentParams.ammoType,
      ammoRemaining: ammoBoxComponentParams.ammoRemaining,
      ammoWarningRenderPart: renderParts.ammoWarningRenderPart
   };
}

const updateAmmoType = (ammoBoxComponent: AmmoBoxComponent, entity: EntityID, ammoType: TurretAmmoType | null): void => {
   if (ammoType === null) {
      ammoBoxComponent.ammoType = null;

      if (ammoBoxComponent.ammoWarningRenderPart === null) {
         const transformComponent = TransformComponentArray.getComponent(entity);
         
         ammoBoxComponent.ammoWarningRenderPart = new TexturedRenderPart(
            null,
            999,
            0,
            getTextureArrayIndex("entities/ballista/ammo-warning.png")
         );
         ammoBoxComponent.ammoWarningRenderPart.offset.x = rotateXAroundOrigin(BALLISTA_AMMO_BOX_OFFSET_X, BALLISTA_AMMO_BOX_OFFSET_Y, transformComponent.rotation);
         ammoBoxComponent.ammoWarningRenderPart.offset.y = rotateYAroundOrigin(BALLISTA_AMMO_BOX_OFFSET_X, BALLISTA_AMMO_BOX_OFFSET_Y, transformComponent.rotation);
         ammoBoxComponent.ammoWarningRenderPart.inheritParentRotation = false;

         const renderInfo = getEntityRenderInfo(entity);
         renderInfo.attachRenderThing(ammoBoxComponent.ammoWarningRenderPart);
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

function updateFromData(reader: PacketReader, entity: EntityID): void {
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