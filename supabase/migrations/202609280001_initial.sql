-- All business writes go through checked transactional functions. No browser write grants.
create table public.platform_admins (user_id uuid primary key references auth.users(id));
create table public.tenants (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 1 and 160),
 subscription_status text not null default 'active' check(subscription_status in ('active','suspended')), subscription_until date,
 created_at timestamptz not null default now()
);
create table public.branches (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id),
 name text not null, code text not null check(code ~ '^[A-Z0-9]{2,10}$'), nit text not null default '', address text not null default '',
 phone text not null default '', footer text not null default 'Gracias por confiar en nosotros.', logo text not null default '', active boolean not null default true,
 unique(tenant_id,id), unique(tenant_id,code)
);
create table public.memberships (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id), user_id uuid not null references auth.users(id),
 branch_id uuid, email text not null default '', role text not null check(role in ('owner','manager','cashier')),
 foreign key(tenant_id,branch_id) references public.branches(tenant_id,id),
 check((role='owner' and branch_id is null) or (role<>'owner' and branch_id is not null))
);
create unique index memberships_unique on public.memberships(tenant_id,user_id,coalesce(branch_id,'00000000-0000-0000-0000-000000000000'::uuid));
create table public.workers (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, branch_id uuid not null,
 name text not null check(length(name) between 1 and 120), active boolean not null default true,
 foreign key(tenant_id,branch_id) references public.branches(tenant_id,id), unique(tenant_id,branch_id,id)
);
create table public.catalog (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, branch_id uuid not null, name text not null,
 kind text not null check(kind in ('service','product')), vehicle_type text not null default 'Todos',
 price numeric(14,2) not null check(price>=0), stock numeric(14,3) not null default 0, minimum_stock numeric(14,3) not null default 0 check(minimum_stock>=0), active boolean not null default true,
 foreign key(tenant_id,branch_id) references public.branches(tenant_id,id), unique(tenant_id,branch_id,id)
);
create table public.cash_sessions (
 id uuid primary key, tenant_id uuid not null, branch_id uuid not null, user_id uuid not null references auth.users(id), device_id uuid not null,
 opening numeric(14,2) not null check(opening>=0), opened_at timestamptz not null default now(), closed_at timestamptz, counted numeric(14,2), expected numeric(14,2),
 foreign key(tenant_id,branch_id) references public.branches(tenant_id,id), unique(tenant_id,branch_id,id)
);
create unique index cash_one_open on public.cash_sessions(user_id,device_id) where closed_at is null;
create table public.orders (
 id uuid primary key, tenant_id uuid not null, branch_id uuid not null, version integer not null check(version>0), document jsonb not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 foreign key(tenant_id,branch_id) references public.branches(tenant_id,id), unique(tenant_id,branch_id,id)
);
create unique index orders_folio on public.orders(tenant_id,branch_id,(document->>'folio'));
create table public.expenses (
 id uuid primary key, tenant_id uuid not null, branch_id uuid not null, cash_session_id uuid,
 amount numeric(14,2) not null check(amount>0), category text not null, description text not null, method text not null check(method in ('cash','transfer','card')), created_at timestamptz not null default now(),
 foreign key(tenant_id,branch_id) references public.branches(tenant_id,id), foreign key(tenant_id,branch_id,cash_session_id) references public.cash_sessions(tenant_id,branch_id,id),
 check(method<>'cash' or cash_session_id is not null)
);
create table public.inventory_movements (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, branch_id uuid not null, product_id uuid not null,
 quantity numeric(14,3) not null check(quantity<>0), reason text not null check(length(reason)>0), order_id uuid, created_at timestamptz not null default now(),
 foreign key(tenant_id,branch_id,product_id) references public.catalog(tenant_id,branch_id,id), foreign key(tenant_id,branch_id,order_id) references public.orders(tenant_id,branch_id,id)
);
create table public.sync_operations (
 id uuid primary key, tenant_id uuid not null, branch_id uuid not null, user_id uuid not null references auth.users(id),
 order_id uuid not null, request jsonb not null, result jsonb not null, state text not null check(state in ('applied','conflict','rejected','resolved')), created_at timestamptz not null default now(),
 foreign key(tenant_id,branch_id) references public.branches(tenant_id,id)
);
create table public.audit_log (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null, branch_id uuid, user_id uuid, action text not null, entity_id uuid, detail jsonb not null default '{}', created_at timestamptz not null default now(),
 foreign key(tenant_id,branch_id) references public.branches(tenant_id,id)
);
create table public.receipt_links (
 token uuid primary key default gen_random_uuid(), tenant_id uuid not null, branch_id uuid not null, order_id uuid not null, snapshot jsonb not null, revoked_at timestamptz, created_at timestamptz not null default now(),
 foreign key(tenant_id,branch_id,order_id) references public.orders(tenant_id,branch_id,id)
);
create index memberships_user on public.memberships(user_id);
create index orders_scope on public.orders(tenant_id,branch_id,updated_at);
create index sync_scope on public.sync_operations(tenant_id,branch_id,state);

create function public.is_platform_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.platform_admins where user_id=auth.uid());
$$;
create function public.has_access(t uuid,b uuid default null,manage boolean default false) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.memberships m join public.tenants te on te.id=m.tenant_id
 where m.user_id=auth.uid() and m.tenant_id=t and te.subscription_status='active'
 and (m.role='owner' or (b is not null and m.branch_id=b)) and (not manage or m.role in ('owner','manager')));
$$;
create function public.is_owner(t uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.memberships where user_id=auth.uid() and tenant_id=t and role='owner');
$$;

alter table public.platform_admins enable row level security;
alter table public.tenants enable row level security;
alter table public.branches enable row level security;
alter table public.memberships enable row level security;
alter table public.workers enable row level security;
alter table public.catalog enable row level security;
alter table public.cash_sessions enable row level security;
alter table public.orders enable row level security;
alter table public.expenses enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.sync_operations enable row level security;
alter table public.audit_log enable row level security;
alter table public.receipt_links enable row level security;
create policy tenant_read on public.tenants for select to authenticated using(public.is_platform_admin() or exists(select 1 from public.memberships m where m.tenant_id=tenants.id and m.user_id=auth.uid()));
create policy membership_read on public.memberships for select to authenticated using(user_id=auth.uid() or public.is_owner(tenant_id));
create policy branch_read on public.branches for select to authenticated using(public.has_access(tenant_id,id));
create policy worker_read on public.workers for select to authenticated using(public.has_access(tenant_id,branch_id));
create policy catalog_read on public.catalog for select to authenticated using(public.has_access(tenant_id,branch_id));
create policy cash_read on public.cash_sessions for select to authenticated using(public.has_access(tenant_id,branch_id) and (user_id=auth.uid() or public.has_access(tenant_id,branch_id,true)));
create policy order_read on public.orders for select to authenticated using(public.has_access(tenant_id,branch_id));
create policy expense_read on public.expenses for select to authenticated using(public.has_access(tenant_id,branch_id,true));
create policy inventory_read on public.inventory_movements for select to authenticated using(public.has_access(tenant_id,branch_id,true));
create policy sync_read on public.sync_operations for select to authenticated using(public.has_access(tenant_id,branch_id) and (user_id=auth.uid() or public.has_access(tenant_id,branch_id,true)));
create policy audit_read on public.audit_log for select to authenticated using(public.has_access(tenant_id,branch_id,true));
create policy receipt_read on public.receipt_links for select to authenticated using(public.has_access(tenant_id,branch_id));

-- Validate documents again inside the trusted transaction, regardless of client validation.
create function public.validate_order(d jsonb) returns numeric language plpgsql security definer set search_path='' as $$
declare l jsonb; a jsonb; p jsonb; result numeric:=0; paid numeric:=0; pct numeric; t uuid:=(d->>'tenant_id')::uuid; b uuid:=(d->>'branch_id')::uuid;
begin
 if d is null or not (d ?& array['id','tenant_id','branch_id','device_id','folio','plate','vehicle_type','lines','payments','cancelled','created_at','ticket','reason']) or exists(select 1 from jsonb_each(d) e where e.key=any(array['id','tenant_id','branch_id','device_id','folio','plate','vehicle_type','lines','payments','cancelled','created_at','ticket','reason']) and e.value='null'::jsonb) then raise exception 'Orden incompleta'; end if;
 perform (d->>'id')::uuid, (d->>'device_id')::uuid, (d->>'created_at')::timestamptz;
 if length(d->>'plate') not between 3 and 12 or length(d->>'folio') not between 1 and 100 or length(d->>'vehicle_type') not between 1 and 40
 or length(coalesce(d->>'notes',''))>2000 or length(coalesce(d->>'customer_name',''))>120 or length(coalesce(d->>'customer_phone',''))>25
 or jsonb_typeof(d->'cancelled')<>'boolean' or jsonb_typeof(d->'ticket')<>'object'
 or jsonb_typeof(d->'lines')<>'array' or jsonb_array_length(d->'lines') not between 1 and 100
 or jsonb_typeof(d->'payments')<>'array' or jsonb_array_length(d->'payments')>3 then raise exception 'Datos de orden inválidos'; end if;
 if (select count(distinct x->>'id') from jsonb_array_elements(d->'lines') x) <> jsonb_array_length(d->'lines') then raise exception 'Línea repetida'; end if;
 for l in select * from jsonb_array_elements(d->'lines') loop
  if not (l ?& array['id','catalog_id','kind','name','quantity','price','status','allocations']) or exists(select 1 from jsonb_each(l) e where e.value='null'::jsonb) then raise exception 'Línea incompleta'; end if;
  perform (l->>'id')::uuid;
  if not exists(select 1 from public.catalog where id=(l->>'catalog_id')::uuid and tenant_id=t and branch_id=b and kind=l->>'kind') then raise exception 'Producto o servicio fuera de sede'; end if;
  if l->>'status' not in ('pending','working','done') or l->>'kind' not in ('service','product') or length(l->>'name') not between 1 and 160
  or (l->>'quantity')::numeric not between 1 and 1000 or trunc((l->>'quantity')::numeric)<>(l->>'quantity')::numeric
  or (l->>'price')::numeric not between 0 and 999999999 or round((l->>'price')::numeric,2)<>(l->>'price')::numeric
  or jsonb_typeof(l->'allocations')<>'array' then raise exception 'Detalle inválido'; end if;
  result:=result+(l->>'price')::numeric*(l->>'quantity')::numeric;
  pct:=0;
  if (select count(distinct x->>'worker_id') from jsonb_array_elements(l->'allocations') x) <> jsonb_array_length(l->'allocations') then raise exception 'Responsable repetido'; end if;
  for a in select * from jsonb_array_elements(l->'allocations') loop
   if not (a ?& array['worker_id','name','percent']) or exists(select 1 from jsonb_each(a) e where e.value='null'::jsonb) or not exists(select 1 from public.workers where id=(a->>'worker_id')::uuid and tenant_id=t and branch_id=b) then raise exception 'Trabajador fuera de sede'; end if;
   if (a->>'percent')::numeric<=0 or (a->>'percent')::numeric>100 then raise exception 'Porcentaje inválido'; end if;
   pct:=pct+(a->>'percent')::numeric;
  end loop;
  if l->>'kind'='service' and abs(pct-100)>0.001 then raise exception 'Los responsables deben sumar 100 %%'; end if;
 end loop;
 for p in select * from jsonb_array_elements(d->'payments') loop
  if not (p ?& array['method','amount']) or exists(select 1 from jsonb_each(p) e where e.value='null'::jsonb) or p->>'method' not in ('cash','transfer','card') or (p->>'amount')::numeric<=0 or round((p->>'amount')::numeric,2)<>(p->>'amount')::numeric then raise exception 'Pago inválido'; end if;
  paid:=paid+(p->>'amount')::numeric;
 end loop;
 if jsonb_array_length(d->'payments')>0 and (paid<>result or nullif(d->>'cash_session_id','') is null) then raise exception 'El pago debe cubrir el total exacto y tener caja'; end if;
 if jsonb_array_length(d->'payments')>0 then
  if nullif(d->>'paid_at','') is null then raise exception 'Falta la fecha del pago'; end if;
  perform (d->>'paid_at')::timestamptz;
 end if;
 if (d->>'cancelled')::boolean and length(trim(d->>'reason'))=0 then raise exception 'Se requiere motivo'; end if;
 return result;
end $$;

create function public.sync_order(operation_id uuid, base_version integer, payload jsonb, sender_device uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare t uuid:=(payload->>'tenant_id')::uuid; b uuid:=(payload->>'branch_id')::uuid; oid uuid:=(payload->>'id')::uuid;
 old public.orders; prior public.sync_operations; result jsonb; saved jsonb; product record; delta numeric; cash public.cash_sessions; oldcash uuid;
begin
 if auth.uid() is null or not public.has_access(t,b) or not exists(select 1 from public.branches where id=b and tenant_id=t and active) then raise exception 'Sin acceso a esta sede'; end if;
 perform pg_advisory_xact_lock(hashtextextended(operation_id::text,0));
 select * into prior from public.sync_operations where id=operation_id;
 if found then
  if prior.user_id<>auth.uid() or prior.tenant_id<>t or prior.request<>payload then raise exception 'Identificador de operación reutilizado'; end if;
  return prior.result;
 end if;
 perform pg_advisory_xact_lock(hashtextextended(oid::text,1));
 select * into old from public.orders where id=oid for update;
 if found and (old.tenant_id<>t or old.branch_id<>b) then raise exception 'Identificador no disponible'; end if;
 if coalesce(old.version,0)<>base_version then
  result:=jsonb_build_object('state','conflict','order',old.document,'message','La orden cambió en otro dispositivo');
  insert into public.sync_operations values(operation_id,t,b,auth.uid(),oid,payload,result,'conflict',now()); return result;
 end if;
 perform public.validate_order(payload);
 if old.id is not null then
  if old.document->>'folio'<>payload->>'folio' or old.document->>'created_at'<>payload->>'created_at' or old.document->>'device_id'<>payload->>'device_id' or old.document->'ticket'<>payload->'ticket' then raise exception 'Identidad de boleta inmutable'; end if;
  if jsonb_array_length(old.document->'payments')>0 and old.document->>'paid_at' is distinct from payload->>'paid_at' then raise exception 'Fecha de pago inmutable'; end if;
  if (old.document->>'cancelled')::boolean then raise exception 'La orden está anulada'; end if;
  -- Status and assignment updates are allowed after payment; financial edits are administrative.
  if jsonb_array_length(old.document->'payments')>0 and (
    old.document->'payments'<>payload->'payments' or old.document->>'cash_session_id' is distinct from payload->>'cash_session_id'
    or (select jsonb_agg(x - 'status' - 'allocations') from jsonb_array_elements(old.document->'lines') x) is distinct from (select jsonb_agg(x - 'status' - 'allocations') from jsonb_array_elements(payload->'lines') x)
    or (payload->>'cancelled')::boolean
  ) then
   if not public.has_access(t,b,true) or length(trim(payload->>'reason'))=0 then raise exception 'Corrección requiere administrador y motivo'; end if;
  end if;
 end if;
 if (payload->>'cancelled')::boolean and not public.has_access(t,b,true) then raise exception 'Solo un administrador puede anular'; end if;
 -- Lock the register before payment changes, serializing against closing.
 oldcash:=nullif(old.document->>'cash_session_id','')::uuid;
 if oldcash is not null and (old.document->'payments'<>payload->'payments' or (payload->>'cancelled')::boolean) then
  select * into cash from public.cash_sessions where id=oldcash for update;
  if cash.closed_at is not null then raise exception 'Caja cerrada: la corrección requiere conciliación fuera del cierre'; end if;
 end if;
 if jsonb_array_length(payload->'payments')>0 then
  select * into cash from public.cash_sessions where id=(payload->>'cash_session_id')::uuid and tenant_id=t and branch_id=b for update;
  if not found then raise exception 'Caja inválida'; end if;
  if old.id is null or old.document->'payments'<>payload->'payments' then
   if cash.closed_at is not null or ((cash.user_id<>auth.uid() or cash.device_id<>coalesce(sender_device,(payload->>'device_id')::uuid)) and not public.has_access(t,b,true)) then raise exception 'Debes cobrar con tu caja abierta y dispositivo autorizado'; end if;
  end if;
 end if;
 saved:=jsonb_set(payload,'{version}',to_jsonb(base_version+1));
 insert into public.orders(id,tenant_id,branch_id,version,document,created_at) values(oid,t,b,base_version+1,saved,(saved->>'created_at')::timestamptz)
 on conflict(id) do update set version=excluded.version,document=excluded.document,updated_at=now();
 if old.id is not null and ((payload->>'cancelled')::boolean or old.document->'payments'<>payload->'payments' or (select jsonb_agg(x-'status'-'allocations') from jsonb_array_elements(old.document->'lines') x) is distinct from (select jsonb_agg(x-'status'-'allocations') from jsonb_array_elements(payload->'lines') x)) then
  update public.receipt_links set revoked_at=now() where order_id=oid and revoked_at is null;
 end if;
 for product in select id from public.catalog where tenant_id=t and branch_id=b and kind='product' and (id::text in (select x->>'catalog_id' from jsonb_array_elements(payload->'lines') x) or id::text in (select x->>'catalog_id' from jsonb_array_elements(coalesce(old.document->'lines','[]')) x)) order by id for update loop
  select coalesce(sum((x->>'quantity')::numeric),0) into delta from jsonb_array_elements(coalesce(old.document->'lines','[]')) x where x->>'catalog_id'=product.id::text and not coalesce((old.document->>'cancelled')::boolean,false);
  delta:=delta-(select coalesce(sum((x->>'quantity')::numeric),0) from jsonb_array_elements(payload->'lines') x where x->>'catalog_id'=product.id::text and not (payload->>'cancelled')::boolean);
  if delta<>0 then
   update public.catalog set stock=stock+delta where id=product.id;
   insert into public.inventory_movements(tenant_id,branch_id,product_id,quantity,reason,order_id) values(t,b,product.id,delta,'Orden '||(payload->>'folio'),oid);
  end if;
 end loop;
 insert into public.audit_log(tenant_id,branch_id,user_id,action,entity_id,detail) values(t,b,auth.uid(),'order.sync',oid,jsonb_build_object('reason',payload->>'reason','before',old.document,'after',saved));
 result:=jsonb_build_object('state','applied','order',saved);
 insert into public.sync_operations values(operation_id,t,b,auth.uid(),oid,payload,result,'applied',now());
 return result;
end $$;

create function public.manage_record(action text, tenant uuid, branch uuid, data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare rid uuid:=coalesce(nullif(data->>'id','')::uuid,gen_random_uuid()); c public.cash_sessions; cash_expected numeric; token uuid; result jsonb; item public.catalog;
begin
 if auth.uid() is null or not public.has_access(tenant,branch) then raise exception 'Sin acceso'; end if;
 if action not in ('cash.open','cash.close','receipt.create','receipt.revoke') and not public.has_access(tenant,branch,true) then raise exception 'Requiere administrador'; end if;
 case action
 when 'branch.save' then
  if not public.is_owner(tenant) and (rid<>branch or not public.has_access(tenant,rid,true)) then raise exception 'Requiere dueño'; end if;
  if exists(select 1 from public.branches where id=rid and tenant_id<>tenant) then raise exception 'Sede inválida'; end if;
  insert into public.branches(id,tenant_id,name,code,nit,address,phone,footer,logo,active)
  values(rid,tenant,data->>'name',data->>'code',coalesce(data->>'nit',''),coalesce(data->>'address',''),coalesce(data->>'phone',''),coalesce(data->>'footer',''),coalesce(data->>'logo',''),coalesce((data->>'active')::boolean,true))
  on conflict(id) do update set name=excluded.name,nit=excluded.nit,address=excluded.address,phone=excluded.phone,footer=excluded.footer,logo=excluded.logo,active=excluded.active;
 when 'worker.save' then
  if exists(select 1 from public.workers where id=rid and (tenant_id<>tenant or branch_id<>branch)) then raise exception 'Trabajador inválido'; end if;
  insert into public.workers(id,tenant_id,branch_id,name,active) values(rid,tenant,branch,data->>'name',coalesce((data->>'active')::boolean,true)) on conflict(id) do update set name=excluded.name,active=excluded.active;
 when 'membership.revoke' then
  if not public.is_owner(tenant) then raise exception 'Solo el dueño puede retirar accesos'; end if;
  if exists(select 1 from public.memberships where id=rid and user_id=auth.uid()) then raise exception 'No puedes retirar tu propio acceso'; end if;
  delete from public.memberships where id=rid and tenant_id=tenant;
 when 'catalog.save' then
  if exists(select 1 from public.catalog where id=rid and (tenant_id<>tenant or branch_id<>branch or kind<>data->>'kind')) then raise exception 'Producto inválido'; end if;
  insert into public.catalog(id,tenant_id,branch_id,name,kind,vehicle_type,price,minimum_stock,active) values(rid,tenant,branch,data->>'name',data->>'kind',coalesce(data->>'vehicle_type','Todos'),(data->>'price')::numeric,coalesce((data->>'minimum_stock')::numeric,0),coalesce((data->>'active')::boolean,true))
  on conflict(id) do update set name=excluded.name,vehicle_type=excluded.vehicle_type,price=excluded.price,minimum_stock=excluded.minimum_stock,active=excluded.active;
 when 'inventory.move' then
  if exists(select 1 from public.inventory_movements where id=rid and tenant_id=tenant and branch_id=branch) then return jsonb_build_object('id',rid); end if;
  select * into item from public.catalog where id=(data->>'product_id')::uuid and tenant_id=tenant and branch_id=branch and kind='product' for update;
  if not found then raise exception 'Producto inválido'; end if;
  insert into public.inventory_movements(id,tenant_id,branch_id,product_id,quantity,reason) values(rid,tenant,branch,item.id,(data->>'quantity')::numeric,data->>'reason');
  update public.catalog set stock=stock+(data->>'quantity')::numeric where id=item.id;
 when 'expense.add' then
  if exists(select 1 from public.expenses where id=rid and tenant_id=tenant and branch_id=branch) then return jsonb_build_object('id',rid); end if;
  if data->>'method'='cash' then
   select * into c from public.cash_sessions where id=(data->>'cash_session_id')::uuid and tenant_id=tenant and branch_id=branch and user_id=auth.uid() for update;
   if not found or c.closed_at is not null then raise exception 'Abre tu caja para gastos en efectivo'; end if;
  end if;
  insert into public.expenses(id,tenant_id,branch_id,cash_session_id,amount,category,description,method) values(rid,tenant,branch,nullif(data->>'cash_session_id','')::uuid,(data->>'amount')::numeric,data->>'category',data->>'description',data->>'method');
 when 'cash.open' then
  if exists(select 1 from public.cash_sessions where id=rid and tenant_id=tenant and branch_id=branch and user_id=auth.uid()) then return jsonb_build_object('id',rid); end if;
  insert into public.cash_sessions(id,tenant_id,branch_id,user_id,device_id,opening) values(rid,tenant,branch,auth.uid(),(data->>'device_id')::uuid,(data->>'opening')::numeric);
 when 'cash.close' then
  select * into c from public.cash_sessions where id=rid and tenant_id=tenant and branch_id=branch and user_id=auth.uid() for update;
  if not found then raise exception 'Caja inválida'; end if;
  if c.closed_at is not null then return to_jsonb(c); end if;
  if (data->>'counted')::numeric<0 then raise exception 'Conteo inválido'; end if;
  select c.opening+coalesce(sum((p->>'amount')::numeric),0) into cash_expected from public.orders o cross join lateral jsonb_array_elements(o.document->'payments') p
  where o.tenant_id=tenant and o.branch_id=branch and o.document->>'cash_session_id'=rid::text and not (o.document->>'cancelled')::boolean and p->>'method'='cash';
  cash_expected:=cash_expected-(select coalesce(sum(amount),0) from public.expenses where cash_session_id=rid and method='cash');
  update public.cash_sessions set closed_at=now(),expected=cash_expected,counted=(data->>'counted')::numeric where id=rid;
 when 'receipt.create' then
  select document into result from public.orders where id=(data->>'order_id')::uuid and tenant_id=tenant and branch_id=branch;
  if not found then raise exception 'Sincroniza la orden antes de compartir'; end if;
  token:=gen_random_uuid();
  insert into public.receipt_links(token,tenant_id,branch_id,order_id,snapshot) values(token,tenant,branch,(data->>'order_id')::uuid,result - 'customer_phone' - 'notes' - 'reason');
  return jsonb_build_object('token',token);
 when 'receipt.revoke' then
  update public.receipt_links set revoked_at=now() where tenant_id=tenant and branch_id=branch and order_id=(data->>'order_id')::uuid;
 when 'conflict.dismiss' then
  if length(trim(coalesce(data->>'reason','')))=0 then raise exception 'Indica motivo de resolución'; end if;
  update public.sync_operations set state='resolved' where id=rid and tenant_id=tenant and branch_id=branch and state in ('conflict','rejected');
 else raise exception 'Acción desconocida';
 end case;
 insert into public.audit_log(tenant_id,branch_id,user_id,action,entity_id,detail) values(tenant,branch,auth.uid(),action,rid,data);
 return jsonb_build_object('id',rid);
end $$;

-- Provisioning is one transaction, callable only by the server service role.
create function public.provision_tenant(tenant_name text,branch_name text,owner_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare t uuid;
begin
 insert into public.tenants(name) values(tenant_name) returning id into t;
 insert into public.branches(tenant_id,name,code) values(t,branch_name,'SEDE01');
 insert into public.memberships(tenant_id,user_id,email,role) values(t,owner_id,coalesce((select email from auth.users where id=owner_id),''),'owner'); return t;
end $$;

revoke all on all tables in schema public from anon, authenticated;
grant select on public.tenants,public.memberships,public.branches,public.workers,public.catalog,public.cash_sessions,public.orders,public.expenses,public.inventory_movements,public.sync_operations,public.audit_log,public.receipt_links to authenticated;
grant all on public.platform_admins,public.tenants,public.memberships,public.branches,public.workers,public.catalog,public.cash_sessions,public.orders,public.expenses,public.inventory_movements,public.sync_operations,public.audit_log,public.receipt_links to service_role;
revoke execute on all functions in schema public from public,anon,authenticated;
grant execute on function public.is_platform_admin(),public.has_access(uuid,uuid,boolean),public.is_owner(uuid),public.sync_order(uuid,integer,jsonb,uuid),public.manage_record(text,uuid,uuid,jsonb) to authenticated;
grant execute on function public.provision_tenant(text,text,uuid) to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('business-assets','business-assets',false,2097152,array['image/png','image/jpeg','image/webp','application/pdf']);
create policy asset_read on storage.objects for select to authenticated using(bucket_id='business-assets' and public.has_access(((storage.foldername(name))[1])::uuid,((storage.foldername(name))[2])::uuid));
create policy asset_insert on storage.objects for insert to authenticated with check(bucket_id='business-assets' and public.has_access(((storage.foldername(name))[1])::uuid,((storage.foldername(name))[2])::uuid,true));
-- Immutable asset paths preserve historical receipt logos. Upload replacements to new paths.
