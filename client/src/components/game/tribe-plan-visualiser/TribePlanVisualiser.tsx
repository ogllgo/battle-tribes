import { useCallback, useEffect, useState } from "react";
import { TribesmanPlan } from "../../../rendering/tribe-plan-visualiser/tribe-plan-visualiser";
import { distance, TribesmanPlanType } from "../../../../../shared/src/utils";
import CLIENT_ITEM_INFO_RECORD from "../../../client-item-info";
import CLIENT_ENTITY_INFO_RECORD from "../../../client-entity-info";

const enum Vars {
   ZOOM_FACTOR = 1.4
}

interface PlanNodeProps {
   readonly offsetX: number;
   readonly offsetY: number;
   readonly plan: TribesmanPlan;
}

interface PlanConnectorProps {
   readonly offsetX: number;
   readonly offsetY: number;
   readonly startPlan: TribesmanPlan;
   readonly endPlan: TribesmanPlan;
}

export let TribePlanVisualiser_setPlan: (plan: TribesmanPlan | null) => void = () => {};

const getPlanX = (plan: TribesmanPlan, offsetX: number): number => {
   return plan.xOffset * 1.7 + offsetX;
}
const getPlanY = (plan: TribesmanPlan, offsetY: number): number => {
   return plan.depth * 120 + offsetY;
}

const PlanConnector = (props: PlanConnectorProps) => {
   const startX = getPlanX(props.startPlan, props.offsetX);
   const startY = getPlanY(props.startPlan, props.offsetY);
   const endX = getPlanX(props.endPlan, props.offsetX);
   const endY = getPlanY(props.endPlan, props.offsetY);
   
   const length = distance(startX, startY, endX, endY);
   const angle = Math.atan2(endY - startY, endX - startX);
   
   return <div style={{width: length + "px", left: `calc(50% + ${startX}px)`, top: `calc(50% + ${startY}px)`, transform: `rotate(${angle}rad)`}} className="node-connector"></div>;
}

const PlanNode = (props: PlanNodeProps) => {
   const plan = props.plan;

   let content: JSX.Element;
   switch (plan.type) {
      case TribesmanPlanType.root: {
         content = <>
            <h3 className="title">Root Plan</h3>
         </>;
         break;
      };
      case TribesmanPlanType.craftRecipe: {
         const productClientItemInfo = CLIENT_ITEM_INFO_RECORD[plan.recipe.product];
         
         content = <>
            <h3 className="title">Craft Recipe</h3>
            <p>{productClientItemInfo.name}</p>
            <p>Amount: {plan.productAmount}</p>
         </>;
         break;
      };
      case TribesmanPlanType.placeBuilding: {
         content = <>
            <h3 className="title">Place Building</h3>
            <p>{CLIENT_ENTITY_INFO_RECORD[plan.entityType].name}</p>
         </>;
         break;
      };
      case TribesmanPlanType.upgradeBuilding: {
         content = <>
            <h3 className="title">Upgrade Building</h3>
         </>;
         break;
      };
      case TribesmanPlanType.doTechStudy: {
         content = <>
            <h3 className="title">Study Tech</h3>
            <p>{plan.tech.name}</p>
         </>;
         break;
      };
      case TribesmanPlanType.doTechItems: {
         content = <>
            <h3 className="title">Do Tech Items</h3>
            <p>{plan.tech.name}</p>
            <p>{CLIENT_ITEM_INFO_RECORD[plan.itemType].name}</p>
         </>;
         break;
      };
      case TribesmanPlanType.completeTech: {
         content = <>
            <h3 className="title">Complete Tech</h3>
            <p>{plan.tech.name}</p>
         </>;
         break;
      };
      case TribesmanPlanType.gatherItem: {
         content = <>
            <h3 className="title">Gather Items</h3>
            <p>{CLIENT_ITEM_INFO_RECORD[plan.itemType].name} x{plan.amount}</p>
         </>;
         break;
      };
   }

   let className = "tribe-plan-node";
   if (plan.isComplete) {
      className += " complete";
   } else if (plan.assignedTribesman !== null) {
      className += " assigned";
   }
   
   return <>
      <div style={{"left": `calc(50% + ${getPlanX(plan, props.offsetX)}px)`, "top": `calc(50% + ${getPlanY(plan, props.offsetY)}px)`}} className={className}>
         {content}

         {plan.assignedTribesman !== null ? (
            <p>Assigned: #{plan.assignedTribesman}</p>
         ) : <></>}
      </div>

      {plan.childPlans.map((childPlan, i) => {
         return <div key={i}>
            <PlanNode plan={childPlan} offsetX={props.offsetX} offsetY={props.offsetY} />
            <PlanConnector startPlan={props.plan} endPlan={childPlan} offsetX={props.offsetX} offsetY={props.offsetY} />
         </div>
      })}
   </>;
}

const TribePlanVisualiser = () => {
   const [plan, setPlan] = useState<TribesmanPlan | null>(null);
   const [isDragging, setIsDragging] = useState(false);
   const [lastCursorX, setLastCursorX] = useState(0);
   const [lastCursorY, setLastCursorY] = useState(0);
   const [offsetX, setOffsetX] = useState(0);
   const [offsetY, setOffsetY] = useState(0);
   const [zoom, setZoom] = useState(1);

   useEffect(() => {
      TribePlanVisualiser_setPlan = (plan: TribesmanPlan | null): void => {
         setPlan(plan);
      }
   }, []);

   const onMouseDown = (e: MouseEvent): void => {
      setIsDragging(true);
      setLastCursorX(e.clientX);
      setLastCursorY(e.clientY);
   }

   const onMouseUp = (e: MouseEvent): void => {
      setIsDragging(false);
   }

   const onMouseMove = useCallback((e: MouseEvent): void => {
      if (!isDragging) {
         return;
      }

      setOffsetX(offsetX + (e.clientX - lastCursorX) / zoom);
      setOffsetY(offsetY + (e.clientY - lastCursorY) / zoom);
      
      setLastCursorX(e.clientX);
      setLastCursorY(e.clientY);
   }, [isDragging, offsetX, offsetY, zoom]);

   const onWheel = useCallback((e: WheelEvent): void => {
      if (e.deltaY > 0) {
         setZoom(zoom / Vars.ZOOM_FACTOR);
      } else {
         setZoom(zoom * Vars.ZOOM_FACTOR);
      }
   }, [zoom]);
   
   if (plan === null) {
      return null;
   }

   return <div id="tribe-plan-visualiser" onWheel={e => onWheel(e.nativeEvent)} onMouseDown={e => onMouseDown(e.nativeEvent)} onMouseUp={e => onMouseUp(e.nativeEvent)} onMouseMove={e => onMouseMove(e.nativeEvent)}>
      <div style={{transform: `scale(${zoom})`}}>
         <PlanNode plan={plan} offsetX={offsetX} offsetY={offsetY} />
      </div>
   </div>;
}

export default TribePlanVisualiser;