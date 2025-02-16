interface SelectCarryTargetCursorOverlayProps {
   readonly mouseX: number;
   readonly mouseY: number;
}

const SelectCarryTargetCursorOverlay = (props: SelectCarryTargetCursorOverlayProps) => {
   return <div id="select-carry-target-cursor-overlay" style={{left: props.mouseX + "px", top: props.mouseY + "px"}}></div>;
}

export default SelectCarryTargetCursorOverlay;