import { Entity } from "../../shared/src/entities";

// Doing it this way by importing the value directly (instead of calling a function to get it) will cause some overhead when accessing it,
// but this is in the client so these optimisations are less important. The ease-of-use is worth it
/** The player entity associated with the current player. If null, then the player is dead */
export let playerInstance: Entity | null = null;

export function setPlayerInstance(entity: Entity | null): void {
   playerInstance = entity;
}