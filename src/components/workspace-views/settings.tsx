'use client';
import { Users, Plus, Building2 } from 'lucide-react';
import { serverAction } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import type { Branch } from '@/lib/domain';
import type { WorkspaceViewModel } from './types';

export function SettingsView({ model }: { model: WorkspaceViewModel }) {
  const { w, s, branch, branchId, form, run } = model;
  function branchForm(existing?: Branch) {
    form(existing ? 'Personalizar sede' : 'Nueva sede', [
      { name: 'name', label: 'Nombre en la boleta', value: existing?.name },
      { name: 'code', label: 'Código (2–10 letras o números)', value: existing?.code },
      { name: 'nit', label: 'NIT', value: existing?.nit, required: false },
      { name: 'address', label: 'Dirección', value: existing?.address, required: false },
      { name: 'phone', label: 'Teléfono', value: existing?.phone, required: false },
      { name: 'footer', label: 'Mensaje al pie del ticket', value: existing?.footer ?? 'Gracias por confiar en nosotros.', required: false },
      { name: 'active', label: 'Estado', value: String(existing?.active ?? true), options: [{ value: 'true', label: 'Activa' }, { value: 'false', label: 'Inactiva' }] },
    ], async data => {
      if (!/^[A-Z0-9]{2,10}$/.test(data.code)) throw new Error('Usa 2–10 letras mayúsculas o números');
      await w.action('branch.save', { ...data, id: existing?.id ?? data._request_id, logo: existing?.logo ?? '', active: data.active === 'true' });
    });
  }
  function invite() {
    form('Invitar usuario', [
      { name: 'email', label: 'Correo electrónico', type: 'email' },
      { name: 'role', label: 'Rol', options: [{ value: 'cashier', label: 'Cajero de esta sede' }, { value: 'manager', label: 'Administrador de esta sede' }, { value: 'owner', label: 'Dueño · todas las sedes' }] },
    ], async data => {
      if (w.demo) throw new Error('Las invitaciones requieren configurar Supabase.');
      await serverAction('/api/invitations', { ...data, tenant_id: branch?.tenant_id, branch_id: data.role === 'owner' ? null : branchId });
      w.setNotice('Invitación enviada.');
    });
  }
  async function logo(file: File) {
    if (!branch) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) throw new Error('Usa PNG, JPG o WebP de hasta 2 MB.');
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#fff';
    context.fillRect(0, 0, 256, 256);
    const scale = Math.min(256 / bitmap.width, 256 / bitmap.height);
    context.drawImage(bitmap, (256 - bitmap.width * scale) / 2, (256 - bitmap.height * scale) / 2, bitmap.width * scale, bitmap.height * scale);
    bitmap.close();
    const image = canvas.toDataURL('image/png');
    if (!w.demo) {
      const { error } = await supabase().storage.from('business-assets').upload(`${branch.tenant_id}/${branch.id}/${crypto.randomUUID()}.png`, await (await fetch(image)).blob(), { contentType: 'image/png', upsert: false });
      if (error) throw error;
    }
    await w.action('branch.save', { ...branch, logo: image });
  }
  return <>
<div className="section-toolbar"><p className="muted">Cada sede tiene su propia identidad y boleta.</p><div className="row-actions">{w.membership?.role==='owner'&&<><button onClick={invite}><Users size={16}/> Invitar usuario</button><button className="primary" onClick={()=>branchForm()}><Plus size={16}/> Nueva sede</button></>}</div></div><div className="settings-grid">{s.branches.filter(b=>b.tenant_id===branch?.tenant_id).map(b=><section className="panel branch-card" key={b.id}><div className="branch-icon">{b.logo?<img src={b.logo} alt={b.name}/>:<Building2 size={27}/>}</div><span className="badge neutral">{b.code}</span><h2>{b.name}</h2><p>NIT {b.nit||'sin configurar'}<br/>{b.address||'Dirección pendiente'}<br/>{b.phone}</p><blockquote>{b.footer}</blockquote><div className="row-actions"><button onClick={()=>branchForm(b)}>Personalizar</button>{b.id===branchId&&<label className="file-button">Subir logo<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{const file=e.target.files?.[0];if(file)void run(()=>logo(file));}}/></label>}</div></section>)}</div><section className="panel space-top"><div className="panel-heading"><div><h2>Accesos del negocio</h2><p>Los lavadores se administran en Mi equipo; aquí aparecen usuarios con acceso.</p></div></div><div className="table-scroll"><table><thead><tr><th>Usuario</th><th>Rol</th><th>Sede</th></tr></thead><tbody>{s.memberships.filter(m=>m.tenant_id===branch?.tenant_id).map(m=><tr key={m.id}><td>{m.user_id===s.userId?'Tu cuenta':m.email||'Usuario invitado'}</td><td>{{owner:'Dueño',manager:'Administrador',cashier:'Cajero'}[m.role]}</td><td>{m.branch_id?s.branches.find(b=>b.id===m.branch_id)?.name:'Todas'}</td><td>{w.membership?.role==='owner'&&m.user_id!==s.userId&&<button className="danger" onClick={()=>form('Retirar acceso',[{name:'reason',label:'Motivo'}],async d=>{await w.action('membership.revoke',{id:m.id,reason:d.reason});})}>Retirar acceso</button>}</td></tr>)}</tbody></table></div></section>
  </>;
}
