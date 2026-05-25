-- ─────────────────────────────────────────────────────────────────────────────
-- Meridian Memory Layer — idempotent migration
--
-- Safe to run multiple times. Every object uses:
--   CREATE … IF NOT EXISTS  |  CREATE OR REPLACE  |  DROP … IF EXISTS
--
-- Run in Supabase SQL Editor or:
--   supabase db query < supabase/migrations/001_memory_layer.sql
-- ─────────────────────────────────────────────────────────────────────────────


-- ─── Helpers ─────────────────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ─── Align table name with application code ───────────────────────────────────
-- Application code queries public.memories. If an earlier partial run created
-- public.dados_memories instead, rename it once.

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'dados_memories'
  ) and not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'memories'
  ) then
    alter table public.dados_memories rename to memories;
  end if;
end $$;


-- ─── user_preferences: memory columns ────────────────────────────────────────

alter table public.user_preferences
  add column if not exists memory_enabled             boolean not null default true,
  add column if not exists personalization_enabled    boolean not null default true,
  add column if not exists disabled_memory_categories text[]  not null default '{}';


-- ─── pgvector (optional — embeddings stored as float8[] regardless) ────────────

create extension if not exists vector;


-- ─── memories ─────────────────────────────────────────────────────────────────

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

create index if not exists memories_user_id_idx
  on public.memories (user_id);

create index if not exists memories_user_category_idx
  on public.memories (user_id, category);

create index if not exists memories_user_reinforced_idx
  on public.memories (user_id, last_reinforced_at desc);

alter table public.memories enable row level security;

drop policy if exists "memories: select own" on public.memories;
create policy "memories: select own"
  on public.memories for select
  using (auth.uid() = user_id);

drop policy if exists "memories: insert own" on public.memories;
create policy "memories: insert own"
  on public.memories for insert
  with check (auth.uid() = user_id);

drop policy if exists "memories: update own" on public.memories;
create policy "memories: update own"
  on public.memories for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "memories: delete own" on public.memories;
create policy "memories: delete own"
  on public.memories for delete
  using (auth.uid() = user_id);

drop trigger if exists memories_set_updated_at on public.memories;
create trigger memories_set_updated_at
  before update on public.memories
  for each row execute procedure public.set_updated_at();


-- ─── memory_embeddings ────────────────────────────────────────────────────────

create table if not exists public.memory_embeddings (
  id         uuid        primary key default gen_random_uuid(),
  memory_id  uuid        not null references public.memories (id) on delete cascade,
  user_id    uuid        not null references auth.users (id) on delete cascade,
  model      text        not null,
  embedding  float8[]    not null,
  created_at timestamptz not null default now()
);

-- Unique constraint added separately so reruns don't fail if table pre-exists
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

create index if not exists memory_embeddings_user_id_idx
  on public.memory_embeddings (user_id);

alter table public.memory_embeddings enable row level security;

drop policy if exists "memory_embeddings: select own" on public.memory_embeddings;
create policy "memory_embeddings: select own"
  on public.memory_embeddings for select
  using (auth.uid() = user_id);

drop policy if exists "memory_embeddings: insert own" on public.memory_embeddings;
create policy "memory_embeddings: insert own"
  on public.memory_embeddings for insert
  with check (auth.uid() = user_id);

drop policy if exists "memory_embeddings: delete own" on public.memory_embeddings;
create policy "memory_embeddings: delete own"
  on public.memory_embeddings for delete
  using (auth.uid() = user_id);


-- ─── memory_relationships ─────────────────────────────────────────────────────

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
    where conname = 'memory_relationships_source_memory_id_target_memory_id_relatio_key'
      and conrelid = 'public.memory_relationships'::regclass
  ) and not exists (
    select 1 from pg_constraint
    where conname = 'memory_relationships_source_memory_id_target_memory_id_relationship_type_key'
      and conrelid = 'public.memory_relationships'::regclass
  ) then
    alter table public.memory_relationships
      add constraint memory_relationships_source_memory_id_target_memory_id_relationship_type_key
      unique (source_memory_id, target_memory_id, relationship_type);
  end if;
end $$;

create index if not exists memory_relationships_user_id_idx
  on public.memory_relationships (user_id);

create index if not exists memory_relationships_source_idx
  on public.memory_relationships (source_memory_id);

alter table public.memory_relationships enable row level security;

drop policy if exists "memory_relationships: select own" on public.memory_relationships;
create policy "memory_relationships: select own"
  on public.memory_relationships for select
  using (auth.uid() = user_id);

drop policy if exists "memory_relationships: insert own" on public.memory_relationships;
create policy "memory_relationships: insert own"
  on public.memory_relationships for insert
  with check (auth.uid() = user_id);

drop policy if exists "memory_relationships: delete own" on public.memory_relationships;
create policy "memory_relationships: delete own"
  on public.memory_relationships for delete
  using (auth.uid() = user_id);


-- ─── daily_reflections ────────────────────────────────────────────────────────

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

create index if not exists daily_reflections_user_id_idx
  on public.daily_reflections (user_id);

create index if not exists daily_reflections_date_idx
  on public.daily_reflections (user_id, reflection_date desc);

alter table public.daily_reflections enable row level security;

drop policy if exists "daily_reflections: select own" on public.daily_reflections;
create policy "daily_reflections: select own"
  on public.daily_reflections for select
  using (auth.uid() = user_id);

drop policy if exists "daily_reflections: insert own" on public.daily_reflections;
create policy "daily_reflections: insert own"
  on public.daily_reflections for insert
  with check (auth.uid() = user_id);

drop policy if exists "daily_reflections: update own" on public.daily_reflections;
create policy "daily_reflections: update own"
  on public.daily_reflections for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "daily_reflections: delete own" on public.daily_reflections;
create policy "daily_reflections: delete own"
  on public.daily_reflections for delete
  using (auth.uid() = user_id);
