-- Booking app schema for snizzcebu-book
-- Applied to project scjeculrqaxrpyjvjbrz

CREATE TABLE IF NOT EXISTS public.packages (
  id text PRIMARY KEY,
  title text NOT NULL,
  min_pax integer NOT NULL DEFAULT 2,
  max_pax integer NOT NULL DEFAULT 10,
  slots_available integer NOT NULL DEFAULT 10,
  days integer NOT NULL DEFAULT 1,
  nights integer NOT NULL DEFAULT 0,
  destinations text[] NOT NULL DEFAULT '{}',
  accommodation text[] NOT NULL DEFAULT '{}',
  inclusions text[] NOT NULL DEFAULT '{}',
  inclusions_note text NOT NULL DEFAULT '',
  exclusions text[] NOT NULL DEFAULT '{}',
  exclusions_note text NOT NULL DEFAULT '',
  rates_per_pax numeric[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bookings (
  id text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  tour_date date NOT NULL,
  package_id text NOT NULL REFERENCES public.packages(id) ON DELETE RESTRICT,
  package_title text NOT NULL DEFAULT '',
  guests integer NOT NULL DEFAULT 0,
  price_per_pax numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  customer_name text NOT NULL DEFAULT 'Guest',
  customer_phone text NOT NULL DEFAULT '',
  payment_proof_url text NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS bookings_tour_date_idx ON public.bookings (tour_date);
CREATE INDEX IF NOT EXISTS bookings_package_id_idx ON public.bookings (package_id);
CREATE INDEX IF NOT EXISTS bookings_status_idx ON public.bookings (status);
CREATE INDEX IF NOT EXISTS bookings_created_at_idx ON public.bookings (created_at DESC);

CREATE TABLE IF NOT EXISTS public.blocked_dates (
  id text PRIMARY KEY,
  date date NOT NULL,
  package_id text NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  reason text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (date, package_id)
);

CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  endpoint text PRIMARY KEY,
  p256dh text,
  auth text,
  expiration_time bigint NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_credentials (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  password_hash text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
