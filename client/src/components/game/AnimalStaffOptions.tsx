import { useCallback, useEffect, useState } from "react";
import { Entity } from "../../../../shared/src/entities";
import { TransformComponentArray } from "../../entity-components/server-components/TransformComponent";
import Camera from "../../Camera";
import { sendAnimalStaffFollowCommandPacket } from "../../networking/packet-creation";
import { deselectSelectedEntity } from "../../entity-selection";
import { CowComponentArray } from "../../entity-components/server-components/CowComponent";
import { InventoryUseComponentArray } from "../../entity-components/server-components/InventoryUseComponent";
import { entityExists, getCurrentLayer, playerInstance } from "../../world";
import { createAnimalStaffFollowCommandParticle } from "../../particles";
import { getMatrixPosition } from "../../rendering/render-part-matrices";
import { createTranslationMatrix, matrixMultiplyInPlace } from "../../rendering/matrices";
import { playSound } from "../../sound";
import { GameInteractState } from "./GameScreen";
import { setShittyCarrier } from "./GameInteractableLayer";

export const enum AnimalStaffCommandType {
   follow,
   carry
}

export interface AnimalStaffOptionsProps {
   setGameInteractState(state: GameInteractState): void;
}

// @Cleanup: a lot of this is similar to BuildMenu

export let AnimalStaffOptions_setIsVisible: (isVisible: boolean) => void = () => {};
export let AnimalStaffOptions_isHovering: () => boolean = () => false;
export let AnimalStaffOptions_setEntity: (entity: Entity | null) => void = () => {};
export let AnimalStaffOptions_update: () => void = () => {};

export function createControlCommandParticles(commandType: AnimalStaffCommandType): void {
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(playerInstance!);

   const activeItemRenderPart = inventoryUseComponent.activeItemRenderParts[0];

   const originMatrix = createTranslationMatrix(14, 14);
   matrixMultiplyInPlace(activeItemRenderPart.modelMatrix, originMatrix);
   const origin = getMatrixPosition(originMatrix);

   let r: number;
   let g: number;
   let b: number;
   switch (commandType) {
      case AnimalStaffCommandType.follow: {
         r = 165/255;
         g = 255/255;
         b = 163/255;
         break;
      }
      case AnimalStaffCommandType.carry: {
         r = 237/255;
         g = 172/255;
         b = 19/255;
         break;
      }
   }

   const n = 20;
   for (let i = 0; i < n; i++) {
      const offsetDirection = 2 * Math.PI * i / n;
      const offsetMagnitude = 15;
      const x = origin.x + offsetMagnitude * Math.sin(offsetDirection);
      const y = origin.y + offsetMagnitude * Math.cos(offsetDirection);
      createAnimalStaffFollowCommandParticle(x, y, offsetDirection, r, g, b);
   }

   // @Bug: isn't attached to camera
   playSound("animal-staff-command-follow.mp3", 1.3, 1, Camera.position.copy(), getCurrentLayer());
}

const AnimalStaffOptions = (props: AnimalStaffOptionsProps) => {
   const [isVisible, setIsVisible] = useState(false);
   const [entity, setEntity] = useState<Entity | null>(null);
   const [x, setX] = useState(0);
   const [y, setY] = useState(0);
   const [followOptionIsSelected, setFollowOptionIsSelected] = useState(false);
   const [isHovering, setIsHovering] = useState(false);

   const updateFromEntity = (entity: Entity): void => {
      const transformComponent = TransformComponentArray.getComponent(entity);

      const screenX = Camera.calculateXScreenPos(transformComponent.position.x);
      const screenY = Camera.calculateYScreenPos(transformComponent.position.y);
      setX(screenX);
      setY(screenY);

      const cowComponent = CowComponentArray.getComponent(entity);
      setFollowOptionIsSelected(cowComponent.isFollowing);
   }
   
   useEffect(() => {
      AnimalStaffOptions_setIsVisible = setIsVisible;
      AnimalStaffOptions_setEntity = (entity: Entity | null) => {
         setEntity(entity);

         if (entity !== null) {
            updateFromEntity(entity);
         }
      }
   }, []);

   useEffect(() => {
      AnimalStaffOptions_isHovering = () => isHovering;
   }, [isHovering]);

   useEffect(() => {
      AnimalStaffOptions_update = (): void => {
         if (entity !== null) {
            if (!entityExists(entity)) {
               setEntity(null); 
            } else {
               updateFromEntity(entity);
            }
         }
      }
   }, [entity]);

   const onMouseOver = () => {
      setIsHovering(true);
   }

   const onMouseMove = () => {
      setIsHovering(true);
   }

   const onMouseOut = () => {
      setIsHovering(false);
   }

   const sendFollowCommand = useCallback((): void => {
      if (entity !== null) {
         sendAnimalStaffFollowCommandPacket(entity);
         createControlCommandParticles(AnimalStaffCommandType.follow);
      }
      deselectSelectedEntity();
   }, [entity]);

   const pressCarryOption = useCallback((): void => {
      if (entity !== null) {
         setShittyCarrier(entity);
         props.setGameInteractState(GameInteractState.selectCarryTarget);
      }
   }, [entity]);
   
   if (!isVisible || entity === null) {
      return null;
   }

   return <div id="animal-staff-options" style={{left: x + "px", bottom: y + "px"}} onContextMenu={e => e.preventDefault()} onMouseOver={onMouseOver} onMouseMove={onMouseMove} onMouseOut={onMouseOut}>
      <div className={`option follow${followOptionIsSelected ? " active" : ""}`} onClick={sendFollowCommand}></div>
      <div className="option carry" onClick={pressCarryOption}></div>
   </div>;
}

export default AnimalStaffOptions;