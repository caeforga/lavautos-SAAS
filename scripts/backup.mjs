import { createClient } from '@supabase/supabase-js';
import { mkdir,readFile,writeFile,unlink } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { randomBytes,scryptSync,createCipheriv,createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
const required=['DATABASE_URL','NEXT_PUBLIC_SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','BACKUP_PASSPHRASE'];
for(const key of required)if(!process.env[key])throw new Error(`Falta ${key}`);
if(process.env.BACKUP_PASSPHRASE.length<32)throw new Error('BACKUP_PASSPHRASE debe tener al menos 32 caracteres');
const root=path.resolve('backups');await mkdir(root,{recursive:true});const stamp=new Date().toISOString().replaceAll(':','-');const dumpPath=path.join(root,`${stamp}.dump`);
const connection=new URL(process.env.DATABASE_URL);
const pgEnv={...process.env,PGHOST:connection.hostname,PGPORT:connection.port||'5432',PGUSER:decodeURIComponent(connection.username),PGPASSWORD:decodeURIComponent(connection.password),PGDATABASE:connection.pathname.slice(1),PGSSLMODE:'require'};
await new Promise((resolve,reject)=>{const child=spawn('pg_dump',['--format=custom','--no-owner','--no-privileges','--schema=public','--schema=auth','--schema=storage',`--file=${dumpPath}`],{env:pgEnv,stdio:['ignore','ignore','pipe'],windowsHide:true});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error('pg_dump falló; revisa conexión y versión del cliente PostgreSQL')));});
try{
 const client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
 const assets=[];
 async function walk(prefix=''){
  for(let offset=0;;offset+=100){const {data,error}=await client.storage.from('business-assets').list(prefix,{limit:100,offset,sortBy:{column:'name',order:'asc'}});if(error)throw error;
   for(const entry of data){const key=prefix?`${prefix}/${entry.name}`:entry.name;if(!entry.id){await walk(key);continue;}const {data:blob,error:downloadError}=await client.storage.from('business-assets').download(key);if(downloadError)throw downloadError;const bytes=Buffer.from(await blob.arrayBuffer());assets.push({key,mime:blob.type,sha256:createHash('sha256').update(bytes).digest('hex'),data:bytes.toString('base64')});}
   if(data.length<100)break;
  }
 }
 await walk();const dump=await readFile(dumpPath);const archive={version:1,createdAt:stamp,sourceHost:connection.hostname,dump:dump.toString('base64'),dumpSha256:createHash('sha256').update(dump).digest('hex'),assets};
 const salt=randomBytes(16),iv=randomBytes(12),key=scryptSync(process.env.BACKUP_PASSPHRASE,salt,32),cipher=createCipheriv('aes-256-gcm',key,iv);const encrypted=Buffer.concat([cipher.update(gzipSync(JSON.stringify(archive))),cipher.final()]);
 const output=path.join(root,`${stamp}.brillo-backup`);await writeFile(output,Buffer.concat([Buffer.from('BRILLO01'),salt,iv,cipher.getAuthTag(),encrypted]));console.log(`Respaldo cifrado generado: ${path.basename(output)} (${assets.length} archivos).`);
}finally{await unlink(dumpPath);}
