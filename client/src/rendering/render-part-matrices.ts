import { EntityRenderInfo, updateEntityRenderInfoRenderData } from "../EntityRenderInfo";
import { createIdentityMatrix, createTranslationMatrix, Matrix3x3, matrixMultiplyInPlace, overrideWithRotationMatrix } from "./matrices";
import { Settings } from "battletribes-shared/settings";
import { RenderParent, RenderPart } from "../render-parts/render-parts";
import { renderLayerIsChunkRendered, updateChunkRenderedEntity } from "./webgl/chunked-entity-rendering";
import { getEntityRenderInfo } from "../world";
import { Hitbox } from "../../../shared/src/boxes/boxes";
import { TransformComponentArray } from "../entity-components/server-components/TransformComponent";
import { PhysicsComponentArray } from "../entity-components/server-components/PhysicsComponent";
import { Point } from "../../../shared/src/utils";
import { gl } from "../webgl";
import { HealthComponentArray } from "../entity-components/server-components/HealthComponent";

let dirtyEntityRenderInfos = new Array<EntityRenderInfo>();
let dirtyEntityRenderPositions = new Array<EntityRenderInfo>();

/* ------------------------ */
/* Matrix Utility Functions */
/* ------------------------ */

const overrideWithScaleMatrix = (matrix: Matrix3x3, sx: number, sy: number): void => {
   matrix[0] = sx;
   matrix[1] = 0;
   matrix[2] = 0;
   matrix[3] = 0;
   matrix[4] = sy;
   matrix[5] = 0;
   matrix[6] = 0;
   matrix[7] = 0;
   matrix[8] = 1;
}

const rotateMatrix = (matrix: Matrix3x3, rotation: number): void => {
   const sin = Math.sin(rotation);
   const cos = Math.cos(rotation);

   const a00 = cos;
   const a01 = -sin;
   const a02 = 0;
   const a10 = sin;
   const a11 = cos;
   const a12 = 0;
   const a20 = 0;
   const a21 = 0;
   const a22 = 1;

   const b00 = matrix[0];
   const b01 = matrix[1];
   const b02 = matrix[2];
   const b10 = matrix[3];
   const b11 = matrix[4];
   const b12 = matrix[5];
   const b20 = matrix[6];
   const b21 = matrix[7];
   const b22 = matrix[8];

   matrix[0] = b00 * a00 + b01 * a10 + b02 * a20;
   matrix[1] = b00 * a01 + b01 * a11 + b02 * a21;
   matrix[2] = b00 * a02 + b01 * a12 + b02 * a22;
   matrix[3] = b10 * a00 + b11 * a10 + b12 * a20;
   matrix[4] = b10 * a01 + b11 * a11 + b12 * a21;
   matrix[5] = b10 * a02 + b11 * a12 + b12 * a22;
   matrix[6] = b20 * a00 + b21 * a10 + b22 * a20;
   matrix[7] = b20 * a01 + b21 * a11 + b22 * a21;
   matrix[8] = b20 * a02 + b21 * a12 + b22 * a22;
}

// @Cleanup: This should probably be a function stored on the render part
export function getRenderPartRenderPosition(renderPart: RenderPart): Point {
   const matrix = renderPart.modelMatrix;
   
   const x = matrix[6];
   const y = matrix[7];

   return new Point(x, y);
}
// @Copynpaste
export function getMatrixPosition(matrix: Matrix3x3): Point {
   const x = matrix[6];
   const y = matrix[7];

   return new Point(x, y);
}

const scaleMatrix = (matrix: Matrix3x3, sx: number, sy: number): void => {
   const a00 = sx;
   const a01 = 0;
   const a02 = 0;
   const a10 = 0;
   const a11 = sy;
   const a12 = 0;
   const a20 = 0;
   const a21 = 0;
   const a22 = 1;

   const b00 = matrix[0];
   const b01 = matrix[1];
   const b02 = matrix[2];
   const b10 = matrix[3];
   const b11 = matrix[4];
   const b12 = matrix[5];
   const b20 = matrix[6];
   const b21 = matrix[7];
   const b22 = matrix[8];

   matrix[0] = b00 * a00 + b01 * a10 + b02 * a20;
   matrix[1] = b00 * a01 + b01 * a11 + b02 * a21;
   matrix[2] = b00 * a02 + b01 * a12 + b02 * a22;
   matrix[3] = b10 * a00 + b11 * a10 + b12 * a20;
   matrix[4] = b10 * a01 + b11 * a11 + b12 * a21;
   matrix[5] = b10 * a02 + b11 * a12 + b12 * a22;
   matrix[6] = b20 * a00 + b21 * a10 + b22 * a20;
   matrix[7] = b20 * a01 + b21 * a11 + b22 * a21;
   matrix[8] = b20 * a02 + b21 * a12 + b22 * a22;
}

export function translateMatrix(matrix: Matrix3x3, tx: number, ty: number): void {
   const a00 = 1;
   const a01 = 0;
   const a02 = 0;
   const a10 = 0;
   const a11 = 1;
   const a12 = 0;
   const a20 = tx;
   const a21 = ty;
   const a22 = 1;

   const b00 = matrix[0];
   const b01 = matrix[1];
   const b02 = matrix[2];
   const b10 = matrix[3];
   const b11 = matrix[4];
   const b12 = matrix[5];
   const b20 = matrix[6];
   const b21 = matrix[7];
   const b22 = matrix[8];

   matrix[0] = b00 * a00 + b01 * a10 + b02 * a20;
   matrix[1] = b00 * a01 + b01 * a11 + b02 * a21;
   matrix[2] = b00 * a02 + b01 * a12 + b02 * a22;
   matrix[3] = b10 * a00 + b11 * a10 + b12 * a20;
   matrix[4] = b10 * a01 + b11 * a11 + b12 * a21;
   matrix[5] = b10 * a02 + b11 * a12 + b12 * a22;
   matrix[6] = b20 * a00 + b21 * a10 + b22 * a20;
   matrix[7] = b20 * a01 + b21 * a11 + b22 * a21;
   matrix[8] = b20 * a02 + b21 * a12 + b22 * a22;
}

const overrideMatrix = (sourceMatrix: Readonly<Matrix3x3>, targetMatrix: Matrix3x3): void => {
   targetMatrix[0] = sourceMatrix[0];
   targetMatrix[1] = sourceMatrix[1];
   targetMatrix[2] = sourceMatrix[2];
   targetMatrix[3] = sourceMatrix[3];
   targetMatrix[4] = sourceMatrix[4];
   targetMatrix[5] = sourceMatrix[5];
   targetMatrix[6] = sourceMatrix[6];
   targetMatrix[7] = sourceMatrix[7];
   targetMatrix[8] = sourceMatrix[8];
}

export function registerDirtyRenderInfo(renderInfo: EntityRenderInfo): void {
   if (!renderInfo.renderPartsAreDirty) {
      renderInfo.renderPartsAreDirty = true;

      dirtyEntityRenderInfos.push(renderInfo);
   }
}

export function registerDirtyRenderPosition(renderInfo: EntityRenderInfo): void {
   if (!renderInfo.renderPositionIsDirty) {
      renderInfo.renderPositionIsDirty = true;

      dirtyEntityRenderPositions.push(renderInfo);
   }
   // @Hack
   if (!renderInfo.renderPartsAreDirty) {
      renderInfo.renderPartsAreDirty = true;

      dirtyEntityRenderInfos.push(renderInfo);
   }
}

export function removeEntityFromDirtyArrays(renderInfo: EntityRenderInfo): void {
   let idx = dirtyEntityRenderInfos.indexOf(renderInfo);
   if (idx !== -1) {
      dirtyEntityRenderInfos.splice(idx, 1);
   }
   
   idx = dirtyEntityRenderPositions.indexOf(renderInfo);
   if (idx !== -1) {
      dirtyEntityRenderPositions.splice(idx, 1);
   }
}

export function updateRenderInfoRenderPosition(renderInfo: EntityRenderInfo, frameProgress: number): void {
   const transformComponent = TransformComponentArray.getComponent(renderInfo.associatedEntity);
   
   renderInfo.rotation = transformComponent.rotation;
   
   const renderPosition = renderInfo.renderPosition;
   renderPosition.x = transformComponent.position.x;
   renderPosition.y = transformComponent.position.y;

   // Account for velocity
   renderPosition.x += (transformComponent.selfVelocity.x + transformComponent.externalVelocity.x) * frameProgress * Settings.I_TPS;
   renderPosition.y += (transformComponent.selfVelocity.y + transformComponent.externalVelocity.y) * frameProgress * Settings.I_TPS;

   // Shake
   if (renderInfo.shakeAmount > 0) {
      const direction = 2 * Math.PI * Math.random();
      renderPosition.x += renderInfo.shakeAmount * Math.sin(direction);
      renderPosition.y += renderInfo.shakeAmount * Math.cos(direction);
   }
}

/** Marks all render positions which will move due to the frame progress */
export function markMovingRenderPositions(): void {
   for (let i = 0; i < PhysicsComponentArray.entities.length; i++) {
      const entity = PhysicsComponentArray.entities[i];

      const renderInfo = getEntityRenderInfo(entity);
      registerDirtyRenderPosition(renderInfo);
   }
}

export function cleanRenderPositions(frameProgress: number): void {
   for (let i = 0; i < dirtyEntityRenderPositions.length; i++) {
      const renderInfo = dirtyEntityRenderPositions[i];

      updateRenderInfoRenderPosition(renderInfo, frameProgress);
      renderInfo.renderPositionIsDirty = false;
   }

   dirtyEntityRenderPositions = [];
}

const calculateAndOverrideEntityModelMatrix = (renderInfo: EntityRenderInfo): void => {
   // Rotate
   overrideWithRotationMatrix(renderInfo.modelMatrix, renderInfo.rotation);

   // Translate
   translateMatrix(renderInfo.modelMatrix, renderInfo.renderPosition.x, renderInfo.renderPosition.y);
}

const calculateAndOverrideRenderThingMatrix = (thing: RenderPart): void => {
   const matrix = thing.modelMatrix;

   // Rotation
   overrideWithRotationMatrix(matrix, thing.rotation);
   
   // Scale
   const scale = thing.scale;
   scaleMatrix(matrix, scale * thing.flipXMultiplier, scale);
   
   // @Speed: Can probably get rid of this flip multiplication by doing the translation before scaling
   let tx = thing.offset.x * thing.flipXMultiplier;
   let ty = thing.offset.y;

   // Shake
   if (thing.shakeAmount > 0) {
      const direction = 2 * Math.PI * Math.random();
      tx += thing.shakeAmount * Math.sin(direction);
      ty += thing.shakeAmount * Math.cos(direction);
   }
   
   // Translation
   translateMatrix(matrix, tx, ty);
}

// @Cleanup: unused parameter?
const calculateHitboxMatrix = (renderInfo: EntityRenderInfo, entityModelMatrix: Matrix3x3, hitbox: Hitbox, frameProgress: number): Matrix3x3 => {
   const matrix = createIdentityMatrix();

   // Rotation
   overrideWithRotationMatrix(matrix, hitbox.box.rotation);
   
   // Scale
   const scale = hitbox.box.scale;
   scaleMatrix(matrix, scale, scale);
   
   let tx = hitbox.box.position.x;
   let ty = hitbox.box.position.y;

   // @Copynpaste @Hack
   // @Bug: Don't do for hitboxes which don't move statically with the entity position!
   const transformComponent = TransformComponentArray.getComponent(renderInfo.associatedEntity);
   if (PhysicsComponentArray.hasComponent(renderInfo.associatedEntity) && transformComponent.carryRoot === renderInfo.associatedEntity) {
      tx += (transformComponent.selfVelocity.x + transformComponent.externalVelocity.x) * frameProgress * Settings.I_TPS;
      ty += (transformComponent.selfVelocity.y + transformComponent.externalVelocity.y) * frameProgress * Settings.I_TPS;
   }
   
   // Translation
   translateMatrix(matrix, tx, ty);

   return matrix;
}

export function renderParentIsHitbox(parent: RenderParent): parent is Hitbox {
   return parent !== null && typeof (parent as Hitbox).mass !== "undefined";
}

export function translateEntityRenderParts(renderInfo: EntityRenderInfo, tx: number, ty: number): void {
   for (const thing of renderInfo.allRenderThings) {
      const matrix = createTranslationMatrix(tx, ty);
      matrixMultiplyInPlace(thing.modelMatrix, matrix);
      overrideMatrix(matrix, thing.modelMatrix);
   }
}

export function cleanEntityRenderInfo(renderInfo: EntityRenderInfo, frameProgress: number): void {
   calculateAndOverrideEntityModelMatrix(renderInfo);

   for (let i = 0; i < renderInfo.allRenderThings.length; i++) {
      const thing = renderInfo.allRenderThings[i];

      // Model matrix for the render part
      calculateAndOverrideRenderThingMatrix(thing);

      let parentRotation: number;
      let parentModelMatrix: Readonly<Matrix3x3>;
      if (renderParentIsHitbox(thing.parent)) {
         // @Speed?
         parentModelMatrix = calculateHitboxMatrix(renderInfo, renderInfo.modelMatrix, thing.parent, frameProgress);
         parentRotation = thing.parent.box.rotation;
      } else {
         parentModelMatrix = thing.parent !== null ? thing.parent.modelMatrix : renderInfo.modelMatrix;
         parentRotation = thing.parent !== null ? thing.parent.rotation : renderInfo.rotation;
      }

      // @Speed: If the thing doesn't inherit its' parents rotation, undo the rotation before the matrix is applied.
      // But would be faster to branch the whole logic based on the inheritParentRotation flag, instead of cancelling out the rotation step
      if (!thing.inheritParentRotation) {
         rotateMatrix(thing.modelMatrix, -parentRotation);
      }
      
      matrixMultiplyInPlace(parentModelMatrix, thing.modelMatrix);
   }

   if (renderLayerIsChunkRendered(renderInfo.renderLayer)) {
      updateChunkRenderedEntity(renderInfo, renderInfo.renderLayer);
   } else {
      updateEntityRenderInfoRenderData(renderInfo);
   }

   renderInfo.renderPartsAreDirty = false;
}

export function updateRenderPartMatrices(frameProgress: number): void {
   // Do this before so that binding buffers during the loop doesn't mess up any previously bound vertex array.
   gl.bindVertexArray(null);

   // @HACK: to fix the flash bug
   for (const entity of HealthComponentArray.entities) {
      const renderInfo = getEntityRenderInfo(entity);
      registerDirtyRenderInfo(renderInfo);
      registerDirtyRenderPosition(renderInfo);
   }
   
   // @Bug: I don't think this will account for cases where the game is updated less than 60 times a second.
   // To fix: temporarily set Settings.TPS to like 10 or something and then fix the subsequent slideshow
   for (let i = 0; i < dirtyEntityRenderInfos.length; i++) {
      const renderInfo = dirtyEntityRenderInfos[i];
      cleanEntityRenderInfo(renderInfo, frameProgress);
   }

   // Reset dirty entities
   dirtyEntityRenderInfos.length = 0;
}