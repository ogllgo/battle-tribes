import { halfWindowHeight, halfWindowWidth } from "../webgl";
import { PhysicsComponentArray } from "../entity-components/server-components/PhysicsComponent";
import { Settings } from "battletribes-shared/settings";
import { TransformComponentArray } from "../entity-components/server-components/TransformComponent";
import { getEntityRenderInfo } from "../world";
import { playerInstance } from "../player";

// @Cleanup: this is out of place

/** Updates the rotation of the player to match the cursor position */
export function updatePlayerRotation(cursorX: number, cursorY: number): void {
   if (playerInstance === null || cursorX === null || cursorY === null) return;

   const relativeCursorX = cursorX - halfWindowWidth;
   const relativeCursorY = -cursorY + halfWindowHeight;

   let cursorDirection = Math.atan2(relativeCursorY, relativeCursorX);
   cursorDirection = Math.PI/2 - cursorDirection;

   const transformComponent = TransformComponentArray.getComponent(playerInstance);
   const physicsComponent = PhysicsComponentArray.getComponent(playerInstance);
   
   const previousRotation = transformComponent.rotation;
   transformComponent.rotation = cursorDirection;
   transformComponent.relativeRotation = cursorDirection;

   // Angular velocity
   physicsComponent.angularVelocity = (transformComponent.rotation - previousRotation) * Settings.TPS;

   const renderInfo = getEntityRenderInfo(playerInstance);
   // @Temporary
   // registerDirtyRenderInfo(renderInfo);
}