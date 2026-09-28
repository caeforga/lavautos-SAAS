import { describe,it,expect } from 'vitest';
import { orderSchema,total,equalAllocations,productivity,canOperate,csv,day,financialSummary,receiptData } from '../src/lib/domain';
import { demoSnapshot } from '../src/lib/demo';
describe('reglas operativas',()=>{
 it('suma importes en centavos',()=>{const order=demoSnapshot().orders[0];order.lines=[{...order.lines[0],price:0.1,quantity:3}];expect(total(order)).toBe(0.3);});
 it('rechaza pagos parciales y porcentajes incompletos',()=>{const o=demoSnapshot().orders[0];o.payments=[{method:'cash',amount:1}];expect(orderSchema.safeParse(o).success).toBe(false);o.payments=[];o.lines[0].allocations[0].percent=90;expect(orderSchema.safeParse(o).success).toBe(false);});
 it('reparte exactamente cien por ciento entre tres trabajadores',()=>{expect(equalAllocations(demoSnapshot().workers).reduce((n,a)=>n+a.percent,0)).toBe(100);});
 it('excluye órdenes anuladas y servicios incompletos de productividad',()=>{const s=demoSnapshot();const completed=s.orders[2];completed.lines[0].allocations=equalAllocations(s.workers);const report=productivity([completed]);expect(report).toHaveLength(3);expect(report.reduce((n,r)=>n+r.value,0)).toBe(total(completed));completed.cancelled=true;expect(productivity([completed])).toEqual([]);expect(productivity([s.orders[0]])).toEqual([]);});
 it('caduca acceso después de siete días y rechaza reloj hacia atrás',()=>{const t=1000000000;expect(canOperate(t,t+7*86400000)).toBe(true);expect(canOperate(t,t+7*86400000+1)).toBe(false);expect(canOperate(t,t-1)).toBe(false);});
 it('usa fecha colombiana e impide fórmulas en CSV',()=>{expect(day('2026-09-29T02:00:00Z')).toBe('2026-09-28');expect(csv([['=HYPERLINK("x")']])).toContain("'=HYPERLINK");});
 it('atribuye el cobro al día del pago, aunque la orden sea anterior',()=>{const o=demoSnapshot().orders[0];o.created_at='2026-09-27T15:00:00Z';o.paid_at='2026-09-28T15:00:00Z';expect(financialSummary([o],'2026-09-28','2026-09-28')).toEqual({sales:0,collected:35000});});
 it('el recibo público no contiene identificadores internos ni teléfono personal',()=>{const o=demoSnapshot().orders[0];const data=receiptData(o);expect(data).not.toHaveProperty('tenant_id');expect(data).not.toHaveProperty('customer_phone');expect(data.lines[0].allocations[0]).not.toHaveProperty('worker_id');});
});
