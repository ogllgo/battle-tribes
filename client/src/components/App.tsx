import { TribeType } from "battletribes-shared/tribes";
import { useEffect, useRef, useState } from "react";
import GameScreen from "./game/GameScreen";
import LoadingScreen from "./LoadingScreen";
import FrameGraph from "./game/dev/FrameGraph";
import MainMenu from "./MainMenu";
import { establishNetworkConnection } from "../client";

export const enum AppState {
   mainMenu,
   loading,
   game
}

export let App_setState: (state: AppState) => void = () => {};

function App() {
   const usernameRef = useRef("");
   const tribeTypeRef = useRef(TribeType.plainspeople);
   const isSpectatingRef = useRef(false);
   const [appState, setAppState] = useState(AppState.mainMenu);

   useEffect(() => {
      App_setState = (appState: AppState): void => {
         // @HACK
         if (appState === AppState.loading) {
            establishNetworkConnection(usernameRef.current, tribeTypeRef.current, isSpectatingRef.current);
         }
         
         setAppState(appState);
      }
   }, [usernameRef, tribeTypeRef, isSpectatingRef]);

   return <>
      {appState === AppState.mainMenu ? <>
         <MainMenu existingUsername={usernameRef.current} usernameRef={usernameRef} tribeTypeRef={tribeTypeRef} isSpectatingRef={isSpectatingRef} />
      </> : appState === AppState.loading ? <>
         <LoadingScreen />
      </> : appState === AppState.game ? <>
         <GameScreen setAppState={setAppState} />
      </> : null}

      <div id="canvas-wrapper" className={appState !== AppState.game ? "hidden" : undefined}>
         <canvas id="game-canvas"></canvas>
         <canvas id="text-canvas"></canvas>
         <canvas id="tech-tree-canvas" className="hidden"></canvas>
         <canvas id="tribe-plan-visualiser-canvas" className="hidden"></canvas>
         <FrameGraph />
      </div>
   </>;
}

export default App;
