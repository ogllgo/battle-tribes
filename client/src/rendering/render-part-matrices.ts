import { EntityRenderInfo, updateEntityRenderInfoRenderData } from "../EntityRenderInfo";
import { createIdentityMatrix, createTranslationMatrix, Matrix3x2, matrixMultiplyInPlace } from "./matrices";
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

const calculateHitboxMatrix = (renderInfo: EntityRenderInfo, hitbox: Hitbox, frameProgress: number): Matrix3x2 => {
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
   // @Speed: perhaps just modify the render info's vertex data
   
   calculateAndOverrideEntityModelMatrix(renderInfo);

   for (let i = 0; i < renderInfo.allRenderThings.length; i++) {
      const thing = renderInfo.allRenderThings[i];

      // Model matrix for the render part
      calculateAndOverrideRenderThingMatrix(thing);

      let parentRotation: number;
      let parentModelMatrix: Readonly<Matrix3x2>;
      if (renderParentIsHitbox(thing.parent)) {
         // @Speed? @Garbage: Should override
         parentModelMatrix = calculateHitboxMatrix(renderInfo, thing.parent, frameProgress);
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