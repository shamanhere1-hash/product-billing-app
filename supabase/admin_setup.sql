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

-- Insert default Admin PIN if not exists (Default: 123456)
-- Note: The backend will auto-migrate this to a hash on first login if strictly implementing the plan,
-- but for security, we should ideally start with a hash or let the backend handle the plaintext '123456' -> hash transition.
insert into public.app_pins (pin_type, pin_hash)
select 'admin', '123456'
where not exists (
  select 1 from public.app_pins where pin_type = 'admin'
);
