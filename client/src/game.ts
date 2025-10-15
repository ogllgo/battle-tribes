import { EntityDebugData } from "battletribes-shared/client-server-types";
import { Settings } from "battletribes-shared/settings";
import Board from "./Board";
import { isDev } from "./utils";
import { createTextCanvasContext, updateTextNumbers, renderText } from "./text-canvas";
import { maxVisibleChunkX, maxVisibleChunkY, maxVisibleRenderChunkX, maxVisibleRenderChunkY, minVisibleChunkX, minVisibleChunkY, minVisibleRenderChunkX, minVisibleRenderChunkY, refreshCameraPosition, refreshCameraView } from "./camera";
import { updateSpamFilter } from "./components/game/ChatBox";
import { createEntityShaders } from "./rendering/webgl/entity-rendering";
import { cursorScreenPos, renderCursorTooltip } from "./mouse";
import { refreshDebugInfo, setDebugInfoDebugData } from "./components/game/dev/DebugInfo";
import { createTexture, createWebGLContext, gl, halfWindowHeight, halfWindowWidth, resizeCanvas, windowHeight, windowWidth } from "./webgl";
import { loadTextures, preloadTextureImages } from "./textures";
import { GameScreen_getGameInteractState, GameScreen_update } from "./components/game/GameScreen";
import { createHitboxShaders, renderHitboxes } from "./rendering/webgl/box-wireframe-rendering";
import { GameInfoDisplay_setBufferSize, updateDebugScreen, updateDebugScreenRenderTime } from "./components/game/dev/GameInfoDisplay";
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
import { dirtifyMovingEntities, entityUsesClientInterp, registerDirtyRenderInfo, updateRenderPartMatrices } from "./rendering/render-part-matrices";
import { renderNextRenderables, resetRenderOrder } from "./rendering/render-loop";
import { MAX_RENDER_LAYER, RenderLayer } from "./render-layers";
import { preloadTextureAtlasImages } from "./texture-atlases/texture-atlas-stitching";
import { updatePlayerMovement, updatePlayerItems, playerIsHoldingPlaceableItem } from "./components/game/GameInteractableLayer";
import { refreshChunkedEntityRenderingBuffers } from "./rendering/webgl/chunked-entity-rendering";
import { entityExists, getCurrentLayer, getEntityRenderInfo, layers } from "./world";
import Layer from "./Layer";
import { createDarkeningShaders, renderLayerDarkening } from "./rendering/webgl/layer-darkening-rendering";
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
import { TransformComponentArray } from "./entity-components/server-components/TransformComponent";
import { setHitboxAngle, setHitboxObservedAngularVelocity } from "./hitboxes";
import { callEntityOnUpdateFunctions } from "./entity-components/ComponentArray";
import { resolvePlayerCollisions } from "./collision";
import { CowStaminaBar_forceUpdate } from "./components/game/CowStaminaBar";
import { updateBox } from "../../shared/src/boxes/boxes";
import { PacketReader } from "../../shared/src/packets";
import { decodeSnapshotFromGameDataPacket, PacketSnapshot, updateGameToSnapshot } from "./networking/packet-snapshots";
import { angle } from "../../shared/src/utils";
import Client from "./networking/Client";

const SNAPSHOT_BUFFER_LENGTH = 2;

let entityDebugData: EntityDebugData | null = null;

export let gameFramebuffer: WebGLFramebuffer;
export let gameFramebufferTexture: WebGLTexture;

// @Cleanup: this is ambiguous... what texture? should this be here??
let lastTextureWidth = 0;
let lastTextureHeight = 0;

let lastFrameTime = 0;

let clientTick = 0;
let clientTickInterp = 0;

const snapshotBuffer = new Array<PacketSnapshot>();
export let currentSnapshot: PacketSnapshot;
export let nextSnapshot: PacketSnapshot;

/** The number of ticks it takes for the measured server packet interval to fully adjust (if going from a constant tps of A to a constant tps of B) */
const PACKET_INTERVAL_ADJUST_TIME = 10;
let lastPacketTime = 0;
let measuredServerPacketIntervalMS = 1000 / Settings.SERVER_PACKET_SEND_RATE; // Start it off at the value we expect it to be at

let playerPacketAccumulator = 0;

document.addEventListener("visibilitychange", () => {
   if (document.visibilityState === "visible") {
      lastPacketTime = performance.now();
   }
})

export function receivePacket(reader: PacketReader): void {
   const snapshot = decodeSnapshotFromGameDataPacket(reader);
   snapshotBuffer.push(snapshot);
   GameInfoDisplay_setBufferSize(snapshotBuffer.length);

   const timeNow = performance.now();
   
   const delta = timeNow - lastPacketTime;

   // Calculate new server packet interval using la "Exponential Moving Average"
   const smoothingFactor = 2 / (PACKET_INTERVAL_ADJUST_TIME + 1);
   measuredServerPacketIntervalMS = measuredServerPacketIntervalMS * (1 - smoothingFactor) + smoothingFactor * delta;
   
   lastPacketTime = timeNow;
}

export function receiveInitialPacket(reader: PacketReader): void {
   lastPacketTime = performance.now();
   
   receivePacket(reader);

   const snapshot = snapshotBuffer[0]; // @Hack since we dont have the snapshot variable from inside receivePacket
   updateGameToSnapshot(snapshot);
   currentSnapshot = snapshot;
   clientTick = snapshot.tick; // Start the client tick off at the tick of the very first packet received.
}

export function setCurrentSnapshot(snapshot: PacketSnapshot): void {
   currentSnapshot = snapshot;
}

export function getMeasuredServerTPS(): number {
   return 1000 / measuredServerPacketIntervalMS;
}

export function tickIntervalHasPassed(intervalSeconds: number): boolean {
   const currentTick = Math.floor(clientTick);
   
   const ticksPerInterval = intervalSeconds * Settings.TICK_RATE;
   
   const previousCheck = (currentTick - 1) / ticksPerInterval;
   const check = currentTick / ticksPerInterval;
   return Math.floor(previousCheck) !== Math.floor(check);
}

// @Location
/** Updates the rotation of the player to match the cursor position */
const updatePlayerRotation = (): void => {
   if (playerInstance === null) return;

   const relativeCursorX = cursorScreenPos.x - halfWindowWidth;
   const relativeCursorY = -cursorScreenPos.y + halfWindowHeight;

   const cursorDirection = angle(relativeCursorX, relativeCursorY);

   const transformComponent = TransformComponentArray.getComponent(playerInstance);
   const playerHitbox = transformComponent.hitboxes[0];
   
   const previousAngle = playerHitbox.box.angle;

   setHitboxAngle(playerHitbox, cursorDirection);
   // We've changed the relative angle, in a weird place where idk if its guaranteed that it will be cleaned in time for it to register correctly.
   // so now do this
   if (playerHitbox.parent !== null) {
      updateBox(playerHitbox.box, playerHitbox.parent.box);
   } else {
      playerHitbox.box.angle = playerHitbox.box.relativeAngle;
   }

   // Angular velocity
   // We don't use relativeAngle here cuz that wouldn't work for when the player is mounted.
   // setHitboxAngularVelocity(playerHitbox, (playerHitbox.box.angle - previousAngle) * Settings.TICK_RATE);
   setHitboxObservedAngularVelocity(playerHitbox, 0);

   const renderInfo = getEntityRenderInfo(playerInstance);
   registerDirtyRenderInfo(renderInfo);
}

const runFrame = (frameStartTime: number): void => {
   if (Game.isSynced) {
      const deltaTimeMS = frameStartTime - lastFrameTime;
      lastFrameTime = frameStartTime;

      // Calculate the client tick's error
      const serverTick = snapshotBuffer[snapshotBuffer.length - 1].tick;
      const delayTicks = serverTick - clientTick;
      const errorTicks = delayTicks + Settings.TICK_RATE / Settings.SERVER_PACKET_SEND_RATE;

      const timeDilationFactor = errorTicks < -0.5 || errorTicks > 0.5 ? 1 + 0.15 * errorTicks : 1;
      
      // Delta tick accounting for the ACTUAL tps of the server
      const deltaTick = deltaTimeMS / measuredServerPacketIntervalMS * Settings.TICK_RATE / Settings.SERVER_PACKET_SEND_RATE;

      clientTick += deltaTick * timeDilationFactor;
      
      // Calculate the subtick time to render at (render tick)
      const renderTick = clientTick - SNAPSHOT_BUFFER_LENGTH * Settings.TICK_RATE / Settings.SERVER_PACKET_SEND_RATE;

      // Make sure the current snapshot is the min snapshot
      for (let i = 0; i < snapshotBuffer.length; i++) {
         const snapshot = snapshotBuffer[i];
         if (snapshot.tick < renderTick && snapshot.tick > currentSnapshot.tick) {
            updateGameToSnapshot(snapshot);
            currentSnapshot = snapshot;
         }
      }

      // Snapshots older than the current one are now useless
      while (snapshotBuffer.length > 0) {
         const snapshot = snapshotBuffer[0];
         if (snapshot.tick < currentSnapshot.tick) {
            snapshotBuffer.splice(0, 1);
         } else {
            break;
         }
      }
      GameInfoDisplay_setBufferSize(snapshotBuffer.length);

      // @Cleanup kinda unclear at a glance
      nextSnapshot = (snapshotBuffer[snapshotBuffer.indexOf(currentSnapshot) + 1]) || currentSnapshot;

      const serverTickInterp = (renderTick - currentSnapshot.tick) / (nextSnapshot.tick - currentSnapshot.tick);
   
      // send player packets to server
      playerPacketAccumulator += deltaTick;
      while (playerPacketAccumulator >= Settings.TICK_RATE / Settings.CLIENT_PACKET_SEND_RATE) {
         Client.sendPlayerDataPacket();
         playerPacketAccumulator -= Settings.TICK_RATE / Settings.CLIENT_PACKET_SEND_RATE;
      }

      // Tick the player (independently from all other entities)
      clientTickInterp += deltaTick;
      while (clientTickInterp >= 1) {
         // @Cleanup: this function name i think is a lil weird for something which the contents of the if updates the player.
         if (playerInstance !== null && entityUsesClientInterp(playerInstance)) {
            callEntityOnUpdateFunctions(playerInstance);
            resolvePlayerCollisions();
         }

         clientTickInterp--;

         // Tick all entities (cuz the client interp loop is based on the network update rate not the tick rate)
         Board.tickEntities();
         
         updateSpamFilter();

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
         CowStaminaBar_forceUpdate();

         updateTechTreeItems();
         
         updateSounds();
         playRiverSounds();

         createCollapseParticles();
         updateSlimeTrails();

         if (isDev()) refreshDebugInfo();
         updateDebugEntity();
      }

      Game.render(clientTickInterp, serverTickInterp);

      const renderEndTime = performance.now();
      const renderTimeTaken = renderEndTime - frameStartTime;
      registerFrame(frameStartTime, renderEndTime);
      updateFrameGraph();
      updateDebugScreenRenderTime(renderTimeTaken);

      GameScreen_update();
      updateTextNumbers();
      Board.updateTickCallbacks();
      Board.updateParticles();
      
      updatePlayerMovement();

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
      renderChunkBorders(minVisibleChunkX, maxVisibleChunkX, minVisibleChunkY, maxVisibleChunkY, Settings.CHUNK_SIZE, 1);
   }
   if (nerdVisionIsVisible() && OPTIONS.showRenderChunkBorders) {
      renderChunkBorders(minVisibleRenderChunkX, maxVisibleRenderChunkX, minVisibleRenderChunkY, maxVisibleRenderChunkY, RENDER_CHUNK_SIZE, 2);
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
   public static isRunning = false;

   /** If the game has recevied up-to-date game data from the server. Set to false when paused */
   // @Cleanup: We might be able to remove this whole system by just always sending player data. But do we want to do that???
   public static isSynced = true;

   public static hasInitialised = false;

   public static setGameObjectDebugData(newEntityDebugData: EntityDebugData | null): void {
      entityDebugData = newEntityDebugData;
      setDebugInfoDebugData(entityDebugData);
   }

   public static getEntityDebugData(): EntityDebugData | null {
      return entityDebugData || null;
   }

   /** Starts the game */
   public static start(): void {
      resizeCanvas();

      // Set the player's initial rotation
      updatePlayerRotation();
               
      // Start the game loop
      this.isSynced = true;
      this.isRunning = true;
      lastFrameTime = performance.now();
      requestAnimationFrame(runFrame);
   }

   public static stop(): void {
      this.isRunning = false;
   }
   
   public static sync(): void {
      lastFrameTime = performance.now();
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
   public static render(clientTickInterp: number, serverTickInterp: number): void {
      // Player rotation is updated each render, but only sent each update
      updatePlayerRotation();
      
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

      updateUBOs();

      dirtifyMovingEntities();
      updateRenderPartMatrices(clientTickInterp, serverTickInterp);

      refreshCameraPosition(clientTickInterp, serverTickInterp)
      refreshCameraView();

      // Render layers
      // @Hack
      if (layers.indexOf(getCurrentLayer()) === 0) {
         renderLayer(layers[1], serverTickInterp);
         renderLayerDarkening();
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

      updateDebugScreen();
      updateInspectHealthBar();
      
      renderTechTree();
      renderTechTreeItems();

      renderTribePlans();
   }
}

export default Game;