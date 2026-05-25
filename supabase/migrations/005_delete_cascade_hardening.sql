-- ─────────────────────────────────────────────────────────────────────────────
-- 005_delete_cascade_hardening.sql — Cascade safety + policy tightening
--
-- Idempotent. Safe to re-run.
--
-- Fixes:
--   1. tasks UPDATE policy missing WITH CHECK (prevents user_id mutation)
--   2. tasks.conversation_id gets FK to conversations with SET NULL on delete
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Fix tasks UPDATE policy (add WITH CHECK) ─────────────────────────────────

drop policy if exists "tasks: update own" on public.tasks;
create policy "tasks: update own"
  on public.tasks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Add missing FK: tasks.conversation_id → conversations(id) ───────────────
-- Uses SET NULL so tasks survive when a conversation is soft- or hard-deleted.

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'tasks_conversation_id_fkey'
      and table_name = 'tasks'
      and table_schema = 'public'
  ) then
    alter table public.tasks
      add constraint tasks_conversation_id_fkey
      foreign key (conversation_id) references public.conversations(id)
      on delete set null;
  end if;
end $$;
