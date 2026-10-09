'use client';
import { useState } from 'react';
import { CarFront, Plus, Search, Users } from 'lucide-react';
import { customerDirectory, customerVisits } from '@/lib/customers';
import type { BusinessCustomer } from '@/lib/domain';
import { Empty } from '../ui';
import type { WorkspaceViewModel } from './types';

export function BusinessCustomersView({ model }: { model: WorkspaceViewModel }) {
  const { w, s, branch, form } = model;
  const [query, setQuery] = useState('');
  if (!branch) return null;
  const directory = customerDirectory(s, branch.tenant_id);
  const customers = directory.customers.filter(customer => {
    const vehicles = directory.vehicles.filter(vehicle => vehicle.customer_id === customer.id);
    return `${customer.name} ${customer.phone} ${vehicles.map(v=>v.plate).join(' ')}`.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es'));
  }).sort((a,b) => a.name.localeCompare(b.name,'es'));
  function edit(customer?: BusinessCustomer) {
    form(customer ? 'Editar cliente' : 'Agregar cliente', [
      { name: 'name', label: 'Nombre completo', value: customer?.name, required: true },
      { name: 'phone', label: 'WhatsApp o teléfono', value: customer?.phone, required: false },
      { name: 'notes', label: 'Notas internas', value: customer?.notes, type: 'textarea', required: false },
    ], async data => { await w.saveCustomer({ id: customer?.id ?? data._request_id, name: data.name.trim(), phone: data.phone.trim(), notes: data.notes.trim() }); });
  }
  return <>
    <div className="section-toolbar"><p className="muted">Contactos del negocio, separados de tu equipo. Una persona puede tener varias placas.</p>{w.manager&&<button className="primary" onClick={()=>edit()}><Plus size={17}/> Agregar cliente</button>}</div>
    <div className="panel" style={{padding:20}}><label className="field"><span>Buscar por nombre, teléfono o placa</span><div className="add-line"><Search size={18}/><input aria-label="Buscar clientes" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Ej. ABC 123 o Laura"/></div></label></div>
    {customers.length ? <div className="people-grid" style={{marginTop:20}}>{customers.map(customer=>{
      const vehicles=directory.vehicles.filter(v=>v.customer_id===customer.id);
      const visits=customerVisits(customer.id,directory,s.orders.filter(o=>o.tenant_id===branch.tenant_id));
      return <section className="panel person-card" key={customer.id}><div className="avatar big-avatar"><Users size={22}/></div><h2>{customer.name}</h2><p>{customer.phone||'Sin teléfono'}</p><div className="person-stats"><div><strong>{visits.count}</strong><small>Visitas registradas</small></div><div><strong>{vehicles.length}</strong><small>Vehículos</small></div></div><div className="worker-options">{vehicles.map(v=><span className="badge neutral" key={v.id}><CarFront size={13}/> {v.plate}</span>)}</div>{visits.last&&<p className="muted small">Última visita: {new Date(visits.last).toLocaleDateString('es-CO',{timeZone:'America/Bogota'})}</p>}{customer.notes&&<p>{customer.notes}</p>}{w.manager&&<button className="full" onClick={()=>edit(customer)}>Editar cliente</button>}</section>;
    })}</div> : <Empty title={query?'Sin resultados':'Aún no hay clientes registrados'} detail={query?'Prueba con otra placa, nombre o teléfono.':'Registra un cliente aquí o al crear una orden con su placa.'}/>}
    <p className="muted small" style={{marginTop:20}}>Las visitas reflejan las órdenes disponibles en tus sedes. Los cambios de clientes requieren conexión; las órdenes y la búsqueda por placa siguen disponibles sin internet.</p>
  </>;
}
