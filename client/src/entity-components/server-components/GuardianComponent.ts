import { HitboxFlag } from "../../../../shared/src/boxes/boxes";
import { GuardianAttackType, GuardianCrystalBurstStage, GuardianCrystalSlamStage, GuardianSpikyBallSummonStage, ServerComponentType } from "../../../../shared/src/components";
import { Entity } from "../../../../shared/src/entities";
import { PacketReader } from "../../../../shared/src/packets";
import { lerp, Point } from "../../../../shared/src/utils";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { Light, attachLightToRenderPart, createLight } from "../../lights";
import { VisualRenderPart } from "../../render-parts/render-parts";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { registerDirtyRenderInfo } from "../../rendering/render-part-matrices";
import { playSoundOnEntity } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityPreCreationInfo, getEntityRenderInfo } from "../../world";
import { EntityConfig } from "../ComponentArray";
import ServerComponentArray from "../ServerComponentArray";

export interface GuardianComponentParams {
   readonly rubyGemActivation: number;
   readonly emeraldGemActivation: number;

   readonly amethystGemActivation: number;
   readonly limbRubyGemActivation: number;
   readonly limbEmeraldGemActivation: number;
   readonly limbAmethystGemActivation: number;

   readonly attackType: number;
   readonly attackStage: number;
   readonly stageProgress: number;
}

export interface GuardianComponent {
   readonly rubyRenderParts: Array<VisualRenderPart>;
   readonly amethystRenderParts: Array<VisualRenderPart>;
   readonly emeraldRenderParts: Array<VisualRenderPart>;

   readonly rubyLights: Array<[number, Light]>;
   readonly emeraldLights: Array<[number, Light]>;
   readonly amethystLights: Array<[number, Light]>;

   rubyGemActivation: number;
   emeraldGemActivation: number;
   amethystGemActivation: number;

   readonly limbRenderParts: Array<VisualRenderPart>;
   readonly limbCrackRenderParts: Array<VisualRenderPart>;
   readonly limbCrackLights: Array<Light>;

   limbRubyGemActivation: number;
   limbEmeraldGemActivation: number;
   limbAmethystGemActivation: number;

   attackType: GuardianAttackType;
   attackStage: number;
}

const enum Vars {
   SPIKY_BALL_SUMMON_SHAKE_AMOUNT = 2
}

export const GuardianComponentArray = new ServerComponentArray<GuardianComponent, GuardianComponentParams, never>(ServerComponentType.guardian, true, {
   createParamsFromData: createParamsFromData,
   createComponent: createComponent,
   getMaxRenderParts: getMaxRenderParts,
   padData: padData,
   updateFromData: updateFromData
});

function createParamsFromData(reader: PacketReader): GuardianComponentParams {
   const rubyGemActivation = reader.readNumber();
   const emeraldGemActivation = reader.readNumber();
   const amethystGemActivation = reader.readNumber();

   const limbRubyGemActivation = reader.readNumber();
   const limbEmeraldGemActivation = reader.readNumber();
   const limbAmethystGemActivation = reader.readNumber();

   const attackType = reader.readNumber();
   const attackStage = reader.readNumber();
   const stageProgress = reader.readNumber();

   return {
      rubyGemActivation: rubyGemActivation,
      emeraldGemActivation: emeraldGemActivation,
      amethystGemActivation: amethystGemActivation,
      limbRubyGemActivation: limbRubyGemActivation,
      limbEmeraldGemActivation: limbEmeraldGemActivation,
      limbAmethystGemActivation: limbAmethystGemActivation,
      attackType: attackType,
      attackStage: attackStage,
      stageProgress: stageProgress
   };
}

function createComponent(entityConfig: EntityConfig<ServerComponentType.guardian | ServerComponentType.transform, never>): GuardianComponent {
   const rubyRenderParts = new Array<VisualRenderPart>();
   const amethystRenderParts = new Array<VisualRenderPart>();
   const emeraldRenderParts = new Array<VisualRenderPart>();

   const rubyLights = new Array<[number, Light]>();
   const emeraldLights = new Array<[number, Light]>();
   const amethystLights = new Array<[number, Light]>();

   // Head
   
   const headRenderPart = new TexturedRenderPart(
      null,
      2,
      0,
      getTextureArrayIndex("entities/guardian/guardian-head.png")
   );
   headRenderPart.offset.y = 28;
   entityConfig.renderInfo.attachRenderPart(headRenderPart);
   
   const headRubies = new TexturedRenderPart(
      headRenderPart,
      2.1,
      0,
      getTextureArrayIndex("entities/guardian/guardian-head-rubies.png")
   );
   entityConfig.renderInfo.attachRenderPart(headRubies);
   rubyRenderParts.push(headRubies);

   // Body

   const bodyRenderPart = new TexturedRenderPart(
      null,
      1,
      0,
      getTextureArrayIndex("entities/guardian/guardian-body.png")
   );
   entityConfig.renderInfo.attachRenderPart(bodyRenderPart);

   const bodyAmethystsRenderPart = new TexturedRenderPart(
      bodyRenderPart,
      1.1,
      0,
      getTextureArrayIndex("entities/guardian/guardian-body-amethysts.png")
   );
   entityConfig.renderInfo.attachRenderPart(bodyAmethystsRenderPart);
   amethystRenderParts.push(bodyAmethystsRenderPart);

   const bodyEmeraldsRenderPart = new TexturedRenderPart(
      bodyRenderPart,
      1.1,
      0,
      getTextureArrayIndex("entities/guardian/guardian-body-emeralds.png")
   );
   entityConfig.renderInfo.attachRenderPart(bodyEmeraldsRenderPart);
   emeraldRenderParts.push(bodyEmeraldsRenderPart);

   // Red lights

   let light = createLight(
      new Point(0, 4.5 * 4),
      0.5,
      0.3,
      6,
      1,
      0,
      0.1
   );
   attachLightToRenderPart(light, headRenderPart, entityConfig.entity, entityConfig.layer);
   rubyLights.push([light.intensity, light]);

   for (let i = 0; i < 2; i++) {
      const light = createLight(
         new Point(4.25 * 4 * (i === 0 ? 1 : -1), 3.25 * 4),
         0.4,
         0.2,
         4,
         1,
         0,
         0.1
      );
      attachLightToRenderPart(light, headRenderPart, entityConfig.entity, entityConfig.layer);
      rubyLights.push([light.intensity, light]);
   }

   // Green lights

   light = createLight(
      new Point(0, -3 * 4),
      0.5,
      0.3,
      6,
      0,
      1,
      0
   );
   attachLightToRenderPart(light, bodyRenderPart, entityConfig.entity, entityConfig.layer);
   emeraldLights.push([light.intensity, light]);

   // Amethyst lights
   // @Hack @Robustness: Make pixels able to glow!

   // @Temporary
   // light = {
   //    offset: new Point(0, 4 * 4),
   //    intensity: 0.35,
   //    strength: 0.2,
   //    radius: 4,
   //    r: 0.6,
   //    g: 0,
   //    b: 1
   // };
   // lightID = addLight(light);
   // attachLightToRenderPart(lightID, bodyRenderPart.id);

   light = createLight(
      new Point(5 * 4, 6.5 * 4),
      0.35,
      0.2,
      4,
      0.6,
      0,
      1
   );
   attachLightToRenderPart(light, bodyRenderPart, entityConfig.entity, entityConfig.layer);
   amethystLights.push([light.intensity, light]);

   light = createLight(
      new Point(6.5 * 4, 3 * 4),
      0.35,
      0.2,
      4,
      0.6,
      0,
      1
   );
   attachLightToRenderPart(light, bodyRenderPart, entityConfig.entity, entityConfig.layer);
   amethystLights.push([light.intensity, light]);

   light = createLight(
      new Point(10 * 4, 0),
      0.35,
      0.2,
      4,
      0.6,
      0,
      1
   );
   attachLightToRenderPart(light, bodyRenderPart, entityConfig.entity, entityConfig.layer);
   amethystLights.push([light.intensity, light]);

   light = createLight(
      new Point(7 * 4, -5 * 4),
      0.35,
      0.2,
      4,
      0.6,
      0,
      1
   );
   attachLightToRenderPart(light, bodyRenderPart, entityConfig.entity, entityConfig.layer);
   amethystLights.push([light.intensity, light]);

   light = createLight(
      new Point(3.5 * 4, -8 * 4),
      0.35,
      0.2,
      4,
      0.6,
      0,
      1
   );
   attachLightToRenderPart(light, bodyRenderPart, entityConfig.entity, entityConfig.layer);
   amethystLights.push([light.intensity, light]);

   light = createLight(
      new Point(-2 * 4, -9 * 4),
      0.35,
      0.2,
      4,
      0.6,
      0,
      1
   );
   attachLightToRenderPart(light, bodyRenderPart, entityConfig.entity, entityConfig.layer);
   amethystLights.push([light.intensity, light]);

   light = createLight(
      new Point(-5 * 4, -5 * 4),
      0.35,
      0.2,
      4,
      0.6,
      0,
      1
   );
   attachLightToRenderPart(light, bodyRenderPart, entityConfig.entity, entityConfig.layer);
   amethystLights.push([light.intensity, light]);

   light = createLight(
      new Point(-8 * 4, -3 * 4),
      0.35,
      0.2,
      4,
      0.6,
      0,
      1
   );
   attachLightToRenderPart(light, bodyRenderPart, entityConfig.entity, entityConfig.layer);
   amethystLights.push([light.intensity, light]);

   light = createLight(
      new Point(-7 * 4, 2.5 * 4),
      0.35,
      0.2,
      4,
      0.6,
      0,
      1
   );
   attachLightToRenderPart(light, bodyRenderPart, entityConfig.entity, entityConfig.layer);
   amethystLights.push([light.intensity, light]);

   light = createLight(
      new Point(-8 * 4, 6 * 4),
      0.35,
      0.2,
      4,
      0.6,
      0,
      1
   );
   attachLightToRenderPart(light, bodyRenderPart, entityConfig.entity, entityConfig.layer);
   amethystLights.push([light.intensity, light]);

   const limbRenderParts = new Array<VisualRenderPart>();
   const limbCrackRenderParts = new Array<VisualRenderPart>();
   const limbCrackLights = new Array<Light>();
   
   // Attach limb render parts
   const transformComponentParams = entityConfig.serverComponents[ServerComponentType.transform];
   for (let i = 0; i < transformComponentParams.hitboxes.length; i++) {
      const hitbox = transformComponentParams.hitboxes[i];
      if (hitbox.flags.includes(HitboxFlag.GUARDIAN_LIMB_HITBOX)) {
         const limbRenderPart = new TexturedRenderPart(
            hitbox,
            0,
            0,
            getTextureArrayIndex("entities/guardian/guardian-limb.png")
         );
         entityConfig.renderInfo.attachRenderPart(limbRenderPart);
         limbRenderParts.push(limbRenderPart);

         const cracksRenderPart = new TexturedRenderPart(
            limbRenderPart,
            0,
            0,
            getTextureArrayIndex("entities/guardian/guardian-limb-gem-cracks.png")
         );
         entityConfig.renderInfo.attachRenderPart(cracksRenderPart);
         limbCrackRenderParts.push(cracksRenderPart);

         const light = createLight(
            new Point(0, 0),
            0.5,
            0.3,
            12,
            0,
            0,
            0
         );
         attachLightToRenderPart(light, cracksRenderPart, entityConfig.entity, entityConfig.layer);
         limbCrackLights.push(light);
      }
   }

   const guardianComponentParams = entityConfig.serverComponents[ServerComponentType.guardian];

   return {
      rubyRenderParts: rubyRenderParts,
      amethystRenderParts: amethystRenderParts,
      emeraldRenderParts: emeraldRenderParts,
      rubyLights: rubyLights,
      emeraldLights: emeraldLights,
      amethystLights: amethystLights,
      rubyGemActivation: guardianComponentParams.rubyGemActivation,
      emeraldGemActivation: guardianComponentParams.emeraldGemActivation,
      amethystGemActivation: guardianComponentParams.amethystGemActivation,
      limbRenderParts: limbRenderParts,
      limbCrackRenderParts: limbCrackRenderParts,
      limbCrackLights: limbCrackLights,
      limbRubyGemActivation: guardianComponentParams.limbRubyGemActivation,
      limbEmeraldGemActivation: guardianComponentParams.limbEmeraldGemActivation,
      limbAmethystGemActivation: guardianComponentParams.limbAmethystGemActivation,
      attackType: guardianComponentParams.attackType,
      attackStage: guardianComponentParams.attackStage
   };
}

function getMaxRenderParts(preCreationInfo: EntityPreCreationInfo<ServerComponentType.transform>): number {
   const transformComponentConfig = preCreationInfo.serverComponentParams[ServerComponentType.transform];
   return 2 * transformComponentConfig.hitboxes.length;
}
   
function padData(reader: PacketReader): void {
   reader.padOffset(9 * Float32Array.BYTES_PER_ELEMENT);
}

const setColours = (renderParts: ReadonlyArray<VisualRenderPart>, lights: ReadonlyArray<[number, Light]>, activation: number, tintR: number, tintG: number, tintB: number): void => {
   for (let i = 0; i < renderParts.length; i++) {
      const renderPart = renderParts[i];
      renderPart.tintR = tintR;
      renderPart.tintG = tintG;
      renderPart.tintB = tintB;
   }
   
   for (let i = 0; i < lights.length; i++) {
      const pair = lights[i];
      const maxIntensity = pair[0];
      const light = pair[1];

      light.intensity = maxIntensity * activation;
   }
}

function updateFromData(reader: PacketReader, entity: Entity): void {
   const guardianComponent = GuardianComponentArray.getComponent(entity);
   
   const rubyGemActivation = reader.readNumber();
   const emeraldGemActivation = reader.readNumber();
   const amethystGemActivation = reader.readNumber();

   const limbRubyGemActivation = reader.readNumber();
   const limbEmeraldGemActivation = reader.readNumber();
   const limbAmethystGemActivation = reader.readNumber();

   const attackType = reader.readNumber();
   const attackStage = reader.readNumber();
   const stageProgress = reader.readNumber();

   const actualRubyGemActivation = lerp(rubyGemActivation, 1, limbRubyGemActivation);
   if (actualRubyGemActivation !== guardianComponent.rubyGemActivation) {
      setColours(guardianComponent.rubyRenderParts, guardianComponent.rubyLights, actualRubyGemActivation, actualRubyGemActivation, 0, 0);
      const renderInfo = getEntityRenderInfo(entity);
      registerDirtyRenderInfo(renderInfo);
   }
   const actualEmeraldGemActivation = lerp(emeraldGemActivation, 1, limbEmeraldGemActivation);
   if (actualEmeraldGemActivation !== guardianComponent.emeraldGemActivation) {
      setColours(guardianComponent.emeraldRenderParts, guardianComponent.emeraldLights, actualEmeraldGemActivation, 0, actualEmeraldGemActivation, 0);
      const renderInfo = getEntityRenderInfo(entity);
      registerDirtyRenderInfo(renderInfo);
   }
   const actualAmethystGemActivation = lerp(amethystGemActivation, 1, limbAmethystGemActivation);
   if (actualAmethystGemActivation !== guardianComponent.amethystGemActivation) {
      setColours(guardianComponent.amethystRenderParts, guardianComponent.amethystLights, actualAmethystGemActivation, actualAmethystGemActivation * 0.9, actualAmethystGemActivation * 0.2, actualAmethystGemActivation * 0.9);
      const renderInfo = getEntityRenderInfo(entity);
      registerDirtyRenderInfo(renderInfo);
   }

   guardianComponent.rubyGemActivation = actualRubyGemActivation;
   guardianComponent.emeraldGemActivation = actualEmeraldGemActivation;
   guardianComponent.amethystGemActivation = actualAmethystGemActivation;

   if (limbRubyGemActivation !== guardianComponent.limbRubyGemActivation || limbEmeraldGemActivation !== guardianComponent.limbEmeraldGemActivation || limbAmethystGemActivation !== guardianComponent.limbAmethystGemActivation) {
      for (let i = 0; i < guardianComponent.limbCrackRenderParts.length; i++) {
         const renderPart = guardianComponent.limbCrackRenderParts[i];
         renderPart.tintR = 0;
         renderPart.tintG = 0;
         renderPart.tintB = 0;
         
         // @Hack
         // Ruby
         renderPart.tintR += limbRubyGemActivation;
         renderPart.tintG += 0;
         renderPart.tintB += 0;
         // Emerald
         renderPart.tintR += 0;
         renderPart.tintG += limbEmeraldGemActivation;
         renderPart.tintB += 0;
         // Amethyst
         renderPart.tintR += limbAmethystGemActivation * 0.9;
         renderPart.tintG += limbAmethystGemActivation * 0.2;
         renderPart.tintB += limbAmethystGemActivation * 0.9;

         const light = guardianComponent.limbCrackLights[i];
         light.r = 0;
         light.g = 0;
         light.b = 0;

         // @Hack
         // Ruby
         light.r += limbRubyGemActivation * 0.6;
         light.g += 0;
         light.b += 0;
         // Emerald
         light.r += 0;
         light.g += limbEmeraldGemActivation * 0.6;
         light.b += 0;
         // Amethyst
         light.r += limbAmethystGemActivation * 0.5;
         light.g += limbAmethystGemActivation * 0.2;
         light.b += limbAmethystGemActivation * 0.5;
      }
      const renderInfo = getEntityRenderInfo(entity);
      registerDirtyRenderInfo(renderInfo);
   }

   guardianComponent.limbRubyGemActivation = limbRubyGemActivation;
   guardianComponent.limbEmeraldGemActivation = limbEmeraldGemActivation;
   guardianComponent.limbAmethystGemActivation = limbAmethystGemActivation;

   for (let i = 0; i < guardianComponent.limbRenderParts.length; i++) {
      const renderPart = guardianComponent.limbRenderParts[i];
      renderPart.shakeAmount = 0;
   }
   
   switch (attackType) {
      case GuardianAttackType.crystalSlam: {
         // If just starting the slam, play charge sound
         if (guardianComponent.attackType !== GuardianAttackType.crystalSlam) {
            playSoundOnEntity("guardian-rock-smash-charge.mp3", 0.4, 1, entity, true);
         }

         // If starting slam, play start sound
         if (guardianComponent.attackStage === GuardianCrystalSlamStage.windup && attackStage === GuardianCrystalSlamStage.slam) {
            playSoundOnEntity("guardian-rock-smash-start.mp3", 0.2, 1, entity, false);
         }
         
         // If going from slam to return, then play the slam sound
         if (guardianComponent.attackStage === GuardianCrystalSlamStage.slam && attackStage === GuardianCrystalSlamStage.return) {
            playSoundOnEntity("guardian-rock-smash-impact.mp3", 0.65, 1, entity, false);
         }
         break;
      }
      case GuardianAttackType.crystalBurst: {
         // If just starting, play charge sound
         if (guardianComponent.attackType !== GuardianAttackType.crystalBurst) {
            playSoundOnEntity("guardian-rock-burst-charge.mp3", 0.4, 1, entity, true);
         }

         // If starting burst, play burst sound
         if (guardianComponent.attackStage === GuardianCrystalBurstStage.windup && attackStage === GuardianCrystalBurstStage.burst) {
            playSoundOnEntity("guardian-rock-burst.mp3", 0.7, 1, entity, false);
         }
         break;
      }
      case GuardianAttackType.summonSpikyBalls: {
         // If just starting, play focus sound
         if (attackStage === GuardianSpikyBallSummonStage.focus && guardianComponent.attackStage === GuardianSpikyBallSummonStage.windup) {
            playSoundOnEntity("guardian-summon-focus.mp3", 0.55, 1, entity, true);
         }

         for (let i = 0; i < guardianComponent.limbRenderParts.length; i++) {
            const renderPart = guardianComponent.limbRenderParts[i];

            let shakeAmount: number;
            switch (attackStage) {
               case GuardianSpikyBallSummonStage.windup: {
                  shakeAmount = Vars.SPIKY_BALL_SUMMON_SHAKE_AMOUNT * stageProgress;
                  break;
               }
               case GuardianSpikyBallSummonStage.focus: {
                  shakeAmount = Vars.SPIKY_BALL_SUMMON_SHAKE_AMOUNT;
                  break;
               }
               case GuardianSpikyBallSummonStage.return: {
                  shakeAmount = Vars.SPIKY_BALL_SUMMON_SHAKE_AMOUNT * (1 - stageProgress);
                  break;
               }
               default: {
                  throw new Error();
               }
            }

            renderPart.shakeAmount = shakeAmount;
         }
         break;
      }
   }
   
   guardianComponent.attackType = attackType;
   guardianComponent.attackStage = attackStage;
}