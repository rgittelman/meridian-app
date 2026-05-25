-- ─────────────────────────────────────────────────────────────────────────────
-- Meridian — Supabase schema (base)
--
-- MIGRATION ORDER (run in sequence, each is idempotent):
--   1. supabase/schema.sql              — base tables (profiles, prefs, memories)
--   2. supabase/migrations/001_memory_layer.sql  — memory extensions
--   3. supabase/migrations/002_conversations.sql — conversations + messages
--   4. supabase/migrations/003_life_os.sql       — tasks, reminders, domain cols
--   5. supabase/migrations/004_profile_hardening.sql — profile columns + OAuth trigger
--   6. supabase/migrations/005_delete_cascade_hardening.sql — FK + policy fixes
--
-- Run in Supabase SQL editor or via CLI:
--   supabase db query < supabase/schema.sql
--
-- Re-runnable: all statements use IF NOT EXISTS / CREATE OR REPLACE.
-- Safe to run multiple times without duplication errors.
-- ─────────────────────────────────────────────────────────────────────────────


-- ─── Helper: updated_at auto-stamp ───────────────────────────────────────────
-- Defined FIRST because triggers below reference it.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ─── profiles ─────────────────────────────────────────────────────────────────
-- One row per authenticated user. Auto-created by the trigger below.

create table if not exists public.profiles (
  id                  uuid        primary key references auth.users (id) on delete cascade,
  email               text,
  full_name           text,
  display_name        text,
  avatar_url          text,
  onboarding_complete boolean     not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Users can only read and update their own profile.
-- No INSERT policy here — the handle_new_user trigger inserts via SECURITY DEFINER,
-- which bypasses RLS. A user-facing insert policy is not needed and would be a risk.

create policy "profiles: select own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: update own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Updated_at trigger for profiles
drop trigger if exists profiles_set_updated_at on public.profiles;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();


-- ─── Trigger: auto-create profile on signup ───────────────────────────────────
-- SECURITY DEFINER: runs as the function owner, bypassing RLS to insert
-- into profiles. set search_path = '' prevents search_path injection attacks.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_full_name text;
  v_avatar    text;
begin
  v_full_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'name', ''),
    nullif(new.raw_user_meta_data ->> 'display_name', '')
  );

  v_avatar := coalesce(
    nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
    nullif(new.raw_user_meta_data ->> 'picture', '')
  );

  insert into public.profiles (id, email, full_name, display_name, avatar_url)
  values (
    new.id,
    new.email,
    v_full_name,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), v_full_name),
    v_avatar
  )
  on conflict (id) do update set
    email        = coalesce(excluded.email, public.profiles.email),
    full_name    = coalesce(public.profiles.full_name, excluded.full_name),
    display_name = coalesce(public.profiles.display_name, excluded.display_name),
    avatar_url   = coalesce(public.profiles.avatar_url, excluded.avatar_url),
    updated_at   = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ─── user_preferences ────────────────────────────────────────────────────────
-- Stores onboarding selections and future preference updates.
-- One row per user (enforced via unique constraint on user_id).

create table if not exists public.user_preferences (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references auth.users (id) on delete cascade,
  -- Onboarding: "what creates the most mental load?" (multi-select)
  mental_load      text[]      not null default '{}',
  -- Onboarding: "what should Meridian protect?" (multi-select)
  protect_values   text[]      not null default '{}',
  -- Future: preferred AI tone (calm / direct / proactive)
  preferred_tone   text,
  -- Memory system preferences
  memory_enabled              boolean not null default true,
  personalization_enabled     boolean not null default true,
  disabled_memory_categories  text[]  not null default '{}',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (user_id)
);

alter table public.user_preferences enable row level security;

create policy "user_preferences: select own"
  on public.user_preferences for select
  using (auth.uid() = user_id);

create policy "user_preferences: insert own"
  on public.user_preferences for insert
  with check (auth.uid() = user_id);

create policy "user_preferences: update own"
  on public.user_preferences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_preferences: delete own"
  on public.user_preferences for delete
  using (auth.uid() = user_id);

drop trigger if exists user_preferences_set_updated_at on public.user_preferences;

create trigger user_preferences_set_updated_at
  before update on public.user_preferences
  for each row execute procedure public.set_updated_at();


-- ─── connections ──────────────────────────────────────────────────────────────
-- Tracks which integrations a user has connected and their current status.
-- One row per user per provider (enforced by unique constraint).
--
-- Security note: never store raw OAuth tokens here.
-- Use Supabase Vault or encrypted columns for sensitive credential storage.

create table if not exists public.connections (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users (id) on delete cascade,
  -- Provider key matches Connection.id in data/connections.ts
  -- e.g. "google-calendar", "plaid", "meridian-continuity"
  provider   text        not null,
  -- "connected" | "disconnected" | "available" | "ready_soon" | "coming_soon"
  status     text        not null default 'disconnected',
  -- Non-sensitive provider metadata only (account IDs, display names, scopes).
  -- Never store tokens, secrets, or keys in this column.
  metadata   jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

alter table public.connections enable row level security;

create policy "connections: select own"
  on public.connections for select
  using (auth.uid() = user_id);

create policy "connections: insert own"
  on public.connections for insert
  with check (auth.uid() = user_id);

create policy "connections: update own"
  on public.connections for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "connections: delete own"
  on public.connections for delete
  using (auth.uid() = user_id);

drop trigger if exists connections_set_updated_at on public.connections;

create trigger connections_set_updated_at
  before update on public.connections
  for each row execute procedure public.set_updated_at();


-- ─── pgvector extension (for semantic memory search) ────────────────────────
-- Enable in Supabase Dashboard → Database → Extensions if not already active.

create extension if not exists vector;


-- ─── memories ─────────────────────────────────────────────────────────────────
-- Structured long-term memory objects extracted from conversations,
-- onboarding, integrations, and daily reflections.
--
-- Security: never store OAuth tokens, API keys, or raw credentials here.
-- source_excerpt is truncated conversation text only.

create table if not exists public.memories (
  id                   uuid        primary key default gen_random_uuid(),
  user_id              uuid        not null references auth.users (id) on delete cascade,
  category             text        not null,
  title                text        not null,
  content              text        not null,
  summary              text,
  confidence           float       not null default 0.5
                         check (confidence >= 0 and confidence <= 1),
  importance           float       not null default 0.5
                         check (importance >= 0 and importance <= 1),
  emotional_valence    text        check (emotional_valence in ('positive','negative','neutral','mixed')),
  emotional_intensity  float       not null default 0
                         check (emotional_intensity >= 0 and emotional_intensity <= 1),
  source_type          text        not null default 'conversation'
                         check (source_type in ('conversation','onboarding','integration','reflection','manual')),
  source_id            text,
  source_excerpt       text,
  why_remembered       text,
  metadata             jsonb       not null default '{}',
  reinforcement_count  int         not null default 1,
  last_reinforced_at   timestamptz not null default now(),
  is_active            boolean     not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists memories_user_id_idx          on public.memories (user_id);
create index if not exists memories_user_category_idx    on public.memories (user_id, category);
create index if not exists memories_user_reinforced_idx  on public.memories (user_id, last_reinforced_at desc);

alter table public.memories enable row level security;

drop policy if exists "memories: select own" on public.memories;
create policy "memories: select own"
  on public.memories for select using (auth.uid() = user_id);

drop policy if exists "memories: insert own" on public.memories;
create policy "memories: insert own"
  on public.memories for insert with check (auth.uid() = user_id);

drop policy if exists "memories: update own" on public.memories;
create policy "memories: update own"
  on public.memories for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "memories: delete own" on public.memories;
create policy "memories: delete own"
  on public.memories for delete using (auth.uid() = user_id);

drop trigger if exists memories_set_updated_at on public.memories;

create trigger memories_set_updated_at
  before update on public.memories
  for each row execute procedure public.set_updated_at();


-- ─── memory_embeddings ────────────────────────────────────────────────────────
-- Vector embeddings for semantic retrieval. One primary embedding per memory.
-- embedding stored as float8[] for compatibility without pgvector RPC;
-- vector column available when pgvector is enabled.

create table if not exists public.memory_embeddings (
  id         uuid        primary key default gen_random_uuid(),
  memory_id  uuid        not null references public.memories (id) on delete cascade,
  user_id    uuid        not null references auth.users (id) on delete cascade,
  model      text        not null,
  embedding  float8[]    not null,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'memory_embeddings_memory_id_key'
      and conrelid = 'public.memory_embeddings'::regclass
  ) then
    alter table public.memory_embeddings
      add constraint memory_embeddings_memory_id_key unique (memory_id);
  end if;
end $$;

create index if not exists memory_embeddings_user_id_idx on public.memory_embeddings (user_id);

alter table public.memory_embeddings enable row level security;

drop policy if exists "memory_embeddings: select own" on public.memory_embeddings;
create policy "memory_embeddings: select own"
  on public.memory_embeddings for select using (auth.uid() = user_id);

drop policy if exists "memory_embeddings: insert own" on public.memory_embeddings;
create policy "memory_embeddings: insert own"
  on public.memory_embeddings for insert with check (auth.uid() = user_id);

drop policy if exists "memory_embeddings: delete own" on public.memory_embeddings;
create policy "memory_embeddings: delete own"
  on public.memory_embeddings for delete using (auth.uid() = user_id);


-- ─── memory_relationships ─────────────────────────────────────────────────────
-- Graph edges between related memories for pattern detection and context stitching.

create table if not exists public.memory_relationships (
  id                 uuid        primary key default gen_random_uuid(),
  user_id            uuid        not null references auth.users (id) on delete cascade,
  source_memory_id   uuid        not null references public.memories (id) on delete cascade,
  target_memory_id   uuid        not null references public.memories (id) on delete cascade,
  relationship_type  text        not null default 'related'
                       check (relationship_type in ('related','supersedes','reinforces','contradicts')),
  strength           float       not null default 0.5
                       check (strength >= 0 and strength <= 1),
  created_at         timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'memory_relationships_source_memory_id_target_memory_id_relationship_type_key'
      and conrelid = 'public.memory_relationships'::regclass
  ) then
    alter table public.memory_relationships
      add constraint memory_relationships_source_memory_id_target_memory_id_relationship_type_key
      unique (source_memory_id, target_memory_id, relationship_type);
  end if;
end $$;

create index if not exists memory_relationships_user_id_idx on public.memory_relationships (user_id);

alter table public.memory_relationships enable row level security;

drop policy if exists "memory_relationships: select own" on public.memory_relationships;
create policy "memory_relationships: select own"
  on public.memory_relationships for select using (auth.uid() = user_id);

drop policy if exists "memory_relationships: insert own" on public.memory_relationships;
create policy "memory_relationships: insert own"
  on public.memory_relationships for insert with check (auth.uid() = user_id);

drop policy if exists "memory_relationships: delete own" on public.memory_relationships;
create policy "memory_relationships: delete own"
  on public.memory_relationships for delete using (auth.uid() = user_id);


-- ─── daily_reflections ────────────────────────────────────────────────────────
-- One reflection per user per day, generated by the reflection engine.

create table if not exists public.daily_reflections (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references auth.users (id) on delete cascade,
  reflection_date date        not null,
  summary         text        not null,
  emotional_tone  text,
  key_themes      text[]      not null default '{}',
  memory_ids      uuid[]      not null default '{}',
  insights        jsonb       not null default '{}',
  created_at      timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'daily_reflections_user_id_reflection_date_key'
      and conrelid = 'public.daily_reflections'::regclass
  ) then
    alter table public.daily_reflections
      add constraint daily_reflections_user_id_reflection_date_key
      unique (user_id, reflection_date);
  end if;
end $$;

create index if not exists daily_reflections_user_id_idx on public.daily_reflections (user_id);

alter table public.daily_reflections enable row level security;

drop policy if exists "daily_reflections: select own" on public.daily_reflections;
create policy "daily_reflections: select own"
  on public.daily_reflections for select using (auth.uid() = user_id);

drop policy if exists "daily_reflections: insert own" on public.daily_reflections;
create policy "daily_reflections: insert own"
  on public.daily_reflections for insert with check (auth.uid() = user_id);

drop policy if exists "daily_reflections: update own" on public.daily_reflections;
create policy "daily_reflections: update own"
  on public.daily_reflections for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "daily_reflections: delete own" on public.daily_reflections;
create policy "daily_reflections: delete own"
  on public.daily_reflections for delete using (auth.uid() = user_id);

