import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './components/App';
import { createPlayerInputListeners } from './components/game/GameInteractableLayer';
import { toggleSettingsMenu } from './components/game/GameScreen';
import { gameIsRunning } from './client';

import "./css/index.css";
import "./css/main-menu.css";
import "./css/loading-screen.css";
import "./css/game/chatbox.css";
import "./css/game/menus/settings.css";
import "./css/game/death-screen.css";
import "./css/game/health-bar.css";
import "./css/game/inventories/inventory.css";
import "./css/game/inventories/hotbar.css";
import "./css/game/inventories/cooking-inventory.css";
import "./css/game/inventories/tribesman-inventory.css";
import "./css/game/inventories/barrel-inventory.css";
import "./css/game/inventories/backpack-inventory.css";
import "./css/game/inventories/tombstone-epitaph.css";
import "./css/game/inventories/ammo-box-inventory.css";
import "./css/game/inventories/item-tooltip.css";
import "./css/game/charge-meter.css";
import "./css/game/menus/crafting-menu.css";
import "./css/game/nerd-vision/nerd-vision.css";
import "./css/game/nerd-vision/game-info-display.css";
import "./css/game/nerd-vision/cursor-tooltip.css";
import "./css/game/nerd-vision/terminal-button.css";
import "./css/game/nerd-vision/terminal.css";
import "./css/game/nerd-vision/debug-info.css";
import "./css/game/nerd-vision/frame-graph.css";
import "./css/game/tech-tree.css";
import "./css/game/tech-infocard.css";
import "./css/game/research-bench-caption.css";
import "./css/game/build-menu.css";
import "./css/game/health-inspector.css";
import "./css/game/infocards.css";
import "./css/game/attack-charge-bar.css";
import "./css/game/layer-change-message.css";
import "./css/game/tribe-plan-visualiser.css";
import "./css/game/animal-staff-options.css";
import "./css/game/select-carry-target-cursor-overlay.css";
import "./css/game/taming-menu.css";
import "./css/game/sign-inscribe-menu.css";
import "./css/game/cow-stamina-bar.css";
import "./css/game/spectator-controls.css";

// We have to manually import this so that the component arrays are all detected
import "./entity-components/components";

const root = ReactDOM.createRoot(
   document.getElementById('root') as HTMLElement
);

const renderApp = (Component: React.FC) => {
  root.render(
    <React.StrictMode>
      <Component />
    </React.StrictMode>
  );
};

renderApp(App);

window.addEventListener("load", () => {
   createPlayerInputListeners();
});
window.addEventListener("keydown", (e: KeyboardEvent) => {
   if (e.key === "Escape" && gameIsRunning) {
      toggleSettingsMenu();
   }
});

// Mouse movement handled in mouse.ts

// Enable Hot Module Replacement (HMR)
if (module.hot) {
   module.hot.accept();
}