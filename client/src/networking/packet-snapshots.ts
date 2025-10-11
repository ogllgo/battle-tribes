import { Entity, EntityType } from "../../../shared/src/entities";
import { PacketReader } from "../../../shared/src/packets";
import Camera from "../Camera";
import { updateDebugScreenCurrentTime, updateDebugScreenIsPaused, updateDebugScreenTicks } from "../components/game/dev/GameInfoDisplay";
import { selectItemSlot } from "../components/game/GameInteractableLayer";
import { setGameTime } from "../game";
import { playerInstance } from "../player";
import { playSound } from "../sound";
import { ExtendedTribe, readExtendedTribeData, readShortTribeData, ShortTribe } from "../tribes";
import { getCurrentLayer, layers, removeEntity, setCurrentLayer } from "../world";

// @Speed @Memory I cause a lot of GC right now by reading things in the snapshot decoding process which aren't necessary for snapshots (e.g. data for all tribes), instead of reading that when updating the game state to that.

interface EntitySnapshot {
   readonly entityType: EntityType;
   readonly spawnTicks: number;
   readonly layerIdx: number;
}

/** A snapshot of the game represented in a packet. */
export interface GameSnapshot {
   // @CLEANUP @INCOMPLETE best done as a separate packet instead of this.
   readonly simulationIsPaused: boolean;
   readonly tick: number;
   readonly time: number;
   readonly layerIdx: number;
   readonly entities: Map<Entity, EntitySnapshot>;
   readonly playerInstance: number;
   readonly cameraSubject: number;
   readonly playerTribeData: ExtendedTribe;
   readonly enemyTribeData: ShortTribe;
}

const decodeEntitySnapshot = (reader: PacketReader): EntitySnapshot => {
   const entityType = reader.readNumber() as EntityType;
   const spawnTicks = reader.readNumber();
   const layerIdx = reader.readNumber();
   console.assert(Number.isInteger(layerIdx) && layerIdx < layers.length);

   
}

export function decodeSnapshotFromGameDataPacket(reader: PacketReader): GameSnapshot {
   const simulationIsPaused = reader.readBoolean();
   reader.padOffset(3);

   const tick = reader.readNumber();
   
   const time = reader.readNumber();

   const layerIdx = reader.readNumber();

   const numEntities = reader.readNumber();
   const entities = new Map<Entity, EntitySnapshot>();
   for (let i = 0; i < numEntities; i++) {
      const entity = reader.readNumber() as Entity;
   }

   const playerInstance = reader.readNumber();
   const cameraSubject = reader.readNumber() as Entity;

   return {
      simulationIsPaused: simulationIsPaused,
      tick: tick,
      time: time,
      layerIdx: layerIdx,
      playerInstance: playerInstance,
      cameraSubject: cameraSubject
   };
}

export function updateGameToSnapshot(snapshot: GameSnapshot): void {
   updateDebugScreenIsPaused(snapshot.simulationIsPaused);

   // @INCOMPLETE
   // Board.serverTicks = ticks;
   updateDebugScreenTicks(snapshot.tick);
   
   setGameTime(snapshot.time);
   updateDebugScreenCurrentTime(snapshot.time);

   const layer = layers[snapshot.layerIdx];
   if (layer !== getCurrentLayer()) {
      setCurrentLayer(layer);
      playSound("layer-change.mp3", 0.55, 1, Camera.position.copy(), null);
   }
   
   // @SQUEAM
    // player has gone from not existing to existing
   // let hasNewPlayerInstance = false;

   if (playerInstance === null && snapshot.playerInstance !== 0) {
      // @CLEANUP this is weird: callled twice.
      setPlayerInstance(newPlayerInstance);
      // hasNewPlayerInstance = true;
   }
}





   // Process entities
   const numEntities = reader.readNumber();
   for (let i = 0; i < numEntities; i++) {
      const entityID = reader.readNumber() as Entity;
      if (entityID === playerInstance) {
         if (entityExists(playerInstance)) {
            processPlayerUpdateData(reader);
         } else {
            processEntityCreationData(entityID, reader);
         }
      } else if (entityExists(entityID)) {
         processEntityUpdateData(entityID, reader);
      } else {
         processEntityCreationData(entityID, reader);
      }
   }

   // @CLEANUP this is strange and weird to use cameraSubject variable in disjointed way, etc. other stranges too.
   // Set the tracked entity after the entities are created so that it can find the first render part of the tracked entity
   if (!Camera.verybadIsTracking) {
      Camera.trackEntity(cameraSubject);
   }
   
   // @HACKISH
   if (hasNewPlayerInstance) {
      // Done after all the components are updated as the selectItemSlot function needs the player's inventory use component
      selectItemSlot(1);
      gameScreenSetIsDead(false);
   }

   const entitiesToRemove = new Set<Entity>();
   
   // Read removed entity IDs
   const serverRemovedEntityIDs = new Set<number>();
   const numRemovedEntities = reader.readNumber();
   for (let i = 0; i < numRemovedEntities; i++) {
      const entityID = reader.readNumber();

      serverRemovedEntityIDs.add(entityID);
      
      if (entityExists(entityID)) {
         entitiesToRemove.add(entityID);
      }
   }

   // Tribes
   // @Temporary @Garbage
   const tempTribes = new Set<Tribe>();
   const numTribes = reader.readNumber();
   for (let i = 0; i < numTribes; i++) {
      const isExtended = reader.readBoolean();
      reader.padOffset(3);

      const tribe = isExtended ? readExtendedTribeData(reader) : readShortTribeData(reader);
      tempTribes.add(tribe);
      
      if (i === 0) {
         updatePlayerTribe(tribe as ExtendedTribe);
      }
   }
   tribes.splice(0, tribes.length);
   for (const tribe of tempTribes) {
      tribes.push(tribe);
   }
   // @Hack: shouldn't do always
   TribesTab_refresh();

   // Lights
   updateLightsFromData(reader);

   // @Cleanup: move to own function
   
   // @Temporary: I seem to be having an issue with some trees being invisible, possibly caused by this removing entities when they shouldn't be removed?
   
   // Remove entities which are no longer visible
   // const minVisibleChunkX = Camera.minVisibleChunkX - 2;
   // const maxVisibleChunkX = Camera.maxVisibleChunkX + 2;
   // const minVisibleChunkY = Camera.minVisibleChunkY - 2;
   // const maxVisibleChunkY = Camera.maxVisibleChunkY + 2;
   // // @Speed
   // for (let chunkX = 0; chunkX < Settings.BOARD_SIZE; chunkX++) {
   //    for (let chunkY = 0; chunkY < Settings.BOARD_SIZE; chunkY++) {
   //       // Skip visible chunks
   //       if (chunkX >= minVisibleChunkX && chunkX <= maxVisibleChunkX && chunkY >= minVisibleChunkY && chunkY <= maxVisibleChunkY) {
   //          continue;
   //       }

   //       const chunk = playerLayer.getChunk(chunkX, chunkY);
   //       for (let i = 0; i < chunk.entities.length; i++) {
   //          const entity = chunk.entities[i];
   //          // @Hack?
   //          if (entity !== playerInstance) {
   //             entitiesToRemove.add(entity);
   //          }
   //       }
   //    }
   // }

   // Register hits
   const numHits = reader.readNumber();
   console.assert(Number.isInteger(numHits));
   for (let i = 0; i < numHits; i++) {
      const hitEntity = reader.readNumber() as Entity;
      const hitHitboxLocalID = reader.readNumber();
      const hitPositionX = reader.readNumber();
      const hitPositionY = reader.readNumber();
      const attackEffectiveness = reader.readNumber() as AttackEffectiveness;
      const damage = reader.readNumber();
      const shouldShowDamageNumber = reader.readBoolean();
      reader.padOffset(3);
      const flags = reader.readNumber();

      if (entityExists(hitEntity)) {
         if (attackEffectiveness === AttackEffectiveness.stopped) {
            // Register stopped hit
                     
            const transformComponent = TransformComponentArray.getComponent(hitEntity);
            const hitbox = transformComponent.hitboxes[0];
            for (let i = 0; i < 6; i++) {
               const position = hitbox.box.position.offset(randFloat(0, 6), randAngle());
               createSparkParticle(position.x, position.y);
            }
         } else {
            // Register hit

            const transformComponent = TransformComponentArray.getComponent(hitEntity);

            // If the entity is hit by a flesh sword, create slime puddles
            if (flags & HitFlags.HIT_BY_FLESH_SWORD) {
               const hitbox = transformComponent.hitboxes[0];
               for (let i = 0; i < 2; i++) {
                  createSlimePoolParticle(hitbox.box.position.x, hitbox.box.position.y, 32);
               }
            }

            // @Incomplete @Hack
            if (flags & HitFlags.HIT_BY_SPIKES) {
               playSound("spike-stab.mp3", 0.3, 1, new Point(hitPositionX, hitPositionY), getEntityLayer(hitEntity));
            }

            const hitHitbox = getHitboxByLocalID(transformComponent.hitboxes, hitHitboxLocalID);
            if (hitHitbox !== null) {
               // @Speed
               const componentArrays = getComponentArrays();
               for (let i = 0; i < componentArrays.length; i++) {
                  const componentArray = componentArrays[i];
                  if (typeof componentArray.onHit !== "undefined" && componentArray.hasComponent(hitEntity)) {
                     componentArray.onHit(hitEntity, hitHitbox, new Point(hitPositionX, hitPositionY), flags);
                  }
               }
            }
         }
      }
      
      if (damage > 0 && shouldShowDamageNumber) {
         createDamageNumber(hitPositionX, hitPositionY, damage);
      }
   }

   const numPlayerKnockbacks = reader.readNumber();
   for (let i = 0; i < numPlayerKnockbacks; i++) {
      const knockback = reader.readNumber();
      const knockbackDirection = reader.readNumber();

      if (playerInstance !== null) {
         const transformComponent = TransformComponentArray.getComponent(playerInstance);
         const playerHitbox = transformComponent.hitboxes[0];

         const previousVelocity = getHitboxVelocity(playerHitbox);
         setHitboxVelocity(playerHitbox, previousVelocity.x * 0.5, previousVelocity.y * 0.5);

         addHitboxVelocity(playerHitbox, knockback * Math.sin(knockbackDirection), knockback * Math.cos(knockbackDirection));
      }
   }

   const numHeals = reader.readNumber();
   for (let i = 0; i < numHeals; i++) {
      const x = reader.readNumber();
      const y = reader.readNumber();
      const healedEntity = reader.readNumber() as Entity;
      const healerEntity = reader.readNumber() as Entity;
      const healAmount = reader.readNumber();

      if (healAmount === 0) {
         continue;
      }

      if (healerEntity === playerInstance) {
         createHealNumber(healedEntity, x, y, healAmount);
      }

      if (entityExists(healedEntity)) {
         const transformComponent = TransformComponentArray.getComponent(healedEntity);
   
         // Create healing particles depending on the amount the entity was healed
         let remainingHealing = healAmount;
         for (let size = 2; size >= 0;) {
            if (remainingHealing >= HEALING_PARTICLE_AMOUNTS[size]) {
               const position = getRandomPositionInEntity(transformComponent);
               createHealingParticle(position, size);
               remainingHealing -= HEALING_PARTICLE_AMOUNTS[size];
            } else {
               size--;
            }
         }

         // @Hack @Incomplete: This will trigger the repair sound effect even if a hammer isn't the one healing the structure
         if (STRUCTURE_TYPES.includes(getEntityType(healedEntity) as any)) { // @Cleanup
            playSound("repair.mp3", 0.4, 1, new Point(x, y), getEntityLayer(healedEntity));
         }
      }
   }

   const visibleEntityDeathIDs = new Set<Entity>();
   const numVisibleDeaths = reader.readNumber();
   for (let i = 0; i < numVisibleDeaths; i++) {
      const id = reader.readNumber();
      visibleEntityDeathIDs.add(id);
   }

   for (const entity of entitiesToRemove) {
      const isDeath = visibleEntityDeathIDs.has(entity);
      removeEntity(entity, isDeath);

      // @CLEANUP THIS IS WEIRD
      if (entity === playerInstance) {
         // Kill the player

         // Remove the player from the game
         setPlayerInstance(null);

         latencyGameState.resetFlags();
         definiteGameState.resetFlags();

         gameScreenSetIsDead(true);
         closeCurrentMenu();

         // We want the hotbar to refresh now to show the empty hotbar
         // This will propagate down to refresh the hotbar.
         // @CLEANUP bruuuh this is just to update the hotbar. React.js shittery.
         GameScreen_update();
      }
   }

   // Research orb completes
   const numOrbs = reader.readNumber();
   for (let i = 0; i < numOrbs; i++) {
      const x = reader.readNumber();
      const y = reader.readNumber();
      const amount = reader.readNumber();
      createResearchNumber(x, y, amount);
   }

   const numTileUpdates = reader.readNumber();
   console.assert(Number.isInteger(numTileUpdates));
   for (let i = 0; i < numTileUpdates; i++) {
      const layerIdx = reader.readNumber();
      const tileIndex = reader.readNumber();
      const tileType = reader.readNumber();

      const layer = layers[layerIdx];
      
      const tile = layer.getTile(tileIndex);
      tile.type = tileType;
      
      updateRenderChunkFromTileUpdate(tileIndex, layer);
   }

   // Wall subtile updates
   for (const layer of layers) {
      const numUpdates = reader.readNumber();
      for (let i = 0; i < numUpdates; i++) {
         const subtileIndex = reader.readNumber();
         const subtileType = reader.readNumber() as SubtileType;
         const damageTaken = reader.readNumber();
         layer.registerSubtileUpdate(subtileIndex, subtileType, damageTaken);
      }
   }

   const playerHealth = reader.readNumber();

   const hasDebugData = reader.readBoolean();
   reader.padOffset(3);
   
   if (hasDebugData && isDev()) {
      const debugData = readDebugData(reader);
      Game.setGameObjectDebugData(debugData);
   } else {
      Game.setGameObjectDebugData(null);
   }

   const hasPickedUpItem = reader.readBoolean();
   reader.padOffset(3);
   if (hasPickedUpItem) {
      playSound("item-pickup.mp3", 0.3, 1, Camera.position, null);
   }

   if (playerInstance !== null) {
      definiteGameState.hotbarCrossbowLoadProgressRecord = readCrossbowLoadProgressRecord(reader);
   }

   // Title offer
   const hasTitleOffer = reader.readBoolean();
   reader.padOffset(3);
   let titleOffer: TribesmanTitle | null = null;
   if (hasTitleOffer) {
      titleOffer = reader.readNumber();
   }
   Infocards_setTitleOffer(titleOffer);
   
   // Tick events
   const numTickEvents = reader.readNumber();
   for (let i = 0; i < numTickEvents; i++) {
      const entity = reader.readNumber() as Entity;
      const type = reader.readNumber() as EntityTickEventType;
      const data = reader.readNumber();
      processTickEvent(entity, type, data);
   }

   // Mined subtiles
   const minedSubtiles = new Array<MinedSubtile>();
   const numMinedSubtiles = reader.readNumber();
   for (let i = 0; i < numMinedSubtiles; i++) {
      const subtile = reader.readNumber();
      const subtileType = reader.readNumber() as SubtileType;
      const support = reader.readNumber();
      const isCollapsing = reader.readBoolean();
      reader.padOffset(3);

      const minedSubtile: MinedSubtile = {
         subtileIndex: subtile,
         subtileType: subtileType,
         support: support,
         isCollapsing: isCollapsing
      };
      minedSubtiles.push(minedSubtile);
   }
   setMinedSubtiles(minedSubtiles);

   // Collapses
   const numCollapses = reader.readNumber();
   assert(Number.isInteger(numCollapses));
   for (let i = 0; i < numCollapses; i++) {
      const collapsingSubtileIndex = reader.readNumber();
      const ageTicks = reader.readNumber();
      tickCollapse(collapsingSubtileIndex, ageTicks);
   }

   updateGrassBlockers(reader);

   // Tribe plans and virtual buildings
   // @Cleanup: remove underscore
   const _isDev = reader.readBoolean();
   reader.padOffset(3);
   if (_isDev) {
      readPacketDevData(reader);
   }
}