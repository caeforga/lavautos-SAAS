'use client';
import { Plus } from 'lucide-react';
import { day } from '@/lib/domain';
import { serverAction } from '@/lib/api';
import type { WorkspaceViewModel } from './types';

export function ClientsView({ model }: { model: WorkspaceViewModel }) {
  const { w, s, form } = model;
  return <>
<div className="section-toolbar"><p className="muted">Clientes, planes y cobros registrados fuera de Brillo.</p><button className="primary" onClick={()=>form('Crear cliente',[{name:'name',label:'Nombre del negocio'},{name:'branch',label:'Nombre de la primera sede'},{name:'email',label:'Correo del dueño',type:'email'}],async d=>{const invited=await serverAction('/api/invitations',{email:d.email,role:'owner'});await serverAction('/api/platform',{action:'create',name:d.name,branch:d.branch,owner_id:invited.id});await w.refresh();})}><Plus size={16}/> Nuevo cliente</button></div><section className="panel space-top table-scroll"><table><thead><tr><th>Cliente</th><th>Suscripción</th><th>Hasta</th><th/></tr></thead><tbody>{s.tenants.map(t=><tr key={t.id}><td>{t.name}</td><td>{t.subscription_status==='active'?'Activa':'Suspendida'}</td><td>{t.subscription_until??'Sin fecha'}</td><td><button onClick={()=>form('Actualizar suscripción',[{name:'status',label:'Estado',value:t.subscription_status,options:[{value:'active',label:'Activa'},{value:'suspended',label:'Suspendida'}]},{name:'until',label:'Pagada hasta',type:'date',value:t.subscription_until??'',required:false},{name:'amount',label:'Cobro recibido (COP)',type:'number',min:0.01,required:false},{name:'paid_on',label:'Fecha del cobro',type:'date',value:day(new Date()),required:false},{name:'reference',label:'Referencia del pago',required:false}],async d=>{await serverAction('/api/platform',{action:'subscription',id:t.id,status:d.status,until:d.until||null,amount:d.amount?Number(d.amount):undefined,paid_on:d.amount?d.paid_on||undefined:undefined,reference:d.reference||undefined});await w.refresh();})}>Administrar</button></td></tr>)}</tbody></table></section>
  </>;
}
