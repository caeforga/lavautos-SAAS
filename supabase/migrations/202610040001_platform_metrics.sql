-- Platform-only subscription ledger and aggregate SaaS metrics.
-- Subscription changes and payments are written atomically by the server role.
create table public.subscription_payments (
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references public.tenants(id),
 amount numeric(14,2) not null check(amount > 0),
 paid_on date not null default ((now() at time zone 'America/Bogota')::date),
 period_until date,
 reference text not null default '' check(length(reference) <= 200),
 recorded_by uuid not null references auth.users(id),
 created_at timestamptz not null default now()
);
create index subscription_payments_paid_on on public.subscription_payments(paid_on desc);
create index subscription_payments_tenant_paid_on on public.subscription_payments(tenant_id, paid_on desc);

alter table public.subscription_payments enable row level security;
create policy subscription_payment_platform_read on public.subscription_payments
 for select to authenticated using(public.is_platform_admin());

create function public.update_platform_subscription(
 p_tenant uuid,
 p_status text,
 p_until date,
 p_amount numeric default null,
 p_paid_on date default null,
 p_reference text default '',
 p_recorded_by uuid default null
) returns void language plpgsql security definer set search_path='' as $$
begin
 if p_status not in ('active','suspended') then raise exception 'Estado de suscripción inválido'; end if;
 if p_recorded_by is null or not exists(select 1 from public.platform_admins where user_id=p_recorded_by) then
  raise exception 'Requiere administrador de plataforma';
 end if;
 if not exists(select 1 from public.tenants where id=p_tenant) then raise exception 'Cliente inexistente'; end if;
 if p_amount is not null and p_amount <= 0 then raise exception 'El cobro debe ser mayor que cero'; end if;
 if length(coalesce(p_reference,'')) > 200 then raise exception 'La referencia admite hasta 200 caracteres'; end if;

 update public.tenants set subscription_status=p_status,subscription_until=p_until where id=p_tenant;
 if p_amount is not null then
  insert into public.subscription_payments(tenant_id,amount,paid_on,period_until,reference,recorded_by)
  values(p_tenant,p_amount,coalesce(p_paid_on,((now() at time zone 'America/Bogota')::date)),p_until,trim(coalesce(p_reference,'')),p_recorded_by);
 end if;
 insert into public.audit_log(tenant_id,user_id,action,entity_id,detail)
 values(p_tenant,p_recorded_by,'subscription.update',p_tenant,jsonb_strip_nulls(jsonb_build_object(
  'status',p_status,'until',p_until,'amount',p_amount,'paid_on',p_paid_on,'reference',nullif(trim(coalesce(p_reference,'')), '')
 )));
end $$;

create function public.platform_dashboard_metrics() returns jsonb language sql stable security definer set search_path='' as $$
 with clock as (
  select ((now() at time zone 'America/Bogota')::date) as today
 ), summary as (
  select
   (select count(*) from public.tenants) as total_clients,
   (select count(*) from public.tenants where subscription_status='active') as active_clients,
   (select count(*) from public.tenants where subscription_status='suspended') as suspended_clients,
   (select count(*) from public.branches) as total_branches,
   (select count(*) from public.branches where active) as active_branches,
   (select count(distinct user_id) from public.memberships) as user_accounts,
   (select count(*) from public.tenants t cross join clock c where t.created_at >= date_trunc('month',c.today)::date) as new_clients_this_month,
   (select count(*) from public.tenants t cross join clock c where t.subscription_status='active' and t.subscription_until between c.today and c.today + 30) as expiring_within_30_days,
   (select count(*) from public.tenants t cross join clock c where t.subscription_status='active' and t.subscription_until is not null and t.subscription_until < c.today) as expired_clients
 ), payments as (
  select
   coalesce(sum(p.amount) filter(where p.paid_on >= date_trunc('month',c.today)::date),0) as collected_this_month,
   coalesce(sum(p.amount) filter(where p.paid_on >= (date_trunc('month',c.today)-interval '1 month')::date and p.paid_on < date_trunc('month',c.today)::date),0) as collected_last_month,
   count(*) filter(where p.paid_on >= date_trunc('month',c.today)::date) as payments_this_month
  from public.subscription_payments p cross join clock c
 )
 select jsonb_build_object(
  'total_clients',summary.total_clients,
  'active_clients',summary.active_clients,
  'suspended_clients',summary.suspended_clients,
  'total_branches',summary.total_branches,
  'active_branches',summary.active_branches,
  'user_accounts',summary.user_accounts,
  'new_clients_this_month',summary.new_clients_this_month,
  'expiring_within_30_days',summary.expiring_within_30_days,
  'expired_clients',summary.expired_clients,
  'collected_this_month',payments.collected_this_month,
  'collected_last_month',payments.collected_last_month,
  'payments_this_month',payments.payments_this_month,
  'recent_payments',coalesce((
   select jsonb_agg(jsonb_build_object(
    'id',recent.id,'tenant_id',recent.tenant_id,'tenant_name',recent.tenant_name,
    'amount',recent.amount,'paid_on',recent.paid_on,'period_until',recent.period_until,'reference',recent.reference
   ) order by recent.paid_on desc,recent.created_at desc)
   from (
    select p.id,p.tenant_id,t.name as tenant_name,p.amount,p.paid_on,p.period_until,p.reference,p.created_at
    from public.subscription_payments p join public.tenants t on t.id=p.tenant_id
    order by p.paid_on desc,p.created_at desc limit 6
   ) recent
  ),'[]'::jsonb)
 ) from summary cross join payments;
$$;

revoke all on public.subscription_payments from anon,authenticated;
grant select on public.subscription_payments to authenticated;
grant all on public.subscription_payments to service_role;
revoke execute on function public.update_platform_subscription(uuid,text,date,numeric,date,text,uuid),public.platform_dashboard_metrics() from public,anon,authenticated;
grant execute on function public.update_platform_subscription(uuid,text,date,numeric,date,text,uuid),public.platform_dashboard_metrics() to service_role;
