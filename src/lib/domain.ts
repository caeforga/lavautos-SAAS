import { z } from 'zod';

export type Role = 'owner' | 'manager' | 'cashier';
export type Membership = { id: string; tenant_id: string; user_id: string; branch_id: string | null; email?:string; role: Role };
export type Tenant = { id: string; name: string; subscription_status: 'active' | 'suspended'; subscription_until: string | null };
export type Branch = { id: string; tenant_id: string; name: string; code: string; nit: string; address: string; phone: string; footer: string; logo: string; active: boolean };
export type Worker = { id: string; tenant_id: string; branch_id: string; name: string; active: boolean };
export type BusinessCustomer = { id: string; tenant_id: string; name: string; phone: string; notes: string; created_at: string; updated_at: string };
export type CustomerVehicle = { id: string; tenant_id: string; customer_id: string | null; plate: string; plate_key: string; vehicle_type: string; created_at: string; updated_at: string };
export type CatalogItem = { id: string; tenant_id: string; branch_id: string; name: string; kind: 'service' | 'product'; vehicle_type: string; price: number; stock: number; minimum_stock: number; active: boolean };
export type CashSession = { id: string; tenant_id: string; branch_id: string; user_id: string; device_id: string; opening: number; opened_at: string; closed_at: string | null; counted: number | null; expected: number | null };
export type Expense = { id: string; tenant_id: string; branch_id: string; cash_session_id: string | null; amount: number; category: string; description: string; method: string; created_at: string };
export type Movement = { id: string; tenant_id: string; branch_id: string; product_id: string; quantity: number; reason: string; created_at: string };
const amount = z.number().finite().min(0).max(999999999).refine(n => Math.abs(n * 100 - Math.round(n * 100)) < 0.00001, 'Máximo dos decimales');
export const allocationSchema = z.object({ worker_id: z.uuid(), name: z.string().min(1).max(120), percent: z.number().positive().max(100) });
export const lineSchema = z.object({
  id: z.uuid(), catalog_id: z.uuid(), name: z.string().min(1).max(160), kind: z.enum(['service', 'product']),
  quantity: z.number().int().min(1).max(1000), price: amount,
  status: z.enum(['pending', 'working', 'done']), allocations: z.array(allocationSchema).max(30),
}).superRefine((v, ctx) => {
  if (v.kind === 'service' && (v.allocations.length === 0 || Math.abs(v.allocations.reduce((s, a) => s + a.percent, 0) - 100) > 0.001)) ctx.addIssue({ code: 'custom', message: 'Los responsables deben sumar 100 %' });
  if (new Set(v.allocations.map(a => a.worker_id)).size !== v.allocations.length) ctx.addIssue({ code: 'custom', message: 'Responsable repetido' });
});
export const orderSchema = z.object({
  id: z.uuid(), tenant_id: z.uuid(), branch_id: z.uuid(), device_id: z.uuid(), folio: z.string().min(1).max(100),
  plate: z.string().trim().min(3).max(12), vehicle_type: z.string().min(1).max(40),
  customer_name: z.string().max(120), customer_phone: z.string().max(25), notes: z.string().max(2000),
  customer_id: z.uuid().nullable().optional(),
  lines: z.array(lineSchema).min(1).max(100), payments: z.array(z.object({ method: z.enum(['cash', 'transfer', 'card']), amount: amount.refine(n => n > 0) })).max(3),
  cash_session_id: z.uuid().nullable(), paid_at: z.iso.datetime().nullable(), cancelled: z.boolean(), reason: z.string().max(1000),
  created_at: z.iso.datetime(), version: z.number().int().min(0),
  ticket: z.object({ name: z.string(), nit: z.string(), address: z.string(), phone: z.string(), footer: z.string(), logo: z.string() }),
}).superRefine((v, ctx) => {
  if (v.payments.length && cents(v.payments.reduce((s, p) => s + p.amount, 0)) !== cents(total(v))) ctx.addIssue({ code: 'custom', message: 'El pago debe cubrir el total exacto' });
  if (v.payments.length && !v.cash_session_id) ctx.addIssue({ code: 'custom', message: 'Abre una caja antes de cobrar' });
  if (v.payments.length && !v.paid_at) ctx.addIssue({ code: 'custom', message: 'Falta la fecha del pago' });
  if (v.cancelled && !v.reason.trim()) ctx.addIssue({ code: 'custom', message: 'Indica el motivo de anulación' });
  if (new Set(v.lines.map(l => l.id)).size !== v.lines.length) ctx.addIssue({ code: 'custom', message: 'Línea repetida' });
});
export type Order = z.infer<typeof orderSchema>;
export type OrderLine = Order['lines'][number];
export type ReceiptData = Pick<Order,'ticket'|'folio'|'plate'|'vehicle_type'|'customer_name'|'created_at'|'cancelled'|'payments'> & { lines: (Pick<OrderLine,'name'|'quantity'|'price'> & {allocations: {name:string;percent:number}[]})[] };
export function receiptData(order:Order):ReceiptData { return {ticket:order.ticket,folio:order.folio,plate:order.plate,vehicle_type:order.vehicle_type,customer_name:order.customer_name,created_at:order.created_at,cancelled:order.cancelled,payments:order.payments,lines:order.lines.map(l=>({name:l.name,quantity:l.quantity,price:l.price,allocations:l.allocations.map(a=>({name:a.name,percent:a.percent}))}))}; }
export type Scope = { userId: string; tenantId: string; branchId: string };
export type Operation = { id: string; scope: string; orderId: string; baseVersion: number; order: Order; state: 'pending' | 'conflict' | 'rejected'; error?: string; createdAt: string; serverOrder?: Order };
export type Snapshot = { tenants: Tenant[]; memberships: Membership[]; branches: Branch[]; workers: Worker[]; customers: BusinessCustomer[]; vehicles: CustomerVehicle[]; catalog: CatalogItem[]; orders: Order[]; cash: CashSession[]; expenses: Expense[]; movements: Movement[]; validatedAt: number; userId: string; platformAdmin: boolean; conflicts?: Operation[]; resolvedOperationIds?: string[] };
export const emptySnapshot = (): Snapshot => ({ tenants: [], memberships: [], branches: [], workers: [], customers: [], vehicles: [], catalog: [], orders: [], cash: [], expenses: [], movements: [], validatedAt: 0, userId: '', platformAdmin: false });
export const plateKey = (plate: string) => plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
export const cents = (n: number) => Math.round(n * 100);
export const total = (o: {lines:{price:number;quantity:number}[]}) => o.lines.reduce((s, l) => s + cents(l.price) * l.quantity, 0) / 100;
export const cop = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 2 }).format(n);
export const day = (date: string | Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(date));
export const scopeKey = (s: Scope) => `${s.userId}:${s.tenantId}:${s.branchId}`;
export function status(o: Order) { return o.cancelled ? 'Anulada' : o.lines.filter(l => l.kind === 'service').every(l => l.status === 'done') ? 'Terminada' : o.lines.some(l => l.status !== 'pending') ? 'En proceso' : 'Pendiente'; }
export function canOperate(validatedAt: number, now = Date.now()) { return validatedAt > 0 && now >= validatedAt && now - validatedAt <= 7 * 86400000; }
export function equalAllocations(workers: Worker[]) { return workers.map((w, i) => ({ worker_id: w.id, name: w.name, percent: i === workers.length - 1 ? (10000 - Math.floor(10000 / workers.length) * i) / 100 : Math.floor(10000 / workers.length) / 100 })); }
export function productivity(orders: Order[]) {
  const map = new Map<string, { name: string; services: number; value: number }>();
  for (const o of orders.filter(o => !o.cancelled)) for (const l of o.lines.filter(l => l.kind === 'service' && l.status === 'done')) for (const a of l.allocations) {
    const row = map.get(a.worker_id) ?? { name: a.name, services: 0, value: 0 };
    row.services += l.quantity * a.percent / 100; row.value += l.quantity * l.price * a.percent / 100; map.set(a.worker_id, row);
  }
  return [...map.values()].sort((a, b) => b.value - a.value);
}
export function financialSummary(orders:Order[],from:string,to:string){
 const active=orders.filter(o=>!o.cancelled);
 const sold=active.filter(o=>day(o.created_at)>=from&&day(o.created_at)<=to);
 const paid=active.filter(o=>o.paid_at&&day(o.paid_at)>=from&&day(o.paid_at)<=to);
 return {sales:sold.reduce((n,o)=>n+total(o),0),collected:paid.reduce((n,o)=>n+o.payments.reduce((m,p)=>m+p.amount,0),0)};
}
export function csv(rows: (string | number)[][]) { return '\uFEFF' + rows.map(row => row.map(v => { const s = String(v); return '"' + (/^[=+\-@\t\r]/.test(s) ? "'" + s : s).replaceAll('"', '""') + '"'; }).join(';')).join('\r\n'); }
