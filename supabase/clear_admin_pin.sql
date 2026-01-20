-- Delete Admin PIN to allow testing "First-Time Setup"
DELETE FROM public.app_pins WHERE pin_type = 'admin';
