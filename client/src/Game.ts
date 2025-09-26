import { EntityDebugData } from "battletribes-shared/client-server-types";
import { Settings } from "battletribes-shared/settings";
import Board from "./Board";
import { isDev } from "./utils";
import { createTextCanvasContext, updateTextNumbers, renderText } from "./text-canvas";
import Camera from "./Camera";
import { updateSpamFilter } from "./components/game/ChatBox";
import { createEntityShaders } from "./rendering/webgl/entity-rendering";
import Client, { getLastPacketTime } from "./networking/Client";
import { calculateCursorWorldPositionX, calculateCursorWorldPositionY, cursorX, cursorY, handleMouseMovement, renderCursorTooltip } from "./mouse";
import { refreshDebugInfo, setDebugInfoDebugData } from "./components/game/dev/DebugInfo";
import { createTexture, createWebGLContext, gl, halfWindowHeight, halfWindowWidth, resizeCanvas, windowHeight, windowWidth } from "./webgl";
import { loadTextures, preloadTextureImages } from "./textures";
import { GameScreen_getGameInteractState, GameScreen_update, toggleSettingsMenu } from "./components/game/GameScreen";
import { createHitboxShaders, renderHitboxes } from "./rendering/webgl/box-wireframe-rendering";
import { clearServerTicks, updateDebugScreenFPS, updateDebugScreenRenderTime } from "./components/game/dev/GameInfoDisplay";
import { createWorldBorderShaders, renderWorldBorder } from "./rendering/webgl/world-border-rendering";
import { clearSolidTileRenderingData, createSolidTileShaders, renderSolidTiles } from "./rendering/webgl/solid-tile-rendering";
import { calculateVisibleRiverInfo, createRiverShaders, renderLowerRiverFeatures, renderUpperRiverFeatures } from "./rendering/webgl/river-rendering";
import { createChunkBorderShaders, renderChunkBorders } from "./rendering/webgl/chunk-border-rendering";
import { nerdVisionIsVisible } from "./components/game/dev/NerdVision";
import { createDebugDataShaders, renderLineDebugData, renderTriangleDebugData } from "./rendering/webgl/debug-data-rendering";
import { createTileShadowShaders, renderTileShadows, TileShadowType } from "./rendering/webgl/tile-shadow-rendering";
import { createWallBorderShaders, renderWallBorders } from "./rendering/webgl/wall-border-rendering";
import { ParticleRenderLayer, createParticleShaders, renderMonocolourParticles, renderTexturedParticles } from "./rendering/webgl/particle-rendering";
import OPTIONS from "./options";
import { RENDER_CHUNK_SIZE, createRenderChunks } from "./rendering/render-chunks";
import { registerFrame, updateFrameGraph } from "./components/game/dev/FrameGraph";
import { createNightShaders, renderLighting } from "./rendering/webgl/lighting-rendering";
import { renderGhostEntities } from "./rendering/webgl/entity-ghost-rendering";
import { setupFrameGraph } from "./rendering/webgl/frame-graph-rendering";
import { createTextureAtlases } from "./texture-atlases/texture-atlases";
import { createForcefieldShaders, renderForcefield } from "./rendering/webgl/world-border-forcefield-rendering";
import { playRiverSounds, loadSoundEffects, updateSounds } from "./sound";
import { createTechTreeGLContext, createTechTreeShaders, renderTechTree } from "./rendering/webgl/tech-tree-rendering";
import { createResearchOrbShaders, renderResearchOrb } from "./rendering/webgl/research-orb-rendering";
import { attemptToResearch, updateActiveResearchBench, updateResearchOrb } from "./research";
import { getHighlightedEntityID, getHighlightedRenderInfo, getSelectedEntityID, resetInteractableEntityIDs, updateHighlightedAndHoveredEntities, updateSelectedEntity } from "./entity-selection";
import { createStructureHighlightShaders, renderEntitySelection } from "./rendering/webgl/entity-selection-rendering";
import { InventorySelector_forceUpdate } from "./components/game/inventories/InventorySelector";
import { createTurretRangeShaders, renderTurretRange } from "./rendering/webgl/turret-range-rendering";
import { createPathfindNodeShaders, renderPathfindingNodes } from "./rendering/webgl/pathfinding-node-rendering";
import { updateInspectHealthBar } from "./components/game/HealthInspector";
import { createSafetyNodeShaders, renderSafetyNodes } from "./rendering/webgl/safety-node-rendering";
import { createRestrictedBuildingAreaShaders, renderRestrictedBuildingAreas } from "./rendering/webgl/restricted-building-areas-rendering";
import { createWallConnectionShaders, renderWallConnections } from "./rendering/webgl/wall-connection-rendering";
import { createHealingBeamShaders, renderHealingBeams } from "./rendering/webgl/healing-beam-rendering";
import { BuildMenu_refreshBuildingID, BuildMenu_updateBuilding } from "./components/game/BuildMenu";
import { createGrassBlockerShaders, renderGrassBlockers } from "./rendering/webgl/grass-blocker-rendering";
import { createTechTreeItemShaders, renderTechTreeItems, updateTechTreeItems } from "./rendering/webgl/tech-tree-item-rendering";
import { createUBOs, updateUBOs } from "./rendering/ubos";
import { createEntityOverlayShaders } from "./rendering/webgl/overlay-rendering";
import { calculateHitboxRenderPosition, dirtifyMovingEntities, getMatrixPosition, updateRenderPartMatrices } from "./rendering/render-part-matrices";
import { renderNextRenderables, resetRenderOrder } from "./rendering/render-loop";
import { MAX_RENDER_LAYER, RenderLayer } from "./render-layers";
import { preloadTextureAtlasImages } from "./texture-atlases/texture-atlas-stitching";
import { updatePlayerMovement, updatePlayerItems, playerIsHoldingPlaceableItem } from "./components/game/GameInteractableLayer";
import { refreshChunkedEntityRenderingBuffers } from "./rendering/webgl/chunked-entity-rendering";
import { entityExists, getCurrentLayer, getEntityLayer, getEntityRenderInfo, layers } from "./world";
import Layer from "./Layer";
import { createDarkeningShaders, renderDarkening } from "./rendering/webgl/darkening-rendering";
import { createLightDebugShaders, renderLightingDebug } from "./rendering/webgl/light-debug-rendering";
import { createTileBreakProgressShaders, renderTileBreakProgress } from "./rendering/webgl/tile-break-progress-rendering";
import { createCollapseParticles } from "./collapses";
import { createSubtileSupportShaders, renderSubtileSupports } from "./rendering/webgl/subtile-support-rendering";
import { createSlimeTrailShaders, renderSlimeTrails, updateSlimeTrails } from "./rendering/webgl/slime-trail-rendering";
import { createTribePlanVisualiserGLContext, renderTribePlans } from "./rendering/tribe-plan-visualiser/tribe-plan-visualiser";
import { createBuildingBlockingTileShaders, renderBuildingBlockingTiles } from "./rendering/webgl/building-blocking-tiles-rendering";
import { renderLightLevelsText } from "./rendering/light-levels-text-rendering";
import { createLightLevelsBGShaders, renderLightLevelsBG } from "./rendering/webgl/light-levels-bg-rendering";
import { createMithrilRichTileRenderingShaders, renderMithrilRichTileOverlays } from "./rendering/webgl/mithril-rich-tile-rendering";
import { createDebugImageShaders, renderDebugImages } from "./rendering/webgl/debug-image-rendering";
import { AnimalStaffOptions_update } from "./components/game/AnimalStaffOptions";
import { updateDebugEntity } from "./entity-debugging";
import { playerInstance } from "./player";
import { TamingMenu_forceUpdate } from "./components/game/taming-menu/TamingMenu";
import { cleanEntityTransform, TransformComponentArray } from "./entity-components/server-components/TransformComponent";
import { getHitboxVelocity, setHitboxAngularVelocity } from "./hitboxes";
import { callEntityOnUpdateFunctions, getComponentArrays } from "./entity-components/ComponentArray";
import { resolveEntityCollisions, resolvePlayerCollisions } from "./collision";
import { Point } from "../../shared/src/utils";

// @Cleanup: remove.
let _frameProgress = Number.EPSILON;

let listenersHaveBeenCreated = false;

let entityDebugData: EntityDebugData | null = null;

export let gameFramebuffer: WebGLFramebuffer;
export let gameFramebufferTexture: WebGLTexture;

let lastTextureWidth = 0;
let lastTextureHeight = 0;

const cursorWorldPos = new Point(0, 0);

let lastRenderTime = Math.floor(new Date().getTime() / 1000);

let serverTickInterp = 0;

// @Cleanup: remove.
export function getFrameProgress(): number {
   return _frameProgress;
}

export function getCursorWorldPos(): Readonly<Point> {
   return cursorWorldPos;
}

export function resetServerTickInterp(): void {
   serverTickInterp = 0;
}

const createEventListeners = (): void => {
   if (listenersHaveBeenCreated) return;
   listenersHaveBeenCreated = true;

   window.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Escape" && Game.isRunning) {
         toggleSettingsMenu();
      }
   });

   window.addEventListener("mousemove", handleMouseMovement);
}

// @Location
/** Updates the rotation of the player to match the cursor position */
const updatePlayerRotation = (cursorX: number, cursorY: number): void => {
   if (playerInstance === null || cursorX === null || cursorY === null) return;

   const relativeCursorX = cursorX - halfWindowWidth;
   const relativeCursorY = -cursorY + halfWindowHeight;

   let cursorDirection = Math.atan2(relativeCursorY, relativeCursorX);
   cursorDirection = Math.PI/2 - cursorDirection;

   const transformComponent = TransformComponentArray.getComponent(playerInstance);
   const playerHitbox = transformComponent.hitboxes[0];
   
   const previousRelativeAngle = playerHitbox.box.relativeAngle;

   // @HACK: without this silliness occurs
   if (playerHitbox.parent === null) {
      playerHitbox.box.angle = playerHitbox.box.relativeAngle;
   }
   playerHitbox.box.relativeAngle = cursorDirection - playerHitbox.box.angle + playerHitbox.box.relativeAngle;

   // Angular velocity
   setHitboxAngularVelocity(playerHitbox, (playerHitbox.box.relativeAngle - previousRelativeAngle) * Settings.TICK_RATE);

   const renderInfo = getEntityRenderInfo(playerInstance);
   // @Temporary
   // registerDirtyRenderInfo(renderInfo);
}

/** Update and tick all entities EXCEPT the player. */
const simulateTick = (): void => {
   const componentArrays = getComponentArrays();
   
   for (let i = 0; i < componentArrays.length; i++) {
      const componentArray = componentArrays[i];
      if (typeof componentArray.onUpdate !== "undefined") {
         for (let j = 0; j < componentArray.activeEntities.length; j++) {
            const entity = componentArray.activeEntities[j];
            if (entity !== playerInstance) {
               componentArray.onUpdate(entity);
            }
         }
      }
      if (typeof componentArray.onTick !== "undefined") {
         for (let j = 0; j < componentArray.activeEntities.length; j++) {
            const entity = componentArray.activeEntities[j];
            if (entity !== playerInstance) {
               componentArray.onTick(entity);
            }
         }
      }
      
      componentArray.deactivateQueue();
   }
   
   // Resolve collisions
   for (const layer of layers) {
      resolveEntityCollisions(layer);
   }
}

const runFrame = (currentTime: number): void => {
   if (Game.isSynced) {
      const deltaTime = currentTime - Game.lastTime;
      Game.lastTime = currentTime;
   
      // send player packets to server
      Game.lag += deltaTime;
      while (Game.lag >= 1000 / Settings.CLIENT_PACKET_SEND_RATE) {
         Client.sendPlayerDataPacket();
         Game.lag -= 1000 / Settings.CLIENT_PACKET_SEND_RATE;
      }

      // Tick the player (independently from all other entities)
      Game.lag2 += deltaTime;
      while (Game.lag2 >= 1000 / Settings.TICK_RATE) {
         if (playerInstance !== null) {
            callEntityOnUpdateFunctions(playerInstance);
            resolvePlayerCollisions();
         }

         Game.lag2 -= 1000 / Settings.TICK_RATE;
         
         Board.clientTicks++;
         
         updateSpamFilter();

         Camera.applyCameraKinematics();
         
         updatePlayerItems();
         updateActiveResearchBench();
         updateResearchOrb();
         attemptToResearch();

         const gameInteractState = GameScreen_getGameInteractState();
         // @Cleanup: can probs just combine these 2
         updateHighlightedAndHoveredEntities(gameInteractState);
         updateSelectedEntity(gameInteractState);
         BuildMenu_updateBuilding();
         BuildMenu_refreshBuildingID();
         AnimalStaffOptions_update();
         // @Incomplete?
         // updateInspectHealthBar();
         InventorySelector_forceUpdate();
         // @Hack @Speed
         TamingMenu_forceUpdate();

         updateTechTreeItems();
         
         updateSounds();
         playRiverSounds();

         createCollapseParticles();
         updateSlimeTrails();

         if (isDev()) refreshDebugInfo();
         updateDebugEntity();
      }

      serverTickInterp += deltaTime / 1000 * Settings.TICK_RATE;
      // For interps >= 1, we simulate a tick
      while (serverTickInterp >= 1) {
         serverTickInterp--;
         simulateTick();
      }
      
      const renderStartTime = performance.now();

      const clientTickInterp = Game.lag2 / 1000 * Settings.TICK_RATE;
      Game.render(serverTickInterp, clientTickInterp);

      const renderEndTime = performance.now();

      const renderTime = renderEndTime - renderStartTime;
      registerFrame(renderStartTime, renderEndTime);
      updateFrameGraph();
      updateDebugScreenRenderTime(renderTime);

      GameScreen_update();
      updateTextNumbers();
      Board.updateTickCallbacks();
      Board.updateParticles();
      
      updatePlayerMovement();

      cursorWorldPos.x = calculateCursorWorldPositionX(cursorX!) || 0;
      cursorWorldPos.y = calculateCursorWorldPositionY(cursorY!) || 0;
      renderCursorTooltip();
   }

   if (Game.isRunning) {
      requestAnimationFrame(runFrame);
   }
}

const renderLayer = (layer: Layer, frameProgress: number): void => {
   if (layer === getCurrentLayer()) {
      renderText(frameProgress);
   }
   
   resetRenderOrder();

   gl.bindFramebuffer(gl.FRAMEBUFFER, gameFramebuffer);

   // @Incomplete: A whole lot of these are not layer specific

   renderTileShadows(layer, TileShadowType.dropdownShadow);

   renderSolidTiles(layer, false);
   renderMithrilRichTileOverlays(layer, false);
   renderGrassBlockers();

   renderTurretRange();

   if (nerdVisionIsVisible() && entityDebugData !== null && entityExists(entityDebugData.entityID)) {
      renderTriangleDebugData(entityDebugData);
   }
   renderRestrictedBuildingAreas();
   if (nerdVisionIsVisible() && OPTIONS.showChunkBorders) {
      renderChunkBorders(Camera.minVisibleChunkX, Camera.maxVisibleChunkX, Camera.minVisibleChunkY, Camera.maxVisibleChunkY, Settings.CHUNK_SIZE, 1);
   }
   if (nerdVisionIsVisible() && OPTIONS.showRenderChunkBorders) {
      renderChunkBorders(Camera.minVisibleRenderChunkX, Camera.maxVisibleRenderChunkX, Camera.minVisibleRenderChunkY, Camera.maxVisibleRenderChunkY, RENDER_CHUNK_SIZE, 2);
   }

   // @Incomplete: Not layer specific
   renderHealingBeams();

   renderSlimeTrails(layer);

   refreshChunkedEntityRenderingBuffers(layer);

   const visibleRiverRenderChunks = calculateVisibleRiverInfo(layer);

   renderLowerRiverFeatures(layer, visibleRiverRenderChunks);
   // Render everything up to fish
   renderNextRenderables(layer, RenderLayer.fish);
   renderUpperRiverFeatures(layer, visibleRiverRenderChunks);
   if (OPTIONS.showParticles) {
      renderMonocolourParticles(ParticleRenderLayer.low);
      renderTexturedParticles(ParticleRenderLayer.low);
   }
   // Render up to walls
   renderNextRenderables(layer, RenderLayer.WALL_SEPARATOR);

   // Render walls
   renderTileShadows(layer, TileShadowType.wallShadow);
   renderSolidTiles(layer, true);
   renderMithrilRichTileOverlays(layer, true);
   renderTileBreakProgress(layer);
   renderWallBorders(layer);

   // Render everything else
   renderNextRenderables(layer, MAX_RENDER_LAYER);

   // @Cleanup: should this only be for the current layer?
   // @Cleanup this is so messy
   if (entityExists(getSelectedEntityID())) {
      const renderInfo = getEntityRenderInfo(getSelectedEntityID());
      renderEntitySelection(renderInfo, frameProgress, true);
   }
   const renderInfo = getHighlightedRenderInfo();
   if (renderInfo !== null && getHighlightedEntityID() !== getSelectedEntityID()) {
      renderEntitySelection(renderInfo, frameProgress, false);
   }
   
   renderForcefield();
   renderWorldBorder();
   
   if (OPTIONS.showParticles) {
      renderMonocolourParticles(ParticleRenderLayer.high);
      renderTexturedParticles(ParticleRenderLayer.high);
   }

   renderPathfindingNodes();
   renderSafetyNodes();
   renderWallConnections();
   renderResearchOrb();

   if (OPTIONS.showHitboxes) {
      renderHitboxes(layer);
   }
   if (nerdVisionIsVisible() && entityDebugData !== null && entityExists(entityDebugData.entityID)) {
      renderLineDebugData(entityDebugData);
   }

   renderGhostEntities();

   // Should be before lighting so that the player can't use building blocking tiles to see in the dark
   if (layer === getCurrentLayer() && playerIsHoldingPlaceableItem()) {
      renderBuildingBlockingTiles();
   }
      
   gl.bindFramebuffer(gl.FRAMEBUFFER, null);

   renderLighting(layer);
   if (OPTIONS.debugLights) {
      renderLightingDebug(layer);
   }

   if (OPTIONS.debugTethers) {
      // @Incomplete: not per layer
      renderDebugImages();
   }
}

abstract class Game {
   public static lastTime = 0;

   public static isRunning = false;

   /** If the game has recevied up-to-date game data from the server. Set to false when paused */
   // @Cleanup: We might be able to remove this whole system by just always sending player data. But do we want to do that???
   public static isSynced = true;

   public static hasInitialised = false;

   /** Amount of time the game is through the current frame */
   public static lag = 0;
   public static lag2 = 0;

   public static setGameObjectDebugData(newEntityDebugData: EntityDebugData | null): void {
      entityDebugData = newEntityDebugData;
      setDebugInfoDebugData(entityDebugData);
   }

   public static getEntityDebugData(): EntityDebugData | null {
      return entityDebugData || null;
   }

   /** Starts the game */
   public static start(): void {
      createEventListeners();
      resizeCanvas();

      // Set the player's initial rotation
      if (cursorX !== null && cursorY !== null) {
         updatePlayerRotation(cursorX, cursorY);
      }
               
      // Start the game loop
      this.isSynced = true;
      this.isRunning = true;
      this.lastTime = performance.now();
      requestAnimationFrame(runFrame);
   }

   public static stop(): void {
      this.isRunning = false;
   }
   
   public static sync(): void {
      Game.lastTime = performance.now();
      this.isSynced = true;
   }
   
   /**
    * Prepares the game to be played. Called once just before the game starts.
    */
   public static async initialise(): Promise<void> {
      resetInteractableEntityIDs();
      
      if (!Game.hasInitialised) {
         return new Promise(async resolve => {
            const start = performance.now();
            let l = performance.now();
            createWebGLContext();
            createTechTreeGLContext();
            createTextCanvasContext();
            createTribePlanVisualiserGLContext();

            console.log("creating contexts",performance.now() - l);
            l = performance.now();
            
            clearSolidTileRenderingData();
            for (const layer of layers) {
               createRenderChunks(layer, layer.waterRocks, layer.riverSteppingStones);
            }
         
            preloadTextureAtlasImages();
            const textureImages = preloadTextureImages();

            console.log("preloading images",performance.now() - l);
            l = performance.now();
            // @Speed
            await loadSoundEffects();
            
            console.log("audio",performance.now() - l);
            l = performance.now();
            // We load the textures before we create the shaders because some shader initialisations stitch textures together
            await loadTextures(textureImages);
            console.log("loading textures",performance.now() - l);
            // @Hack
            await new Promise<void>(resolve => {
               setTimeout(() => {
                  resolve();
               }, 1000)
            });
            l = performance.now();
            // @Speed
            await createTextureAtlases();
            console.log("texture atlases",performance.now() - l);
            l = performance.now();
            
            // Done after creating texture atlases as the data from them is used in a ubo
            createUBOs();

            // @Cleanup: Move to separate function
            gameFramebuffer = gl.createFramebuffer()!;

            // Create shaders
            createSolidTileShaders();
            createRiverShaders();
            createEntityShaders();
            await createEntityOverlayShaders();
            createWorldBorderShaders();
            createChunkBorderShaders();
            createHitboxShaders();
            createDebugDataShaders();
            createNightShaders();
            createParticleShaders();
            createWallBorderShaders();
            createDarkeningShaders();
            createTileShadowShaders();
            createForcefieldShaders();
            createTechTreeShaders();
            createTechTreeItemShaders();
            createResearchOrbShaders();
            createStructureHighlightShaders();
            createTurretRangeShaders();
            createPathfindNodeShaders();
            createSafetyNodeShaders();
            createRestrictedBuildingAreaShaders();
            createWallConnectionShaders();
            createHealingBeamShaders();
            createGrassBlockerShaders();
            createLightDebugShaders();
            createTileBreakProgressShaders();
            createSubtileSupportShaders();
            createSlimeTrailShaders();
            createBuildingBlockingTileShaders();
            createLightLevelsBGShaders();
            createMithrilRichTileRenderingShaders();
            createDebugImageShaders();
            if (isDev()) {
               setupFrameGraph();
            }

            console.log("shader stuff",performance.now() - l);
            l = performance.now();

            console.log("render chunks",performance.now() - l);
            console.log(performance.now() - start);
            this.hasInitialised = true;

            resolve();
         });
      } else {
         clearSolidTileRenderingData();
         for (const layer of layers) {
            createRenderChunks(layer, layer.waterRocks, layer.riverSteppingStones);
         }
      }
   }

   /**
    * 
    * @param serverTickInterp How far the game is into the current frame (0 = frame just started, 0.99 means frame is about to end)
    */
   public static render(serverTickInterp: number, clientTickInterp: number): void {
      // Player rotation is updated each render, but only sent each update
      if (cursorX !== null && cursorY !== null) {
         updatePlayerRotation(cursorX, cursorY);
      }
      
      const currentRenderTime = performance.now(); // @Speed
      if (Math.floor(currentRenderTime / 1000) !== Math.floor(lastRenderTime / 1000)) {
         clearServerTicks();
      }
      const deltaTime = (currentRenderTime - lastRenderTime) / 1000;
      lastRenderTime = currentRenderTime;

      gl.bindFramebuffer(gl.FRAMEBUFFER, gameFramebuffer);
   
      if (lastTextureWidth !== windowWidth || lastTextureHeight !== windowHeight) {
         gameFramebufferTexture = createTexture(windowWidth, windowHeight);
   
         lastTextureWidth = windowWidth;
         lastTextureHeight = windowHeight;
      
         // Attach the texture as the first color attachment
         const attachmentPoint = gl.COLOR_ATTACHMENT0;
         gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, gameFramebufferTexture, 0);
      }

      // Reset the framebuffer
      gl.clearColor(1, 1, 1, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      // @Cleanup: weird. shouldn't be global anyway
      _frameProgress = serverTickInterp;

      const playerLayer = getCurrentLayer();

      updateUBOs();

      // @BUG: if this isn't here then the camera stutters like crazy when riding something.
      {
         const trackedEntityTransformComponent = TransformComponentArray.getComponent(Camera.trackedEntity);
         const trackedEntityHitbox = trackedEntityTransformComponent.hitboxes[0];
         const rootTrackedEntity = trackedEntityHitbox.rootEntity;
         const rootTrackedEntityTransformComponent = TransformComponentArray.getComponent(rootTrackedEntity);
         const rootTrackedEntityHitbox = rootTrackedEntityTransformComponent.hitboxes[0];

         if (rootTrackedEntity !== playerInstance) {

            trackedEntityHitbox.box.position.x = rootTrackedEntityHitbox.box.position.x;
            trackedEntityHitbox.box.position.y = rootTrackedEntityHitbox.box.position.y;
            trackedEntityHitbox.previousPosition.x = rootTrackedEntityHitbox.previousPosition.x;
            trackedEntityHitbox.previousPosition.y = rootTrackedEntityHitbox.previousPosition.y;

         }
         // cleanEntityTransform(playerInstance!);
      }

      dirtifyMovingEntities();
      updateRenderPartMatrices(serverTickInterp, clientTickInterp);

      // @Cleanup: move to update function in camera
      // Update the camera
      if (!Camera.isSpectating) {
         // @CRASH when the player dies
         const trackedEntityTransformComponent = TransformComponentArray.getComponent(Camera.trackedEntity);
         const trackedEntityHitbox = trackedEntityTransformComponent.hitboxes[0];
         const rootTrackedEntity = trackedEntityHitbox.rootEntity;
         
         const tickInterp = rootTrackedEntity === playerInstance ? clientTickInterp : serverTickInterp;
         Camera.updatePosition(tickInterp);
      } else {
         Camera.updateSpectatorPosition(deltaTime);
      }
      Camera.updateVisibleChunkBounds();
      Camera.updateVisibleRenderChunkBounds();

      // @Hack
      if (layers.indexOf(playerLayer) === 0) {
         renderLayer(layers[1], serverTickInterp);
         renderDarkening();
         renderLayer(layers[0], serverTickInterp);
      } else {
         renderLayer(layers[1], serverTickInterp);
      }

      if (OPTIONS.showSubtileSupports) {
         renderSubtileSupports();
      }

      if (OPTIONS.showLightLevels) {
         renderLightLevelsBG();
         renderLightLevelsText();
      }

      updateDebugScreenFPS();
      updateInspectHealthBar();
      
      renderTechTree();
      renderTechTreeItems();

      renderTribePlans();
   }
}

export default Game;