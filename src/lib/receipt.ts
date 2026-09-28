import { jsPDF } from 'jspdf';
import { cop, total, type ReceiptData } from './domain';
export async function downloadReceipt(order: ReceiptData, width: 58 | 80 = 80) {
  const lines = [order.ticket.name, `NIT ${order.ticket.nit}`, order.ticket.address, order.ticket.phone, '', 'COMPROBANTE DE SERVICIO', order.folio,
    new Date(order.created_at).toLocaleString('es-CO', { timeZone: 'America/Bogota' }), `Placa: ${order.plate} · ${order.vehicle_type}`, order.customer_name,
    ...order.lines.flatMap(l => [`${l.quantity} × ${l.name}`, cop(l.price*l.quantity), ...l.allocations.map(a => `${a.name} (${a.percent}%)`)]), '', `TOTAL: ${cop(total(order))}`, order.cancelled ? 'ANULADA' : order.payments.length ? 'PAGADO' : 'PENDIENTE DE PAGO',
    ...order.payments.map(p => `${({cash:'Efectivo',transfer:'Transferencia',card:'Datáfono'})[p.method]}: ${cop(p.amount)}`), '', order.ticket.footer, 'No es factura electrónica.' ];
  const scratch = new jsPDF({ unit:'mm', format:[width,300] }); scratch.setFontSize(9);
  const wrapped = lines.flatMap(l => scratch.splitTextToSize(l || ' ', width-10) as string[]);
  const doc = new jsPDF({ unit:'mm', format:[width, Math.max(110,wrapped.length*4.5+30)] });
  doc.setFontSize(9); let y=8;
  if (order.ticket.logo.startsWith('data:image/')) { try { doc.addImage(order.ticket.logo,'PNG',width/2-8,y,16,16); y+=20; } catch { /* Text identity remains on receipt if a legacy logo cannot be decoded. */ } }
  for (const line of wrapped) { doc.text(line,5,y); y+=4.5; }
  doc.save(`${order.folio}.pdf`);
}
export function downloadText(name: string, content: string, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type })); const a = document.createElement('a'); a.href=url; a.download=name; a.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
}
