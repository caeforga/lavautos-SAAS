-- A tenant owns its customer directory; a plate identifies one vehicle within it.
create table public.business_customers (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id),
 name text not null check(length(trim(name)) between 1 and 120),
 phone text not null default '' check(length(phone)<=25),
 notes text not null default '' check(length(notes)<=1000),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(tenant_id,id)
);
create index business_customers_tenant on public.business_customers(tenant_id,name);
create table public.customer_vehicles (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id),
 customer_id uuid, plate text not null check(length(trim(plate)) between 3 and 12),
 plate_key text not null check(plate_key ~ '^[A-Z0-9]{3,12}$'),
 vehicle_type text not null check(length(vehicle_type) between 1 and 40),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 foreign key(tenant_id,customer_id) references public.business_customers(tenant_id,id),
 unique(tenant_id,plate_key)
);
create index customer_vehicles_owner on public.customer_vehicles(tenant_id,customer_id);
alter table public.business_customers enable row level security;
alter table public.customer_vehicles enable row level security;
create function public.has_customer_access(t uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.memberships m join public.tenants te on te.id=m.tenant_id
 where m.user_id=auth.uid() and m.tenant_id=t and te.subscription_status='active');
$$;
revoke execute on function public.has_customer_access(uuid) from public,anon,authenticated;
grant execute on function public.has_customer_access(uuid) to authenticated;
create policy business_customer_read on public.business_customers for select to authenticated
 using(public.has_customer_access(tenant_id));
create policy customer_vehicle_read on public.customer_vehicles for select to authenticated
 using(public.has_customer_access(tenant_id));
grant select on public.business_customers,public.customer_vehicles to authenticated;
grant all on public.business_customers,public.customer_vehicles to service_role;

-- Direct browser writes remain forbidden. Profiles are edited through this checked RPC.
create function public.save_business_customer(tenant uuid, branch uuid, data jsonb)
 returns jsonb language plpgsql security definer set search_path='' as $$
declare rid uuid:=coalesce(nullif(data->>'id','')::uuid,gen_random_uuid()); n text:=trim(coalesce(data->>'name',''));
begin
 if auth.uid() is null or not public.has_access(tenant,branch,true) then raise exception 'Requiere administrador'; end if;
 if length(n) not between 1 and 120 or length(coalesce(data->>'phone',''))>25 or length(coalesce(data->>'notes',''))>1000 then raise exception 'Datos de cliente inválidos'; end if;
 if exists(select 1 from public.business_customers where id=rid and tenant_id<>tenant) then raise exception 'Cliente fuera del negocio'; end if;
 insert into public.business_customers(id,tenant_id,name,phone,notes)
 values(rid,tenant,n,coalesce(data->>'phone',''),coalesce(data->>'notes',''))
 on conflict(id) do update set name=excluded.name,phone=excluded.phone,notes=excluded.notes,updated_at=now();
 insert into public.audit_log(tenant_id,branch_id,user_id,action,entity_id,detail)
 values(tenant,branch,auth.uid(),'business_customer.save',rid,jsonb_build_object('name',n));
 return jsonb_build_object('id',rid);
end $$;
revoke execute on function public.save_business_customer(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.save_business_customer(uuid,uuid,jsonb) to authenticated;

-- Runs inside sync_order's transaction, so a rejected plate/owner association cannot post a payment.
create function public.register_order_vehicle() returns trigger language plpgsql security definer set search_path='' as $$
declare key text:=upper(regexp_replace(coalesce(new.document->>'plate',''),'[^A-Za-z0-9]','','g'));
 requested uuid:=nullif(new.document->>'customer_id','')::uuid;
 linked uuid; contact_name text:=trim(coalesce(new.document->>'customer_name',''));
 contact_phone text:=coalesce(new.document->>'customer_phone','');
begin
 if length(key) not between 3 and 12 then raise exception 'Placa inválida'; end if;
 select customer_id into linked from public.customer_vehicles where tenant_id=new.tenant_id and plate_key=key for update;
 if linked is not null and requested is not null and linked<>requested then raise exception 'La placa pertenece a otro cliente; requiere conciliación'; end if;
 requested:=coalesce(requested,linked);
 if requested is null and contact_name<>'' then requested:=gen_random_uuid(); end if;
 if requested is not null then
  if exists(select 1 from public.business_customers where id=requested and tenant_id<>new.tenant_id) then raise exception 'Cliente fuera del negocio'; end if;
  if not exists(select 1 from public.business_customers where id=requested and tenant_id=new.tenant_id) then
   if contact_name='' then raise exception 'Indica el nombre del cliente'; end if;
   insert into public.business_customers(id,tenant_id,name,phone) values(requested,new.tenant_id,contact_name,contact_phone);
  end if;
 end if;
 insert into public.customer_vehicles(tenant_id,customer_id,plate,plate_key,vehicle_type)
 values(new.tenant_id,requested,upper(trim(new.document->>'plate')),key,new.document->>'vehicle_type')
 on conflict(tenant_id,plate_key) do update set
  customer_id=coalesce(public.customer_vehicles.customer_id,excluded.customer_id),
  vehicle_type=excluded.vehicle_type,updated_at=now()
 where public.customer_vehicles.customer_id is null or excluded.customer_id is null or public.customer_vehicles.customer_id=excluded.customer_id
 returning customer_id into linked;
 if not found then raise exception 'La placa pertenece a otro cliente; requiere conciliación'; end if;
 if linked is not null then new.document:=jsonb_set(new.document,'{customer_id}',to_jsonb(linked),true); end if;
 return new;
end $$;
revoke execute on function public.register_order_vehicle() from public,anon,authenticated;
create trigger orders_register_vehicle before insert or update of document on public.orders
 for each row execute function public.register_order_vehicle();

-- Newest historical visit determines the initial owner; receipt names remain untouched.
do $$ declare item record; begin
 for item in select id from public.orders order by created_at desc loop
  update public.orders set document=document where id=item.id;
 end loop;
end $$;
