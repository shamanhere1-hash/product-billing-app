-- Add cost_settings_pin type to app_pins and app_sessions

-- Drop and recreate CHECK constraint on app_pins to allow new pin type
ALTER TABLE public.app_pins DROP CONSTRAINT IF EXISTS app_pins_pin_type_check;
ALTER TABLE public.app_pins ADD CONSTRAINT app_pins_pin_type_check 
  CHECK (pin_type IN ('main_app', 'history_summary', 'owner', 'admin', 'cost_settings_pin'));

-- Drop and recreate CHECK constraint on app_sessions to allow new session type
ALTER TABLE public.app_sessions DROP CONSTRAINT IF EXISTS app_sessions_session_type_check;
ALTER TABLE public.app_sessions ADD CONSTRAINT app_sessions_session_type_check 
  CHECK (session_type IN ('main_app', 'history_summary', 'owner', 'admin', 'cost_settings_pin'));

-- Insert default cost_settings_pin (0000) - will be auto-migrated to bcrypt on first verify
INSERT INTO public.app_pins (pin_type, pin_hash) 
VALUES ('cost_settings_pin', '0000')
ON CONFLICT (pin_type) DO NOTHING;
