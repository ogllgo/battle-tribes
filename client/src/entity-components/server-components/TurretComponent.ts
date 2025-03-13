import { Entity, EntityType } from "battletribes-shared/entities";
import { ServerComponentType, TurretAmmoType } from "battletribes-shared/components";
import { lerp } from "battletribes-shared/utils";
import { playSoundOnHitbox } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { ItemType } from "battletribes-shared/items/items";
import { VisualRenderPart } from "../../render-parts/render-parts";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { PacketReader } from "battletribes-shared/packets";
import { EntityIntermediateInfo, EntityParams, getEntityRenderInfo, getEntityType } from "../../world";
import { AmmoBoxComponentArray } from "./AmmoBoxComponent";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";
import { Hitbox } from "../../hitboxes";

// @Cleanup: can make this a whole lot better by having the projectile not be a render part, but the actual projectile pre-created, and then just un-carried from the turret once fired.

type TurretType = EntityType.slingTurret | EntityType.ballista;

export interface TurretComponentParams {
   readonly aimDirection: number;
   readonly chargeProgress: number;
   readonly reloadProgress: number;
}

export interface TurretComponent {
   // @Cleanup: Do we need to store this?
   chargeProgress: number;

   /** The render part which changes texture as the turret charges */
   readonly aimingRenderPart: TexturedRenderPart;
   /** The render part which pivots as the turret aims */
   readonly pivotingRenderPart: VisualRenderPart;
   readonly gearRenderParts: ReadonlyArray<VisualRenderPart>;
   projectileRenderPart: TexturedRenderPart | null;
}

const NUM_SLING_TURRET_CHARGE_TEXTURES = 5;
const NUM_BALLISTA_CHARGE_TEXTURES = 11;

interface AmmoRenderInfo {
   readonly projectileTextureSource: string;
   readonly drawOffset: number;
}

const AMMO_RENDER_INFO_RECORD: Record<TurretAmmoType, AmmoRenderInfo> = {
   [ItemType.wood]: {
      projectileTextureSource: "projectiles/wooden-bolt.png",
      drawOffset: 0
   },
   [ItemType.rock]: {
      projectileTextureSource: "projectiles/ballista-rock.png",
      drawOffset: -20
   },
   [ItemType.frostcicle]: {
      projectileTextureSource: "projectiles/ballista-frostcicle.png",
      drawOffset: -10
   },
   [ItemType.slimeball]: {
      projectileTextureSource: "projectiles/ballista-slimeball.png",
      drawOffset: -20
   }
};

const getSlingTurretChargeTextureSource = (chargeProgress: number): string => {
   let textureIdx = Math.floor(chargeProgress * NUM_SLING_TURRET_CHARGE_TEXTURES);
   if (textureIdx >= NUM_SLING_TURRET_CHARGE_TEXTURES) {
      textureIdx = NUM_SLING_TURRET_CHARGE_TEXTURES - 1;
   }

   if (textureIdx === 0) {
      return "entities/sling-turret/sling-turret-sling.png";
   }
   return "entities/sling-turret/sling-charge-" + textureIdx + ".png";
}

const getBallistaCrossbarTextureSource = (chargeProgress: number): string => {
   let textureIdx = Math.floor(chargeProgress * NUM_BALLISTA_CHARGE_TEXTURES);
   if (textureIdx >= NUM_BALLISTA_CHARGE_TEXTURES) {
      textureIdx = NUM_BALLISTA_CHARGE_TEXTURES - 1;
   }
   return "entities/ballista/crossbow-" + (textureIdx + 1) + ".png";
}

const getChargeTextureSource = (entityType: TurretType, chargeProgress: number): string => {
   switch (entityType) {
      case EntityType.slingTurret: return getSlingTurretChargeTextureSource(chargeProgress);
      case EntityType.ballista: return getBallistaCrossbarTextureSource(chargeProgress);
   }
}

const getProjectilePullbackAmount = (entity: Entity, chargeProgress: number): number => {
   switch (getEntityType(entity) as TurretType) {
      case EntityType.slingTurret: {
         return lerp(0, -21, chargeProgress);
      }
      case EntityType.ballista: {
         const ammoBoxComponent = AmmoBoxComponentArray.getComponent(entity);
         const ammoRenderInfo = AMMO_RENDER_INFO_RECORD[ammoBoxComponent.ammoType!];
         return lerp(48, 0, chargeProgress) + ammoRenderInfo.drawOffset;
      }
   }
}

const playFireSound = (entity: Entity): void => {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.children[0] as Hitbox;
   
   switch (getEntityType(entity) as TurretType) {
      case EntityType.slingTurret: {
         playSoundOnHitbox("sling-turret-fire.mp3", 0.2, 1, entity, hitbox, false);
         break;
      }
      case EntityType.ballista: {
         playSoundOnHitbox("sling-turret-fire.mp3", 0.25, 0.7, entity, hitbox, false);
         break;
      }
   }
}

const getProjectileTextureSource = (entity: Entity): string => {
   switch (getEntityType(entity) as TurretType) {
      case EntityType.slingTurret: {
         return "projectiles/sling-rock.png";
      }
      case EntityType.ballista: {
         const ammoBoxComponent = AmmoBoxComponentArray.getComponent(entity);
         const ammoRenderInfo = AMMO_RENDER_INFO_RECORD[ammoBoxComponent.ammoType!];
         return ammoRenderInfo.projectileTextureSource;
      }
   }
}

const getProjectileZIndex = (entityType: TurretType): number => {
   switch (entityType) {
      case EntityType.slingTurret: return 1.5;
      case EntityType.ballista: return 4;
   }
}

export const TurretComponentArray = new ServerComponentArray<TurretComponent, TurretComponentParams, never>(ServerComponentType.turret, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData
});

const fillParams = (aimDirection: number, chargeProgress: number, reloadProgress: number): TurretComponentParams => {
   return {
      aimDirection: aimDirection,
      chargeProgress: chargeProgress,
      reloadProgress: reloadProgress
   };
}

export function createTurretComponentParams(): TurretComponentParams {
   return fillParams(0, 0, 0);
}

function createParamsFromData(reader: PacketReader): TurretComponentParams {
   const aimDirection = reader.readNumber();
   const chargeProgress = reader.readNumber();
   const reloadProgress = reader.readNumber();

   return fillParams(aimDirection, chargeProgress, reloadProgress);
}

function createComponent(entityParams: EntityParams, _: never, entityIntermediateInfo: EntityIntermediateInfo): TurretComponent {
   return {
      chargeProgress: entityParams.serverComponentParams[ServerComponentType.turret]!.chargeProgress,
      aimingRenderPart: entityIntermediateInfo.renderInfo.getRenderThing("turretComponent:aiming") as TexturedRenderPart,
      pivotingRenderPart: entityIntermediateInfo.renderInfo.getRenderThing("turretComponent:pivoting") as VisualRenderPart,
      gearRenderParts: entityIntermediateInfo.renderInfo.getRenderThings("turretComponent:gear") as Array<VisualRenderPart>,
      projectileRenderPart:  null
   };
}

function getMaxRenderParts(): number {
   // 1 for the projectile render part
   return 1;
}

const updateAimDirection = (turretComponent: TurretComponent, aimDirection: number, chargeProgress: number): void => {
   turretComponent.pivotingRenderPart.rotation = aimDirection;

   for (let i = 0; i < turretComponent.gearRenderParts.length; i++) {
      const gearRenderPart = turretComponent.gearRenderParts[i];
      gearRenderPart.rotation = lerp(0, Math.PI * 2, chargeProgress) * (i === 0 ? 1 : -1);
   }
}

const shouldShowProjectile = (entity: Entity, chargeProgress: number, reloadProgress: number): boolean => {
   switch (getEntityType(entity)) {
      case EntityType.ballista: {
         const ammoBoxComponent = AmmoBoxComponentArray.getComponent(entity);
         return ammoBoxComponent.ammoType !== null;
      }
      case EntityType.slingTurret: {
         return chargeProgress > 0 || reloadProgress > 0;
      }
      default: throw new Error();
   }
}

const projectileHasRandomRotation = (entity: Entity): boolean => {
   switch (getEntityType(entity)) {
      case EntityType.ballista: {
         const ammoBoxComponent = AmmoBoxComponentArray.getComponent(entity);
         return ammoBoxComponent.ammoType === ItemType.rock || ammoBoxComponent.ammoType === ItemType.slimeball;
      }
      case EntityType.slingTurret: {
         return true;
      }
      default: throw new Error();
   }
}

const updateProjectileRenderPart = (turretComponent: TurretComponent, entity: Entity, chargeProgress: number, reloadProgress: number): void => {
   if (shouldShowProjectile(entity, chargeProgress, reloadProgress)) {
      const textureSource = getProjectileTextureSource(entity);
      if (turretComponent.projectileRenderPart === null) {
         turretComponent.projectileRenderPart = new TexturedRenderPart(
            turretComponent.pivotingRenderPart,
            getProjectileZIndex(getEntityType(entity) as TurretType),
            0,
            getTextureArrayIndex(textureSource)
         );

         if (projectileHasRandomRotation(entity)) {
            turretComponent.projectileRenderPart.rotation = 2 * Math.PI * Math.random();
         }

         const renderInfo = getEntityRenderInfo(entity);
         renderInfo.attachRenderPart(turretComponent.projectileRenderPart);
      } else {
         turretComponent.projectileRenderPart.switchTextureSource(textureSource);
      }
   
      turretComponent.projectileRenderPart.offset.y = getProjectilePullbackAmount(entity, chargeProgress);

      if (reloadProgress > 0) {
         turretComponent.projectileRenderPart.opacity = reloadProgress;
      } else {
         turretComponent.projectileRenderPart.opacity = 1;
      }
   } else if (turretComponent.projectileRenderPart !== null) {
      const renderInfo = getEntityRenderInfo(entity);
      renderInfo.removeRenderPart(turretComponent.projectileRenderPart);
      turretComponent.projectileRenderPart = null;
   }
}

function padData(reader: PacketReader): void {
   reader.padOffset(3 * Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: Entity): void {
   const turretComponent = TurretComponentArray.getComponent(entity);
   
   const aimDirection = reader.readNumber();
   const chargeProgress = reader.readNumber();
   const reloadProgress = reader.readNumber();
   
   if (chargeProgress < turretComponent.chargeProgress) {
      playFireSound(entity);
   }
   turretComponent.chargeProgress = chargeProgress;

   turretComponent.aimingRenderPart.switchTextureSource(getChargeTextureSource(getEntityType(entity) as TurretType, chargeProgress));
   
   updateAimDirection(turretComponent, aimDirection, chargeProgress);
   updateProjectileRenderPart(turretComponent, entity, chargeProgress, reloadProgress);
}