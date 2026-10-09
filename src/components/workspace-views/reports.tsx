'use client';
import { CarFront, Wallet, ChartNoAxesCombined, Download, ReceiptText, TriangleAlert } from 'lucide-react';
import { cop, productivity, csv, day, status, total } from '@/lib/domain';
import { downloadText } from '@/lib/receipt';
import { Field, DatePicker } from '../ui';
import { Metric } from './metric';
import type { WorkspaceViewModel } from './types';

export function ReportsView({ model }: { model: WorkspaceViewModel }) {
  const { s, branch, from, setFrom, to, setTo, reportBranch, setReportBranch, reportWorker, setReportWorker, reportService, setReportService, reportMethod, setReportMethod, reportOrders, reportLive, reportSales, reportPaid, expenseTotal } = model;
  function exportReport() {
    downloadText(`reporte-${from}-${to}.csv`, csv([
      ['Boleta', 'Fecha Colombia', 'Sede', 'Placa', 'Estado', 'Venta COP', 'Cobrado COP'],
      ...reportOrders.map(order => [
        order.folio, day(order.created_at), s.branches.find(branch => branch.id === order.branch_id)?.name ?? '',
        order.plate, status(order), order.cancelled ? 0 : total(order),
        order.cancelled ? 0 : order.payments.reduce((sum, payment) => sum + payment.amount, 0),
      ]),
    ]));
  }
  return <>
   <div className="report-filters"><div className="field"><span>Desde</span><DatePicker label="Desde" value={from} onChange={next=>{setFrom(next);if(to<next)setTo(next);}} /></div><div className="field"><span>Hasta</span><DatePicker label="Hasta" value={to} min={from} onChange={setTo} /></div><Field label="Sede"><select value={reportBranch} onChange={e=>setReportBranch(e.target.value)}><option value="all">Todas las sedes</option>{s.branches.filter(b=>b.tenant_id===branch?.tenant_id).map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></Field><Field label="Trabajador"><select value={reportWorker} onChange={e=>setReportWorker(e.target.value)}><option value="all">Todo el equipo</option>{s.workers.filter(x=>x.tenant_id===branch?.tenant_id).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></Field><Field label="Servicio"><select value={reportService} onChange={e=>setReportService(e.target.value)}><option value="all">Todos</option>{s.catalog.filter(x=>x.tenant_id===branch?.tenant_id&&x.kind==='service').map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></Field><Field label="Medio de pago"><select value={reportMethod} onChange={e=>setReportMethod(e.target.value)}><option value="all">Todos</option><option value="cash">Efectivo</option><option value="transfer">Transferencia</option><option value="card">Datáfono</option></select></Field></div>
   <div className="warning subtle"><TriangleAlert size={16}/> Los dispositivos desconectados pueden tener registros pendientes. Los filtros seleccionan órdenes completas; los gastos se filtran solo por sede y fecha.</div><div className="metric-grid"><Metric label="Ventas" value={cop(reportSales)} detail={`${reportLive.length} órdenes sin anular`} icon={<CarFront size={18}/>}/><Metric label="Cobros" value={cop(reportPaid)} detail="Por fecha del pago" icon={<Wallet size={18}/>}/><Metric label="Gastos" value={cop(expenseTotal)} detail="Sedes y fechas seleccionadas" icon={<ReceiptText size={18}/>}/><Metric label="Flujo neto" value={cop(reportPaid-expenseTotal)} detail="Cobros menos gastos · no es utilidad" icon={<ChartNoAxesCombined size={18}/>} accent/></div><div className="section-toolbar"><p className="muted">Ticket promedio: <strong>{cop(reportLive.length?reportSales/reportLive.length:0)}</strong></p><button onClick={exportReport}><Download size={16}/> Exportar órdenes CSV</button></div>
   <section className="panel"><div className="panel-heading"><div><h2>Productividad del equipo</h2><p>Servicios terminados, ponderados por participación. No liquida comisiones.</p></div><button onClick={()=>downloadText('productividad.csv',csv([['Trabajador','Servicios atribuidos','Valor atribuido COP'],...productivity(reportOrders).map(p=>[p.name,p.services,p.value])]))}><Download size={16}/> CSV</button></div><div className="table-scroll"><table><thead><tr><th>Trabajador</th><th>Servicios atribuidos</th><th>Valor atribuido</th><th>Participación</th></tr></thead><tbody>{productivity(reportOrders).map((p,i)=><tr key={i}><td><strong>{p.name}</strong></td><td>{p.services.toFixed(2)}</td><td>{cop(p.value)}</td><td><div className="progress-track"><div style={{width:`${Math.min(100,reportSales?p.value/reportSales*100:0)}%`}}/></div></td></tr>)}</tbody></table></div></section>
  </>;
}
