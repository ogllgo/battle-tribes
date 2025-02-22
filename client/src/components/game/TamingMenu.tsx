import { useEffect, useReducer, useState } from "react";
import CLIENT_ENTITY_INFO_RECORD from "../../client-entity-info";
import { entityExists, getEntityType } from "../../world";
import { Entity } from "../../../../shared/src/entities";
import { getTamingSkillByID, TAMING_SKILLS, TAMING_TIER_INFO_RECORD, TamingSkill, TamingSkillID } from "battletribes-shared/taming";
import { hasTamingSkill, TamingComponent, TamingComponentArray } from "../../entity-components/server-components/TamingComponent";
import Menu from "./menus/Menu";
import { keyIsPressed } from "../../keyboard-input";
import { sendAcquireTamingSkillPacket, sendCompleteTamingTierPacket, sendForceAcquireTamingSkillPacket, sendForceCompleteTamingTierPacket } from "../../networking/packet-creation";
import { isDev } from "../../utils";
import TamingSkillTooltip from "./TamingSkillTooltip";

const enum Vars {
   SKILL_TRANSFORM_SCALE_FACTOR = 0.5
}

interface TierSeparatorProps {
   readonly tamingTier: number;
}

interface SkillConnectorProps {
   readonly tamingComponent: TamingComponent;
   readonly fromSkill: TamingSkill;
   readonly toSkill: TamingSkill;
}

export let TamingMenu_setVisibility: (isVisible: boolean) => void = () => {};
export let TamingMenu_setEntity: (entity: Entity) => void = () => {};
export let TamingMenu_forceUpdate: () => void = () => {};

const TAMING_MENU_ICONS: Record<TamingSkillID, any> = {
   [TamingSkillID.follow]: require("../../images/menus/taming-almanac/follow-skill.png"),
   [TamingSkillID.riding]: require("../../images/menus/taming-almanac/riding-skill.png"),
   [TamingSkillID.move]: require("../../images/menus/taming-almanac/move-skill.png"),
   [TamingSkillID.carry]: require("../../images/menus/taming-almanac/carry-skill.png"),
   [TamingSkillID.attack]: require("../../images/menus/taming-almanac/attack-skill.png"),
   [TamingSkillID.shatteredWill]: require("../../images/menus/taming-almanac/shattered-will-skill.png")
};

const UNUSED_NAMETAG_IMG = require("../../images/menus/taming-almanac/nametag-unused.png");
const USED_NAMETAG_IMG = require("../../images/menus/taming-almanac/nametag-used.png");

const TAMING_TIER_ICONS: Record<number, any> = {
   0: require("../../images/entities/miscellaneous/taming-tier-0.png"),
   1: require("../../images/entities/miscellaneous/taming-tier-1.png"),
   2: require("../../images/entities/miscellaneous/taming-tier-2.png"),
   3: require("../../images/entities/miscellaneous/taming-tier-3.png")
};

const TierSeparator = (props: TierSeparatorProps) => {
   const tierInfo = TAMING_TIER_INFO_RECORD[props.tamingTier]!;

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
   
   let className = "skill-connector";
   if (hasTamingSkill(props.tamingComponent, props.toSkill.id)) {
      className += " confirmed";
   }
   
   return <div className={className} style={{"--x": x, "--y": y, "--direction-rad": offsetDirection + "rad", "--magnitude": offsetMagnitude} as React.CSSProperties}></div>;
}

const TamingMenu = () => {
   const [entity, setEntity] = useState(0);
   const [isVisible, setIsVisible] = useState(false);
   const [_, forceUpdate] = useReducer(x => x + 1, 0);
   const [hoveredSkill, setHoveredSkill] = useState<TamingSkill | null>(null);
   
   useEffect(() => {
      TamingMenu_setEntity = setEntity;
      TamingMenu_setVisibility = setIsVisible;

      // @Hack
      TamingMenu_forceUpdate = forceUpdate;
   }, []);

   useEffect(() => {
      if (!isVisible) {
         setHoveredSkill(null);
      }
   }, [isVisible]);

   if (!isVisible || !entityExists(entity)) {
      return null;
   }

   const clientEntityInfo = CLIENT_ENTITY_INFO_RECORD[getEntityType(entity)];

   const tamingComponent = TamingComponentArray.getComponent(entity);

   const nextTamingTierInfo = TAMING_TIER_INFO_RECORD[tamingComponent.tamingTier + 1];

   const berryProgress = typeof nextTamingTierInfo !== "undefined" ? Math.min(tamingComponent.berriesEatenInTier / nextTamingTierInfo.costBerries, 1) : 1;

   const onCompleteButtonClick = (): void => {
      if (keyIsPressed("shift") && isDev()) {
         sendForceCompleteTamingTierPacket(entity);
      } else {
         sendCompleteTamingTierPacket(entity);
      }
   }

   const onSkillClick = (skill: TamingSkill): void => {
      if (keyIsPressed("shift") && isDev()) {
         sendForceAcquireTamingSkillPacket(entity, skill.id);
      } else {
         sendAcquireTamingSkillPacket(entity, skill.id);
      }
   }

   const onSkillMouseOver = (skill: TamingSkill): void => {
      setHoveredSkill(skill);
   }

   const onSkillMouseOut = (): void => {
      setHoveredSkill(null);
   }
   
   return <>
      <Menu id="taming-menu" className="menu">
         <h1>{clientEntityInfo.name} <img src={tamingComponent.name !== "" ? USED_NAMETAG_IMG : UNUSED_NAMETAG_IMG} /></h1>

         <p className="taming-tier">
            <span>Taming Tier:</span>
            <img src={TAMING_TIER_ICONS[tamingComponent.tamingTier]} />
         </p>

         <div className="progress-area">
            <div className="row">
               <div className="berry-progress-bar">
                  <div className="berry-progress-bar-bg"></div>
                  <div className="berry-progress-bar-fill" style={{"--width-percentage": berryProgress * 100 + "%"} as React.CSSProperties}></div>
                  <div className="progress-counter">
                     {typeof nextTamingTierInfo !== "undefined" ? <>
                        <span>{tamingComponent.berriesEatenInTier}/{nextTamingTierInfo.costBerries} Berries</span>
                        <img src={require("../../images/items/large/berry.png")} />
                     </> : <>
                        <div className="height-padder">
                           <span>Max!</span>
                        </div>
                     </>}
                  </div>
               </div>
               {typeof nextTamingTierInfo !== "undefined" ? (
                  <button className={tamingComponent.berriesEatenInTier >= nextTamingTierInfo.costBerries ? "clickable" : undefined} onMouseDown={onCompleteButtonClick}>Complete</button>
               ) : null}
            </div>
         </div>

         <div className="skill-map-container">
            {TAMING_SKILLS.map((skill, i) => {
               let className = "skill";
               if (skill.requiredTamingTier > tamingComponent.tamingTier) {
                  className += " inaccessible";
               }
               if (hasTamingSkill(tamingComponent, skill.id)) {
                  className += " acquired";
               }
               return <div key={i} className={className} style={{top: skill.y * Vars.SKILL_TRANSFORM_SCALE_FACTOR + "rem", left: `calc(50% + ${skill.x * Vars.SKILL_TRANSFORM_SCALE_FACTOR}rem)`}}>
                  <div>
                     <div className="skill-icon-wrapper" onMouseDown={() => onSkillClick(skill)} onMouseOver={() => onSkillMouseOver(skill)} onMouseOut={() => onSkillMouseOut()}>
                        <div className="skill-bg" />
                        <img className="skill-icon" src={TAMING_MENU_ICONS[skill.id]} />
                     </div>
                  </div> 
                  <p>{skill.name}</p>
               </div>;
            })}
            {TAMING_SKILLS.map((skill, i) => {
               if (skill.parent !== null && tamingComponent.tamingTier >= skill.requiredTamingTier) {
                  return <SkillConnector key={i} tamingComponent={tamingComponent} fromSkill={getTamingSkillByID(skill.parent)} toSkill={skill} />
               } else {
                  return null;
               }
            })}

            {tamingComponent.tamingTier < 1 ? (
               <TierSeparator tamingTier={1} />
            ) : null}
            {tamingComponent.tamingTier < 2 ? (
               <TierSeparator tamingTier={2} />
            ) : null}
            {tamingComponent.tamingTier < 3 ? (
               <TierSeparator tamingTier={3} />
            ) : null}
         </div>
      </Menu>

      {hoveredSkill !== null ? (
         <TamingSkillTooltip tamingComponent={tamingComponent} skill={hoveredSkill} />
      ) : null}
   </>;
}

export default TamingMenu;