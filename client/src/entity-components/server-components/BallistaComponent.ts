import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { BALLISTA_AMMO_BOX_OFFSET_X, BALLISTA_AMMO_BOX_OFFSET_Y, BALLISTA_GEAR_X, BALLISTA_GEAR_Y } from "../../utils";
import { Entity } from "../../../../shared/src/entities";
import { randItem } from "../../../../shared/src/utils";
import { ROCK_HIT_SOUNDS, ROCK_DESTROY_SOUNDS, playSoundOnHitbox } from "../../sound";
import { RenderPart } from "../../render-parts/render-parts";
import { TransformComponentArray } from "./TransformComponent";
import { EntityIntermediateInfo, EntityParams } from "../../world";
import { Hitbox } from "../../hitboxes";

export interface BallistaComponentParams {}

interface IntermediateInfo {}

export interface BallistaComponent {}

export const BallistaComponentArray = new ServerComponentArray<BallistaComponent, BallistaComponentParams, IntermediateInfo>(ServerComponentType.ballista, true, {
   createParamsFromData: createParamsFromData,
   populateIntermediateInfo: populateIntermediateInfo,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData,
   onHit: onHit,
   onDie: onDie
});

const fillParams = (): BallistaComponentParams => {
   return {};
}

export function createBallistaComponentParams(): BallistaComponentParams {
   return fillParams();
}

function createParamsFromData(): BallistaComponentParams {
   return fillParams();
}

function populateIntermediateInfo(entityIntermediateInfo: EntityIntermediateInfo, entityParams: EntityParams): IntermediateInfo {
   const transformComponentParams = entityParams.serverComponentParams[ServerComponentType.transform]!;
   const hitbox = transformComponentParams.children[0] as Hitbox;
   
   // Base
   entityIntermediateInfo.renderInfo.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         getTextureArrayIndex("entities/ballista/base.png")
      )
   );

   // Ammo box
   const ammoBoxRenderPart = new TexturedRenderPart(
      hitbox,
      1,
      Math.PI / 2,
      getTextureArrayIndex("entities/ballista/ammo-box.png")
   );
   ammoBoxRenderPart.offset.x = BALLISTA_AMMO_BOX_OFFSET_X;
   ammoBoxRenderPart.offset.y = BALLISTA_AMMO_BOX_OFFSET_Y;
   entityIntermediateInfo.renderInfo.attachRenderPart(ammoBoxRenderPart);

   // Plate
   const plateRenderPart = new TexturedRenderPart(
      hitbox,
      2,
      0,
      getTextureArrayIndex("entities/ballista/plate.png")
   );
   plateRenderPart.addTag("turretComponent:pivoting");
   entityIntermediateInfo.renderInfo.attachRenderPart(plateRenderPart);

   // Shaft
   const shaftRenderPart = new TexturedRenderPart(
      plateRenderPart,
      3,
      0,
      getTextureArrayIndex("entities/ballista/shaft.png")
   );
   entityIntermediateInfo.renderInfo.attachRenderPart(shaftRenderPart);

   // Gears
   const gearRenderParts = new Array<RenderPart>();
   for (let i = 0; i < 2; i++) {
      const renderPart = new TexturedRenderPart(
         shaftRenderPart,
         2.5 + i * 0.1,
         0,
         getTextureArrayIndex("entities/ballista/gear.png")
      );
      renderPart.addTag("turretComponent:gear");
      // @Speed: Garbage collection
      renderPart.offset.x = i === 0 ? BALLISTA_GEAR_X : -BALLISTA_GEAR_X;
      renderPart.offset.y = BALLISTA_GEAR_Y;
      entityIntermediateInfo.renderInfo.attachRenderPart(renderPart);
      gearRenderParts.push(renderPart);
   }

   // Crossbow
   const crossbowRenderPart = new TexturedRenderPart(
      shaftRenderPart,
      5,
      0,
      getTextureArrayIndex("entities/ballista/crossbow-1.png")
   );
   crossbowRenderPart.addTag("turretComponent:aiming");
   entityIntermediateInfo.renderInfo.attachRenderPart(crossbowRenderPart);
   
   return {};
}

function createComponent(): BallistaComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 7;
}

function padData(): void {}

function updateFromData(): void {}

function onHit(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.children[0] as Hitbox;
   // @Temporary
   playSoundOnHitbox(randItem(ROCK_HIT_SOUNDS), 0.3, 1, entity, hitbox, false);
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.children[0] as Hitbox;
   // @Temporary
   playSoundOnHitbox(randItem(ROCK_DESTROY_SOUNDS), 0.4, 1, entity, hitbox, false);
}