// Prisma's browser adapter; upstream source remains unchanged.
import {sha256} from '@noble/hashes/sha2.js';
import {bytesToHex} from '@noble/hashes/utils.js';
export const randomUUID=()=>globalThis.crypto.randomUUID();
export function createHash(algorithm:string){
 if(algorithm!=='sha256')throw new Error('Algoritmo no disponible en el motor web.');
 const pieces:Uint8Array[]=[];
 return {update(input:Uint8Array|string){pieces.push(typeof input==='string'?new TextEncoder().encode(input):input);return this;},digest(encoding?:string){const size=pieces.reduce((sum,p)=>sum+p.length,0),input=new Uint8Array(size);let at=0;for(const piece of pieces){input.set(piece,at);at+=piece.length;}const result=sha256(input);return encoding==='hex'?bytesToHex(result):result;}};
}
