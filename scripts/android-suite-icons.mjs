import fs from 'node:fs';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),sharp=require(process.env.PRISMA_SHARP_PATH||'sharp');
for(const kind of ['slides','data','publisher','prisma']){const logo='public/'+kind+'-logo.svg',root='android/app/src/'+kind+'/res';
 for(const [density,size,adaptive] of [['mdpi',48,108],['hdpi',72,162],['xhdpi',96,216],['xxhdpi',144,324],['xxxhdpi',192,432]]){const dir=root+'/mipmap-'+density;fs.mkdirSync(dir,{recursive:true});for(const name of ['ic_launcher','ic_launcher_round'])await sharp(logo).resize(size,size).png().toFile(dir+'/'+name+'.png');const asset=await sharp(logo).resize(Math.round(adaptive*.6),Math.round(adaptive*.6)).png().toBuffer();await sharp({create:{width:adaptive,height:adaptive,channels:4,background:'#ffffff00'}}).composite([{input:asset,gravity:'centre'}]).png().toFile(dir+'/ic_launcher_foreground.png');}
 fs.mkdirSync(root+'/drawable',{recursive:true});await sharp(logo).resize(512,512).png().toFile(root+'/drawable/prisma_logo.png');
}
