import {build} from 'esbuild';
import {mkdirSync} from 'node:fs';
mkdirSync('engines/dist',{recursive:true});
for(const [name,entry] of [['docx','src/prisma-ooxml.ts'],['pptx','src/prisma-presentation.ts']]){
 await build({entryPoints:[entry],bundle:true,platform:'node',format:'cjs',outfile:'engines/dist/'+name+'.cjs',target:'node22',legalComments:'inline',logLevel:'warning'});
 console.log('Motor propio Prisma '+name+' generado.');
}
