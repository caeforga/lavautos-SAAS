import { readdir,writeFile,readFile,cp } from 'node:fs/promises';
import path from 'node:path';
const assets=[];
async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const full=path.join(dir,entry.name);if(entry.isDirectory())await walk(full);else if(!entry.name.endsWith('.map'))assets.push('/'+full.replaceAll('\\','/').replace(/^\.next\//,'_next/'));}}
await walk('.next/static');const id=(await readFile('.next/BUILD_ID','utf8')).trim();await writeFile('public/sw-assets.js',`self.BRILLO_BUILD=${JSON.stringify(id)};\nself.BRILLO_ASSETS=${JSON.stringify(assets)};\n`);console.log(`Preparados ${assets.length} archivos para operación sin conexión.`);
if(process.env.NEXT_STANDALONE==='1'){await cp('public','.next/standalone/public',{recursive:true});await cp('.next/static','.next/standalone/.next/static',{recursive:true});}
