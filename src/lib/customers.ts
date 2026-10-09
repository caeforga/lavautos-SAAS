import { plateKey, type BusinessCustomer, type CustomerVehicle, type Order, type Snapshot } from './domain';

export type CustomerDirectory = { customers: BusinessCustomer[]; vehicles: CustomerVehicle[] };

// Project queued orders into the directory, so lookup works after an offline save or reload.
export function customerDirectory(snapshot: Snapshot, tenantId: string): CustomerDirectory {
  const customers = new Map((snapshot.customers ?? []).filter(c => c.tenant_id === tenantId).map(c => [c.id, c]));
  const vehicles = new Map((snapshot.vehicles ?? []).filter(v => v.tenant_id === tenantId).map(v => [v.plate_key, v]));
  const registeredKeys = new Set(vehicles.keys());
  const orders = snapshot.orders.filter(o => o.tenant_id === tenantId && !o.cancelled).sort((a,b) => a.created_at.localeCompare(b.created_at));
  for (const order of orders) {
    const key = plateKey(order.plate);
    if (!key) continue;
    if (order.customer_id && !customers.has(order.customer_id) && order.customer_name.trim()) {
      customers.set(order.customer_id, { id: order.customer_id, tenant_id: tenantId, name: order.customer_name.trim(), phone: order.customer_phone, notes: '', created_at: order.created_at, updated_at: order.created_at });
    }
    const previous = vehicles.get(key);
    vehicles.set(key, { id: previous?.id ?? order.id, tenant_id: tenantId, customer_id: registeredKeys.has(key) ? previous?.customer_id ?? null : order.customer_id ?? previous?.customer_id ?? null, plate: order.plate, plate_key: key, vehicle_type: order.vehicle_type, created_at: previous?.created_at ?? order.created_at, updated_at: order.created_at });
  }
  return { customers: [...customers.values()], vehicles: [...vehicles.values()] };
}

export function findVehicle(directory: CustomerDirectory, plate: string) {
  const vehicle = directory.vehicles.find(v => v.plate_key === plateKey(plate));
  return vehicle ? { vehicle, customer: directory.customers.find(c => c.id === vehicle.customer_id) } : null;
}

export function customerVisits(customerId: string, directory: CustomerDirectory, orders: Order[]) {
  const plates = new Set(directory.vehicles.filter(v => v.customer_id === customerId).map(v => v.plate_key));
  const visits = orders.filter(o => !o.cancelled && (o.customer_id === customerId || (!o.customer_id && plates.has(plateKey(o.plate)))));
  return { count: visits.length, last: visits.reduce((date, o) => o.created_at > date ? o.created_at : date, '') };
}
