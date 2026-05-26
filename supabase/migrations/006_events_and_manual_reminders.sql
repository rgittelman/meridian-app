-- ─────────────────────────────────────────────────────────────────────────────
-- 006_events_and_manual_reminders.sql — Events support + manual reminder creation
--
-- Idempotent. Safe to re-run.
--
-- Changes:
--   1. Expand tasks.task_type to include 'event'
--   2. Add 'manual' to reminders.reminder_type
--   3. Add reminders.scheduled_date (date-only, for day-level reminders)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Expand task_type constraint to include 'event' ────────────────────────────

alter table public.tasks drop constraint if exists tasks_task_type_check;
alter table public.tasks
  add constraint tasks_task_type_check
  check (task_type in ('hard', 'soft', 'event'));

-- ── Expand reminder_type constraint to include 'manual' ──────────────────────

alter table public.reminders drop constraint if exists reminders_reminder_type_check;
alter table public.reminders
  add constraint reminders_reminder_type_check
  check (reminder_type in ('task', 'contextual', 'recurring', 'reflection', 'manual'));

-- ── Add scheduled_date for day-level reminder scheduling ─────────────────────

alter table public.reminders
  add column if not exists scheduled_date date;

create index if not exists reminders_scheduled_date_idx
  on public.reminders (user_id, scheduled_date)
  where status = 'pending';
