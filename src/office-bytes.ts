export const encodeOfficeBytes=(bytes:Uint8Array)=>{let value='';for(let i=0;i<bytes.length;i+=32768)value+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(value);};
export const decodeOfficeBytes=(value:string)=>Uint8Array.from(atob(value),c=>c.charCodeAt(0));
