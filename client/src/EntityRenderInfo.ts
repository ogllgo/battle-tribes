import { Point } from "battletribes-shared/utils";
import { Entity, EntityTypeString } from "battletribes-shared/entities";
import Board from "./Board";
import { removeLightsAttachedToRenderPart } from "./lights";
import { RenderPartOverlayGroup } from "./rendering/webgl/overlay-rendering";
import { removeRenderable } from "./rendering/render-loop";
import { VisualRenderPart, RenderPart } from "./render-parts/render-parts";
import { createIdentityMatrix } from "./rendering/matrices";
import { NUM_RENDER_LAYERS, RenderLayer } from "./render-layers";
import { registerDirtyRenderInfo, renderParentIsHitbox } from "./rendering/render-part-matrices";
import { getEntityLayer, getEntityType } from "./world";
import { getServerComponentArrays } from "./entity-components/ComponentArray";

export interface ComponentTint {
   readonly tintR: number;
   readonly tintG: number;
   readonly tintB: number;
}

export function createComponentTint(tintR: number, tintG: number, tintB: number): ComponentTint {
   return {
      tintR: tintR,
      tintG: tintG,
      tintB: tintB
   };
}

/** Internally contains all the information required to render an entity to the screen. */
export class EntityRenderInfo {
   public readonly associatedEntity: Entity;
   public readonly renderLayer: RenderLayer;
   public readonly renderHeight: number;

   public renderPosition = new Point(0, 0);
   public rotation = 0;

   /** Stores all render parts attached to the object, sorted ascending based on zIndex. (So that render part with smallest zIndex is rendered first) */
   public readonly allRenderThings = new Array<RenderPart>();

   public readonly renderPartOverlayGroups = new Array<RenderPartOverlayGroup>();
   
   public readonly modelMatrix = createIdentityMatrix();

   /** Amount the entity's render parts will shake */
   public shakeAmount = 0;

   /** Whether or not the entity has changed visually at all since its last dirty check */
   public renderPartsAreDirty = false;
   public renderPositionIsDirty = false;

   public tintR = 0;
   public tintG = 0;
   public tintB = 0;

   constructor(associatedEntity: Entity, renderLayer: RenderLayer, renderHeight: number) {
      this.associatedEntity = associatedEntity;
      this.renderLayer = renderLayer;
      this.renderHeight = renderHeight;
   }

   public attachRenderPart(renderPart: RenderPart): void {
      // Don't add if already attached
      if (this.allRenderThings.indexOf(renderPart) !== -1) {
         return;
      }

      // @Temporary?
      // @Incomplete: Check with the first render part up the chain
      // Make sure the render part has a higher z-index than its parent
      // if (thing.parent !== null && thing.zIndex <= thing.parent.zIndex) {
      //    throw new Error("Render part less-than-or-equal z-index compared to its parent.");
      // }

      // @Incomplete
      // Add to the array just after its parent

      // Add to the array of all render parts
      let idx = this.allRenderThings.length;
      for (let i = 0; i < this.allRenderThings.length; i++) {
         const currentRenderPart = this.allRenderThings[i];
         if (renderPart.zIndex < currentRenderPart.zIndex) {
            idx = i;
            break;
         }
      }
      this.allRenderThings.splice(idx, 0, renderPart);

      if (renderPart.parent !== null && !renderParentIsHitbox(renderPart.parent)) {
         renderPart.parent.children.push(renderPart);
      }
      
      Board.renderPartRecord[renderPart.id] = renderPart;

      registerDirtyRenderInfo(this);
   }

   public removeRenderPart(renderPart: VisualRenderPart): void {
      // Don't remove if already removed
      const idx = this.allRenderThings.indexOf(renderPart);
      if (idx === -1) {
         console.warn("Tried to remove when already removed!");
         return;
      }
      
      removeLightsAttachedToRenderPart(renderPart);

      delete Board.renderPartRecord[renderPart.id];
      
      // Remove from the root array
      this.allRenderThings.splice(this.allRenderThings.indexOf(renderPart), 1);
   }

   public getRenderThing(tag: string): RenderPart {
      for (let i = 0; i < this.allRenderThings.length; i++) {
         const renderThing = this.allRenderThings[i];

         if (renderThing.tags.includes(tag)) {
            return renderThing;
         }
      }

      throw new Error("No render part with tag '" + tag + "' could be found on entity type " + EntityTypeString[getEntityType(this.associatedEntity)]);
   }

   public getRenderThings(tag: string, expectedAmount?: number): Array<RenderPart> {
      const renderThings = new Array<RenderPart>();
      for (let i = 0; i < this.allRenderThings.length; i++) {
         const renderThing = this.allRenderThings[i];

         if (renderThing.tags.includes(tag)) {
            renderThings.push(renderThing);
         }
      }

      if (typeof expectedAmount !== "undefined" && renderThings.length !== expectedAmount) {
         throw new Error("Expected " + expectedAmount + " render parts with tag '" + tag + "' on " + EntityTypeString[getEntityType(this.associatedEntity)] + " but got " + renderThings.length);
      }
      
      return renderThings;
   }

   public removeOverlayGroup(overlayGroup: RenderPartOverlayGroup): void {
      const idx = this.renderPartOverlayGroups.indexOf(overlayGroup);
      if (idx !== -1) {
         this.renderPartOverlayGroups.splice(idx, 1);
      }
      
      removeRenderable(getEntityLayer(this.associatedEntity), overlayGroup, this.renderLayer);
   }

   public recalculateTint(): void {
      this.tintR = 0;
      this.tintG = 0;
      this.tintB = 0;

      // @Speed
      const serverComponentArrays = getServerComponentArrays();
      for (let i = 0; i < serverComponentArrays.length; i++) {
         const componentArray = serverComponentArrays[i];
         if (componentArray.hasComponent(this.associatedEntity) && typeof componentArray.calculateTint !== "undefined") {
            const tint = componentArray.calculateTint!(this.associatedEntity);

            this.tintR += tint.tintR;
            this.tintG += tint.tintG;
            this.tintB += tint.tintB;
         }
      }
   }
}