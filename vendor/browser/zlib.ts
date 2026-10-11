import {deflateSync as compress,inflateSync} from 'fflate';
export const deflateSync=(bytes:Uint8Array,options?:{level?:number})=>compress(bytes,{level:options?.level as 0|1|2|3|4|5|6|7|8|9|undefined});
export const inflateRawSync=(bytes:Uint8Array)=>inflateSync(bytes);
export function crc32(bytes:Uint8Array){let value=0xffffffff;for(const byte of bytes){value^=byte;for(let bit=0;bit<8;bit++)value=(value>>>1)^((value&1)?0xedb88320:0);}return (value^0xffffffff)>>>0;}
