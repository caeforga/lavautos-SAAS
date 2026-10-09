'use client';
import { useEffect, useState } from 'react';
import { LayoutDashboard, Users, Wallet, Building2 } from 'lucide-react';
import { cop } from '@/lib/domain';
import { serverAction } from '@/lib/api';
import { Empty } from '../ui';
import { Metric } from './metric';
import type { PlatformMetrics, WorkspaceViewModel } from './types';

export function PlatformView({ model }: { model: WorkspaceViewModel }) {
  const { w, s } = model;
  const [platformMetrics, setPlatformMetrics] = useState<PlatformMetrics | null>(null);
  const [platformMetricsError, setPlatformMetricsError] = useState('');
  useEffect(() => {
    if (w.demo) return;
    let current = true;
    setPlatformMetricsError('');
    void serverAction('/api/platform', { action: 'metrics' })
      .then(data => { if (current) setPlatformMetrics(data as PlatformMetrics); })
      .catch(error => { if (current) setPlatformMetricsError(error instanceof Error ? error.message : 'No se pudieron cargar las métricas de plataforma.'); });
    return () => { current = false; };
  }, [w.demo, s.tenants, s.branches, s.memberships]);
  return <>
{platformMetricsError&&<p className="error">{platformMetricsError}</p>}{platformMetrics?<><div className="metric-grid"><Metric label="Ingresos del mes" value={cop(Number(platformMetrics.collected_this_month))} detail={`${platformMetrics.payments_this_month} cobros registrados`} icon={<Wallet size={19}/>} accent/><Metric label="Clientes activos" value={`${platformMetrics.active_clients}/${platformMetrics.total_clients}`} detail={`${platformMetrics.suspended_clients} suspendidos`} icon={<Building2 size={19}/>}/><Metric label="Sedes activas" value={`${platformMetrics.active_branches}/${platformMetrics.total_branches}`} detail={`${platformMetrics.new_clients_this_month} clientes nuevos este mes`} icon={<LayoutDashboard size={19}/>}/><Metric label="Cuentas con acceso" value={String(platformMetrics.user_accounts)} detail={`${platformMetrics.expiring_within_30_days} planes vencen en 30 días`} icon={<Users size={19}/>}/></div><div className="overview-grid"><section className="panel"><div className="panel-heading"><div><h2>Recaudo de suscripciones</h2><p>Comparación con el mes anterior.</p></div><strong>{cop(Number(platformMetrics.collected_last_month))}</strong></div><div className="chart-footer"><span><i/> Mes actual</span><strong>{cop(Number(platformMetrics.collected_this_month))}</strong></div></section><section className="panel"><div className="panel-heading"><div><h2>Atención de planes</h2><p>Seguimiento de la cartera manual.</p></div></div><div className="team-row"><div><strong>{platformMetrics.expiring_within_30_days} por vencer</strong><small>Suscripciones activas en los próximos 30 días</small></div></div><div className="team-row"><div><strong>{platformMetrics.expired_clients} vencidas</strong><small>Clientes activos con fecha ya superada</small></div></div></section></div><section className="panel"><div className="panel-heading"><div><h2>Últimos cobros</h2><p>Registro manual de planes recibidos.</p></div></div>{platformMetrics.recent_payments.length?<div className="table-scroll"><table><thead><tr><th>Cliente</th><th>Fecha</th><th>Vigencia hasta</th><th>Referencia</th><th>Valor</th></tr></thead><tbody>{platformMetrics.recent_payments.map(payment=><tr key={payment.id}><td><strong>{payment.tenant_name}</strong></td><td>{payment.paid_on}</td><td>{payment.period_until??'Sin fecha'}</td><td>{payment.reference||'—'}</td><td className="money">{cop(Number(payment.amount))}</td></tr>)}</tbody></table></div>:<Empty title="Aún no hay cobros registrados" detail="Al actualizar una suscripción puedes guardar el valor, fecha y referencia del pago."/>}</section></>:<section className="panel"><div className="empty"><span className="spin">◌</span><p>Cargando métricas de la plataforma…</p></div></section>}
  </>;
}
