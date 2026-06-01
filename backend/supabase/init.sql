-- Initial Supabase database setup for the Notes feature.
-- Run this once in Supabase Dashboard > SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  owner_email text not null,
  title text not null default '',
  body text not null default '',
  color text not null default 'mint' check (color in ('mint', 'sky', 'coral', 'gold')),
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create unique index if not exists notes_owner_title_unique_idx
  on public.notes (owner_email, title);

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

-- The app currently writes through Next.js API routes using a server-side
-- service role or secret key, so no public RLS policy is required here.
-- If you later switch to Supabase Auth in the browser, add user-scoped RLS
-- policies instead of exposing the service role key.

-- Optional sanity seed:
-- Replace the email, uncomment, and run if you want one default note.
--
-- insert into public.notes (owner_email, title, body, color, pinned)
-- values (
--   'you@example.com',
--   'Welcome note',
--   'Your Supabase notes backend is ready.',
--   'mint',
--   true
-- );

notify pgrst, 'reload schema';
