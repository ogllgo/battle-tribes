import { assertBoxIsCircular } from "../../../shared/src/boxes/boxes";
import CircularBox from "../../../shared/src/boxes/CircularBox";
import { Entity, EntityType } from "../../../shared/src/entities";
import { AttackEffectiveness } from "../../../shared/src/entity-damage-types";
import { PathfindingSettings, Settings } from "../../../shared/src/settings";
import { Point } from "../../../shared/src/utils";
import { CollisionVars, entitiesAreColliding } from "../collision-detection";
import { AIHelperComponent, AIType } from "../components/AIHelperComponent";
import { EnergyStoreComponentArray } from "../components/EnergyStoreComponent";
import { HealthComponentArray, hitEntity } from "../components/HealthComponent";
import { addHungerEnergy } from "../components/HungerComponent";
import { TransformComponentArray } from "../components/TransformComponent";
import { Hitbox, turnHitboxToAngle } from "../hitboxes";
import { convertEntityPathfindingGroupID, findSingleLayerPath, getEntityFootprint, Path, PathfindOptions } from "../pathfinding";
import { entityExists, getEntityAgeTicks, getEntityLayer, getEntityType } from "../world";

export class VegetationConsumeAI {
   public readonly acceleration: number;
   public readonly turnSpeed: number;

   public target: Entity = 0;
   public pathToTarget: Path | null = null;

   constructor(acceleration: number, turnSpeed: number) {
      this.acceleration = acceleration;
      this.turnSpeed = turnSpeed;
   }
}

const getVegetationConsumeAITarget = (krumblid: Entity, aiHelperComponent: AIHelperComponent): [Entity, Path] | null => {
   const layer = getEntityLayer(krumblid);
   
   const transformComponent = TransformComponentArray.getComponent(krumblid);
   const hitbox = transformComponent.children[0] as Hitbox;

   const pathfindingEntityFootprint = getEntityFootprint((hitbox.box as CircularBox).radius);
   
   // @Hack: just chose a rnadom group id. But ther'es always the possibility that it collides with an actual pathfinding group id! Shite!!!
   const pathfindingGroupID = 2346;
   convertEntityPathfindingGroupID(krumblid, 0, pathfindingGroupID);
   
   let minDist = Number.MAX_SAFE_INTEGER;
   let target: Entity | null = null;
   let targetPath: Path | null = null;
   for (const entity of aiHelperComponent.visibleEntities) {
      const entityType = getEntityType(entity);
      if (entityType !== EntityType.desertBushLively && entityType !== EntityType.desertBushSandy && entityType !== EntityType.desertShrub && entityType !== EntityType.desertSmallWeed) {
         continue;
      }
      
      const entityTransformComponent = TransformComponentArray.getComponent(entity);
      const entityHitbox = entityTransformComponent.children[0] as Hitbox;
      assertBoxIsCircular(entityHitbox.box);

      const options: PathfindOptions = {
         goalRadius: Math.floor(entityHitbox.box.radius / PathfindingSettings.NODE_SEPARATION) + 2,
         failureDefault: 0,
         nodeBudget: 200
      }
      const path = findSingleLayerPath(layer, hitbox.box.position.x, hitbox.box.position.y, entityHitbox.box.position.x, entityHitbox.box.position.y, pathfindingGroupID, pathfindingEntityFootprint, options);

      if (!path.isFailed) {
         const dist = hitbox.box.position.calculateDistanceBetween(entityHitbox.box.position);
         if (dist < minDist) {
            minDist = dist;
            target = entity;
            targetPath = path;
         }
      }
   }

   convertEntityPathfindingGroupID(krumblid, pathfindingGroupID, 0);

   return target !== null && targetPath !== null ? [target, targetPath] : null;
}

export function updateVegetationConsumeAI(krumblid: Entity, aiHelperComponent: AIHelperComponent, vegetationConsumeAI: VegetationConsumeAI): void {
   if (!entityExists(vegetationConsumeAI.target)) {
      // look for a target
      const res = getVegetationConsumeAITarget(krumblid, aiHelperComponent);
      if (res !== null) {
         const [target, targetPath] = res;
         vegetationConsumeAI.target = target;
         vegetationConsumeAI.pathToTarget = targetPath;
      }
   }
}

export function shouldRunVegetationConsumeAI(vegetationConsumeAI: VegetationConsumeAI): boolean {
   return entityExists(vegetationConsumeAI.target);
}

export function runVegetationConsumeAI(krumblid: Entity, aiHelperComponent: AIHelperComponent, vegetationConsumeAI: VegetationConsumeAI): void {
   aiHelperComponent.currentAIType = AIType.vegetationConsume;
   
   const target = vegetationConsumeAI.target;
   
   const transformComponent = TransformComponentArray.getComponent(krumblid);
   const hitbox = transformComponent.children[0] as Hitbox;
   
   const targetTransformComponent = TransformComponentArray.getComponent(target);
   const targetHitbox = targetTransformComponent.children[0] as Hitbox;
   
   // @Incomplete: move using pathfinding!!!
   aiHelperComponent.move(krumblid, vegetationConsumeAI.acceleration, vegetationConsumeAI.turnSpeed, targetHitbox.box.position.x, targetHitbox.box.position.y);

   if (entitiesAreColliding(krumblid, target) !== CollisionVars.NO_COLLISION) {
      // @Copynpaste
      for (let i = 0; i < 2; i++) {
         // @Hack
         const mandibleHitbox = transformComponent.children[i + 1] as Hitbox;
         const idealAngle = ((getEntityAgeTicks(krumblid) * 3.2 + (i === 0 ? Settings.TPS * 0.35 : 0)) % Settings.TPS) / Settings.TPS < 0.5 ? -Math.PI * 0.3 : Math.PI * 0.1;
         turnHitboxToAngle(mandibleHitbox, idealAngle, 3 * Math.PI, 0.5, true);
      }

      if (getEntityAgeTicks(krumblid) % Settings.TPS === 0) {
         const hitPosition = new Point((targetHitbox.box.position.x + hitbox.box.position.x) / 2, (targetHitbox.box.position.y + hitbox.box.position.y) / 2);
         hitEntity(target, krumblid, 1, 0, AttackEffectiveness.effective, hitPosition, 0);

         const targetHealthComponent = HealthComponentArray.getComponent(target);
         if (targetHealthComponent.health <= 0) {
            // Convert them to energy
            const energyStoreComponent= EnergyStoreComponentArray.getComponent(target);
            addHungerEnergy(krumblid, energyStoreComponent.energyAmount);
         }
      }
   }
}