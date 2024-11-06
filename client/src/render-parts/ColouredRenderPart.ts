import { RenderPart } from "./render-parts";
import _VisualRenderPart from "./VisualRenderPart";

export interface RenderPartColour {
   r: number;
   g: number;
   b: number;
   a: number;
}

class ColouredRenderPart extends _VisualRenderPart {
   // @Memory: Split up
   // @Incomplete: alpha doesn't actually do anything
   public readonly colour: RenderPartColour;

   constructor(parent: RenderPart | null, zIndex: number, rotation: number, colour: RenderPartColour) {
      super(parent, zIndex, rotation);

      this.colour = colour;
   }
}

export default ColouredRenderPart;