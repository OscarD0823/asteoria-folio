import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
const core='ONLYOFFICE/core-fonts',coreRevision='7030c6681fb5bbed560675cb42422f91df15d5c9',kiwi='kiwi0fruit/open-fonts',kiwiRevision='deb211dd1e08becf3b9300b02365cd79415c64d4',wachin='wachin/Alternative-to-privative-Microsoft-Windows-Fonts',wachinRevision='ae393b1a52ac40f916125cfca4d9b2a779ed6bcd';
const entries=[
 ['DejaVuSans','DejaVu Sans','sans-serif',core,coreRevision,'dejavu','LICENSE.txt',['DejaVuSans.ttf','DejaVuSans-Bold.ttf','DejaVuSans-Oblique.ttf','DejaVuSans-BoldOblique.ttf']],
 ['DejaVuSerif','DejaVu Serif','serif',core,coreRevision,'dejavu','LICENSE.txt',['DejaVuSerif.ttf','DejaVuSerif-Bold.ttf','DejaVuSerif-Italic.ttf','DejaVuSerif-BoldItalic.ttf']],
 ['DejaVuSansCondensed','DejaVu Sans Condensed','sans-serif',core,coreRevision,'dejavu','LICENSE.txt',['DejaVuSansCondensed.ttf','DejaVuSansCondensed-Bold.ttf','DejaVuSansCondensed-Oblique.ttf','DejaVuSansCondensed-BoldOblique.ttf']],
 ['DejaVuSerifCondensed','DejaVu Serif Condensed','serif',core,coreRevision,'dejavu','LICENSE.txt',['DejaVuSerifCondensed.ttf','DejaVuSerifCondensed-Bold.ttf','DejaVuSerifCondensed-Italic.ttf','DejaVuSerifCondensed-BoldItalic.ttf']],
 ['DejaVuMath','DejaVu Math TeX Gyre','serif',core,coreRevision,'dejavu','LICENSE.txt',['DejaVuMathTeXGyre.ttf']],
 ['AbyssinicaSIL','Abyssinica SIL','serif',core,coreRevision,'abyssinica','LICENSE.txt',['AbyssinicaSIL-R.ttf']],
 ['LohitDevanagari','Lohit Devanagari','sans-serif',core,coreRevision,'lohit-devanagari','LICENSE.txt',['Lohit-Devanagari.ttf']],
 ['LohitTamil','Lohit Tamil','sans-serif',core,coreRevision,'lohit-tamil','LICENSE.txt',['Lohit-Tamil.ttf']],
 ['Padauk','Padauk','sans-serif',core,coreRevision,'padauk','LICENSE.txt',['Padauk.ttf','Padauk-bold.ttf']],
 ['DejaVuSansMono','DejaVu Sans Mono','monospace',kiwi,kiwiRevision,'Fonts/DejaVu','LICENSE',['DejaVuSansMono.ttf','DejaVuSansMono-Bold.ttf','DejaVuSansMono-Oblique.ttf','DejaVuSansMono-BoldOblique.ttf']],
 ['EmbedSerif','Embed Serif','serif',kiwi,kiwiRevision,'Fonts/EmbedSerif','SIL-OFL-LICENSE.txt',['EmbedSerifR-Regular.ttf','EmbedSerifB-Bold.ttf','EmbedSerifIt-Italic.ttf','EmbedSerifBIt-BoldItalic.ttf']],
 ['Arvo','Arvo','serif',wachin,wachinRevision,'Arvo','OFL.txt',['Arvo-Regular.ttf','Arvo-Bold.ttf','Arvo-Italic.ttf','Arvo-BoldItalic.ttf']],
 ['Anton','Anton','sans-serif',wachin,wachinRevision,'Anton','OFL.txt',['Anton-Regular.ttf']],
];
const families=[];
for(const [value,label,category,repo,revision,dir,license,files] of entries){const root='public/fonts/'+value;fs.mkdirSync(root,{recursive:true});const records=[];
 for(const file of [license,...files]){const target=root+'/'+file;const url='https://raw.githubusercontent.com/'+repo+'/'+revision+'/'+dir+'/'+encodeURIComponent(file);if(!fs.existsSync(target)){const response=await fetch(url);if(!response.ok)throw new Error(url+' '+response.status);fs.writeFileSync(target,Buffer.from(await response.arrayBuffer()));}records.push({file,url,sha256:crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex')});}
 fs.writeFileSync(root+'/SOURCE.json',JSON.stringify({family:label,upstream:'https://github.com/'+repo,revision,derivation:'Original font files, without modification. Per-family license included.',files:records},null,2)+'\n');
 families.push({value,label,category,css:value+', '+category,styles:Object.fromEntries(files.map((file,index)=>[['Regular','Bold','Italic','BoldItalic'][index],value+'/'+file]))});
}
fs.writeFileSync('src/reference-fonts.ts','import type {FontFamily} from "./fonts";\nexport const referenceFontFamilies:FontFamily[]='+JSON.stringify(families,null,2)+';\n');
const marker='/* Prisma reference fonts */';
const css=fs.readFileSync('public/fonts/fonts.css','utf8').split(marker)[0]+marker+'\n'+families.map(family=>Object.entries(family.styles).map(([style,file])=>`@font-face{font-family:${JSON.stringify(family.value)};src:url("./${file}");font-weight:${style.includes('Bold')?700:400};font-style:${style.includes('Italic')?'italic':'normal'};font-display:swap}`).join('\n')).join('\n');
fs.writeFileSync('public/fonts/fonts.css',css+'\n');
console.log(families.length,'licensed font families added from pinned reference repositories.');
