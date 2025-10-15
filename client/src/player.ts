import { Entity } from "../../shared/src/entities";
import { selectItemSlot } from "./components/game/GameInteractableLayer";
import { GameScreen_update, gameScreenSetIsDead } from "./components/game/GameScreen";
import { definiteGameState, latencyGameState } from "./game-state/game-states";
import { closeCurrentMenu } from "./menus";

// Doing it this way by importing the value directly (instead of calling a function to get it) will cause some overhead when accessing it,
// but this is in the client so these optimisations are less important. The ease-of-use is worth it
/** The player entity associated with the current player. If null, then the player is dead */
export let playerInstance: Entity | null = null;

const onPlayerRespawn = (): void => {
   selectItemSlot(1);
   gameScreenSetIsDead(false);
}

const onPlayerDeath = (): void => {
   latencyGameState.resetFlags();
   definiteGameState.resetFlags();

   gameScreenSetIsDead(true);
   
   // Close any open menus
   closeCurrentMenu();

   // We want the hotbar to refresh now to show the empty hotbar
   // This will propagate down to refresh the hotbar.
   // @CLEANUP bruuuh this is just to update the hotbar. React.js shittery.
   GameScreen_update();
}

export function setPlayerInstance(newPlayerInstance: Entity | null): void {
   if (playerInstance === null && newPlayerInstance !== null) {
      onPlayerRespawn();
   } else if (playerInstance !== null && newPlayerInstance === null) {
      onPlayerDeath();
   }
   playerInstance = newPlayerInstance;
}