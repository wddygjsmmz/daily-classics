-- Applied using Supabase migration API; no phone numbers stored in this table.
create function public.daily_classics_valid_folders(value jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare f jsonb; item jsonb; names text[] := '{}';
begin
 if value is null or jsonb_typeof(value) <> 'array' then return false; end if;
 if jsonb_array_length(value) < 1 or jsonb_array_length(value) > 100 or octet_length(value::text) > 1048576 then return false; end if;
 for f in select jsonb_array_elements(value) loop
  if jsonb_typeof(f) <> 'object' or jsonb_typeof(f->'name') <> 'string' or jsonb_typeof(f->'items') <> 'array' or not (f ? 'name' and f ? 'items') then return false; end if;
  if length(btrim(f->>'name')) not between 1 and 48 or (f->>'name') = any(names) then return false; end if;
  names := array_append(names,f->>'name');
  if jsonb_array_length(f->'items') > 5000 then return false; end if;
  for item in select jsonb_array_elements(f->'items') loop
   if jsonb_typeof(item) <> 'string' or length(item #>> '{}') not between 1 and 500 then return false; end if;
  end loop;
 end loop;
 return true;
end; $$;
create table public.daily_classics_collections (
 user_id uuid primary key references auth.users(id) on delete cascade,
 folders jsonb not null default '[{"name":"我的最爱","items":[]}]'::jsonb,
 version bigint not null default 0 check (version >= 0),
 updated_at timestamptz not null default now(),
 constraint valid_folders check (public.daily_classics_valid_folders(folders))
);
alter table public.daily_classics_collections enable row level security;
revoke all on public.daily_classics_collections from anon, authenticated;
grant select, insert, update on public.daily_classics_collections to authenticated;
create policy collections_read on public.daily_classics_collections for select to authenticated using ((select auth.uid()) = user_id);
create policy collections_create on public.daily_classics_collections for insert to authenticated with check ((select auth.uid()) = user_id);
create policy collections_update on public.daily_classics_collections for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create function public.daily_classics_save_collections(expected_version bigint, new_folders jsonb)
returns setof public.daily_classics_collections language plpgsql security invoker set search_path = '' as $$
begin
 if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
 if not public.daily_classics_valid_folders(new_folders) then raise exception 'invalid_folders' using errcode = '22023'; end if;
 insert into public.daily_classics_collections(user_id) values(auth.uid()) on conflict (user_id) do nothing;
 return query update public.daily_classics_collections
 set folders = new_folders, version = version + 1, updated_at = now()
 where user_id = auth.uid() and version = expected_version returning *;
 -- Empty result is a conflict. The caller must refresh, never blindly overwrite.
end; $$;
revoke all on function public.daily_classics_save_collections(bigint,jsonb) from public, anon;
grant execute on function public.daily_classics_save_collections(bigint,jsonb) to authenticated;
revoke all on function public.daily_classics_valid_folders(jsonb) from public, anon;
grant execute on function public.daily_classics_valid_folders(jsonb) to authenticated;
