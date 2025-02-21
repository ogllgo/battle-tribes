import { useEffect, useState } from "react";
import CLIENT_ENTITY_INFO_RECORD from "../../client-entity-info";
import { entityExists, getEntityType } from "../../world";
import { Entity } from "../../../../shared/src/entities";
import { getTamingSkillByID, TAMING_SKILLS, TAMING_TIER_INFO_RECORD, TamingSkill, TamingSkillID } from "battletribes-shared/taming";
import { TamingComponentArray } from "../../entity-components/server-components/TamingComponent";
import Menu from "./menus/Menu";

const enum Vars {
   SKILL_TRANSFORM_SCALE_FACTOR = 0.5
}

interface TierSeparatorProps {
   readonly tamingTier: number;
}

interface SkillConnectorProps {
   readonly fromSkill: TamingSkill;
   readonly toSkill: TamingSkill;
}

export let TamingMenu_setVisibility: (isVisible: boolean) => void = () => {};
export let TamingMenu_setEntity: (entity: Entity) => void = () => {};

const TAMING_MENU_ICONS: Record<TamingSkillID, any> = {
   [TamingSkillID.follow]: require("../../images/menus/taming-almanac/follow-skill.png"),
   [TamingSkillID.riding]: require("../../images/menus/taming-almanac/riding-skill.png"),
   [TamingSkillID.move]: require("../../images/menus/taming-almanac/move-skill.png"),
   [TamingSkillID.carry]: require("../../images/menus/taming-almanac/carry-skill.png"),
   [TamingSkillID.attack]: require("../../images/menus/taming-almanac/attack-skill.png"),
   [TamingSkillID.shatteredWill]: require("../../images/menus/taming-almanac/shattered-will-skill.png")
};

const skillBGImage = require("../../images/menus/taming-almanac/skill-bg.png");

const UNUSED_NAMETAG_IMG = require("../../images/menus/taming-almanac/nametag-unused.png");
const USED_NAMETAG_IMG = require("../../images/menus/taming-almanac/nametag-used.png");

const TAMING_TIER_ICONS: Record<number, any> = {
   0: require("../../images/entities/miscellaneous/taming-tier-0.png"),
   1: require("../../images/entities/miscellaneous/taming-tier-1.png"),
   2: require("../../images/entities/miscellaneous/taming-tier-2.png"),
   3: require("../../images/entities/miscellaneous/taming-tier-3.png")
};

const TierSeparator = (props: TierSeparatorProps) => {
   const tierInfo = TAMING_TIER_INFO_RECORD[props.tamingTier];

   return <div className="tier-separator-container" style={{top: tierInfo.y * Vars.SKILL_TRANSFORM_SCALE_FACTOR + "rem"}}>
      <img className="tier-icon" src={TAMING_TIER_ICONS[props.tamingTier]} />
      <div className="tier-separator"></div>
   </div>;
}

const SkillConnector = (props: SkillConnectorProps) => {
   // Position it at the start skill
   const x = props.fromSkill.x * Vars.SKILL_TRANSFORM_SCALE_FACTOR + "rem";
   const y = props.fromSkill.y * Vars.SKILL_TRANSFORM_SCALE_FACTOR + "rem";

   const offsetX = props.toSkill.x - props.fromSkill.x;
   const offsetY = props.toSkill.y - props.fromSkill.y;
   const offsetDirection = Math.atan2(offsetY, offsetX);
   const offsetMagnitude = Math.sqrt(offsetX * offsetX + offsetY * offsetY) * Vars.SKILL_TRANSFORM_SCALE_FACTOR + "rem";
   
   return <div className="skill-connector" style={{"--x": x, "--y": y, "--direction-rad": offsetDirection + "rad", "--magnitude": offsetMagnitude} as React.CSSProperties}></div>;
}

const TamingMenu = () => {
   const [entity, setEntity] = useState(0);
   const [isVisible, setIsVisible] = useState(false);
   
   useEffect(() => {
      TamingMenu_setEntity = setEntity;
      TamingMenu_setVisibility = setIsVisible;
   }, []);

   if (!isVisible || !entityExists(entity)) {
      return null;
   }

   const clientEntityInfo = CLIENT_ENTITY_INFO_RECORD[getEntityType(entity)];

   const tamingComponent = TamingComponentArray.getComponent(entity);

   const nextTamingTierInfo = TAMING_TIER_INFO_RECORD[tamingComponent.tamingTier + 1];
   
   return <Menu id="taming-menu" className="menu">
      <h1>{clientEntityInfo.name} <img src={tamingComponent.name !== "" ? USED_NAMETAG_IMG : UNUSED_NAMETAG_IMG} /></h1>

      <p className="taming-tier">Taming Tier {tamingComponent.tamingTier} - <img src={TAMING_TIER_ICONS[tamingComponent.tamingTier]} /></p>

      <div className="progress-area">
         <div className="row">
            <div className="berry-progress-bar">
               <div className="berry-progress-bar-bg"></div>
               <div className="berry-progress-bar-fill"></div>
               {typeof nextTamingTierInfo !== "undefined" ? (
                  <div className="progress-counter">
                     <span>{tamingComponent.berriesEatenInTier}/{nextTamingTierInfo.costBerries} Berries</span>
                     <img src={require("../../images/items/large/berry.png")} />
                  </div>
               ) : null}
            </div>
            <button>Complete</button>
         </div>
      </div>

      <div className="skill-map-container">
         {TAMING_SKILLS.map((skill, i) => {
            return <div key={i} className="skill" style={{top: skill.y * Vars.SKILL_TRANSFORM_SCALE_FACTOR + "rem", left: `calc(50% + ${skill.x * Vars.SKILL_TRANSFORM_SCALE_FACTOR}rem)`}}>
               <div>
                  <div className="skill-icon-wrapper">
                     <img className="skill-bg" src={skillBGImage} />
                     <img className="skill-icon" src={TAMING_MENU_ICONS[skill.id]} />
                  </div>
               </div>
               <p>{skill.name}</p>
            </div>;
         })}
         {TAMING_SKILLS.map((skill, i) => {
            if (skill.parent !== null) {
               return <SkillConnector key={i} fromSkill={getTamingSkillByID(skill.parent)} toSkill={skill} />
            } else {
               return null;
            }
         })}

         <TierSeparator tamingTier={1} />
         <TierSeparator tamingTier={2} />
         <TierSeparator tamingTier={3} />
      </div>
   </Menu>;
}

export default TamingMenu;