-- Meridian Conversations — idempotent migration
-- Safe to run multiple times.

-- ─── conversations ─────────────────────────────────────────────────────────────

create table if not exists public.conversations (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users (id) on delete cascade,
  title       text        not null default 'New conversation',
  is_active   boolean     not null default true,
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists conversations_user_updated_idx
  on public.conversations (user_id, updated_at desc)
  where deleted_at is null;

create index if not exists conversations_user_active_idx
  on public.conversations (user_id, is_active)
  where deleted_at is null;

alter table public.conversations enable row level security;

drop policy if exists "conversations: select own" on public.conversations;
create policy "conversations: select own"
  on public.conversations for select
  using (auth.uid() = user_id and deleted_at is null);

drop policy if exists "conversations: insert own" on public.conversations;
create policy "conversations: insert own"
  on public.conversations for insert
  with check (auth.uid() = user_id);

drop policy if exists "conversations: update own" on public.conversations;
create policy "conversations: update own"
  on public.conversations for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "conversations: delete own" on public.conversations;
create policy "conversations: delete own"
  on public.conversations for delete
  using (auth.uid() = user_id);

drop trigger if exists conversations_set_updated_at on public.conversations;
create trigger conversations_set_updated_at
  before update on public.conversations
  for each row execute procedure public.set_updated_at();


-- ─── messages ────────────────────────────────────────────────────────────────

create table if not exists public.messages (
  id               uuid        primary key default gen_random_uuid(),
  conversation_id  uuid        not null references public.conversations (id) on delete cascade,
  user_id          uuid        not null references auth.users (id) on delete cascade,
  role             text        not null check (role in ('user', 'assistant')),
  content          text        not null default '',
  status           text        not null default 'sent'
                     check (status in ('sending', 'sent', 'streaming', 'error')),
  metadata         jsonb       not null default '{}',
  created_at       timestamptz not null default now()
);

create index if not exists messages_conversation_idx
  on public.messages (conversation_id, created_at asc);

create index if not exists messages_user_idx
  on public.messages (user_id);

alter table public.messages enable row level security;

drop policy if exists "messages: select own" on public.messages;
create policy "messages: select own"
  on public.messages for select
  using (auth.uid() = user_id);

drop policy if exists "messages: insert own" on public.messages;
create policy "messages: insert own"
  on public.messages for insert
  with check (auth.uid() = user_id);

drop policy if exists "messages: update own" on public.messages;
create policy "messages: update own"
  on public.messages for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "messages: delete own" on public.messages;
create policy "messages: delete own"
  on public.messages for delete
  using (auth.uid() = user_id);
