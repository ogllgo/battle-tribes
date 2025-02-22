import { TamingSkill } from "../../../../shared/src/taming";
import { getTamingSkillLearning, hasTamingSkill, skillLearningIsComplete, TamingComponent } from "../../entity-components/server-components/TamingComponent";
import { cursorX, cursorY } from "../../mouse";

interface TamingSkillTooltipProps {
   readonly tamingComponent: TamingComponent;
   readonly skill: TamingSkill;
}

const TamingSkillTooltip = (props: TamingSkillTooltipProps) => {
   const tamingComponent = props.tamingComponent;
   const skill = props.skill;
   
   const x = cursorX;
   const y = cursorY;

   const skillLearning = getTamingSkillLearning(props.tamingComponent, skill.id);
   
   return <div id="taming-skill-tooltip" style={{top: y + "px", left: x + "px"}}>
      <p className="description">{skill.description}</p>

      {!hasTamingSkill(tamingComponent, skill.id) ? <>
         {skill.requiredTamingTier <= tamingComponent.tamingTier ? (
            skill.requirements.map((requirement, i) => {
               let requirementProgress: number;
               const skillLearning = getTamingSkillLearning(tamingComponent, skill.id);
               if (skillLearning !== null) {
                  requirementProgress = skillLearning.requirementProgressArray[i];
               } else {
                  requirementProgress = 0;
               }
               
               return <p key={i} className="requirement">{requirement.description}: {requirementProgress}/{requirement.amountRequired}{requirement.suffix}</p>
            })
         ) : null}

         {skillLearning !== null && skillLearningIsComplete(skillLearning) ? (
            <p className="complete-text">Click to claim this skill!</p>
         ) : null}
      </> : null}
      
   </div>;
}

export default TamingSkillTooltip;