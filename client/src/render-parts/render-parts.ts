import { Entity } from "../../../shared/src/entities";
import ColouredRenderPart from "./ColouredRenderPart";
import RenderAttachPoint from "./RenderAttachPoint";
import TexturedRenderPart from "./TexturedRenderPart";

export type VisualRenderPart = ColouredRenderPart | TexturedRenderPart;
export type RenderPart = VisualRenderPart | RenderAttachPoint;

export interface HitboxReference {
   readonly entity: Entity;
   readonly localID: number;
}

// @HACK: changing this from Hitbox to HitboxReference.
export type RenderPartParent = HitboxReference | RenderPart;

export function renderPartIsTextured(renderPart: VisualRenderPart): renderPart is TexturedRenderPart {
   return typeof (renderPart as TexturedRenderPart).textureArrayIndex !== "undefined";
}

export function thingIsVisualRenderPart(thing: Readonly<RenderPart>): thing is VisualRenderPart {
   return typeof (thing as VisualRenderPart).tintR !== "undefined";
}