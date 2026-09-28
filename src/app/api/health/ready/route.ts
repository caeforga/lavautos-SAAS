import { timingSafeEqual } from 'node:crypto';
import { adminClient } from '@/lib/server';
export async function GET(request:Request){
 const expected=process.env.MONITORING_TOKEN;
 const actual=request.headers.get('authorization')?.replace(/^Bearer /,'')??'';
 if(!expected||Buffer.byteLength(expected)!==Buffer.byteLength(actual)||!timingSafeEqual(Buffer.from(expected),Buffer.from(actual)))return Response.json({status:'unauthorized'},{status:401});
 try{const {error}=await adminClient().from('tenants').select('id').limit(1);if(error)throw error;return Response.json({status:'ready'},{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({status:'unavailable'},{status:503});}
}
