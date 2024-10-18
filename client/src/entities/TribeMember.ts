import { Settings } from "battletribes-shared/settings";
import { TribeType } from "battletribes-shared/tribes";
import { EntityType } from "battletribes-shared/entities";
import { HitData } from "battletribes-shared/client-server-types";
import { angle, lerp, randFloat, randInt, randItem } from "battletribes-shared/utils";
import { TileType } from "battletribes-shared/tiles";
import Entity from "../Entity";
import { BloodParticleSize, LeafParticleSize, createBloodParticle, createBloodParticleFountain, createBloodPoolParticle, createLeafParticle } from "../particles";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { playSound } from "../sound";
import { getTribesmanRadius } from "../entity-components/server-components/TribeMemberComponent";
import { TribeComponentArray } from "../entity-components/server-components/TribeComponent";
import { InventoryName, ItemType } from "battletribes-shared/items/items";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { RenderPart } from "../render-parts/render-parts";
import { getEntityAgeTicks, getEntityLayer, getEntityRenderInfo } from "../world";
import { getEntityTile, TransformComponentArray } from "../entity-components/server-components/TransformComponent";
import { getInventory, InventoryComponentArray } from "../entity-components/server-components/InventoryComponent";

export const TRIBE_MEMBER_Z_INDEXES: Record<string, number> = {
   hand: 1,
   body: 2
}

// @Memory
const GOBLIN_HURT_SOUNDS: ReadonlyArray<string> = ["goblin-hurt-1.mp3", "goblin-hurt-2.mp3", "goblin-hurt-3.mp3", "goblin-hurt-4.mp3", "goblin-hurt-5.mp3"];
const GOBLIN_DIE_SOUNDS: ReadonlyArray<string> = ["goblin-die-1.mp3", "goblin-die-2.mp3", "goblin-die-3.mp3", "goblin-die-4.mp3"];

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

abstract class TribeMember extends Entity {
   private static readonly BLOOD_FOUNTAIN_INTERVAL = 0.1;

   // @Cleanup: Move to TribeMember client component
   private lowHealthMarker: RenderPart | null = null;
   
   // @Cleanup: Move to TribeMember component
   protected onHit(hitData: HitData): void {
      const transformComponent = TransformComponentArray.getComponent(this.id);

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

      const tribeComponent = TribeComponentArray.getComponent(this.id);
      switch (tribeComponent.tribeType) {
         case TribeType.goblins: {
            playSound(randItem(GOBLIN_HURT_SOUNDS), 0.4, 1, transformComponent.position);
            break;
         }
         case TribeType.plainspeople: {
            playSound("plainsperson-hurt-" + randInt(1, 3) + ".mp3", 0.4, 1, transformComponent.position);
            break;
         }
         case TribeType.barbarians: {
            playSound("barbarian-hurt-" + randInt(1, 3) + ".mp3", 0.4, 1, transformComponent.position);
            break;
         }
         case TribeType.frostlings: {
            playSound("frostling-hurt-" + randInt(1, 4) + ".mp3", 0.4, 1, transformComponent.position);
            break;
         }
      }

      // If the tribesman is wearing a leaf suit, create leaf particles
      const inventoryComponent = InventoryComponentArray.getComponent(this.id)
      const armourInventory = getInventory(inventoryComponent, InventoryName.armourSlot)!;
      const armour = armourInventory.itemSlots[1];
      if (typeof armour !== "undefined" && armour.type === ItemType.leaf_suit) {
         for (let i = 0; i < 3; i++) {
            const moveDirection = 2 * Math.PI * Math.random();
   
            const radius = getTribesmanRadius(this.id);
            const spawnPositionX = transformComponent.position.x + radius * Math.sin(moveDirection);
            const spawnPositionY = transformComponent.position.y + radius * Math.cos(moveDirection);
   
            createLeafParticle(spawnPositionX, spawnPositionY, moveDirection + randFloat(-1, 1), Math.random() < 0.5 ? LeafParticleSize.large : LeafParticleSize.small);
         }
      }
   }

   public onDie(): void {
      const transformComponent = TransformComponentArray.getComponent(this.id);

      createBloodPoolParticle(transformComponent.position.x, transformComponent.position.y, 20);
      createBloodParticleFountain(this.id, TribeMember.BLOOD_FOUNTAIN_INTERVAL, 1);

      const tribeComponent = TribeComponentArray.getComponent(this.id);
      switch (tribeComponent.tribeType) {
         case TribeType.goblins: {
            playSound(randItem(GOBLIN_DIE_SOUNDS), 0.4, 1, transformComponent.position);
            break;
         }
         case TribeType.plainspeople: {
            playSound("plainsperson-die-1.mp3", 0.4, 1, transformComponent.position);
            break;
         }
         case TribeType.barbarians: {
            playSound("barbarian-die-1.mp3", 0.4, 1, transformComponent.position);
            break;
         }
         case TribeType.frostlings: {
            playSound("frostling-die.mp3", 0.4, 1, transformComponent.position);
            break;
         }
      }
   }

   public overrideTileMoveSpeedMultiplier(): number | null {
      const inventoryComponent = InventoryComponentArray.getComponent(this.id);
      const armourSlotInventory = getInventory(inventoryComponent, InventoryName.armourSlot)!;

      const armour = armourSlotInventory.itemSlots[1];
      if (typeof armour !== "undefined") {
         const transformComponent = TransformComponentArray.getComponent(this.id);
         const layer = getEntityLayer(this.id);
         const tile = getEntityTile(layer, transformComponent);

         // If snow armour is equipped, move at normal speed on snow tiles
         if ((armour.type === ItemType.frost_armour || armour.type === ItemType.deepfrost_armour) && tile.type === TileType.snow) {
            return 1;
         }
         // If fishlord suit is equipped, move at normal speed on snow tiles
         if (armour.type === ItemType.fishlord_suit && tile.type === TileType.water) {
            return 1;
         }
      }
      return null;
   }

   // @Incomplete?
   private updateLowHealthMarker(shouldShow: boolean): void {
      if (shouldShow) {
         if (this.lowHealthMarker === null) {
            this.lowHealthMarker = new TexturedRenderPart(
               null,
               9,
               0,
               getTextureArrayIndex("entities/low-health-marker.png")
            );
            this.lowHealthMarker.inheritParentRotation = false;
            this.lowHealthMarker.offset.x = 20;
            this.lowHealthMarker.offset.y = 20;

            const renderInfo = getEntityRenderInfo(this.id);
            renderInfo.attachRenderThing(this.lowHealthMarker);
         }

         let opacity = Math.sin(getEntityAgeTicks(this.id) / Settings.TPS * 5) * 0.5 + 0.5;
         this.lowHealthMarker.opacity = lerp(0.3, 0.8, opacity);
      } else {
         if (this.lowHealthMarker !== null) {
            const renderInfo = getEntityRenderInfo(this.id);
            renderInfo.removeRenderPart(this.lowHealthMarker);
            this.lowHealthMarker = null;
         }
      }
   }

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
}

export default TribeMember;