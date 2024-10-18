import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";

export interface IceShardComponentParams {}

export interface IceShardComponent {}

export const IceShardComponentArray = new ServerComponentArray<IceShardComponent, IceShardComponentParams, never>(ServerComponentType.iceShard, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(): IceShardComponentParams {
   return {};
}

function createComponent(): IceShardComponent {
   return {};
}

function padData(): void {}

function updateFromData(): void {}