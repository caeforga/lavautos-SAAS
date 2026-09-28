import 'server-only';
import { createClient } from '@supabase/supabase-js';
export function adminClient() {
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Falta configurar Supabase en el servidor');
  return createClient(url,key,{ auth: { persistSession:false, autoRefreshToken:false } });
}
export async function authorize(request: Request) {
  const token=request.headers.get('authorization')?.replace(/^Bearer /,'');
  if (!token) throw new Error('No autorizado');
  const admin=adminClient(); const {data:{user},error}=await admin.auth.getUser(token);
  if (error || !user) throw new Error('No autorizado');
  const {data:platform}=await admin.from('platform_admins').select('user_id').eq('user_id',user.id).maybeSingle();
  return {admin,user,platform:Boolean(platform)};
}
export function apiError(error: unknown) { return Response.json({error:error instanceof Error?error.message:'No se pudo completar la operación'},{status:400}); }
