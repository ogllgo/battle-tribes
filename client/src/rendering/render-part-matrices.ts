import { EntityRenderInfo, updateEntityRenderInfoRenderData } from "../EntityRenderInfo";
import { createIdentityMatrix, createTranslationMatrix, Matrix3x2, matrixMultiplyInPlace } from "./matrices";
import { Settings } from "battletribes-shared/settings";
import { RenderPartParent, RenderPart } from "../render-parts/render-parts";
import { renderLayerIsChunkRendered, updateChunkRenderedEntity } from "./webgl/chunked-entity-rendering";
import { getEntityRenderInfo, getEntityType } from "../world";
import { Point, randAngle } from "../../../shared/src/utils";
import { gl } from "../webgl";
import { HealthComponentArray } from "../entity-components/server-components/HealthComponent";
import { getHitboxVelocity, Hitbox } from "../hitboxes";
import { TransformComponentArray } from "../entity-components/server-components/TransformComponent";
import { EntityType } from "../../../shared/src/entities";
import { playerInstance } from "../player";

// @Cleanup: file name

let dirtyEntityRenderInfos = new Array<EntityRenderInfo>();

/* ------------------------ */
/* Matrix Utility Functions */
/* ------------------------ */

const overrideWithScaleMatrix = (matrix: Matrix3x2, sx: number, sy: number): void => {
   matrix[0] = sx;
   matrix[1] = 0;
   matrix[2] = 0;
   matrix[3] = sy;
   matrix[4] = 0;
   matrix[5] = 0;
}

const rotateMatrix = (matrix: Matrix3x2, rotation: number): void => {
   const sin = Math.sin(rotation);
   const cos = Math.cos(rotation);

   const negSin = -sin;

   const b00 = matrix[0];
   const b01 = matrix[1];
   const b10 = matrix[2];
   const b11 = matrix[3];
   const b20 = matrix[4];
   const b21 = matrix[5];

   matrix[0] = b00 * cos + b01 * sin;
   matrix[1] = b00 * negSin + b01 * cos;
   matrix[2] = b10 * cos + b11 * sin;
   matrix[3] = b10 * negSin + b11 * cos;
   matrix[4] = b20 * cos + b21 * sin;
   matrix[5] = b20 * negSin + b21 * cos;
}

// @Cleanup: This should probably be a function stored on the render part
export function getRenderPartRenderPosition(renderPart: RenderPart): Point {
   const matrix = renderPart.modelMatrix;
   
   const x = matrix[4];
   const y = matrix[5];

   // @Garbage
   return new Point(x, y);
}
// @Copynpaste
export function getMatrixPosition(matrix: Matrix3x2): Point {
   const x = matrix[4];
   const y = matrix[5];

   // @Garbage
   return new Point(x, y);
}

const scaleMatrix = (matrix: Matrix3x2, sx: number, sy: number): void => {
   matrix[0] *= sx;
   matrix[1] *= sy;
   matrix[2] *= sx;
   matrix[3] *= sy;
   matrix[4] *= sx;
   matrix[5] *= sy;
}

export function translateMatrix(matrix: Matrix3x2, tx: number, ty: number): void {
   matrix[4] += tx;
   matrix[5] += ty;
}

const overrideMatrix = (sourceMatrix: Readonly<Matrix3x2>, targetMatrix: Matrix3x2): void => {
   targetMatrix[0] = sourceMatrix[0];
   targetMatrix[1] = sourceMatrix[1];
   targetMatrix[2] = sourceMatrix[2];
   targetMatrix[3] = sourceMatrix[3];
   targetMatrix[4] = sourceMatrix[4];
   targetMatrix[5] = sourceMatrix[5];
}

const overrideWithRotationMatrix = (matrix: Matrix3x2, rotation: number): void => {
   const sin = Math.sin(rotation);
   const cos = Math.cos(rotation);

   matrix[0] = cos;
   matrix[1] = -sin;
   matrix[2] = sin;
   matrix[3] = cos;
   matrix[4] = 0;
   matrix[5] = 0;
}

export function registerDirtyRenderInfo(renderInfo: EntityRenderInfo): void {
   if (!renderInfo.renderPartsAreDirty) {
      renderInfo.renderPartsAreDirty = true;

      dirtyEntityRenderInfos.push(renderInfo);
   }
}

export function undirtyRenderInfo(renderInfo: EntityRenderInfo): void {
   const idx = dirtyEntityRenderInfos.indexOf(renderInfo);
   if (idx !== -1) {
      dirtyEntityRenderInfos.splice(idx, 1);
   }
}

/** Marks all render infos which will move due to the frame progress */
export function dirtifyMovingEntities(): void {
   // @SPEED
   for (let i = 0; i < TransformComponentArray.entities.length; i++) {
      const entity = TransformComponentArray.entities[i];
      const transformComponent = TransformComponentArray.components[i];

      for (const hitbox of transformComponent.hitboxes) {
         const velocity = getHitboxVelocity(hitbox);
         if (velocity.x !== 0 || velocity.y !== 0) {
            // Is moving!!

            const renderInfo = getEntityRenderInfo(entity);
            registerDirtyRenderInfo(renderInfo);

            break;
         }
      }
   }
}

const calculateAndOverrideRenderThingMatrix = (thing: RenderPart): void => {
   const matrix = thing.modelMatrix;

   // Rotation
   overrideWithRotationMatrix(matrix, thing.angle);
   
   // Scale
   const scale = thing.scale;
   scaleMatrix(matrix, scale * thing.flipXMultiplier, scale);
   
   // @Speed: Can probably get rid of this flip multiplication by doing the translation before scaling
   let tx = thing.offset.x * thing.flipXMultiplier;
   let ty = thing.offset.y;

   // Shake
   if (thing.shakeAmount > 0) {
      const direction = randAngle();
      tx += thing.shakeAmount * Math.sin(direction);
      ty += thing.shakeAmount * Math.cos(direction);
   }
   
   // Translation
   translateMatrix(matrix, tx, ty);
}

const calculateHitboxMatrix = (hitbox: Hitbox, tickInterp: number): Matrix3x2 => {
   const matrix = createIdentityMatrix();

   const scale = hitbox.box.scale;
   overrideWithScaleMatrix(matrix, scale * (hitbox.box.flipX ? -1 : 1), scale);

   // Rotation
   rotateMatrix(matrix, hitbox.box.angle)
   // overrideWithRotationMatrix(matrix, hitbox.box.angle);
   
   // Scale
   // const scale = hitbox.box.scale;
   // scaleMatrix(matrix, scale * (hitbox.box.flipX ? -1 : 1), scale);
   // scaleMatrix(matrix, scale, scale);
   
   const velocity = getHitboxVelocity(hitbox);
   const tx = hitbox.box.position.x + velocity.x * tickInterp * Settings.DELTA_TIME;
   const ty = hitbox.box.position.y + velocity.y * tickInterp * Settings.DELTA_TIME;

   // Translation
   translateMatrix(matrix, tx, ty);

   return matrix;
}

export function calculateHitboxRenderPosition(hitbox: Hitbox, tickInterp: number): Point {
   const matrix = calculateHitboxMatrix(hitbox, tickInterp);
   return getMatrixPosition(matrix);
}

export function renderParentIsHitbox(parent: RenderPartParent): parent is Hitbox {
   return parent !== null && typeof (parent as Hitbox).mass !== "undefined";
}

export function translateEntityRenderParts(renderInfo: EntityRenderInfo, tx: number, ty: number): void {
   for (const thing of renderInfo.renderPartsByZIndex) {
      const matrix = createTranslationMatrix(tx, ty);
      matrixMultiplyInPlace(thing.modelMatrix, matrix);
      overrideMatrix(matrix, thing.modelMatrix);
   }
}

const cleanRenderPartModelMatrix = (renderPart: RenderPart, tickInterp: number): void => {
   // Model matrix for the render part
   calculateAndOverrideRenderThingMatrix(renderPart);

   let parentRotation: number;
   let parentModelMatrix: Readonly<Matrix3x2>;
   if (renderParentIsHitbox(renderPart.parent)) {
      // @Speed? @Garbage: Should override
      parentModelMatrix = calculateHitboxMatrix(renderPart.parent, tickInterp);
      parentRotation = renderPart.parent.box.angle;
   } else {
      parentModelMatrix = renderPart.parent.modelMatrix;
      parentRotation = renderPart.parent.angle;
   }

   // @Speed: If the thing doesn't inherit its' parents rotation, undo the rotation before the matrix is applied.
   // But would be faster to branch the whole logic based on the inheritParentRotation flag, instead of cancelling out the rotation step
   if (!renderPart.inheritParentRotation) {
      rotateMatrix(renderPart.modelMatrix, -parentRotation);
   }
   
   matrixMultiplyInPlace(parentModelMatrix, renderPart.modelMatrix);

   for (const child of renderPart.children) {
      cleanRenderPartModelMatrix(child, tickInterp);
   }
}

export function cleanEntityRenderInfo(renderInfo: EntityRenderInfo, tickInterp: number): void {
   for (const renderPart of renderInfo.rootRenderParts) {
      cleanRenderPartModelMatrix(renderPart, tickInterp);
   }

   if (renderLayerIsChunkRendered(renderInfo.renderLayer)) {
      updateChunkRenderedEntity(renderInfo, renderInfo.renderLayer);
   } else {
      updateEntityRenderInfoRenderData(renderInfo);
   }

   renderInfo.renderPartsAreDirty = false;
}

export function updateRenderPartMatrices(serverTickInterp: number, clientTickInterp: number): void {
   // Do this before so that binding buffers during the loop doesn't mess up any previously bound vertex array.
   gl.bindVertexArray(null);

   // @HACK: to fix the flash bug where the damage flash doesn't play
   for (const entity of HealthComponentArray.entities) {
      const renderInfo = getEntityRenderInfo(entity);
      registerDirtyRenderInfo(renderInfo);
   }
   
   // @Bug: I don't think this will account for cases where the game is updated less than 60 times a second.
   // To fix: temporarily set Settings.TICK_RATE to like 10 or something and then fix the subsequent slideshow
   for (let i = 0; i < dirtyEntityRenderInfos.length; i++) {
      const renderInfo = dirtyEntityRenderInfos[i];

      // @CLEANUP
      let tickInterp: number;
      const entity = renderInfo.associatedEntity;
      if (entity === playerInstance) {
         const entityTransformComponent = TransformComponentArray.getComponent(entity);
         const entityHitbox = entityTransformComponent.hitboxes[0];
         const rootEntity = entityHitbox.rootEntity;
         tickInterp = rootEntity === playerInstance ? clientTickInterp : serverTickInterp;
      } else {
         tickInterp = serverTickInterp;
      }
      
      cleanEntityRenderInfo(renderInfo, tickInterp);
   }

   // Reset dirty entities
   dirtyEntityRenderInfos.length = 0;
}