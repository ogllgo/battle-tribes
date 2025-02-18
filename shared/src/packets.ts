// @Cleanup: maybe extract into client-to-server and server-to-client ?
export const enum PacketType {
   // -----------------
   // CLIENT-TO-SERVER
   // -----------------
   initialPlayerData,
   activate,
   // @Cleanup: unused?
   deactivate,
   playerData,
   // @Cleanup: unused?
   syncRequest,
   attack,
   respawn,
   startItemUse,
   useItem,
   stopItemUse,
   dropItem,
   itemPickup,
   itemRelease,
   summonEntity,
   toggleSimulation,
   placeBlueprint,
   craftItem,
   devSetDebugEntity,
   ascend,
   structureInteract,
   unlockTech,
   selectTech,
   studyTech,
   animalStaffFollowCommand,
   mountCarrySlot,
   dismountCarrySlot,
   pickUpArrow,
   modifyBuilding,
   setCarryTarget,
   devGiveItem, // ((DEV))
   devTPToEntity, // ((DEV))
   devSpectateEntity, // ((DEV))
   devSetAutogiveBaseResource, // ((DEV))
   // -----------------
   // SERVER-TO-CLIENT
   // -----------------
   initialGameData,
   gameData,
   // @Cleanup: unused?
   syncData,
   sync,
   forcePositionUpdate
}

// @Bandwidth: figure out a way to be tightly packed (not have to add padding)
// @Bandwidth: split number into addFloat, addUInt8, and addUInt16

abstract class BasePacketObject {
   public currentByteOffset: number;

   constructor(byteOffset: number) {
      this.currentByteOffset = byteOffset;
   }
   
   public padOffset(paddingBytes: number): void {
      this.currentByteOffset += paddingBytes;
   }
}

// @Hack: remove once packets are tightly packed
export function alignLengthBytes(lengthBytes: number): number {
   if (lengthBytes % 4 !== 0) {
      return lengthBytes + 4 - lengthBytes % 4;
   }
   return lengthBytes;
}

// @Cleanup: change 'add' to 'write'
export class Packet extends BasePacketObject {
   public readonly buffer: ArrayBuffer;
   private readonly floatView: Float32Array;
   private readonly uint8View: Uint8Array;
   
   constructor(packetType: PacketType, lengthBytes: number) {
      super(0);

      this.buffer = new ArrayBuffer(lengthBytes);
      this.floatView = new Float32Array(this.buffer);
      this.uint8View = new Uint8Array(this.buffer);

      this.addNumber(packetType);
   }

   public addNumber(number: number): void {
      if (isNaN(number)) {
         throw new Error("Tried to write NaN to a packet.");
      }
      
      // this.cleanByteOffset();
      if (this.currentByteOffset >= this.buffer.byteLength) {
         throw new Error("Exceeded length of buffer");
      }
      if (this.currentByteOffset % 4 !== 0) {
         throw new Error("Misaligned");
      }

      this.floatView[this.currentByteOffset / 4] = number;
      
      this.currentByteOffset += 4;
   }

   public addString(str: string): void {
      if (this.currentByteOffset >= this.buffer.byteLength) {
         throw new Error("Exceeded length of buffer");
      }

      const encodedUsername = new TextEncoder().encode(str);

      // Write the length of the string
      this.addNumber(str.length);
      
      new Uint8Array(this.buffer).set(encodedUsername, this.currentByteOffset);
      
      this.currentByteOffset += alignLengthBytes(encodedUsername.byteLength);
   }

   public addBoolean(boolean: boolean): void {
      if (this.currentByteOffset >= this.buffer.byteLength) {
         throw new Error("Exceeded length of buffer");
      }

      this.uint8View[this.currentByteOffset] = boolean ? 1 : 0;
      this.currentByteOffset++;
   }
}

export function getStringLengthBytes(str: string): number {
   // @Copynpaste
   return Float32Array.BYTES_PER_ELEMENT + alignLengthBytes(new TextEncoder().encode(str).byteLength); // @Speed?
}

export class PacketReader extends BasePacketObject {
   private readonly startPaddingBytes: number;
   private readonly buffer: ArrayBufferLike;
   
   private readonly uint8View: Uint8Array;
   // private readonly floatView: Float32Array;
   private readonly view: DataView;

   constructor(buffer: ArrayBufferLike, startPaddingBytes: number) {
      super(startPaddingBytes);

      this.startPaddingBytes = startPaddingBytes;
      this.buffer = buffer;
      
      this.uint8View = new Uint8Array(buffer);
      // this.floatView = new Float32Array(buffer);
      this.view = new DataView(buffer);
   }

   public readNumber(): number {
      // this.cleanByteOffset();
      if (this.currentByteOffset >= this.buffer.byteLength) {
         throw new Error("Exceeded length of buffer");
      }
      if ((this.currentByteOffset - this.startPaddingBytes) % 4 !== 0) {
         throw new Error("Misaligned");
      }

      // const number = this.buffer.readFloatLE(this.currentByteOffset);
      // const number = this.floatView[this.currentByteOffset / 4];
      const number = this.view.getFloat32(this.currentByteOffset, true);
      
      this.currentByteOffset += 4;

      return number;
   }

   public readString(): string {
      const stringLength = this.readNumber();
      
      const decodeBuffer = this.uint8View.subarray(this.currentByteOffset, this.currentByteOffset + stringLength);
      // @Speed? @Garbage
      const string = new TextDecoder().decode(decodeBuffer);

      const lengthBytes = alignLengthBytes(new TextEncoder().encode(string).byteLength); // @Speed?
      this.currentByteOffset += lengthBytes;

      return string;
   }

   public padString(): void {
      this.readString();
   }

   // @Cleanup: rename to readbool
   public readBoolean(): boolean {
      const boolean = this.uint8View[this.currentByteOffset];
      this.currentByteOffset++;

      if (boolean === 1) {
         return true;
      } else if (boolean === 0) {
         return false
      } else {
         throw new Error("Buffer data is not in boolean form.");
      }
   }
}