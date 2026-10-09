'use client';
import { Plus } from 'lucide-react';
import { cop, productivity, type Worker } from '@/lib/domain';
import { Empty } from '../ui';
import type { WorkspaceViewModel } from './types';

export function TeamView({ model }: { model: WorkspaceViewModel }) {
  const { w, branch, live, workers, form } = model;
  function workerForm(worker?: Worker) {
    form(worker ? 'Editar trabajador' : 'Agregar trabajador', [
      { name: 'name', label: 'Nombre completo', value: worker?.name },
      { name: 'active', label: 'Estado', value: String(worker?.active ?? true), options: [{ value: 'true', label: 'Activo' }, { value: 'false', label: 'Inactivo' }] },
    ], async data => {
      await w.action('worker.save', { id: worker?.id ?? data._request_id, ...data, active: data.active === 'true' });
    });
  }
  return <>
<div className="section-toolbar"><p className="muted">Trabajadores de {branch?.name}. No necesitan una cuenta para recibir servicios.</p><button className="primary" onClick={()=>workerForm()}><Plus size={17}/> Agregar trabajador</button></div><div className="people-grid">{workers.map((worker,i)=>{const p=productivity(live).find(p=>p.name===worker.name);return <section className="panel person-card" key={worker.id}><div className={`avatar big-avatar avatar-${i%3}`}>{worker.name.split(' ').map(n=>n[0]).slice(0,2).join('')}</div><span className={`badge ${worker.active?'green':'neutral'}`}>{worker.active?'Activo':'Inactivo'}</span><h2>{worker.name}</h2><p>Equipo de {branch?.name}</p><div className="person-stats"><div><strong>{(p?.services??0).toFixed(1)}</strong><small>Servicios hoy</small></div><div><strong>{cop(p?.value??0)}</strong><small>Valor atribuido</small></div></div><button className="full" onClick={()=>workerForm(worker)}>Editar trabajador</button></section>;})}</div>{!workers.length&&<Empty title="Construye tu equipo" detail="Agrega al primer trabajador para poder asignarle servicios."/>}
  </>;
}
