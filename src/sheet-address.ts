export const sheetLimits={fileBytes:40*1024*1024,cells:150000,rows:20000,columns:500,area:600000};
export const columnName=(column:number)=>{let n=column+1,s='';while(n>0){s=String.fromCharCode(65+((n-1)%26))+s;n=Math.floor((n-1)/26);}return s;};
export const cellAddress=(row:number,column:number)=>columnName(column)+(row+1);
export function parseAddress(address:string){const m=address.trim().match(/^\$?([A-Z]{1,3})\$?([1-9]\d*)$/i);if(!m)return null;let col=0;for(const c of m[1].toUpperCase())col=col*26+c.charCodeAt(0)-64;const row=Number(m[2])-1;return row<sheetLimits.rows&&col<=sheetLimits.columns?{row,col:col-1}:null;}
