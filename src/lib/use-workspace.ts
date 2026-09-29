'use client';
import { useEffect,useRef,useState } from 'react';
import { type Snapshot,type Order,type Operation,type Scope,emptySnapshot,scopeKey,total } from './domain';
import { local,deviceId,mergeRemote,readSnapshot,localOrders,saveLocalOrder,flushQueue } from './local';
import { demoSnapshot,DEMO_USER } from './demo';
import { configured,supabase } from './supabase';
import { fetchSnapshot,manage,synchronize } from './api';
import { prepareOffline } from './prepare-offline';

export function useWorkspace(){
 const [snapshot,setSnapshot]=useState<Snapshot>(emptySnapshot),[ready,setReady]=useState(false),[demo,setDemo]=useState(false),[device,setDevice]=useState(''),[branchId,setBranchId]=useState(''),[online,setOnline]=useState(true),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[operations,setOperations]=useState<Operation[]>([]),[lastSync,setLastSync]=useState(0);
 const syncing=useRef(false);const sessionEpoch=useRef(0);const stateRef=useRef({snapshot,demo,branchId});stateRef.current={snapshot,demo,branchId};
 async function hydrate(s:Snapshot){const epoch=sessionEpoch.current;const orders=await localOrders(s.userId,s.branches);if(epoch!==sessionEpoch.current)return;setSnapshot({...s,orders});setBranchId(current=>s.branches.some(b=>b.id===current)?current:s.branches[0]?.id??'');await loadOperations(s);}
 async function loadOperations(s=stateRef.current.snapshot){const epoch=sessionEpoch.current;const all=await local.operations.toArray();if(epoch!==sessionEpoch.current)return;const merged=new Map((s.conflicts??[]).map(o=>[o.id,o]));for(const o of all.filter(o=>o.scope.startsWith(`${s.userId}:`)))merged.set(o.id,o);setOperations([...merged.values()]);}
 async function refresh(){if(stateRef.current.demo)return;const epoch=sessionEpoch.current;const s=await fetchSnapshot();if(epoch!==sessionEpoch.current)return;await local.meta.put({key:'last-authenticated-user',value:s.userId});if(epoch!==sessionEpoch.current)return;await hydrate(s);setLastSync(Date.now());}
 async function currentSession(){
  const sessionRequest=supabase().auth.getSession();
  const timeout=new Promise<never>((_,reject)=>window.setTimeout(()=>reject(new Error('No fue posible conectar con Supabase. Revisa tu conexión e inténtalo de nuevo.')),8000));
  const {data:{session},error}=await Promise.race([sessionRequest,timeout]);
  if(error)throw error;
  return session;
 }
 async function load(){setBusy(true);try{
  if(!configured()){setReady(true);return;}
  if(!navigator.onLine){const last=await local.meta.get('last-authenticated-user');if(last){const cached=await readSnapshot(String(last.value));if(cached)await hydrate(cached);}return;}
  const session=await currentSession();
  if(session){const cached=await readSnapshot(session.user.id);if(cached)await hydrate(cached);if(navigator.onLine)await refresh();}
 }catch(e){setNotice(e instanceof Error?e.message:'No se pudo cargar el negocio');}finally{setBusy(false);setReady(true);}}
 useEffect(()=>{void deviceId().then(setDevice);void load();setOnline(navigator.onLine);const change=()=>setOnline(navigator.onLine);window.addEventListener('online',change);window.addEventListener('offline',change);void prepareOffline().catch(e=>setNotice(e.message));return()=>{window.removeEventListener('online',change);window.removeEventListener('offline',change);};},[]);
 async function startDemo(){sessionEpoch.current++;setBusy(true);try{setDemo(true);let s=await readSnapshot(DEMO_USER);if(!s){s=demoSnapshot();const d=await deviceId();s.cash=s.cash.map(c=>({...c,device_id:d}));await mergeRemote(s);}await hydrate(s);}finally{setBusy(false);}}
 async function sync(){if(syncing.current||!navigator.onLine||!stateRef.current.snapshot.userId)return;const epoch=sessionEpoch.current;syncing.current=true;setBusy(true);try{
  const {snapshot:s,demo:isDemo}=stateRef.current;
  for(const b of s.branches){if(epoch!==sessionEpoch.current)return;const scope={userId:s.userId,tenantId:b.tenant_id,branchId:b.id};if(isDemo)await flushQueue(scope,async op=>({state:'applied',order:{...op.order,version:op.baseVersion+1}}));else await synchronize(scope);}
  if(epoch!==sessionEpoch.current)return;
  if(isDemo){const orders=await localOrders(s.userId,s.branches);const next={...s,orders};await local.meta.put({key:`snapshot:${s.userId}`,value:next});setSnapshot(next);await loadOperations(next);}else await refresh();setLastSync(Date.now());
 }catch(e){if(epoch===sessionEpoch.current){setNotice(e instanceof Error?e.message:'Sin conexión al servidor. Los cambios están guardados localmente.');await loadOperations();}}finally{syncing.current=false;setBusy(false);}}
 useEffect(()=>{if(!snapshot.userId)return;void sync();const timer=setInterval(()=>void sync(),30000);const visible=()=>{if(document.visibilityState==='visible')void sync();};document.addEventListener('visibilitychange',visible);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',visible);};},[online,snapshot.userId]);
 const branch=snapshot.branches.find(b=>b.id===branchId);
 const tenant=snapshot.tenants.find(t=>t.id===branch?.tenant_id);
 const membership=snapshot.memberships.find(m=>m.user_id===snapshot.userId&&m.tenant_id===branch?.tenant_id&&(m.role==='owner'||m.branch_id===branchId));
 const manager=membership?.role==='owner'||membership?.role==='manager';
 const scope:Scope={userId:snapshot.userId,tenantId:branch?.tenant_id??'',branchId};
 const cash=snapshot.cash.find(c=>c.branch_id===branchId&&c.user_id===snapshot.userId&&c.device_id===device&&!c.closed_at);
 async function saveOrder(order:Order){const epoch=sessionEpoch.current;const previous=snapshot.orders.find(o=>o.id===order.id);const next=await saveLocalOrder(scope,order,snapshot.validatedAt);if(epoch!==sessionEpoch.current)return next;setSnapshot(s=>({...s,orders:[next,...s.orders.filter(o=>o.id!==next.id)],catalog:!demo?s.catalog:s.catalog.map(c=>{if(c.kind!=='product')return c;const before=previous&&!previous.cancelled?previous.lines.filter(l=>l.catalog_id===c.id).reduce((n,l)=>n+l.quantity,0):0;const after=!next.cancelled?next.lines.filter(l=>l.catalog_id===c.id).reduce((n,l)=>n+l.quantity,0):0;return {...c,stock:Number(c.stock)+before-after};})}));await loadOperations();setNotice('Orden guardada en este dispositivo.');setTimeout(()=>void sync(),0);return next;}
 async function action(action:string,data:Record<string,unknown>,targetBranch=branchId){
  const epoch=sessionEpoch.current;
  if(!navigator.onLine)throw new Error('Esta acción requiere conexión a internet.');if(!branch)throw new Error('Selecciona una sede');
  if(!demo){const result=await manage(action,branch.tenant_id,targetBranch,data);if(epoch===sessionEpoch.current)await refresh();return result;}
  const id=String(data.id??crypto.randomUUID());const base={...data,id,tenant_id:branch.tenant_id,branch_id:targetBranch};let s={...snapshot};
  if(action==='worker.save')s={...s,workers:[base as unknown as Snapshot['workers'][number],...s.workers.filter(w=>w.id!==id)]};
  if(action==='catalog.save'){const old=s.catalog.find(c=>c.id===id);s={...s,catalog:[{...base,stock:old?.stock??0} as unknown as Snapshot['catalog'][number],...s.catalog.filter(c=>c.id!==id)]};}
  if(action==='branch.save')s={...s,branches:[base as unknown as Snapshot['branches'][number],...s.branches.filter(b=>b.id!==id)]};
  if(action==='cash.open')s={...s,cash:[{...base,user_id:s.userId,device_id:device,opened_at:new Date().toISOString(),closed_at:null,counted:null,expected:null} as unknown as Snapshot['cash'][number],...s.cash]};
  if(action==='cash.close'){const c=s.cash.find(c=>c.id===id)!;const expected=Number(c.opening)+s.orders.filter(o=>o.cash_session_id===id&&!o.cancelled).reduce((n,o)=>n+o.payments.filter(p=>p.method==='cash').reduce((m,p)=>m+p.amount,0),0)-s.expenses.filter(e=>e.cash_session_id===id&&e.method==='cash').reduce((n,e)=>n+Number(e.amount),0);s={...s,cash:s.cash.map(c=>c.id===id?{...c,expected,counted:Number(data.counted),closed_at:new Date().toISOString()}:c)};}
  if(action==='expense.add')s={...s,expenses:[{...base,created_at:new Date().toISOString()} as unknown as Snapshot['expenses'][number],...s.expenses]};
  if(action==='inventory.move')s={...s,catalog:s.catalog.map(c=>c.id===data.product_id?{...c,stock:Number(c.stock)+Number(data.quantity)}:c),movements:[{...base,created_at:new Date().toISOString()} as unknown as Snapshot['movements'][number],...s.movements]};
  if(action.startsWith('receipt.'))throw new Error('Los enlaces de WhatsApp requieren Supabase. Puedes descargar el PDF de demostración.');
  await local.meta.put({key:`snapshot:${s.userId}`,value:s});setSnapshot(s);return {id};
 }
 async function logout(){sessionEpoch.current++;if(!demo&&configured())await supabase().auth.signOut({scope:'local'});await local.meta.delete('last-authenticated-user');setSnapshot(emptySnapshot());setDemo(false);setOperations([]);setBranchId('');setNotice('Los pendientes siguen conservados para esta cuenta en el dispositivo.');}
 return {snapshot,ready,demo,device,branchId,setBranchId,branch,tenant,membership,manager,scope,cash,online,busy,notice,setNotice,operations,lastSync,load,startDemo,sync,saveOrder,action,logout,refresh,loadOperations,hydrate};
}
