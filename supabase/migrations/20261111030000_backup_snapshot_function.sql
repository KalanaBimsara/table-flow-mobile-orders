-- Daily backup support.
--
-- public.backup_snapshot() returns one consistent snapshot of the database as
-- JSON. The n8n workflow "Supabase Daily Backup to Google Drive" calls it at
-- 03:00 Asia/Colombo and uploads the result to Google Drive as a zip:
--
--   schema.sql  types, sequences, tables, constraints, indexes, functions,
--               triggers, row level security, policies, grants, realtime
--   data.sql    INSERT statements for every row, plus sequence positions
--   backup.json the same rows as JSON, with row counts
--
-- It runs as the owner (SECURITY DEFINER) so it can read auth.users, and only
-- the service_role key may call it. Never grant it to anon or authenticated:
-- the output contains every row, including password hashes.

create or replace function public.backup_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = ''
set statement_timeout = '120s'
as $$
declare
  t record;
  c record;
  rel_rows jsonb;
  col_list text;
  data jsonb := '{}'::jsonb;
  counts jsonb := '{}'::jsonb;
  data_sql text;
  schema_sql text := '';
  part text;
begin
  -- Tables included in the data backup: everything in public, plus the auth
  -- and storage tables needed to restore logins and file metadata.
  -- Sessions, refresh tokens and audit logs are left out on purpose.
  data_sql := concat_ws(E'\n',
    '-- TableFlow data restore. Generated ' || to_char(now() at time zone 'Asia/Colombo', 'YYYY-MM-DD HH24:MI') || ' Asia/Colombo.',
    '-- Run schema.sql first, then this file, as the postgres role (Supabase SQL editor or psql).',
    '-- replica mode stops triggers firing during restore (no n8n order webhooks,',
    '-- no duplicate profiles) and defers foreign-key checks.',
    'BEGIN;',
    'SET LOCAL session_replication_role = replica;',
    '');

  for t in
    select n.nspname as s, cl.relname as r, cl.oid as oid
    from pg_class cl
    join pg_namespace n on n.oid = cl.relnamespace
    where cl.relkind in ('r', 'p')
      and (
        n.nspname = 'public'
        or (n.nspname = 'auth' and cl.relname in ('users', 'identities'))
        or (n.nspname = 'storage' and cl.relname in ('buckets', 'objects'))
      )
    order by case n.nspname when 'auth' then 0 when 'storage' then 1 else 2 end, cl.relname
  loop
    execute format('select coalesce(jsonb_agg(to_jsonb(x)), ''[]''::jsonb) from %I.%I x', t.s, t.r)
      into rel_rows;

    data := data || jsonb_build_object(t.s || '.' || t.r, rel_rows);
    counts := counts || jsonb_build_object(t.s || '.' || t.r, jsonb_array_length(rel_rows));

    if jsonb_array_length(rel_rows) > 0 then
      -- Generated columns cannot be inserted, so list the real columns only.
      select string_agg(quote_ident(a.attname), ', ' order by a.attnum)
        into col_list
      from pg_attribute a
      where a.attrelid = t.oid and a.attnum > 0 and not a.attisdropped and a.attgenerated = '';

      data_sql := data_sql || format(
        E'-- %s.%s: %s rows\nINSERT INTO %I.%I (%s)\nSELECT %s FROM jsonb_populate_recordset(NULL::%I.%I, %L::jsonb);\n\n',
        t.s, t.r, jsonb_array_length(rel_rows), t.s, t.r, col_list, col_list, t.s, t.r, rel_rows::text);
    end if;
  end loop;

  -- Sequence positions (e.g. order_form_number_seq)
  for c in
    select schemaname, sequencename, last_value
    from pg_sequences
    where schemaname = 'public' and last_value is not null
  loop
    data_sql := data_sql || format(E'SELECT setval(%L, %s, true);\n', c.schemaname || '.' || c.sequencename, c.last_value);
  end loop;

  data_sql := data_sql || E'\nCOMMIT;\n';

  ---------------------------------------------------------------------------
  -- schema.sql
  ---------------------------------------------------------------------------
  schema_sql := concat_ws(E'\n',
    '-- TableFlow schema snapshot (public schema, plus triggers on auth.users).',
    '-- Generated ' || to_char(now() at time zone 'Asia/Colombo', 'YYYY-MM-DD HH24:MI') || ' Asia/Colombo from ' || split_part(version(), ' on ', 1) || '.',
    '-- Restore into a fresh Supabase project as postgres, before data.sql.',
    '',
    '-- Extensions',
    'CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;',
    'CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;',
    'CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;',
    '');

  -- Enum types
  for c in
    select format('CREATE TYPE public.%I AS ENUM (%s);', ty.typname,
             string_agg(quote_literal(e.enumlabel), ', ' order by e.enumsortorder)) as ddl
    from pg_type ty
    join pg_namespace n on n.oid = ty.typnamespace
    join pg_enum e on e.enumtypid = ty.oid
    where n.nspname = 'public'
    group by ty.typname
  loop
    schema_sql := schema_sql || c.ddl || E'\n';
  end loop;

  -- Sequences
  for c in
    select format('CREATE SEQUENCE IF NOT EXISTS public.%I AS %s INCREMENT BY %s MINVALUE %s MAXVALUE %s START WITH %s%s;',
             sequencename, data_type, increment_by, min_value, max_value, start_value,
             case when cycle then ' CYCLE' else '' end) as ddl
    from pg_sequences
    where schemaname = 'public'
  loop
    schema_sql := schema_sql || c.ddl || E'\n';
  end loop;
  schema_sql := schema_sql || E'\n';

  -- Tables (columns, defaults, NOT NULL, generated / identity columns)
  for t in
    select cl.oid, cl.relname as r
    from pg_class cl
    join pg_namespace n on n.oid = cl.relnamespace
    where n.nspname = 'public' and cl.relkind in ('r', 'p')
    order by cl.relname
  loop
    select string_agg(
             '  ' || quote_ident(a.attname) || ' ' || pg_catalog.format_type(a.atttypid, a.atttypmod)
             || case
                  when a.attgenerated = 's' then ' GENERATED ALWAYS AS (' || pg_catalog.pg_get_expr(d.adbin, d.adrelid) || ') STORED'
                  when a.attidentity = 'a' then ' GENERATED ALWAYS AS IDENTITY'
                  when a.attidentity = 'd' then ' GENERATED BY DEFAULT AS IDENTITY'
                  when d.adbin is not null then ' DEFAULT ' || pg_catalog.pg_get_expr(d.adbin, d.adrelid)
                  else ''
                end
             || case when a.attnotnull then ' NOT NULL' else '' end,
             E',\n' order by a.attnum)
      into part
    from pg_attribute a
    left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
    where a.attrelid = t.oid and a.attnum > 0 and not a.attisdropped;

    schema_sql := schema_sql || format(E'CREATE TABLE public.%I (\n%s\n);\n\n', t.r, part);
  end loop;

  -- Constraints: primary keys, unique and check first, foreign keys last
  for c in
    select format('ALTER TABLE ONLY public.%I ADD CONSTRAINT %I %s;', cl.relname, co.conname, pg_catalog.pg_get_constraintdef(co.oid)) as ddl
    from pg_constraint co
    join pg_class cl on cl.oid = co.conrelid
    join pg_namespace n on n.oid = cl.relnamespace
    where n.nspname = 'public' and co.contype in ('p', 'u', 'c', 'x', 'f')
    order by case co.contype when 'p' then 0 when 'u' then 1 when 'c' then 2 when 'x' then 3 else 4 end, cl.relname, co.conname
  loop
    schema_sql := schema_sql || c.ddl || E'\n';
  end loop;
  schema_sql := schema_sql || E'\n';

  -- Indexes that do not belong to a constraint
  for c in
    select pg_catalog.pg_get_indexdef(i.indexrelid) || ';' as ddl
    from pg_index i
    join pg_class cl on cl.oid = i.indrelid
    join pg_namespace n on n.oid = cl.relnamespace
    where n.nspname = 'public'
      and not exists (select 1 from pg_constraint co where co.conindid = i.indexrelid)
    order by cl.relname
  loop
    schema_sql := schema_sql || c.ddl || E'\n';
  end loop;
  schema_sql := schema_sql || E'\n';

  -- Functions (excluding ones that belong to extensions)
  for c in
    select pg_catalog.pg_get_functiondef(p.oid) as ddl
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind in ('f', 'p')
      and not exists (select 1 from pg_depend dep where dep.objid = p.oid and dep.deptype = 'e')
    order by p.proname
  loop
    schema_sql := schema_sql || c.ddl || E';\n\n';
  end loop;

  -- Function grants (Supabase grants EXECUTE to everyone by default, so
  -- revoke first and re-apply exactly what exists now)
  for c in
    select format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated;', p.proname,
             pg_catalog.pg_get_function_identity_arguments(p.oid)) as ddl
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proacl is not null
      and not exists (select 1 from pg_depend dep where dep.objid = p.oid and dep.deptype = 'e')
    union all
    select format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO %s;', p.proname,
             pg_catalog.pg_get_function_identity_arguments(p.oid),
             case when acl.grantee = 0 then 'PUBLIC' else quote_ident(pg_catalog.pg_get_userbyid(acl.grantee)) end)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    cross join lateral aclexplode(p.proacl) acl
    where n.nspname = 'public' and acl.privilege_type = 'EXECUTE'
      and not exists (select 1 from pg_depend dep where dep.objid = p.oid and dep.deptype = 'e')
  loop
    schema_sql := schema_sql || c.ddl || E'\n';
  end loop;
  schema_sql := schema_sql || E'\n';

  -- Triggers on public tables and on auth.users (e.g. on_auth_user_created)
  for c in
    select pg_catalog.pg_get_triggerdef(tg.oid) || ';' as ddl
    from pg_trigger tg
    join pg_class cl on cl.oid = tg.tgrelid
    join pg_namespace n on n.oid = cl.relnamespace
    where not tg.tgisinternal
      and (n.nspname = 'public' or (n.nspname = 'auth' and cl.relname = 'users'))
    order by n.nspname, cl.relname, tg.tgname
  loop
    schema_sql := schema_sql || c.ddl || E'\n';
  end loop;
  schema_sql := schema_sql || E'\n';

  -- Row level security
  for c in
    select format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', cl.relname)
           || case when cl.relforcerowsecurity then format(E'\nALTER TABLE public.%I FORCE ROW LEVEL SECURITY;', cl.relname) else '' end as ddl
    from pg_class cl
    join pg_namespace n on n.oid = cl.relnamespace
    where n.nspname = 'public' and cl.relkind in ('r', 'p') and cl.relrowsecurity
    order by cl.relname
  loop
    schema_sql := schema_sql || c.ddl || E'\n';
  end loop;
  schema_sql := schema_sql || E'\n';

  -- Policies
  for c in
    select format('CREATE POLICY %I ON public.%I AS %s FOR %s TO %s%s%s;',
             po.polname, cl.relname,
             case when po.polpermissive then 'PERMISSIVE' else 'RESTRICTIVE' end,
             case po.polcmd when 'r' then 'SELECT' when 'a' then 'INSERT' when 'w' then 'UPDATE' when 'd' then 'DELETE' else 'ALL' end,
             coalesce((select string_agg(case when r = 0 then 'PUBLIC' else quote_ident(pg_catalog.pg_get_userbyid(r)) end, ', ')
                       from unnest(po.polroles) r), 'PUBLIC'),
             case when po.polqual is not null then ' USING (' || pg_catalog.pg_get_expr(po.polqual, po.polrelid) || ')' else '' end,
             case when po.polwithcheck is not null then ' WITH CHECK (' || pg_catalog.pg_get_expr(po.polwithcheck, po.polrelid) || ')' else '' end) as ddl
    from pg_policy po
    join pg_class cl on cl.oid = po.polrelid
    join pg_namespace n on n.oid = cl.relnamespace
    where n.nspname = 'public'
    order by cl.relname, po.polname
  loop
    schema_sql := schema_sql || c.ddl || E'\n';
  end loop;
  schema_sql := schema_sql || E'\n';

  -- Table grants
  for c in
    select format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated, service_role;', cl.relname) as ddl, cl.relname as r, 0 as ord
    from pg_class cl
    join pg_namespace n on n.oid = cl.relnamespace
    where n.nspname = 'public' and cl.relkind in ('r', 'p') and cl.relacl is not null
    union all
    select format('GRANT %s ON TABLE public.%I TO %s;', string_agg(acl.privilege_type, ', ' order by acl.privilege_type), cl.relname,
             case when acl.grantee = 0 then 'PUBLIC' else quote_ident(pg_catalog.pg_get_userbyid(acl.grantee)) end), cl.relname, 1
    from pg_class cl
    join pg_namespace n on n.oid = cl.relnamespace
    cross join lateral aclexplode(cl.relacl) acl
    where n.nspname = 'public' and cl.relkind in ('r', 'p')
      and pg_catalog.pg_get_userbyid(acl.grantee) in ('anon', 'authenticated', 'service_role')
    group by cl.relname, acl.grantee
    order by r, ord
  loop
    schema_sql := schema_sql || c.ddl || E'\n';
  end loop;
  schema_sql := schema_sql || E'\n';

  -- Realtime
  for c in
    select format('ALTER PUBLICATION supabase_realtime ADD TABLE %I.%I;', schemaname, tablename) as ddl
    from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public'
  loop
    schema_sql := schema_sql || c.ddl || E'\n';
  end loop;

  return jsonb_build_object(
    'meta', jsonb_build_object(
      'project_ref', 'hlemlubraovotrsdkgka',
      'created_at_utc', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      'created_at_colombo', to_char(now() at time zone 'Asia/Colombo', 'YYYY-MM-DD HH24:MI:SS'),
      'postgres_version', split_part(version(), ' on ', 1),
      'database_size', pg_size_pretty(pg_database_size(current_database())),
      'row_counts', counts
    ),
    'schema_sql', schema_sql,
    'data_sql', data_sql,
    'data', data
  );
end;
$$;

revoke all on function public.backup_snapshot() from public, anon, authenticated;
grant execute on function public.backup_snapshot() to service_role;

comment on function public.backup_snapshot() is
  'Full JSON snapshot (schema SQL, data SQL, rows) for the daily n8n backup. service_role only.';
