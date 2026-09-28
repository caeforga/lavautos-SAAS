'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { X, LoaderCircle } from 'lucide-react';
export function Modal({title,children,onClose,wide=false}:{title:string;children:ReactNode;onClose:()=>void;wide?:boolean}) {
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{ref.current?.showModal();return()=>ref.current?.close();},[]);
 return <dialog ref={ref} className={wide?'modal wide':'modal'} onCancel={onClose}><header><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Cerrar"><X size={20}/></button></header>{children}</dialog>;
}
export function Field({label,children}:{label:string;children:ReactNode}){return <label className="field"><span>{label}</span>{children}</label>;}
export type FieldSpec={name:string;label:string;type?:string;value?:string|number;options?:{value:string;label:string}[];required?:boolean;min?:number;step?:string};
export function RecordForm({fields,onSubmit,submit='Guardar'}:{fields:FieldSpec[];onSubmit:(data:Record<string,string>)=>Promise<void>;submit?:string}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const [requestId]=useState(()=>crypto.randomUUID());
 return <form className="record-form" onSubmit={async e=>{e.preventDefault();const data={...Object.fromEntries(new FormData(e.currentTarget)),_request_id:requestId} as Record<string,string>;setBusy(true);setError('');try{await onSubmit(data);}catch(err){setError(err instanceof Error?err.message:'No se pudo guardar');}finally{setBusy(false);}}}>
 {fields.map(f=><Field key={f.name} label={f.label}>{f.options?<select name={f.name} defaultValue={f.value} required={f.required!==false}>{f.options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>:f.type==='textarea'?<textarea name={f.name} defaultValue={f.value} required={f.required!==false}/>:<input name={f.name} type={f.type??'text'} defaultValue={f.value} required={f.required!==false} min={f.min} step={f.step??(f.type==='number'?'0.01':undefined)}/>}</Field>)}
 {error&&<p className="error" role="alert">{error}</p>}<button className="primary" disabled={busy}>{busy?<LoaderCircle className="spin" size={17}/>:null}{submit}</button></form>;
}
export function Empty({title,detail}:{title:string;detail:string}){return <div className="empty"><span>✧</span><h3>{title}</h3><p>{detail}</p></div>;}
