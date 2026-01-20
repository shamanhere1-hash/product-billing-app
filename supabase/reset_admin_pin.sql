-- Force reset Admin PIN to 4321
-- First, remove any existing admin pin entry to avoid conflicts
DELETE FROM public.app_pins WHERE pin_type = 'admin';

-- Insert the new plaintext PIN '4321'
-- The system will automatically migrate this to a secure hash on your first successful login.
INSERT INTO public.app_pins (pin_type, pin_hash) 
VALUES ('admin', '4321');
