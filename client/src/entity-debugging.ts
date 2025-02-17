import { Entity } from "../../shared/src/entities";
import Camera from "./Camera";
import { nerdVisionIsVisible } from "./components/game/dev/NerdVision";
import { getMouseTargetEntity } from "./mouse";
import { sendSetDebugEntityPacket } from "./networking/packet-creation";
import { isDev } from "./utils";
import { entityExists, playerInstance } from "./world";

let previousDebugEntity = 0;

export function updateDebugEntity(): void {
   if (!isDev()) {
      return;
   }
   
   let debugEntity: Entity;
   if (entityExists(Camera.trackedEntityID) && Camera.trackedEntityID !== playerInstance) {
      debugEntity = Camera.trackedEntityID;
   } else if (nerdVisionIsVisible()) {
      const targettedEntity = getMouseTargetEntity();
      debugEntity = targettedEntity !== null ? targettedEntity : 0;
   } else {
      debugEntity = 0;
   }

   if (debugEntity !== previousDebugEntity) {
      sendSetDebugEntityPacket(debugEntity);
   }
   previousDebugEntity = debugEntity;
}