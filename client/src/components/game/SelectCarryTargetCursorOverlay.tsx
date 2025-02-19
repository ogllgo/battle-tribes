import { GameInteractState } from "./GameScreen";

interface SelectCarryTargetCursorOverlayProps {
   readonly gameInteractState: GameInteractState;
   readonly mouseX: number;
   readonly mouseY: number;
}

const SelectTargetCursorOverlay = (props: SelectCarryTargetCursorOverlayProps) => {
   const className = props.gameInteractState === GameInteractState.selectCarryTarget ? "carry" : "attack";
   return <div id="select-carry-target-cursor-overlay" className={className} style={{left: props.mouseX + "px", top: props.mouseY + "px"}}></div>;
}

export default SelectTargetCursorOverlay;