alter table public.notes
  add column if not exists share_mode text not null default 'private'
    check (share_mode in ('private', 'read', 'edit')),
  add column if not exists share_token uuid unique;

create index if not exists notes_share_token_idx
  on public.notes (share_token)
  where share_token is not null and share_mode in ('read', 'edit');
