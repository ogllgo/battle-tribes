import { useCallback, useEffect, useState } from "react";
import { Entity } from "../../../../shared/src/entities";
import { TransformComponentArray } from "../../entity-components/server-components/TransformComponent";
import Camera from "../../Camera";
import { sendAnimalStaffFollowCommandPacket } from "../../networking/packet-creation";
import { deselectSelectedEntity } from "../../entity-selection";
import { CowComponentArray } from "../../entity-components/server-components/CowComponent";

// @Cleanup: a lot of this is similar to BuildMenu

export let AnimalStaffOptions_setIsVisible: (isVisible: boolean) => void = () => {};
export let AnimalStaffOptions_setEntity: (entity: Entity | null) => void = () => {};
export let AnimalStaffOptions_update: () => void = () => {};

const AnimalStaffOptions = () => {
   const [isVisible, setIsVisible] = useState(false);
   const [entity, setEntity] = useState<Entity | null>(null);
   const [x, setX] = useState(0);
   const [y, setY] = useState(0);
   const [followOptionIsSelected, setFollowOptionIsSelected] = useState(false);

   useEffect(() => {
      AnimalStaffOptions_setIsVisible = setIsVisible;
      AnimalStaffOptions_setEntity = setEntity;
   }, []);

   useEffect(() => {
      AnimalStaffOptions_update = (): void => {
         if (entity === null) {
            return;
         }

         const transformComponent = TransformComponentArray.getComponent(entity);

         const screenX = Camera.calculateXScreenPos(transformComponent.position.x);
         const screenY = Camera.calculateYScreenPos(transformComponent.position.y);
         setX(screenX);
         setY(screenY);

         const cowComponent = CowComponentArray.getComponent(entity);
         setFollowOptionIsSelected(cowComponent.isFollowing);
      }
   }, [entity]);

   const sendFollowCommand = useCallback((): void => {
      if (entity !== null) {
         sendAnimalStaffFollowCommandPacket(entity);
      }
      deselectSelectedEntity();
   }, [entity]);
   
   if (!isVisible || entity === null) {
      return null;
   }

   return <div id="animal-staff-options" style={{left: x + "px", bottom: y + "px"}}>
      <div className={`option follow${followOptionIsSelected ? " active" : ""}`} onClick={sendFollowCommand}></div>
      <div className="option carry"></div>
   </div>;
}

export default AnimalStaffOptions;