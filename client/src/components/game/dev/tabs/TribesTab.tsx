import { useCallback, useEffect, useReducer, useState } from "react";
import Game from "../../../../Game";
import DevmodeScrollableOptions from "../DevmodeScrollableOptions";
import Client from "../../../../networking/Client";
import { TribeType, NUM_TRIBE_TYPES } from "battletribes-shared/tribes";
import CLIENT_TRIBE_INFO_RECORD from "../../../../client-tribe-info";
import DevmodeDropdownInput from "../DevmodeDropdownInput";
import { setRenderedTribePlanID } from "../../../../rendering/tribe-plan-visualiser/tribe-plan-visualiser";
import { tribeHasExtendedInfo, tribes } from "../../../../tribes";
import CLIENT_ENTITY_INFO_RECORD from "../../../../client-entity-info";
import { sendSetAutogiveBaseResourcesPacket, sendTPTOEntityPacket } from "../../../../networking/packet-creation";

export let TribesTab_refresh: () => void = () => {};

const TribesTab = () => {
   const [selectedTribe, setSelectedTribe] = useState(tribes[0]);
   const [, forceUpdate] = useReducer(x => x + 1, 0);

   useEffect(() => {
      TribesTab_refresh = forceUpdate;
   }, []);
   
   const selectTribeID = (optionIdx: number): void => {
      setSelectedTribe(tribes[optionIdx]);
   }

   const updateTribeType = useCallback((optionIdx: number): void => {
      const tribeType = optionIdx as TribeType;
      Client.sendDevChangeTribeType(selectedTribe.id, tribeType);
   }, [selectedTribe]);

   const tribeTypeOptions = new Array<string>();
   for (let tribeType: TribeType = 0; tribeType < NUM_TRIBE_TYPES; tribeType++) {
      const clientInfo = CLIENT_TRIBE_INFO_RECORD[tribeType];
      tribeTypeOptions.push(clientInfo.name);
   }

   const checkAutogiveBaseResources = (e: Event): void => {
      const autogiveBaseResources = (e.target as HTMLInputElement).checked;
      sendSetAutogiveBaseResourcesPacket(selectedTribe.id, autogiveBaseResources);
   }
   
   return <div id="tribes-tab" className="devmode-tab devmode-container">
      <div className="flex-container">
         <DevmodeScrollableOptions options={tribes.map(tribe => tribe.id.toString())} onOptionSelect={selectTribeID} />
         
         <div className="flex-container column">
            <div className="spawn-options devmode-menu-section">
               <h2 className="devmode-menu-section-title">{selectedTribe.name}</h2>
               <div className="bar"></div>

               <DevmodeDropdownInput text="Tribe type:" options={tribeTypeOptions} onChange={updateTribeType} />

               <button onClick={() => setRenderedTribePlanID(selectedTribe.id)}>View Plans</button>

               <label>
                  <input type="checkbox" onChange={e => checkAutogiveBaseResources(e.nativeEvent)} />
                  Autogive Base Resources
               </label>
            </div>

            {tribeHasExtendedInfo(selectedTribe) ? (
               <div className="devmode-menu-section">
                  <h3>Tribesmen</h3>

                  {selectedTribe.tribesmen.map((tribesmanInfo, i) => {
                     return <div key={i} className="devmode-card">
                        <button onClick={() => sendTPTOEntityPacket(tribesmanInfo.entity)}>Teleport</button>
                        
                        <p>{tribesmanInfo.name}</p>
                        <p>{CLIENT_ENTITY_INFO_RECORD[tribesmanInfo.entityType].name} #{tribesmanInfo.entity}</p>
                     </div>;
                  })}
               </div>
            ) : <></>}

            {/* @Cleanup: Wrong section */}
            <div className="devmode-menu-section">
               <button onClick={() => Client.sendDevCreateTribe()}>Create New Tribe</button>
            </div>
         </div>
      </div>
   </div>;
}

export default TribesTab;