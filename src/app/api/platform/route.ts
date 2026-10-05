import { z } from 'zod';
import { authorize, apiError } from '@/lib/server';
const schema=z.discriminatedUnion('action',[
  z.object({action:z.literal('create'),name:z.string().min(1).max(160),branch:z.string().min(1).max(160),owner_id:z.uuid()}),
  z.object({action:z.literal('metrics')}),
  z.object({action:z.literal('subscription'),id:z.uuid(),status:z.enum(['active','suspended']),until:z.string().date().nullable(),amount:z.number().positive().max(999999999).optional(),paid_on:z.string().date().optional(),reference:z.string().trim().max(200).optional()}),
]);
export async function POST(req:Request) {
  try {
    const {admin,user,platform}=await authorize(req); if(!platform) return Response.json({error:'Requiere administrador de plataforma'},{status:403});
    const body=schema.parse(await req.json());
    if(body.action==='create') {
      const {data,error}=await admin.rpc('provision_tenant',{tenant_name:body.name,branch_name:body.branch,owner_id:body.owner_id});
      if(error) throw new Error(error.message); return Response.json({id:data});
    }
    if(body.action==='metrics') {
      const {data,error}=await admin.rpc('platform_dashboard_metrics');
      if(error) throw new Error(error.message); return Response.json(data);
    }
    const {error}=await admin.rpc('update_platform_subscription',{p_tenant:body.id,p_status:body.status,p_until:body.until,p_amount:body.amount??null,p_paid_on:body.paid_on??null,p_reference:body.reference??'',p_recorded_by:user.id});
    if(error) throw new Error(error.message);
    return Response.json({ok:true});
  } catch(e) {return apiError(e);}
}
