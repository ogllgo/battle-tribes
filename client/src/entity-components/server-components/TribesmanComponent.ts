import { Entity, EntityType, EntityTypeString } from "battletribes-shared/entities";
import { ServerComponentType } from "battletribes-shared/components";
import { Settings } from "battletribes-shared/settings";
import { TitleGenerationInfo, TribesmanTitle } from "battletribes-shared/titles";
import { Point, angle, lerp, randFloat, randInt, randItem, veryBadHash } from "battletribes-shared/utils";
import { Light, attachLightToEntity, createLight, removeLightsAttachedToEntity } from "../../lights";
import Board from "../../Board";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { BloodParticleSize, createBloodParticle, createBloodParticleFountain, createBloodPoolParticle, createLeafParticle, createSprintParticle, createTitleObtainParticle, LeafParticleSize } from "../../particles";
import { createRenderPartOverlayGroup } from "../../rendering/webgl/overlay-rendering";
import { VisualRenderPart } from "../../render-parts/render-parts";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { PacketReader } from "battletribes-shared/packets";
import { TitlesTab_setTitles } from "../../components/game/dev/tabs/TitlesTab";
import { getEntityLayer, getEntityRenderInfo, getEntityType, playerInstance } from "../../world";
import { InventoryUseComponentArray } from "./InventoryUseComponent";
import { getEntityTile, TransformComponentArray } from "./TransformComponent";
import { PhysicsComponentArray, resetIgnoredTileSpeedMultipliers } from "./PhysicsComponent";
import ServerComponentArray from "../ServerComponentArray";
import RenderAttachPoint from "../../render-parts/RenderAttachPoint";
import { TribeType } from "../../../../shared/src/tribes";
import { EntityRenderInfo } from "../../EntityRenderInfo";  
import { EntityConfig } from "../ComponentArray";
import { HitData } from "../../../../shared/src/client-server-types";
import { InventoryName, ItemType } from "../../../../shared/src/items/items";
import { playSoundOnEntity } from "../../sound";
import { InventoryComponentArray, getInventory } from "./InventoryComponent";
import { TribeComponentArray } from "./TribeComponent";
import { TileType } from "../../../../shared/src/tiles";
import CircularBox from "../../../../shared/src/boxes/CircularBox";

export interface TribesmanComponentParams {
   readonly warpaintType: number | null;
   readonly titles: ReadonlyArray<TitleGenerationInfo>;
}

interface RenderParts {
   readonly bodyRenderPart: VisualRenderPart;
   readonly limbRenderParts: ReadonlyArray<VisualRenderPart>;
}

export interface TribesmanComponent {
   readonly bodyRenderPart: VisualRenderPart;
   readonly handRenderParts: ReadonlyArray<VisualRenderPart>;
   
   warpaintType: number | null;
   
   // @Polymorphism: Make readonly
   titles: ReadonlyArray<TitleGenerationInfo>;

   readonly deathbringerEyeLights: Array<Light>;
}

// @Memory
const GOBLIN_HURT_SOUNDS: ReadonlyArray<string> = ["goblin-hurt-1.mp3", "goblin-hurt-2.mp3", "goblin-hurt-3.mp3", "goblin-hurt-4.mp3", "goblin-hurt-5.mp3"];
const GOBLIN_DIE_SOUNDS: ReadonlyArray<string> = ["goblin-die-1.mp3", "goblin-die-2.mp3", "goblin-die-3.mp3", "goblin-die-4.mp3"];

const GOBLIN_EAR_OFFSET = 4;
const GOBLIN_EAR_ANGLE = Math.PI / 3;

const TUNDRA_IGNORED_TILE_MOVE_SPEEDS = [TileType.snow];
const FISH_SUIT_IGNORED_TILE_MOVE_SPEEDS = [TileType.water];



// @Incomplete?


// const switchTribeMemberRenderParts = (tribesman: Entity): void => {
//    // @Robustness: don't do this. instead remove all and add them back
   
//    const entityType = getEntityType(tribesman.id);
   
//    const tribeComponent = tribesman.getServerComponentA(ServerComponentType.tribe);
//    const tribeType = tribeComponent.tribeType;
   
//    // Switch hand texture sources
//    const handTextureSource = getFistTextureSource(entityType, tribeType);
//    const handRenderParts = tribesman.getRenderThings("tribeMemberComponent:hand", 2) as Array<TexturedRenderPart>;
//    for (let i = 0; i < handRenderParts.length; i++) {
//       const renderPart = handRenderParts[i];
//       renderPart.switchTextureSource(handTextureSource);
//    }

//    // Switch body texture source
//    const bodyTextureSource = getBodyTextureSource(entityType, tribeType);
//    const handRenderPart = tribesman.getRenderThing("tribeMemberComponent:body") as TexturedRenderPart;
//    handRenderPart.switchTextureSource(bodyTextureSource);

//    // Remove any goblin ears
//    const goblinEars = tribesman.getRenderThings("tribeMemberComponent:ear") as Array<RenderPart>;
//    for (let i = 0; i < goblinEars.length; i++) {
//       const renderPart = goblinEars[i];
//       tribesman.removeRenderPart(renderPart);
//    }

//    if (tribeType === TribeType.goblins) {
//       // Add warpaint
//       // @Incomplete
//    } else {
//       // Remove warpaint (if any)
//       const warpaints = tribesman.getRenderThings("tribeMemberComponent:warpaint") as Array<RenderPart>;
//       for (let i = 0; i < warpaints.length; i++) {
//          const renderPart = warpaints[i];
//          tribesman.removeRenderPart(renderPart);
//       }
//    }
// }






// @Incomplete?
// private updateLowHealthMarker(shouldShow: boolean): void {
//    if (shouldShow) {
//       if (this.lowHealthMarker === null) {
//          this.lowHealthMarker = new TexturedRenderPart(
//             null,
//             9,
//             0,
//             getTextureArrayIndex("entities/low-health-marker.png")
//          );
//          this.lowHealthMarker.inheritParentRotation = false;
//          this.lowHealthMarker.offset.x = 20;
//          this.lowHealthMarker.offset.y = 20;

//          const renderInfo = getEntityRenderInfo(this.id);
//          renderInfo.attachRenderThing(this.lowHealthMarker);
//       }

//       let opacity = Math.sin(getEntityAgeTicks(this.id) / Settings.TPS * 5) * 0.5 + 0.5;
//       this.lowHealthMarker.opacity = lerp(0.3, 0.8, opacity);
//    } else {
//       if (this.lowHealthMarker !== null) {
//          const renderInfo = getEntityRenderInfo(this.id);
//          renderInfo.removeRenderPart(this.lowHealthMarker);
//          this.lowHealthMarker = null;
//       }
//    }
// }

// @Cleanup: remove. just do in components
// public updateFromData(data: EntityData): void {
//    const tribeComponent = this.getServerComponentA(ServerComponentType.tribe);
//    const tribeTypeBeforeUpdate = tribeComponent.tribeType;

//    super.updateFromData(data);

//    // Show low health marker for friendly tribe members
//    if (tribeComponent.tribeID === Game.tribe.id) {
//       const healthComponent = this.getServerComponentA(ServerComponentType.health);
//       this.updateLowHealthMarker(healthComponent.health <= healthComponent.maxHealth / 2);
//    }

//    // If tribe type is changed, update render parts
//    if (tribeComponent.tribeType !== tribeTypeBeforeUpdate) {
//       switchTribeMemberRenderParts(this);
//    }
// }



/** Gets the radius of a humanoid creature with just the one circular hitbox */
export function getHumanoidRadius(tribesman: Entity): number {
   const transformComponent = TransformComponentArray.getComponent(tribesman);
   return (transformComponent.hitboxes[0].box as CircularBox).radius;
}

const getSecondsSinceLastAttack = (entity: Entity): number => {
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(entity);

   let maxLastTicks = 0;
   for (let i = 0; i < inventoryUseComponent.limbInfos.length; i++) {
      const limbInfo = inventoryUseComponent.limbInfos[i];

      if (limbInfo.lastAttackTicks > maxLastTicks) {
         maxLastTicks = limbInfo.lastAttackTicks;
      }
   }

   const ticksSinceLastAttack = Board.serverTicks - maxLastTicks;
   return ticksSinceLastAttack / Settings.TPS;
}

const titlesArrayHasExtra = (extraCheckArray: ReadonlyArray<TitleGenerationInfo>, sourceArray: ReadonlyArray<TitleGenerationInfo>): boolean => {
   // Check for extra in titles1
   for (let i = 0; i < extraCheckArray.length; i++) {
      const titleGenerationInfo1 = extraCheckArray[i];

      let hasFound = false;
      for (let j = 0; j < sourceArray.length; j++) {
         const titleGenerationInfo2 = sourceArray[j];

         if (titleGenerationInfo2.title === titleGenerationInfo1.title) {
            hasFound = true;
            break;
         }
      }

      if (!hasFound) {
         return true;
      }
   }

   return false;
}

const titlesAreDifferent = (titles1: ReadonlyArray<TitleGenerationInfo>, titles2: ReadonlyArray<TitleGenerationInfo>): boolean => {
   return titlesArrayHasExtra(titles1, titles2) || titlesArrayHasExtra(titles2, titles1);
}

const readWarpaint = (reader: PacketReader): number | null => {
   const rawWarpaintType = reader.readNumber();
   const warpaintType = rawWarpaintType !== -1 ? rawWarpaintType : null;
   return warpaintType;
}

export function tribesmanHasTitle(tribesmanComponent: TribesmanComponent, title: TribesmanTitle): boolean {
   for (let i = 0; i < tribesmanComponent.titles.length; i++) {
      const generationInfo = tribesmanComponent.titles[i];
      if (generationInfo.title === title) {
         return true;
      }
   }

   return false;
}

export const TribesmanComponentArray = new ServerComponentArray<TribesmanComponent, TribesmanComponentParams, RenderParts>(ServerComponentType.tribesman, true, {
   createParamsFromData: createParamsFromData,
   createRenderParts: createRenderParts,
   createComponent: createComponent,
   onTick: onTick,
   padData: padData,
   updateFromData: updateFromData,
   updatePlayerFromData: updatePlayerFromData,
   onHit: onHit,
   onDie: onDie
});

function createParamsFromData(reader: PacketReader): TribesmanComponentParams {
   const warpaintType = readWarpaint(reader);
   
   const titles = new Array<TitleGenerationInfo>();
   const numTitles = reader.readNumber();
   for (let i = 0; i < numTitles; i++) {
      const title = reader.readNumber() as TribesmanTitle;
      const displayOption = reader.readNumber();
      
      titles.push({
         title: title,
         displayOption: displayOption
      });
   }

   return {
      warpaintType: warpaintType,
      titles: titles
   };
}

const getFistTextureSource = (entityType: EntityType, tribeType: TribeType): string => {
   switch (entityType) {
      // @Robustness
      case EntityType.player:
      case EntityType.tribeWorker:
      case EntityType.tribeWarrior: {
         switch (tribeType) {
            case TribeType.plainspeople: {
               return "entities/plainspeople/fist.png";
            }
            case TribeType.goblins: {
               return "entities/goblins/fist.png";
            }
            case TribeType.frostlings: {
               return "entities/frostlings/fist.png";
            }
            case TribeType.barbarians: {
               return "entities/barbarians/fist.png";
            }
            case TribeType.dwarves: {
               return "entities/dwarves/fist.png";
            }
            default: {
               const unreachable: never = tribeType;
               return unreachable;
            }
         }
      }
      case EntityType.scrappy: return "entities/scrappy/hand.png";
      default: throw new Error();
   }
}

const getBodyTextureSource = (entityType: EntityType, tribeType: TribeType): string => {
   if (entityType === EntityType.scrappy) {
      return "entities/scrappy/body.png";
   }
   
   switch (tribeType) {
      case TribeType.plainspeople: {
         if (entityType === EntityType.tribeWarrior) {
            return "entities/plainspeople/warrior.png";
         } else if (entityType === EntityType.player) {
            return "entities/plainspeople/player.png";
         } else {
            return "entities/plainspeople/worker.png";
         }
      }
      case TribeType.goblins: {
         if (entityType === EntityType.tribeWarrior) {
            return "entities/goblins/warrior.png";
         } else if (entityType === EntityType.player) {
            return "entities/goblins/player.png";
         } else {
            return "entities/goblins/worker.png";
         }
      }
      case TribeType.frostlings: {
         if (entityType === EntityType.tribeWarrior) {
            return "entities/frostlings/warrior.png";
         } else if (entityType === EntityType.player) {
            return "entities/frostlings/player.png";
         } else {
            return "entities/frostlings/worker.png";
         }
      }
      case TribeType.barbarians: {
         if (entityType === EntityType.tribeWarrior) {
            return "entities/barbarians/warrior.png";
         } else if (entityType === EntityType.player) {
            return "entities/barbarians/player.png";
         } else {
            return "entities/barbarians/worker.png";
         }
      }
      case TribeType.dwarves: {
         if (entityType === EntityType.tribeWarrior) {
            return "entities/dwarves/warrior.png";
         } else if (entityType === EntityType.player) {
            return "entities/dwarves/player.png";
         } else {
            return "entities/dwarves/worker.png";
         }
      }
   }
}

function createRenderParts(renderInfo: EntityRenderInfo, entityConfig: EntityConfig<ServerComponentType.tribe | ServerComponentType.tribesman, never>): RenderParts {
   const tribeComponentParams = entityConfig.serverComponents[ServerComponentType.tribe];
   const tribesmanComponentParams = entityConfig.serverComponents[ServerComponentType.tribesman];
   
   const warPaintType = tribesmanComponentParams.warpaintType;

   // @Temporary @Hack
   // const radius = tribesman.type === EntityType.player || tribesman.type === EntityType.tribeWarrior ? 32 : 28;
   const radius = 32;

   // 
   // Body render part
   // 
   
   const bodyRenderPart = new TexturedRenderPart(
      null,
      2,
      0,
      getTextureArrayIndex(getBodyTextureSource(entityConfig.entityType, tribeComponentParams.tribeType))
   );
   renderInfo.attachRenderPart(bodyRenderPart);

   if (tribeComponentParams.tribeType === TribeType.goblins) {
      if (warPaintType !== null) {
         let textureSource: string;
         if (entityConfig.entityType === EntityType.tribeWarrior) {
            textureSource = `entities/goblins/warrior-warpaint-${warPaintType}.png`;
         } else {
            textureSource = `entities/goblins/goblin-warpaint-${warPaintType}.png`;
         }
         
         // Goblin warpaint
         const warpaintRenderPart = new TexturedRenderPart(
            null,
            4,
            0,
            getTextureArrayIndex(textureSource)
         );
         warpaintRenderPart.addTag("tribeMemberComponent:warpaint");
         renderInfo.attachRenderPart(warpaintRenderPart);
      } else {
         console.warn("bad");
      }

      // Left ear
      const leftEarRenderPart = new TexturedRenderPart(
         null,
         3,
         -Math.PI/2 + GOBLIN_EAR_ANGLE,
         getTextureArrayIndex("entities/goblins/goblin-ear.png")
      );
      leftEarRenderPart.addTag("tribeMemberComponent:ear");
      leftEarRenderPart.offset.x = (radius + GOBLIN_EAR_OFFSET) * Math.sin(GOBLIN_EAR_ANGLE);
      leftEarRenderPart.offset.y = (radius + GOBLIN_EAR_OFFSET) * Math.cos(GOBLIN_EAR_ANGLE);
      leftEarRenderPart.setFlipX(true);
      renderInfo.attachRenderPart(leftEarRenderPart);

      // Right ear
      const rightEarRenderPart = new TexturedRenderPart(
         null,
         3,
         -Math.PI/2 + GOBLIN_EAR_ANGLE,
         getTextureArrayIndex("entities/goblins/goblin-ear.png")
      );
      rightEarRenderPart.addTag("tribeMemberComponent:ear");
      rightEarRenderPart.offset.x = (radius + GOBLIN_EAR_OFFSET) * Math.sin(GOBLIN_EAR_ANGLE);
      rightEarRenderPart.offset.y = (radius + GOBLIN_EAR_OFFSET) * Math.cos(GOBLIN_EAR_ANGLE);
      renderInfo.attachRenderPart(rightEarRenderPart);
   }

   // Hands
   const limbRenderParts = new Array<VisualRenderPart>();
   for (let i = 0; i < 2; i++) {
      const attachPoint = new RenderAttachPoint(
         null,
         1,
         0
      );
      if (i === 1) {
         attachPoint.setFlipX(true);
      }
      attachPoint.addTag("inventoryUseComponent:attachPoint");
      renderInfo.attachRenderPart(attachPoint);
      
      const handRenderPart = new TexturedRenderPart(
         attachPoint,
         1.2,
         0,
         getTextureArrayIndex(getFistTextureSource(entityConfig.entityType, tribeComponentParams.tribeType))
      );
      limbRenderParts.push(handRenderPart);
      handRenderPart.addTag("inventoryUseComponent:hand");
      renderInfo.attachRenderPart(handRenderPart);
   }

   return {
      bodyRenderPart: bodyRenderPart,
      limbRenderParts: limbRenderParts
   };
}

function createComponent(entityConfig: EntityConfig<ServerComponentType.tribesman, never>, renderParts: RenderParts): TribesmanComponent {
   const tribesmanComponentParams = entityConfig.serverComponents[ServerComponentType.tribesman];
   
   return {
      bodyRenderPart: renderParts.bodyRenderPart,
      handRenderParts: renderParts.limbRenderParts,
      warpaintType: tribesmanComponentParams.warpaintType,
      titles: tribesmanComponentParams.titles,
      deathbringerEyeLights: []
   };
}

const regenerateTitleEffects = (tribeMemberComponent: TribesmanComponent, entity: Entity): void => {
   // Remove previous effects
   const renderInfo = getEntityRenderInfo(entity);
   const previousRenderParts = renderInfo.getRenderThings("tribeMemberComponent:fromTitle") as Array<VisualRenderPart>;
   for (let i = 0; i < previousRenderParts.length; i++) {
      const renderPart = previousRenderParts[i];
      renderInfo.removeRenderPart(renderPart);
   }
   for (let i = renderInfo.renderPartOverlayGroups.length - 1; i >= 0; i--) {
      const overlayGroup = renderInfo.renderPartOverlayGroups[i];
      renderInfo.removeOverlayGroup(overlayGroup);
   }
   // @Hack @Incomplete: only remove lights added by titles
   removeLightsAttachedToEntity(entity);
   
   // Add for all titles
   for (let i = 0; i < tribeMemberComponent.titles.length; i++) {
      const titleGenerationInfo = tribeMemberComponent.titles[i];
      const title = titleGenerationInfo.title;

      switch (title) {
         // Create 2 glowing red eyes
         case TribesmanTitle.deathbringer: {
            for (let i = 0; i < 2; i++) {
               const offsetX = 16 * (i === 0 ? -1 : 1);
               const offsetY = 20;
               
               const light = createLight(
                  new Point(offsetX, offsetY),
                  0.4,
                  0.4,
                  0,
                  1.75,
                  0,
                  0
               );
               tribeMemberComponent.deathbringerEyeLights.push(light);
               attachLightToEntity(light, entity);
            }
            
            break;
         }
         // Create an eye scar
         case TribesmanTitle.bloodaxe: {
            const hash = veryBadHash(entity.toString());
            const isFlipped = hash % 2 === 0;

            const offsetX = (20 - 5 * 4 / 2) * (isFlipped ? 1 : -1);
            const offsetY = 24 - 6 * 4 / 2;

            const renderPart = new TexturedRenderPart(
               null,
               2.2,
               0,
               getTextureArrayIndex("entities/miscellaneous/eye-scar.png")
            );
            renderPart.addTag("tribeMemberComponent:fromTitle");
            renderPart.setFlipX(true);

            renderPart.offset.x = offsetX;
            renderPart.offset.y = offsetY;

            renderInfo.attachRenderPart(renderPart);
            break;
         }
         // Create shrewd eyes
         case TribesmanTitle.shrewd: {
            for (let i = 0; i < 2; i++) {
               const renderPart = new TexturedRenderPart(
                  null,
                  2.1,
                  0,
                  // @Incomplete
                  getTextureArrayIndex("entities/plainspeople/shrewd-eye.png")
               );
               renderPart.addTag("tribeMemberComponent:fromTitle");

               if (i === 1) {
                  renderPart.setFlipX(true);
               }

               // @Hack
               let xo: number;
               let yo: number;
               if (getEntityType(entity) === EntityType.tribeWorker) {
                  xo = 28;
                  yo = 24;
               } else {
                  xo = 28;
                  yo = 28;
               }
               
               renderPart.offset.x = (xo - 5 * 4 / 2) * (i === 1 ? 1 : -1);
               renderPart.offset.y = yo - 5 * 4 / 2;

               renderInfo.attachRenderPart(renderPart);
            }
            
            break;
         }
         // Create 3/5 (berrymuncher/gardener title) leaves on back
         case TribesmanTitle.berrymuncher:
         case TribesmanTitle.gardener: {
            const numLeaves = title === TribesmanTitle.berrymuncher ? 3 : 5;
            for (let i = 0; i < numLeaves; i++) {
               const angle = ((i - (numLeaves - 1) / 2) * Math.PI * 0.2) + Math.PI;
               
               const renderPart = new TexturedRenderPart(
                  null,
                  0,
                  angle + Math.PI/2 + randFloat(-0.5, 0.5),
                  getTextureArrayIndex("entities/miscellaneous/tribesman-leaf.png")
               );
               renderPart.addTag("tribeMemberComponent:fromTitle");

               const radiusAdd = lerp(-3, -6, Math.abs(i - (numLeaves - 1) / 2) / ((numLeaves - 1) / 2));

               const radius = getHumanoidRadius(entity);
               renderPart.offset.x = (radius + radiusAdd) * Math.sin(angle);
               renderPart.offset.y = (radius + radiusAdd) * Math.cos(angle);

               renderInfo.attachRenderPart(renderPart);
            }
            break;
         }
         case TribesmanTitle.yetisbane: {
            const renderPart = new TexturedRenderPart(
               null,
               0,
               0,
               getTextureArrayIndex("entities/miscellaneous/tribesman-fangs.png")
            );
            renderPart.addTag("tribeMemberComponent:fromTitle");

            const radius = getHumanoidRadius(entity);
            renderPart.offset.y = radius - 2;

            renderInfo.attachRenderPart(renderPart);
            break;
         }
         case TribesmanTitle.builder: {
            // 
            // Create a dirty shine on body render parts
            // 
            
            const bodyRenderPart = renderInfo.getRenderThing("tribeMemberComponent:body") as VisualRenderPart;
            const bodyOverlayGroup = createRenderPartOverlayGroup(entity, "overlays/dirt.png", [bodyRenderPart]);
            renderInfo.renderPartOverlayGroups.push(bodyOverlayGroup);

            const handRenderParts = renderInfo.getRenderThings("tribeMemberComponent:hand", 2) as Array<VisualRenderPart>;
            for (let i = 0; i < handRenderParts.length; i++) {
               const renderPart = handRenderParts[i];
               const handOverlayGroup = createRenderPartOverlayGroup(entity, "overlays/dirt.png", [renderPart]);
               renderInfo.renderPartOverlayGroups.push(handOverlayGroup);
            }

            break;
         }
         case TribesmanTitle.wellful: {
            const renderPart = new TexturedRenderPart(
               null,
               2.1,
               0,
               getTextureArrayIndex("entities/miscellaneous/tribesman-health-patch.png")
            );
            renderPart.addTag("tribeMemberComponent:fromTitle");
            renderInfo.attachRenderPart(renderPart);
            break;
         }
      }
   }
}

const updateTitles = (tribeMemberComponent: TribesmanComponent, entity: Entity, newTitles: ReadonlyArray<TitleGenerationInfo>): void => {
   if (titlesAreDifferent(tribeMemberComponent.titles, newTitles)) {
      // If at least 1 title is added, do particle effects
      if (titlesArrayHasExtra(newTitles, tribeMemberComponent.titles)) {
         const transformComponent = TransformComponentArray.getComponent(entity);
         for (let i = 0; i < 25; i++) {
            const offsetMagnitude = randFloat(12, 34);
            const offsetDirection = 2 * Math.PI * Math.random();
            const spawnPositionX = transformComponent.position.x + offsetMagnitude * Math.sin(offsetDirection);
            const spawnPositionY = transformComponent.position.y + offsetMagnitude * Math.cos(offsetDirection);

            const velocityMagnitude = randFloat(80, 120);
            const vx = velocityMagnitude * Math.sin(offsetDirection);
            const vy = velocityMagnitude * Math.cos(offsetDirection);
            
            createTitleObtainParticle(spawnPositionX, spawnPositionY, vx, vy, offsetDirection + Math.PI*3/4)
         }
      }

      tribeMemberComponent.titles = newTitles;
      regenerateTitleEffects(tribeMemberComponent, entity);
   }
}

function onTick(entity: Entity): void {
   const tribesmanComponent = TribesmanComponentArray.getComponent(entity);
   if (tribesmanComponent.deathbringerEyeLights.length > 0) {
      const eyeFlashProgress = Math.min(getSecondsSinceLastAttack(entity) / 0.5, 1)
      const intensity = lerp(0.6, 0.5, eyeFlashProgress);
      const r = lerp(2, 1.75, eyeFlashProgress);
      for (let i = 0; i < tribesmanComponent.deathbringerEyeLights.length; i++) {
         const light = tribesmanComponent.deathbringerEyeLights[i];
         light.intensity = intensity;
         light.r = r;
      }
   }

   const transformComponent = TransformComponentArray.getComponent(entity);
   const physicsComponent = PhysicsComponentArray.getComponent(entity);

   const inventoryComponent = InventoryComponentArray.getComponent(entity);
   const armourSlotInventory = getInventory(inventoryComponent, InventoryName.armourSlot)!;
   
   // Move speeds
   const armour = armourSlotInventory.itemSlots[1];
   resetIgnoredTileSpeedMultipliers(physicsComponent);
   if (typeof armour !== "undefined") {
      const layer = getEntityLayer(entity);
      const tile = getEntityTile(layer, transformComponent);

      // If frost armour is equipped, move at normal speed on snow tiles
      if ((armour.type === ItemType.frostArmour) && tile.type === TileType.snow) {
         physicsComponent.ignoredTileSpeedMultipliers = TUNDRA_IGNORED_TILE_MOVE_SPEEDS;
      // If fishlord suit is equipped, move at normal speed on snow tiles
      } else if (armour.type === ItemType.fishlord_suit && tile.type === TileType.water) {
         physicsComponent.ignoredTileSpeedMultipliers = FISH_SUIT_IGNORED_TILE_MOVE_SPEEDS;
      }
   }

   // Sprinter particles
   if (tribesmanHasTitle(tribesmanComponent, TribesmanTitle.sprinter) && physicsComponent.selfVelocity.length() > 100) {
      const sprintParticleSpawnRate = Math.sqrt(physicsComponent.selfVelocity.length() * 0.8);
      if (Math.random() < sprintParticleSpawnRate / Settings.TPS) {
         const offsetMagnitude = 32 * Math.random();
         const offsetDirection = 2 * Math.PI * Math.random();
         const x = transformComponent.position.x + offsetMagnitude * Math.sin(offsetDirection);
         const y = transformComponent.position.y + offsetMagnitude * Math.cos(offsetDirection);
         
         const velocityMagnitude = 32 * Math.random();
         const velocityDirection = 2 * Math.PI * Math.random();
         const vx = velocityMagnitude * Math.sin(velocityDirection);
         const vy = velocityMagnitude * Math.cos(offsetDirection);
         createSprintParticle(x, y, vx, vy);
      }
   }

   // Winterswrath particles
   if (tribesmanHasTitle(tribesmanComponent, TribesmanTitle.winterswrath) && Math.random() < 18 * Settings.I_TPS) {
      const offsetMagnitude = randFloat(36, 50);
      const offsetDirection = 2 * Math.PI * Math.random();
      const x = transformComponent.position.x + offsetMagnitude * Math.sin(offsetDirection);
      const y = transformComponent.position.y + offsetMagnitude * Math.cos(offsetDirection);
      
      const velocityMagnitude = randFloat(45, 75);
      const velocityDirection = offsetDirection + Math.PI * 0.5;
      const vx = physicsComponent.selfVelocity.x + velocityMagnitude * Math.sin(velocityDirection);
      const vy = physicsComponent.selfVelocity.y + velocityMagnitude * Math.cos(velocityDirection);
      
      createSprintParticle(x, y, vx, vy);
   }
}

function padData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);

   const numTitles = reader.readNumber();
   reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT * numTitles);
}

function updateFromData(reader: PacketReader, entity: Entity): void {
   const tribesmanComponent = TribesmanComponentArray.getComponent(entity);

   tribesmanComponent.warpaintType = readWarpaint(reader);

   // @Temporary @Garbage
   const titles = new Array<TitleGenerationInfo>();
   const numTitles = reader.readNumber();
   for (let i = 0; i < numTitles; i++) {
      const title = reader.readNumber() as TribesmanTitle;
      const displayOption = reader.readNumber();
      
      titles.push({
         title: title,
         displayOption: displayOption
      });
   }
   
   updateTitles(tribesmanComponent, entity, titles);
}

function updatePlayerFromData(reader: PacketReader): void {
   updateFromData(reader, playerInstance!);

   const tribesmanComponent = TribesmanComponentArray.getComponent(playerInstance!);

   // @Garbage
   const titles = new Array<TribesmanTitle>();
   for (let i = 0; i < titles.length; i++) {
      const titleGenerationInfo = tribesmanComponent.titles[i];
      titles.push(titleGenerationInfo.title);
   }
   
   TitlesTab_setTitles(titles);
}
   
function onHit(entity: Entity, hitData: HitData): void {
   const transformComponent = TransformComponentArray.getComponent(entity);

   // Blood pool particle
   createBloodPoolParticle(transformComponent.position.x, transformComponent.position.y, 20);
   
   // Blood particles
   for (let i = 0; i < 10; i++) {
      let offsetDirection = angle(hitData.hitPosition[0] - transformComponent.position.x, hitData.hitPosition[1] - transformComponent.position.y);
      offsetDirection += 0.2 * Math.PI * (Math.random() - 0.5);

      const spawnPositionX = transformComponent.position.x + 32 * Math.sin(offsetDirection);
      const spawnPositionY = transformComponent.position.y + 32 * Math.cos(offsetDirection);
      createBloodParticle(Math.random() < 0.6 ? BloodParticleSize.small : BloodParticleSize.large, spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(150, 250), true);
   }

   const tribeComponent = TribeComponentArray.getComponent(entity);
   switch (tribeComponent.tribeType) {
      case TribeType.goblins: {
         playSoundOnEntity(randItem(GOBLIN_HURT_SOUNDS), 0.4, 1, entity);
         break;
      }
      case TribeType.plainspeople: {
         playSoundOnEntity("plainsperson-hurt-" + randInt(1, 3) + ".mp3", 0.4, 1, entity);
         break;
      }
      case TribeType.barbarians: {
         playSoundOnEntity("barbarian-hurt-" + randInt(1, 3) + ".mp3", 0.4, 1, entity);
         break;
      }
      case TribeType.frostlings: {
         playSoundOnEntity("frostling-hurt-" + randInt(1, 4) + ".mp3", 0.4, 1, entity);
         break;
      }
   }

   // If the tribesman is wearing a leaf suit, create leaf particles
   const inventoryComponent = InventoryComponentArray.getComponent(entity);
   const armourInventory = getInventory(inventoryComponent, InventoryName.armourSlot)!;
   const armour = armourInventory.itemSlots[1];
   if (typeof armour !== "undefined" && armour.type === ItemType.leaf_suit) {
      for (let i = 0; i < 3; i++) {
         const moveDirection = 2 * Math.PI * Math.random();

         const radius = getHumanoidRadius(entity);
         const spawnPositionX = transformComponent.position.x + radius * Math.sin(moveDirection);
         const spawnPositionY = transformComponent.position.y + radius * Math.cos(moveDirection);

         createLeafParticle(spawnPositionX, spawnPositionY, moveDirection + randFloat(-1, 1), Math.random() < 0.5 ? LeafParticleSize.large : LeafParticleSize.small);
      }
   }
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);

   createBloodPoolParticle(transformComponent.position.x, transformComponent.position.y, 20);
   createBloodParticleFountain(entity, 0.1, 1);

   const tribeComponent = TribeComponentArray.getComponent(entity);
   switch (tribeComponent.tribeType) {
      case TribeType.goblins: {
         playSoundOnEntity(randItem(GOBLIN_DIE_SOUNDS), 0.4, 1, entity);
         break;
      }
      case TribeType.plainspeople: {
         playSoundOnEntity("plainsperson-die-1.mp3", 0.4, 1, entity);
         break;
      }
      case TribeType.barbarians: {
         playSoundOnEntity("barbarian-die-1.mp3", 0.4, 1, entity);
         break;
      }
      case TribeType.frostlings: {
         playSoundOnEntity("frostling-die.mp3", 0.4, 1, entity);
         break;
      }
   }
}