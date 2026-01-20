-- Remove old constraints
ALTER TABLE public.app_pins DROP CONSTRAINT IF EXISTS app_pins_pin_type_check;
ALTER TABLE public.app_sessions DROP CONSTRAINT IF EXISTS app_sessions_session_type_check;

-- Add new constraints including 'admin'
ALTER TABLE public.app_pins ADD CONSTRAINT app_pins_pin_type_check CHECK (pin_type IN ('main_app', 'history_summary', 'owner', 'admin'));
ALTER TABLE public.app_sessions ADD CONSTRAINT app_sessions_session_type_check CHECK (session_type IN ('main_app', 'history_summary', 'owner', 'admin'));

-- Create table for rate limiting if it doesn't exist
create table if not exists public.app_pin_attempts (
  id uuid default gen_random_uuid() primary key,
  ip_address text not null,
  attempt_count int default 1,
  last_attempt_at timestamptz default now(),
  blocked_until timestamptz
);

-- Index for faster lookups
create index if not exists idx_pin_attempts_ip on public.app_pin_attempts(ip_address);
