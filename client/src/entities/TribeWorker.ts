import Tribesman from "./Tribesman";
import { EquipmentComponent, EquipmentComponentArray } from "../entity-components/client-components/EquipmentComponent";
import { FootprintComponent, FootprintComponentArray } from "../entity-components/client-components/FootprintComponent";

class TribeWorker extends Tribesman {
   constructor(id: number) {
      super(id);
      
      FootprintComponentArray.addComponent(this.id, new FootprintComponent(0.15, 20, 64, 4, 50));
      EquipmentComponentArray.addComponent(this.id, new EquipmentComponent());
   }
}

export default TribeWorker;