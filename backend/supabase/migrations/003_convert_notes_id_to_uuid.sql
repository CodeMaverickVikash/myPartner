-- Run this in Supabase SQL Editor if an older notes table has bigint ids.
-- It rebuilds public.notes.id as uuid so the offline client can sync UUID local ids.

create extension if not exists pgcrypto;

do $$
declare
  current_id_type text;
  primary_key_name text;
begin
  select data_type
    into current_id_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'notes'
    and column_name = 'id';

  if current_id_type is null then
    create table public.notes (
      id uuid primary key default gen_random_uuid(),
      owner_email text not null,
      title text not null default '',
      body text not null default '',
      color text not null default 'mint' check (color in ('mint', 'sky', 'coral', 'gold')),
      pinned boolean not null default false,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  elsif current_id_type <> 'uuid' then
    select conname
      into primary_key_name
    from pg_constraint
    where conrelid = 'public.notes'::regclass
      and contype = 'p';

    if primary_key_name is not null then
      execute format('alter table public.notes drop constraint %I', primary_key_name);
    end if;

    alter table public.notes alter column id drop identity if exists;
    alter table public.notes alter column id drop default;
    alter table public.notes alter column id type uuid using gen_random_uuid();
    alter table public.notes alter column id set default gen_random_uuid();
    alter table public.notes add primary key (id);
  end if;
end;
$$;

alter table public.notes
  add column if not exists owner_email text not null default '',
  add column if not exists title text not null default '',
  add column if not exists body text not null default '',
  add column if not exists color text not null default 'mint',
  add column if not exists pinned boolean not null default false,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'notes_color_check'
      and conrelid = 'public.notes'::regclass
  ) then
    alter table public.notes
      add constraint notes_color_check check (color in ('mint', 'sky', 'coral', 'gold'));
  end if;
end;
$$;

create index if not exists notes_owner_updated_idx
  on public.notes (owner_email, pinned desc, updated_at desc);

create or replace function public.set_notes_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists notes_set_updated_at on public.notes;

create trigger notes_set_updated_at
before update on public.notes
for each row
execute function public.set_notes_updated_at();

alter table public.notes enable row level security;

notify pgrst, 'reload schema';
