'use client';
import { useEffect,useState } from 'react';
import { supabase } from '@/lib/supabase';
export default function Callback() {
  const [password,setPassword]=useState(''),[message,setMessage]=useState('Validando el enlace…'),[ready,setReady]=useState(false);
  useEffect(()=>{void supabase().auth.getSession().then(({data})=>{setReady(Boolean(data.session));setMessage(data.session?'Define tu contraseña para continuar.':'Enlace inválido o vencido. Solicita uno nuevo.');});const {data}=supabase().auth.onAuthStateChange((_event,session)=>{if(session){setReady(true);setMessage('Define tu contraseña para continuar.');}});return()=>data.subscription.unsubscribe();},[]);
  return <main className="auth-page"><form className="auth-card" onSubmit={async e=>{e.preventDefault();const {error}=await supabase().auth.updateUser({password});if(error)setMessage(error.message);else window.location.assign('/');}}><div className="brand-mark">b.</div><h1>Bienvenido a bordo</h1><p>{message}</p>{ready&&<><label>Nueva contraseña<input type="password" minLength={12} required value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password"/></label><button className="primary">Guardar y continuar</button></>}<a href="/">Volver al inicio</a></form></main>;
}
