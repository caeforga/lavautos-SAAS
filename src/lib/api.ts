import { supabase } from './supabase';
import { type Snapshot, type Order, type Scope, type Operation, scopeKey } from './domain';
import { flushQueue, mergeRemote, deviceId } from './local';

async function readAll(table: string) {
  const rows: Record<string, unknown>[] = [];
  for (let start = 0; ; start += 1000) {
    const { data, error } = await supabase().from(table).select('*').order('id').range(start, start + 999);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}
export async function fetchSnapshot(): Promise<Snapshot> {
  const { data: { user }, error } = await supabase().auth.getUser();
  if (error || !user) throw new Error('Tu sesión venció. Ingresa de nuevo; tus pendientes siguen guardados.');
  const [tenants, memberships, branches, workers, catalog, orders, cash, expenses, movements, operations, admin] = await Promise.all([
    readAll('tenants'), readAll('memberships'), readAll('branches'), readAll('workers'), readAll('catalog'), readAll('orders'), readAll('cash_sessions'), readAll('expenses'), readAll('inventory_movements'), readAll('sync_operations'), supabase().rpc('is_platform_admin'),
  ]);
  if (admin.error) throw admin.error;
  const {data:{session}}=await supabase().auth.getSession();
  if(session?.user.id!==user.id)throw new Error('La cuenta cambió durante la actualización. Vuelve a cargar tu espacio.');
  const conflicts: Operation[] = operations.filter(o => o.state === 'conflict' || o.state === 'rejected').map(o => ({ id: String(o.id), scope: scopeKey({ userId: user.id, tenantId: String(o.tenant_id), branchId: String(o.branch_id) }), orderId: String(o.order_id), baseVersion: Number((o.request as Order).version), order: o.request as Order, state: o.state as 'conflict' | 'rejected', createdAt: String(o.created_at), error: String((o.result as {message?:string}).message ?? 'Requiere revisión'), serverOrder: (o.result as {order?:Order}).order }));
  const snapshot = { tenants, memberships, branches, workers, catalog, orders: orders.map(o => o.document as Order), cash, expenses, movements, conflicts, resolvedOperationIds: operations.filter(o=>o.state==='resolved').map(o=>String(o.id)), validatedAt: Date.now(), userId: user.id, platformAdmin: Boolean(admin.data) } as Snapshot;
  await mergeRemote(snapshot); return snapshot;
}
export async function synchronize(scope: Scope) {
  const device = await deviceId();
  await flushQueue(scope, async op => {
    const {data:{session}}=await supabase().auth.getSession();
    if(session?.user.id!==scope.userId)throw new Error('La cuenta cambió; se conservaron las operaciones pendientes.');
    const { data, error } = await supabase().rpc('sync_order', { operation_id: op.id, base_version: op.baseVersion, payload: op.order, sender_device: device });
    if (error) {
      if (error.code === 'P0001' || error.code?.startsWith('22') || error.code?.startsWith('23')) return { state: 'rejected', message: error.message };
      throw new Error(error.message);
    }
    return data;
  });
}
export async function manage(action: string, tenant: string, branch: string | null, data: Record<string, unknown>) {
  const result = await supabase().rpc('manage_record', { action, tenant, branch, data });
  if (result.error) throw new Error(result.error.message);
  return result.data;
}
export async function serverAction(path: string, body: unknown) {
  const { data: { session } } = await supabase().auth.getSession();
  const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'No se pudo completar la operación');
  return data;
}
