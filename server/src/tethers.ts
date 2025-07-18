import { TransformComponent } from "./components/TransformComponent";
import { getHitboxVelocity, Hitbox } from "./hitboxes";

export class HitboxTether {
   public readonly hitbox1: Hitbox;
   public readonly hitbox2: Hitbox;
   
   // @Robustness: This is so prone to bugs if i accidentally use the wrong transform component for 
   public readonly transformComponent1: TransformComponent;
   public readonly transformComponent2: TransformComponent;
   
   public readonly idealDistance: number;
   public readonly springConstant: number;
   public readonly damping: number;

   constructor(hitbox1: Hitbox, hitbox2: Hitbox, transformComponent1: TransformComponent, transformComponent2: TransformComponent, idealDistance: number, springConstant: number, damping: number) {
      this.hitbox1 = hitbox1;
      this.hitbox2 = hitbox2;
      this.transformComponent1 = transformComponent1;
      this.transformComponent2 = transformComponent2;
      this.idealDistance = idealDistance;
      this.springConstant = springConstant;
      this.damping = damping;

      // @Hack shitass checks until i decouple tethers from transform components
      let hasFound = false;
      for (const hitbox of transformComponent1.hitboxes) {
         if (hitbox === hitbox1) {
            hasFound = true;
            break;
         }
      }
      if (!hasFound) {
         throw new Error();
      }
      hasFound = false;
      for (const hitbox of transformComponent2.hitboxes) {
         if (hitbox === hitbox2) {
            hasFound = true;
            break;
         }
      }
      if (!hasFound) {
         throw new Error();
      }
   }

   // @Cleanup @Robustness: would be nice to find a way to rework tethers so that this function doesn't need to be called, completely eliminating the potential for an error to be thrown
   public getOtherHitbox(hitbox: Hitbox): Hitbox {
      if (this.hitbox1 === hitbox) {
         return this.hitbox2;
      }
      if (this.hitbox2 === hitbox) {
         return this.hitbox1;
      }
      throw new Error();
   }
}

const tethers = new Array<HitboxTether>();

export function tetherHitboxes(hitbox1: Hitbox, hitbox2: Hitbox, transformComponent1: TransformComponent, transformComponent2: TransformComponent, idealDistance: number, springConstant: number, damping: number): void {
   const tether = new HitboxTether(hitbox1, hitbox2, transformComponent1, transformComponent2, idealDistance, springConstant, damping);
   
   tethers.push(tether);
   hitbox1.tethers.push(tether);
   hitbox2.tethers.push(tether);
}

export function destroyTether(tether: HitboxTether): void {
   let idx = tethers.indexOf(tether);
   if (idx === -1) {
      throw new Error();
   }
   tethers.splice(idx, 1);
   
   idx = tether.hitbox1.tethers.indexOf(tether);
   if (idx === -1) {
      throw new Error();
   }
   tether.hitbox1.tethers.splice(idx, 1);
   
   idx = tether.hitbox2.tethers.indexOf(tether);
   if (idx === -1) {
      throw new Error();
   }
   tether.hitbox2.tethers.splice(idx, 1);
}

const applyTether = (tether: HitboxTether): void => {
   const hitbox1 = tether.hitbox1;
   const hitbox2 = tether.hitbox2;

   const diffX = hitbox2.box.position.x - hitbox1.box.position.x;
   const diffY = hitbox2.box.position.y - hitbox1.box.position.y;
   const distance = Math.sqrt(diffX * diffX + diffY * diffY);
   if (distance === 0) {
      return;
   }

   const normalisedDiffX = diffX / distance;
   const normalisedDiffY = diffY / distance;

   const displacement = distance - tether.idealDistance;
   
   // Calculate spring force
   const springForceX = normalisedDiffX * tether.springConstant * displacement;
   const springForceY = normalisedDiffY * tether.springConstant * displacement;

   const hitboxVelocity = getHitboxVelocity(hitbox1);
   const originHitboxVelocity = getHitboxVelocity(hitbox2);

   const relVelX = hitboxVelocity.x - originHitboxVelocity.x;
   const relVelY = hitboxVelocity.y - originHitboxVelocity.y;

   const dampingForceX = -relVelX * tether.damping;
   const dampingForceY = -relVelY * tether.damping;

   const forceX = springForceX + dampingForceX;
   const forceY = springForceY + dampingForceY;
   
   // @Incomplete: doesn't account for root hitbox!
   hitbox1.acceleration.x += forceX / hitbox1.mass;
   hitbox1.acceleration.y += forceY / hitbox1.mass;
   hitbox2.acceleration.x -= forceX / hitbox2.mass;
   hitbox2.acceleration.y -= forceY / hitbox2.mass;

   // @Speed: Does this need to be done every time?
   tether.transformComponent1.isDirty = true;
   tether.transformComponent2.isDirty = true;
}

export function applyTethers(): void {
   for (const tether of tethers) {
      applyTether(tether);
   }
}