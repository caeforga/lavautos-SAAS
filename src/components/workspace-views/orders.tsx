'use client';
import { Search } from 'lucide-react';
import { status } from '@/lib/domain';
import type { WorkspaceViewModel } from './types';

export function OrdersView({ model }: { model: WorkspaceViewModel }) {
  const { branchOrders, filter, setFilter, search, setSearch, orderTable } = model;
  return <>
<section className="panel"><div className="list-toolbar"><div className="tabs">{['Todas','Pendiente','En proceso','Terminada','Por cobrar'].map(f=><button className={filter===f?'selected':''} key={f} onClick={()=>setFilter(f)}>{f}</button>)}</div><div className="searchbox"><Search size={17}/><input value={search} aria-label="Buscar órdenes" onChange={e=>setSearch(e.target.value)} placeholder="Placa, cliente o boleta…"/></div></div>{orderTable(branchOrders.filter(o=>(filter==='Todas'||filter==='Por cobrar'&&!o.payments.length&&!o.cancelled||status(o)===filter)&&`${o.plate} ${o.customer_name} ${o.folio}`.toLowerCase().includes(search.toLowerCase())))}</section>
  </>;
}
