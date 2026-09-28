'use client';
import { useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { cop,total,type ReceiptData } from '@/lib/domain';
import { downloadReceipt } from '@/lib/receipt';
export function Receipt({order}:{order:ReceiptData}) {
  const [width,setWidth]=useState<58|80>(80);
  return <div className="receipt-wrap"><div className="receipt-actions no-print"><select aria-label="Ancho de boleta" value={width} onChange={e=>setWidth(Number(e.target.value) as 58|80)}><option value={80}>80 mm</option><option value={58}>58 mm</option></select><button onClick={()=>window.print()}><Printer size={16}/> Imprimir</button><button onClick={()=>void downloadReceipt(order,width)}><Download size={16}/> PDF</button></div>
    <article className="receipt-paper" style={{width:`${width}mm`}}>
      {order.ticket.logo.startsWith('data:image/')&&<img src={order.ticket.logo} alt="Logo del lavadero" className="receipt-logo"/>}
      <h2>{order.ticket.name}</h2><p>NIT {order.ticket.nit}<br/>{order.ticket.address}<br/>{order.ticket.phone}</p><hr/>
      <strong>COMPROBANTE DE SERVICIO</strong><p>{order.folio}<br/>{new Date(order.created_at).toLocaleString('es-CO',{timeZone:'America/Bogota'})}</p>
      <h3>{order.plate}</h3><p>{order.vehicle_type}{order.customer_name&&` · ${order.customer_name}`}</p><hr/>
      {order.lines.map((l,i)=><section key={i}><div className="receipt-row"><span>{l.quantity} × {l.name}</span><b>{cop(l.price*l.quantity)}</b></div>{l.allocations.map((a,j)=><small key={j}>{a.name} · {a.percent}%<br/></small>)}</section>)}
      <hr/><div className="receipt-row"><strong>TOTAL</strong><strong>{cop(total(order))}</strong></div><p><b>{order.cancelled?'ANULADA':order.payments.length?'PAGADO':'PENDIENTE DE PAGO'}</b></p>
      {order.payments.map((p,i)=><div className="receipt-row" key={i}><span>{{cash:'Efectivo',transfer:'Transferencia',card:'Datáfono'}[p.method]}</span><span>{cop(p.amount)}</span></div>)}
      <hr/><p>{order.ticket.footer}</p><small>No es factura electrónica.</small>
    </article></div>;
}
