-- Explicit administrator reconciliation: retain server or apply reviewed local data.
create function public.resolve_conflict(operation_id uuid, decision text, reason text, resolution_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare op public.sync_operations; latest public.orders; payload jsonb; result jsonb; payment_device uuid;
begin
 select * into op from public.sync_operations where id=operation_id for update;
 if not found or not public.has_access(op.tenant_id,op.branch_id,true) then raise exception 'Conflicto no disponible'; end if;
 if length(trim(reason))=0 then raise exception 'Explica la conciliación'; end if;
 if op.state='resolved' then return jsonb_build_object('state','resolved'); end if;
 if op.state not in ('conflict','rejected') then raise exception 'La operación no requiere revisión'; end if;
 select * into latest from public.orders where id=op.order_id for update;
 if decision='local' then
  payload:=op.request;
  if latest.id is not null then
   payload:=payload || jsonb_build_object('folio',latest.document->'folio','created_at',latest.document->'created_at','device_id',latest.document->'device_id','ticket',latest.document->'ticket');
  end if;
  payload:=payload || jsonb_build_object('version',coalesce(latest.version,0),'reason',reason);
  select device_id into payment_device from public.cash_sessions where id=nullif(payload->>'cash_session_id','')::uuid;
  result:=public.sync_order(resolution_id,coalesce(latest.version,0),payload,payment_device);
 elsif decision='server' then result:=jsonb_build_object('state','applied','order',latest.document);
 else raise exception 'Decisión inválida'; end if;
 update public.sync_operations set state='resolved' where id=operation_id;
 insert into public.audit_log(tenant_id,branch_id,user_id,action,entity_id,detail) values(op.tenant_id,op.branch_id,auth.uid(),'conflict.resolve',op.order_id,jsonb_build_object('decision',decision,'reason',reason,'operation_id',operation_id));
 return result;
end $$;
revoke all on function public.resolve_conflict(uuid,text,text,uuid) from public,anon;
grant execute on function public.resolve_conflict(uuid,text,text,uuid) to authenticated;
