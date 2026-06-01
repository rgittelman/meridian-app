-- 006_rls_priorities_fix.sql
-- Immediate security remediation: ensure public.priorities is NOT publicly accessible.
--
-- Scope: priorities ONLY.
-- Notes:
-- - This table currently has RLS disabled, which fully exposes it via the Supabase Data API.
-- - This migration backfills NULL user_id rows to the current owner, then enforces per-user access.
--
-- Verified current owner (based on existing app data in tasks/reminders/messages/conversations):
--   bbdb4bd4-6e13-47c4-b0eb-20656a718d74
--
-- If your production dataset is different, replace OWNER_USER_ID below before running.

DO $$
DECLARE
  OWNER_USER_ID uuid := 'bbdb4bd4-6e13-47c4-b0eb-20656a718d74';
BEGIN
  -- 1) Backfill NULL user_id rows (required before setting NOT NULL)
  UPDATE public.priorities
     SET user_id = OWNER_USER_ID
   WHERE user_id IS NULL;

  -- 2) Enforce ownership integrity
  ALTER TABLE public.priorities
    ALTER COLUMN user_id SET DEFAULT auth.uid();

  ALTER TABLE public.priorities
    ALTER COLUMN user_id SET NOT NULL;

  -- 3) Enable RLS (do NOT force, to keep service role/admin workflows intact)
  ALTER TABLE public.priorities ENABLE ROW LEVEL SECURITY;

  -- 4) Drop/recreate policies (authenticated only)
  DROP POLICY IF EXISTS priorities_select_own ON public.priorities;
  DROP POLICY IF EXISTS priorities_insert_own ON public.priorities;
  DROP POLICY IF EXISTS priorities_update_own ON public.priorities;
  DROP POLICY IF EXISTS priorities_delete_own ON public.priorities;

  CREATE POLICY priorities_select_own
  ON public.priorities
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

  CREATE POLICY priorities_insert_own
  ON public.priorities
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

  CREATE POLICY priorities_update_own
  ON public.priorities
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

  CREATE POLICY priorities_delete_own
  ON public.priorities
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
END $$;

