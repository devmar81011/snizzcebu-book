-- Extra booking fields + commission payouts
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_note text NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS public.commission_payouts (
  id text PRIMARY KEY,
  period_key text NOT NULL UNIQUE,
  period_type text NOT NULL CHECK (period_type IN ('week', 'month', 'alltime')),
  label text NOT NULL DEFAULT '',
  income_amount numeric NOT NULL DEFAULT 0,
  commission_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'collected',
  proof_url text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  collected_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS commission_payouts_period_type_idx
  ON public.commission_payouts (period_type);

ALTER TABLE public.commission_payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS commission_payouts_all ON public.commission_payouts;
CREATE POLICY commission_payouts_all
  ON public.commission_payouts FOR ALL
  TO anon, authenticated
  USING (true) WITH CHECK (true);
