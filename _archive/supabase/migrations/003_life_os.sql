-- ─────────────────────────────────────────────────────────────────────────────
-- Meridian Life OS — domains, tasks, reminders
-- Idempotent migration. Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── memories: cross-domain tagging ──────────────────────────────────────────

alter table public.memories
  add column if not exists domains text[] not null default '{}';

create index if not exists memories_domains_idx
  on public.memories using gin (domains);


-- ─── user_preferences: reminder controls ───────────────────────────────────────

alter table public.user_preferences
  add column if not exists reminders_enabled  boolean not null default true,
  add column if not exists disabled_domains   text[]  not null default '{}';


-- ─── tasks ───────────────────────────────────────────────────────────────────

create table if not exists public.tasks (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references auth.users (id) on delete cascade,
  title            text        not null,
  description      text,
  task_type        text        not null default 'soft'
                     check (task_type in ('hard', 'soft')),
  status           text        not null default 'open'
                     check (status in ('open', 'done', 'dismissed', 'snoozed')),
  confidence       float       not null default 0.6
                     check (confidence >= 0 and confidence <= 1),
  due_date         date,
  due_at           timestamptz,
  domains          text[]      not null default '{}',
  source_type      text        not null default 'conversation'
                     check (source_type in ('conversation', 'manual', 'memory', 'integration')),
  source_id        text,
  memory_id        uuid        references public.memories (id) on delete set null,
  conversation_id  uuid,
  postpone_count   int         not null default 0,
  metadata         jsonb       not null default '{}',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists tasks_user_status_idx
  on public.tasks (user_id, status);
create index if not exists tasks_user_due_idx
  on public.tasks (user_id, due_date)
  where status = 'open';


-- ─── reminders ───────────────────────────────────────────────────────────────

create table if not exists public.reminders (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references auth.users (id) on delete cascade,
  title           text        not null,
  body            text,
  reminder_type   text        not null default 'contextual'
                    check (reminder_type in ('task', 'contextual', 'recurring', 'reflection')),
  status          text        not null default 'pending'
                    check (status in ('pending', 'sent', 'dismissed', 'snoozed')),
  task_id         uuid        references public.tasks (id) on delete set null,
  memory_id       uuid        references public.memories (id) on delete set null,
  scheduled_for   timestamptz,
  recurrence      text,
  why_shown       text,
  gentle          boolean     not null default true,
  domains         text[]      not null default '{}',
  metadata        jsonb       not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists reminders_user_status_idx
  on public.reminders (user_id, status);
create index if not exists reminders_scheduled_idx
  on public.reminders (user_id, scheduled_for)
  where status = 'pending';


-- ─── RLS ─────────────────────────────────────────────────────────────────────

alter table public.tasks enable row level security;
alter table public.reminders enable row level security;

drop policy if exists "tasks: select own" on public.tasks;
create policy "tasks: select own" on public.tasks for select using (auth.uid() = user_id);
drop policy if exists "tasks: insert own" on public.tasks;
create policy "tasks: insert own" on public.tasks for insert with check (auth.uid() = user_id);
drop policy if exists "tasks: update own" on public.tasks;
create policy "tasks: update own" on public.tasks for update using (auth.uid() = user_id);
drop policy if exists "tasks: delete own" on public.tasks;
create policy "tasks: delete own" on public.tasks for delete using (auth.uid() = user_id);

drop policy if exists "reminders: select own" on public.reminders;
create policy "reminders: select own" on public.reminders for select using (auth.uid() = user_id);
drop policy if exists "reminders: insert own" on public.reminders;
create policy "reminders: insert own" on public.reminders for insert with check (auth.uid() = user_id);
drop policy if exists "reminders: update own" on public.reminders;
create policy "reminders: update own" on public.reminders for update using (auth.uid() = user_id);
drop policy if exists "reminders: delete own" on public.reminders;
create policy "reminders: delete own" on public.reminders for delete using (auth.uid() = user_id);


-- ─── updated_at triggers ───────────────────────────────────────────────────────

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute procedure public.set_updated_at();

drop trigger if exists reminders_set_updated_at on public.reminders;
create trigger reminders_set_updated_at
  before update on public.reminders
  for each row execute procedure public.set_updated_at();
