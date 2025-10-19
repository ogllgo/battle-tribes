import { useEffect, useRef, useState } from "react";
import { App_setState, AppState } from "./App";

// @Cleanup: This file does too much logic on its own. It should really only have UI/loading state

export let LoadingScreen_setStatus: (status: LoadingScreenStatus) => void = () => {};

export const enum LoadingScreenStatus {
   establishingConnection,
   sendingPlayerData,
   initialisingGame,
   connectionError
}

const LoadingScreen = () => {
   const [status, setStatus] = useState(LoadingScreenStatus.establishingConnection);
   const hasStarted = useRef(false);

   const openMainMenu = (): void => {
      App_setState(AppState.mainMenu);
   }

   const reconnect = (): void => {
      hasStarted.current = false;
      setStatus(LoadingScreenStatus.establishingConnection);
   }

   useEffect(() => {
      LoadingScreen_setStatus = setStatus;
   }, []);

   if (status === LoadingScreenStatus.connectionError) {
      return <div id="loading-screen">
         <div className="content">
            <h1 className="title">Connection closed</h1>
            
            <div className="loading-message">
               <p>Connection with server failed.</p>

               <button onClick={reconnect}>Reconnect</button>
               <button onClick={openMainMenu}>Back</button>
            </div>
         </div>
      </div>;
   }

   return <div id="loading-screen">
      <div className="content">
         <h1 className="title">Loading</h1>

         {status === LoadingScreenStatus.establishingConnection ? <>
            <div className="loading-message">
               <p>Connecting to server...</p>
            </div>
         </> : status === LoadingScreenStatus.sendingPlayerData ? <>
            <div className="loading-message">
               <p>Sending player data...</p>
            </div>
         </> : status === LoadingScreenStatus.initialisingGame ? <>
            <div className="loading-message">
               <p>Initialising game...</p>
            </div>
         </> : null}
      </div>
   </div>;
}

export default LoadingScreen;