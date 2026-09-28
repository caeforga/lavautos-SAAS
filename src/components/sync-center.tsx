'use client';
import { useState } from 'react';
import { RefreshCw,Download,Wifi,WifiOff } from 'lucide-react';
import type { useWorkspace } from '@/lib/use-workspace';
import type { Operation,Order } from '@/lib/domain';
import { scopeKey,total,cop } from '@/lib/domain';
import { local,dismissLocal,localOrders } from '@/lib/local';
import { supabase } from '@/lib/supabase';
import { downloadText } from '@/lib/receipt';
import { Modal,RecordForm,Empty } from './ui';
export function SyncCenter({w}:{w:ReturnType<typeof useWorkspace>}){
 const [review,setReview]=useState<Operation|null>(null);
 const pending=w.operations.filter(o=>o.state==='pending').length;
 async function resolve(data:Record<string,string>){
  if(!review)return;if(!navigator.onLine)throw new Error('Conéctate para conciliar.');
  if(review.scope!==scopeKey(w.scope))throw new Error('Selecciona primero la sede de esta operación.');
  let serverOrder:Order|undefined;
  if(!w.demo){
   const {data:current,error:readError}=await supabase().from('orders').select('document').eq('id',review.orderId).maybeSingle();if(readError)throw readError;
   serverOrder=current?.document as Order|undefined;
   const {data:stored,error}=await supabase().from('sync_operations').select('id').eq('id',review.id).maybeSingle();if(error)throw error;
   if(stored){const {data:result,error:resolveError}=await supabase().rpc('resolve_conflict',{operation_id:review.id,decision:data.decision,reason:data.reason,resolution_id:crypto.randomUUID()});if(resolveError)throw new Error(resolveError.message);serverOrder=result.order??serverOrder;}
   else if(data.decision==='local'){
    const payload={...review.order,version:serverOrder?.version??0,reason:data.reason,...(serverOrder?{ticket:serverOrder.ticket,folio:serverOrder.folio,created_at:serverOrder.created_at,device_id:serverOrder.device_id}:{})};
    const {data:result,error:saveError}=await supabase().rpc('sync_order',{operation_id:crypto.randomUUID(),base_version:payload.version,payload,sender_device:w.device});if(saveError)throw new Error(saveError.message);if(result.state!=='applied')throw new Error('La orden cambió de nuevo. Actualiza y revisa antes de conciliar.');serverOrder=result.order;
   }
  }else serverOrder=data.decision==='local'?{...review.order,reason:data.reason,version:(review.serverOrder?.version??0)+1}:review.serverOrder;
  await dismissLocal(w.scope,review.orderId,serverOrder);
  if(w.demo)await w.hydrate({...w.snapshot,orders:await localOrders(w.snapshot.userId,w.snapshot.branches)});else await w.refresh();
  setReview(null);w.setNotice('Conciliación registrada. Se conservó una copia local de las operaciones reemplazadas.');
 }
 return <><div className="section-toolbar"><p className="muted">{w.online?<Wifi size={16}/>:<WifiOff size={16}/>} {pending} pendientes · {w.operations.length-pending} requieren revisión.<br/>Última validación: {new Date(w.snapshot.validatedAt).toLocaleString('es-CO')}. Acceso local por 7 días.</p><button className="primary" disabled={!w.online||w.busy} onClick={()=>void w.sync()}><RefreshCw size={16} className={w.busy?'spin':''}/> Sincronizar ahora</button></div>
 {w.operations.map(op=><section className="panel conflict-card" key={op.id}><div><span className={`badge ${op.state==='pending'?'amber':'red'}`}>{op.state==='pending'?'Pendiente':op.state==='conflict'?'Conflicto':'Rechazada'}</span><h3>{op.order.plate} · {op.order.folio}</h3><p>{op.error??'Se enviará al recuperar conexión.'}</p><small>{w.snapshot.branches.find(b=>b.id===op.order.branch_id)?.name} · Versión local {op.baseVersion}</small></div><div className="row-actions"><button onClick={()=>downloadText(`operacion-${op.id}.json`,JSON.stringify(op,null,2),'application/json')}><Download size={15}/> Copia</button>{op.state!=='pending'&&w.manager&&<button onClick={()=>setReview(op)}>Revisar y conciliar</button>}</div></section>)}
 {!w.operations.length&&<Empty title="Todo al día en este dispositivo" detail="Las nuevas operaciones se guardan primero aquí y se envían cuando hay conexión."/>}
 <p className="muted small">Los cambios rechazados se conservan. No borres los datos del navegador mientras existan pendientes.</p>
 {review&&<Modal title={`Conciliar ${review.order.plate}`} onClose={()=>setReview(null)}><div className="conflict-comparison"><div><strong>Propuesta local</strong><p>{cop(total(review.order))}<br/>{review.order.payments.length?'Con pago':'Sin pago'} · {review.order.notes||'Sin observaciones'}</p></div><div><strong>Servidor al detectar conflicto</strong><p>{review.serverOrder?`${cop(total(review.serverOrder))} · ${review.serverOrder.payments.length?'Con pago':'Sin pago'}`:'Sin registro disponible'}</p></div></div><p className="notice">Se aplicará solo la operación seleccionada. Las ediciones posteriores de esta orden se archivarán para revisión manual. Una caja cerrada no admite nuevos cobros ni cambios financieros.</p><RecordForm fields={[{name:'decision',label:'Resultado de la revisión',options:[{value:'server',label:'Conservar el servidor y archivar la propuesta'},{value:'local',label:'Aplicar la propuesta local revisada'}]},{name:'reason',label:'Motivo de conciliación',type:'textarea'}]} onSubmit={resolve} submit="Registrar conciliación"/></Modal>}
 </>;
}
