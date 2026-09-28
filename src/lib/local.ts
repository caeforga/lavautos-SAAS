import Dexie, { type Table } from 'dexie';
import { orderSchema, scopeKey, canOperate, type Scope, type Order, type Operation, type Snapshot } from './domain';

type LocalOrder = { key: string; scope: string; order: Order };
type Meta = { key: string; value: unknown };
export class LocalDatabase extends Dexie {
  orders!: Table<LocalOrder, string>;
  operations!: Table<Operation, string>;
  meta!: Table<Meta, string>;
  constructor(name = 'lavautos-v1') {
    super(name);
    this.version(1).stores({ orders: 'key, scope', operations: 'id, scope, orderId, state, createdAt', meta: 'key' });
  }
}
export const local = new LocalDatabase();
export async function deviceId() {
  return local.transaction('rw', local.meta, async () => {
    const existing = await local.meta.get('device');
    if (existing) return existing.value as string;
    const id = crypto.randomUUID(); await local.meta.put({ key: 'device', value: id }); return id;
  });
}
export async function nextFolio(branchCode: string, device: string) {
  return local.transaction('rw', local.meta, async () => {
    const key = `sequence:${branchCode}:${device}`;
    const n = Number((await local.meta.get(key))?.value ?? 0) + 1;
    await local.meta.put({ key, value: n });
    return `${branchCode}-${device.replaceAll('-', '').slice(0, 12).toUpperCase()}-${String(n).padStart(5, '0')}`;
  });
}
export async function saveLocalOrder(scope: Scope, order: Order, validatedAt: number, db = local) {
  if (!canOperate(validatedAt)) throw new Error('Debes conectarte y validar tu acceso antes de registrar más operaciones. Tus pendientes están conservados.');
  const parsed = orderSchema.parse(order);
  if (parsed.tenant_id !== scope.tenantId || parsed.branch_id !== scope.branchId) throw new Error('Orden fuera de la sede activa');
  const sk = scopeKey(scope);
  return db.transaction('rw', db.orders, db.operations, async () => {
    const previous = await db.orders.get(`${sk}:${order.id}`);
    if (previous && previous.order.version !== parsed.version) throw new Error('La orden cambió en otra pestaña. Vuelve a abrirla.');
    const blocked = await db.operations.where('scope').equals(sk).filter(op => op.orderId === order.id && op.state !== 'pending').count();
    if (blocked) throw new Error('Resuelve primero el conflicto de esta orden');
    const next = { ...parsed, version: parsed.version + 1 };
    const op: Operation = { id: crypto.randomUUID(), scope: sk, orderId: order.id, baseVersion: parsed.version, order: parsed, state: 'pending', createdAt: new Date().toISOString() };
    await db.orders.put({ key: `${sk}:${order.id}`, scope: sk, order: next });
    await db.operations.add(op);
    return next;
  });
}
export type SyncResult = { state: 'applied' | 'conflict' | 'rejected'; order?: Order; message?: string };
export async function flushQueue(scope: Scope, send: (op: Operation) => Promise<SyncResult>, db = local) {
  const sk = scopeKey(scope);
  const run = async () => {
    const ops = (await db.operations.where('scope').equals(sk).toArray()).sort((a,b) => a.baseVersion - b.baseVersion || a.createdAt.localeCompare(b.createdAt));
    const blocked = new Set(ops.filter(o => o.state !== 'pending').map(o => o.orderId));
    for (const op of ops) {
      if (op.state !== 'pending' || blocked.has(op.orderId)) continue;
      // A transport error leaves the immutable request available for a safe retry.
      const response = await send(op);
      await db.transaction('rw', db.orders, db.operations, async () => {
        if (response.state === 'applied' && response.order) {
          await db.operations.delete(op.id);
          const remaining = await db.operations.where('scope').equals(sk).filter(x => x.orderId === op.orderId).count();
          if (!remaining) await db.orders.put({ key: `${sk}:${op.orderId}`, scope: sk, order: response.order });
        } else {
          blocked.add(op.orderId);
          await db.operations.update(op.id, { state: response.state === 'conflict' ? 'conflict' : 'rejected', error: response.message ?? 'Operación requiere revisión', serverOrder: response.order });
        }
      });
    }
  };
  if (typeof navigator !== 'undefined' && navigator.locks) return navigator.locks.request(`sync:${sk}`, run);
  return run();
}
export async function mergeRemote(snapshot: Snapshot) {
  await local.transaction('rw', local.meta, local.orders, local.operations, async () => {
    await local.meta.put({ key: `snapshot:${snapshot.userId}`, value: snapshot });
    for (const id of snapshot.resolvedOperationIds ?? []) {
      const resolved = await local.operations.get(id);
      if (resolved?.scope.startsWith(`${snapshot.userId}:`)) {
        const chain = await local.operations.where('scope').equals(resolved.scope).filter(o=>o.orderId===resolved.orderId).toArray();
        await local.meta.put({key:`resolved:${resolved.scope}:${resolved.orderId}:${Date.now()}`,value:chain});
        await local.operations.bulkDelete(chain.map(o=>o.id));
      }
    }
    for (const branch of snapshot.branches) {
      const sk = scopeKey({ userId: snapshot.userId, tenantId: branch.tenant_id, branchId: branch.id });
      const dirty = new Set((await local.operations.where('scope').equals(sk).toArray()).map(o => o.orderId));
      for (const o of snapshot.orders.filter(o => o.branch_id === branch.id)) if (!dirty.has(o.id)) await local.orders.put({ key: `${sk}:${o.id}`, scope: sk, order: o });
    }
  });
}
export async function readSnapshot(userId: string) { return (await local.meta.get(`snapshot:${userId}`))?.value as Snapshot | undefined; }
export async function localOrders(userId: string, branches: Snapshot['branches']) {
  const result: Order[] = [];
  for (const branch of branches) result.push(...(await local.orders.where('scope').equals(scopeKey({ userId, tenantId: branch.tenant_id, branchId: branch.id })).toArray()).map(o => o.order));
  return result;
}
export async function dismissLocal(scope: Scope, orderId: string, serverOrder?: Order) {
  const sk = scopeKey(scope);
  await local.transaction('rw', local.operations, local.orders, local.meta, async () => {
    const ops = await local.operations.where('scope').equals(sk).filter(o => o.orderId === orderId).toArray();
    await local.meta.put({ key: `resolved:${sk}:${orderId}:${Date.now()}`, value: ops });
    await local.operations.bulkDelete(ops.map(o => o.id));
    if (serverOrder) await local.orders.put({ key: `${sk}:${orderId}`, scope: sk, order: serverOrder });
    else await local.orders.delete(`${sk}:${orderId}`);
  });
}
