import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";

export interface IceSpikesComponentParams {}

export interface IceSpikesComponent {}

export const IceSpikesComponentArray = new ServerComponentArray<IceSpikesComponent, IceSpikesComponentParams, never>(ServerComponentType.iceSpikes, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(): IceSpikesComponentParams {
   return {};
}

function createComponent(): IceSpikesComponent {
   return {};
}

function padData(): void {}

function updateFromData(): void {}