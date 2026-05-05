-- Push subscription storage for Web Push Notifications.
-- Each row represents one browser/device subscription endpoint.

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint        text        NOT NULL UNIQUE,
  p256dh          text        NOT NULL,
  auth            text        NOT NULL,
  expiration_time bigint,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Index for quick lookups during broadcast sends
CREATE INDEX IF NOT EXISTS push_subscriptions_created_idx
  ON public.push_subscriptions (created_at DESC);

-- RLS: only the service role (API routes) can read/write subscriptions.
-- Anon users can INSERT their own subscription but cannot read others'.
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role full access"
  ON public.push_subscriptions
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "anon can insert own subscription"
  ON public.push_subscriptions
  FOR INSERT
  WITH CHECK (true);
