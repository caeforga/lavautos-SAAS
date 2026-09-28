import { z } from 'zod';
import { authorize, apiError } from '@/lib/server';
const schema=z.discriminatedUnion('action',[
  z.object({action:z.literal('create'),name:z.string().min(1).max(160),branch:z.string().min(1).max(160),owner_id:z.uuid()}),
  z.object({action:z.literal('subscription'),id:z.uuid(),status:z.enum(['active','suspended']),until:z.string().nullable()}),
]);
export async function POST(req:Request) {
  try {
    const {admin,user,platform}=await authorize(req); if(!platform) return Response.json({error:'Requiere administrador de plataforma'},{status:403});
    const body=schema.parse(await req.json());
    if(body.action==='create') {
      const {data,error}=await admin.rpc('provision_tenant',{tenant_name:body.name,branch_name:body.branch,owner_id:body.owner_id});
      if(error) throw new Error(error.message); return Response.json({id:data});
    }
    const {error}=await admin.from('tenants').update({subscription_status:body.status,subscription_until:body.until}).eq('id',body.id);
    if(error) throw new Error(error.message);
    await admin.from('audit_log').insert({tenant_id:body.id,user_id:user.id,action:'subscription.update',detail:body});
    return Response.json({ok:true});
  } catch(e) {return apiError(e);}
}
