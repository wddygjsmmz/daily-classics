create table public.daily_classics_sync_spaces(
 code_hash text primary key check(code_hash ~ '^[a-f0-9]{64}$'),
 folders jsonb not null check(public.daily_classics_valid_folders(folders) and octet_length(folders::text)<=65536),
 version bigint not null default 1,
 updated_at timestamptz not null default now()
);
alter table public.daily_classics_sync_spaces enable row level security;
revoke all on public.daily_classics_sync_spaces from public,anon,authenticated;
grant select,insert,update on public.daily_classics_sync_spaces to service_role;
create table public.daily_classics_sync_limits(
 bucket text primary key, hits integer not null, expires_at timestamptz not null
);
create index sync_limits_expiry on public.daily_classics_sync_limits(expires_at);
alter table public.daily_classics_sync_limits enable row level security;
revoke all on public.daily_classics_sync_limits from public,anon,authenticated;
grant select,insert,update,delete on public.daily_classics_sync_limits to service_role;
grant execute on function public.daily_classics_valid_folders(jsonb) to service_role;
create function public.daily_classics_sync_request(p_action text,p_hash text,p_ip text,p_folders jsonb default null,p_version bigint default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare row_data public.daily_classics_sync_spaces; n integer; bucket_key text; now_at timestamptz := now();
begin
 if p_hash !~ '^[a-f0-9]{64}$' or p_ip !~ '^[a-f0-9]{64}$' or p_action not in ('create','read','save') then return jsonb_build_object('status',400);end if;
 delete from public.daily_classics_sync_limits where expires_at < now_at;
 bucket_key := 'req:'||p_ip||':'||floor(extract(epoch from now_at)/300)::text;
 insert into public.daily_classics_sync_limits values(bucket_key,1,now_at+interval '10 minutes')
 on conflict(bucket) do update set hits=daily_classics_sync_limits.hits+1 returning hits into n;
 if n>300 then return jsonb_build_object('status',429);end if;
 if p_action='create' then
  bucket_key := 'create:'||p_ip||':'||floor(extract(epoch from now_at)/3600)::text;
  insert into public.daily_classics_sync_limits values(bucket_key,1,now_at+interval '2 hours') on conflict(bucket) do update set hits=daily_classics_sync_limits.hits+1 returning hits into n;
  if n>5 then return jsonb_build_object('status',429);end if;
  bucket_key := 'daily:'||floor(extract(epoch from now_at)/86400)::text;
  insert into public.daily_classics_sync_limits values(bucket_key,1,now_at+interval '2 days') on conflict(bucket) do update set hits=daily_classics_sync_limits.hits+1 returning hits into n;
  if n>100 then return jsonb_build_object('status',429);end if;
  if not public.daily_classics_valid_folders(p_folders) or octet_length(p_folders::text)>65536 then return jsonb_build_object('status',400);end if;
  insert into public.daily_classics_sync_spaces(code_hash,folders) values(p_hash,p_folders) on conflict(code_hash) do nothing;
 end if;
 select * into row_data from public.daily_classics_sync_spaces where code_hash=p_hash for update;
 if not found then return jsonb_build_object('status',403);end if;
 if p_action='save' then
  if p_version is null or row_data.version<>p_version then return jsonb_build_object('status',409);end if;
  if not public.daily_classics_valid_folders(p_folders) or octet_length(p_folders::text)>65536 then return jsonb_build_object('status',400);end if;
  update public.daily_classics_sync_spaces set folders=p_folders,version=version+1,updated_at=now_at where code_hash=p_hash returning * into row_data;
 end if;
 return jsonb_build_object('status',200,'folders',row_data.folders,'version',row_data.version);
end;$$;
revoke all on function public.daily_classics_sync_request(text,text,text,jsonb,bigint) from public,anon,authenticated;
grant execute on function public.daily_classics_sync_request(text,text,text,jsonb,bigint) to service_role;

-- Explicit denial for browser Data API roles; only the Edge Function service role can access.
create policy deny_browser on public.daily_classics_sync_spaces for all to anon,authenticated using(false) with check(false);
create policy deny_browser on public.daily_classics_sync_limits for all to anon,authenticated using(false) with check(false);
