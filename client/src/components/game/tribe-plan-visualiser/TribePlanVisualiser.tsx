import { useEffect, useState } from "react";
import { TribesmanPlan } from "../../../rendering/tribe-plan-visualiser/tribe-plan-visualiser";
import { TribesmanPlanType } from "../../../../../shared/src/utils";
import CLIENT_ITEM_INFO_RECORD from "../../../client-item-info";
import CLIENT_ENTITY_INFO_RECORD from "../../../client-entity-info";

interface PlanNodeProps {
   readonly plan: TribesmanPlan;
}

interface PlanConnectorProps {
   readonly startPlan: TribesmanPlan;
   readonly endPlan: TribesmanPlan;
}

export let TribePlanVisualiser_setPlan: (plan: TribesmanPlan | null) => void = () => {};

const getPlanX = (plan: TribesmanPlan): number => {
   return plan.xOffset;
}
const getPlanY = (plan: TribesmanPlan): number => {
   return plan.depth * 80;
}

const PlanConnector = (props: PlanConnectorProps) => {
   const length = 
   
   return <div className="plan-connector"></div>;
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
         </>;
         break;
      };
      case TribesmanPlanType.doTechItems: {
         content = <>
            <h3 className="title">Do Tech Items</h3>
         </>;
         break;
      };
      case TribesmanPlanType.completeTech: {
         content = <>
            <h3 className="title">Complete Tech</h3>
         </>;
         break;
      };
      case TribesmanPlanType.gatherItem: {
         content = <>
            <h3 className="title">Gather Items</h3>
         </>;
         break;
      };
   }
   
   return <>
      <div style={{"left": `calc(50% + ${getPlanX(plan)}px)`, "top": `calc(50% + ${getPlanY(plan)}px)`}} className="tribe-plan-node">
         {content}
      </div>

      {plan.childPlans.map((childPlan, i) => {
         return <>
            <PlanNode key={i} plan={childPlan} />

         </>
      })}
   </>;
}

const TribePlanVisualiser = () => {
   const [plan, setPlan] = useState<TribesmanPlan | null>(null);

   useEffect(() => {
      TribePlanVisualiser_setPlan = (plan: TribesmanPlan | null): void => {
         setPlan(plan);
      }
   }, []);
   
   if (plan === null) {
      return null;
   }

   return <div id="tribe-plan-visualiser">
      <PlanNode plan={plan} />
   </div>;
}

export default TribePlanVisualiser;