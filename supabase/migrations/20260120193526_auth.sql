-- Create table for storing hashed PINs (backend-only, no RLS read for regular users)
CREATE TABLE public.app_pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pin_type text NOT NULL UNIQUE CHECK (pin_type IN ('main_app', 'history_summary', 'owner', 'admin')),
  pin_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_pins ENABLE ROW LEVEL SECURITY;

-- No SELECT policy for regular users - PINs can only be verified via edge function
-- Only allow updates through edge functions (service role)

-- Create table for active sessions
CREATE TABLE public.app_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token text NOT NULL UNIQUE,
  session_type text NOT NULL CHECK (session_type IN ('main_app', 'history_summary', 'owner', 'admin')),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on sessions
ALTER TABLE public.app_sessions ENABLE ROW LEVEL SECURITY;

-- Allow reading sessions to verify validity
CREATE POLICY "Allow reading sessions" ON public.app_sessions
  FOR SELECT USING (true);

-- Sessions can only be created/deleted via edge functions

-- Create table for immutable billing history
CREATE TABLE public.billing_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_number text NOT NULL UNIQUE,
  customer_name text NOT NULL DEFAULT 'Guest',
  bill_date date NOT NULL DEFAULT CURRENT_DATE,
  day_of_week text NOT NULL,
  bill_time time NOT NULL DEFAULT CURRENT_TIME,
  items jsonb NOT NULL,
  total numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.billing_history ENABLE ROW LEVEL SECURITY;

-- Allow reading billing history (after PIN verification handled by app)
CREATE POLICY "Allow reading billing history" ON public.billing_history
  FOR SELECT USING (true);

-- Allow inserting billing history (append-only)
CREATE POLICY "Allow inserting billing history" ON public.billing_history
  FOR INSERT WITH CHECK (true);

-- NO UPDATE or DELETE policies - immutable!

-- Create table for daily bill counter
CREATE TABLE public.bill_counter (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  counter_date date NOT NULL UNIQUE DEFAULT CURRENT_DATE,
  last_number integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bill_counter ENABLE ROW LEVEL SECURITY;

-- Allow reading and updating bill counter
CREATE POLICY "Allow all access to bill_counter" ON public.bill_counter
  FOR ALL USING (true) WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers for timestamp updates
CREATE TRIGGER update_app_pins_updated_at
  BEFORE UPDATE ON public.app_pins
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bill_counter_updated_at
  BEFORE UPDATE ON public.bill_counter
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for sessions and billing history
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.billing_history;

-- Create table for rate limiting
CREATE TABLE public.app_pin_attempts (
  id uuid default gen_random_uuid() primary key,
  ip_address text not null,
  attempt_count int default 1,
  last_attempt_at timestamptz default now(),
  blocked_until timestamptz
);

-- Index for faster lookups
CREATE INDEX idx_pin_attempts_ip on public.app_pin_attempts(ip_address);
