import {Capacitor} from '@capacitor/core';
export async function download(bytes:Uint8Array,name:string,type='application/pdf'){
  if(Capacitor.isNativePlatform()){
    const [{Filesystem,Directory},{Share}]=await Promise.all([import('@capacitor/filesystem'),import('@capacitor/share')]);
    let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
    const result=await Filesystem.writeFile({path:`prisma-exports/${Date.now()}-${name}`,directory:Directory.Cache,data:btoa(binary),recursive:true});
    await Share.share({title:name,files:[result.uri],dialogTitle:'Guarda o comparte tu documento'});return;
  }
  const url=URL.createObjectURL(new Blob([new Uint8Array(bytes)],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
export async function clearNativeExports(){if(!Capacitor.isNativePlatform())return;const {Filesystem,Directory}=await import('@capacitor/filesystem');try{await Filesystem.rmdir({path:'prisma-exports',directory:Directory.Cache,recursive:true});}catch{/* Empty export cache. */}}
