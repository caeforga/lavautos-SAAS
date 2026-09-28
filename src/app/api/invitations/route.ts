import { z } from 'zod';
import { authorize, apiError } from '@/lib/server';
const schema=z.object({email:z.email(),tenant_id:z.uuid().optional(),branch_id:z.uuid().nullable().optional(),role:z.enum(['owner','manager','cashier']).default('owner')});
export async function POST(req:Request) {
  try {
    const {admin,user,platform}=await authorize(req); const body=schema.parse(await req.json());
    if(!body.tenant_id && !platform) return Response.json({error:'Requiere administrador de plataforma'},{status:403});
    if(body.tenant_id) {
      const {data:owner}=await admin.from('memberships').select('id').eq('tenant_id',body.tenant_id).eq('user_id',user.id).eq('role','owner').maybeSingle();
      if(!platform&&!owner) return Response.json({error:'Solo el dueño puede invitar usuarios'},{status:403});
      if(body.role!=='owner') {
        const {data:branch}=await admin.from('branches').select('id').eq('tenant_id',body.tenant_id).eq('id',body.branch_id??'').maybeSingle();
        if(!branch) throw new Error('Selecciona una sede válida');
      }
    }
    const origin=process.env.NEXT_PUBLIC_APP_URL;
    if(!origin) throw new Error('Configura NEXT_PUBLIC_APP_URL para las invitaciones');
    const {data,error}=await admin.auth.admin.inviteUserByEmail(body.email,{redirectTo:`${origin}/auth/callback`});
    if(error||!data.user) throw new Error(error?.message??'No se pudo invitar');
    if(body.tenant_id) {
      const {error:membershipError}=await admin.from('memberships').insert({tenant_id:body.tenant_id,user_id:data.user.id,email:body.email,role:body.role,branch_id:body.role==='owner'?null:body.branch_id});
      if(membershipError) throw new Error(`Invitación enviada, pero falta asignar el acceso al usuario ${data.user.id}. ${membershipError.message}`);
    }
    return Response.json({id:data.user.id});
  } catch(e) {return apiError(e);}
}
