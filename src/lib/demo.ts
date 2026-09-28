import { type Snapshot, type Order } from './domain';
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
export const DEMO_USER = id(1);
export function demoSnapshot(): Snapshot {
  const t = id(2), b = id(3);
  const branch = { id: b, tenant_id: t, name: 'Laureles', code: 'LAU', nit: '900.123.456-7', address: 'Carrera 76 # 33-18 · Medellín', phone: '3001234567', footer: 'Tu auto impecable. Siempre.', logo: '', active: true };
  const workers = ['Andrés Restrepo', 'Camila Torres', 'Santiago López'].map((name,i) => ({ id: id(10+i), tenant_id: t, branch_id: b, name, active: true }));
  const catalog = [
    { id: id(20), tenant_id: t, branch_id: b, name: 'Lavado completo', kind: 'service' as const, vehicle_type: 'Automóvil', price: 35000, stock: 0, minimum_stock: 0, active: true },
    { id: id(21), tenant_id: t, branch_id: b, name: 'Lavado premium', kind: 'service' as const, vehicle_type: 'Todos', price: 65000, stock: 0, minimum_stock: 0, active: true },
    { id: id(22), tenant_id: t, branch_id: b, name: 'Limpieza de tapicería', kind: 'service' as const, vehicle_type: 'Todos', price: 120000, stock: 0, minimum_stock: 0, active: true },
    { id: id(23), tenant_id: t, branch_id: b, name: 'Ambientador', kind: 'product' as const, vehicle_type: 'Todos', price: 12000, stock: 8, minimum_stock: 10, active: true },
    { id: id(24), tenant_id: t, branch_id: b, name: 'Champú concentrado (ml)', kind: 'product' as const, vehicle_type: 'Todos', price: 100, stock: 2500, minimum_stock: 500, active: true },
  ];
  const cashId = id(40);
  const orders: Order[] = ['KXR 482', 'JPL 903', 'FTH 217', 'WQR 651', 'HGN 328', 'LMP 740'].map((plate, i) => {
    const service = catalog[i%3]; const worker = workers[i%3];
    return { id: id(100+i), tenant_id: t, branch_id: b, device_id: id(50), folio: `LAU-DEMO-${String(i+1).padStart(5,'0')}`, plate, vehicle_type: 'Automóvil', customer_name: '', customer_phone: '', notes: '',
      lines: [{ id: id(200+i), catalog_id: service.id, name: service.name, kind: 'service', quantity: 1, price: service.price, status: i<2 ? 'working' : i<4 ? 'done' : 'pending', allocations: [{ worker_id: worker.id, name: worker.name, percent: 100 }] }],
      payments: i<4 ? [{ method: i%2 ? 'transfer' : 'cash', amount: service.price }] : [], paid_at:i<4?new Date(Date.now()-(6-i)*1800000).toISOString():null, cash_session_id: i<4 ? cashId : null, cancelled: false, reason: '', created_at: new Date(Date.now()-(6-i)*1800000).toISOString(), version: 1, ticket: { name: 'Brillo Auto · Laureles', nit: branch.nit, address: branch.address, phone: branch.phone, footer: branch.footer, logo: '' } };
  });
  return { tenants: [{ id: t, name: 'Brillo Auto', subscription_status: 'active', subscription_until: null }], branches: [branch, { ...branch, id: id(4), name: 'El Poblado', code: 'POB', address: 'Calle 10 # 43-22 · Medellín' }], memberships: [{ id: id(5), tenant_id: t, user_id: DEMO_USER, role: 'owner', branch_id: null }], workers, catalog, orders, cash: [{ id: cashId, tenant_id: t, branch_id: b, user_id: DEMO_USER, device_id: id(50), opening: 100000, opened_at: new Date().toISOString(), closed_at: null, counted: null, expected: null }], expenses: [], movements: [], validatedAt: Date.now(), userId: DEMO_USER, platformAdmin: false };
}
