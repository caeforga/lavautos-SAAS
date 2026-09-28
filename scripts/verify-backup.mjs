import { readFile,mkdir,writeFile } from 'node:fs/promises';
import { scryptSync,createDecipheriv,createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import path from 'node:path';
const input=process.argv[2];if(!input||!process.env.BACKUP_PASSPHRASE)throw new Error('Uso: node scripts/verify-backup.mjs archivo.brillo-backup [directorio-de-extracción]');
const bytes=await readFile(input);if(bytes.subarray(0,8).toString()!=='BRILLO01')throw new Error('Formato no reconocido');
const decipher=createDecipheriv('aes-256-gcm',scryptSync(process.env.BACKUP_PASSPHRASE,bytes.subarray(8,24),32),bytes.subarray(24,36));decipher.setAuthTag(bytes.subarray(36,52));const archive=JSON.parse(gunzipSync(Buffer.concat([decipher.update(bytes.subarray(52)),decipher.final()])).toString());
const hash=buffer=>createHash('sha256').update(buffer).digest('hex');const dump=Buffer.from(archive.dump,'base64');if(hash(dump)!==archive.dumpSha256)throw new Error('Hash de base de datos inválido');
for(const asset of archive.assets)if(hash(Buffer.from(asset.data,'base64'))!==asset.sha256)throw new Error('Hash de archivo inválido');
if(process.argv[3]){const root=path.resolve(process.argv[3]);await mkdir(root,{recursive:true});await writeFile(path.join(root,'database.dump'),dump,{flag:'wx'});for(const asset of archive.assets){const target=path.resolve(root,'assets',asset.key);const base=path.join(root,'assets')+path.sep;if(!target.startsWith(base))throw new Error('Ruta de archivo inválida');await mkdir(path.dirname(target),{recursive:true});await writeFile(target,Buffer.from(asset.data,'base64'),{flag:'wx'});}await writeFile(path.join(root,'manifest.json'),JSON.stringify({createdAt:archive.createdAt,sourceHost:archive.sourceHost,assets:archive.assets.map(({data,...asset})=>asset)},null,2),{flag:'wx'});}
console.log(`Integridad verificada: base de datos y ${archive.assets.length} archivos. La restauración funcional debe probarse en un ambiente aislado.`);
