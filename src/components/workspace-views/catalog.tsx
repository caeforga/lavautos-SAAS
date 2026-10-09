'use client';
import { Plus } from 'lucide-react';
import { cop, day, type CatalogItem } from '@/lib/domain';
import { Empty } from '../ui';
import type { WorkspaceViewModel } from './types';

export function CatalogView({ model }: { model: WorkspaceViewModel }) {
  const { w, s, branchId, catalog, form } = model;
  function catalogForm(item?: CatalogItem) {
    form(item ? 'Editar catálogo' : 'Nuevo servicio o producto', [
      { name: 'name', label: 'Nombre', value: item?.name },
      { name: 'kind', label: 'Tipo', value: item?.kind ?? 'service', options: [{ value: 'service', label: 'Servicio' }, { value: 'product', label: 'Producto / insumo' }] },
      { name: 'vehicle_type', label: 'Vehículo', value: item?.vehicle_type ?? 'Todos', options: ['Todos', 'Automóvil', 'Camioneta', 'Moto', 'Taxi', 'Otro'].map(value => ({ value, label: value })) },
      { name: 'price', label: 'Precio de venta (COP)', type: 'number', min: 0, value: item?.price ?? 0 },
      { name: 'minimum_stock', label: 'Existencia mínima (productos)', type: 'number', min: 0, value: item?.minimum_stock ?? 0 },
      { name: 'active', label: 'Estado', value: String(item?.active ?? true), options: [{ value: 'true', label: 'Activo' }, { value: 'false', label: 'Inactivo' }] },
    ], async data => {
      await w.action('catalog.save', { ...data, id: item?.id ?? data._request_id, price: Number(data.price), minimum_stock: Number(data.minimum_stock), active: data.active === 'true' });
    });
  }
  function moveStock(item: CatalogItem) {
    form(`Movimiento · ${item.name}`, [
      { name: 'quantity', label: 'Cantidad (+ entrada / − consumo o desperdicio)', type: 'number', step: '0.001' },
      { name: 'reason', label: 'Motivo del movimiento' },
    ], async data => {
      if (!Number(data.quantity)) throw new Error('La cantidad debe ser distinta de cero');
      await w.action('inventory.move', { id: data._request_id, product_id: item.id, quantity: Number(data.quantity), reason: data.reason });
    });
  }
  return <>
<div className="section-toolbar"><p className="muted">Precios e inventario exclusivos de esta sede.</p><button className="primary" onClick={()=>catalogForm()}><Plus size={17}/> Agregar al catálogo</button></div><section className="panel table-scroll"><table><thead><tr><th>Nombre</th><th>Tipo</th><th>Vehículo</th><th>Precio</th><th>Existencias</th><th>Acciones</th></tr></thead><tbody>{catalog.map(c=><tr key={c.id}><td><strong>{c.name}</strong><small>{c.active?'Activo':'Inactivo'}</small></td><td>{c.kind==='service'?'Servicio':'Producto / insumo'}</td><td>{c.vehicle_type}</td><td>{cop(Number(c.price))}</td><td>{c.kind==='product'?<span className={`badge ${Number(c.stock)<=Number(c.minimum_stock)?'amber':'green'}`}>{c.stock} {Number(c.stock)<=Number(c.minimum_stock)&&'· bajo'}</span>:'—'}</td><td><div className="row-actions"><button onClick={()=>catalogForm(c)}>Editar</button>{c.kind==='product'&&<button onClick={()=>moveStock(c)}>Movimiento</button>}</div></td></tr>)}</tbody></table>{!catalog.length&&<Empty title="Tu catálogo empieza aquí" detail="Agrega servicios y productos para empezar a recibir vehículos."/>}</section><section className="panel space-top"><div className="panel-heading"><h2>Últimos movimientos de inventario</h2></div><div className="table-scroll"><table><thead><tr><th>Fecha</th><th>Producto</th><th>Cantidad</th><th>Motivo</th></tr></thead><tbody>{s.movements.filter(m=>m.branch_id===branchId).slice(-30).reverse().map(m=><tr key={m.id}><td>{day(m.created_at)}</td><td>{catalog.find(c=>c.id===m.product_id)?.name}</td><td>{m.quantity}</td><td>{m.reason}</td></tr>)}</tbody></table></div></section>
  </>;
}
