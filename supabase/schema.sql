-- ============================================================
-- Agricultural DX Task Management System — Supabase Schema
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Tables ────────────────────────────────────────────────────

-- Houses: Physical farm locations / greenhouses accessed via NFC/QR
CREATE TABLE IF NOT EXISTS houses (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  latitude    NUMERIC(10, 7),
  longitude   NUMERIC(11, 7),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tasks: Work items tied to a specific house, created by AI from voice logs
CREATE TABLE IF NOT EXISTS tasks (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id         UUID        NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  task_description TEXT        NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'pending'
                               CONSTRAINT tasks_status_check
                               CHECK (status IN ('pending', 'completed')),
  due_date         DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Logs: Voice transcript history with AI-extracted structured JSONB data
CREATE TABLE IF NOT EXISTS logs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id        UUID        NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  raw_transcript  TEXT,
  structured_data JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────

-- Speed up the most common query: pending tasks per house on page load
CREATE INDEX IF NOT EXISTS idx_tasks_house_status
  ON tasks(house_id, status);

-- Speed up log history queries
CREATE INDEX IF NOT EXISTS idx_logs_house_created
  ON logs(house_id, created_at DESC);

-- ── Row Level Security ────────────────────────────────────────

ALTER TABLE houses ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks  ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs   ENABLE ROW LEVEL SECURITY;

-- Houses: read/write for authenticated users
CREATE POLICY "houses_select" ON houses FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "houses_insert" ON houses FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "houses_update" ON houses FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Tasks: read/write for authenticated users
CREATE POLICY "tasks_select" ON tasks FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "tasks_insert" ON tasks FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "tasks_update" ON tasks FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Logs: read/write for authenticated users
CREATE POLICY "logs_select" ON logs FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "logs_insert" ON logs FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ── Atomic RPC: save log + task in one transaction ───────────
-- See migrations/001_save_farm_record_rpc.sql for the full definition.
-- Run that migration after this schema to enable atomic writes.

-- ── Seed Data (development only) ─────────────────────────────

-- INSERT INTO houses (name, latitude, longitude) VALUES
--   ('第1ハウス', 35.6895, 139.6917),
--   ('第2ハウス', 35.6900, 139.6925),
--   ('露地畑A区画', 35.6910, 139.6930);
