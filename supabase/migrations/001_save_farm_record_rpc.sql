-- ============================================================
-- Migration 001: Atomic farm record save (log + task)
--
-- Wraps the INSERT into `logs` and `tasks` in a single
-- PostgreSQL function so both succeed or both roll back.
-- PostgreSQL functions execute within the caller's transaction,
-- so any unhandled exception automatically aborts both INSERTs.
-- ============================================================

CREATE OR REPLACE FUNCTION public.save_farm_record(
  p_house_id         UUID,
  p_raw_transcript   TEXT,
  p_structured_data  JSONB,
  p_task_description TEXT,
  p_due_date         DATE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER                 -- Runs with definer's privileges (bypasses RLS safely)
SET search_path = public         -- Prevent search_path hijacking
AS $$
BEGIN
  -- Insert the voice transcript + AI-extracted structured data
  INSERT INTO logs (house_id, raw_transcript, structured_data)
  VALUES (p_house_id, p_raw_transcript, p_structured_data);

  -- Insert the next-day task derived from the AI extraction
  INSERT INTO tasks (house_id, task_description, status, due_date)
  VALUES (p_house_id, p_task_description, 'pending', p_due_date);

  -- If either INSERT raises an exception, PostgreSQL unwinds the entire
  -- function call as one atomic unit — no partial state is committed.
END;
$$;

-- ── Permissions ───────────────────────────────────────────────
-- Revoke default PUBLIC execute, then grant only to authenticated role.
-- Anon/public callers cannot trigger this function directly.
REVOKE ALL ON FUNCTION public.save_farm_record(UUID, TEXT, JSONB, TEXT, DATE) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.save_farm_record(UUID, TEXT, JSONB, TEXT, DATE) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.save_farm_record(UUID, TEXT, JSONB, TEXT, DATE) TO service_role;
