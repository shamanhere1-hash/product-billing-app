-- Insert default PINs (hashed with simple bcrypt-compatible hash for demo)
-- In production, these would be properly hashed via edge function
-- Default: main_app=1234, history_summary=5678, owner=9999
INSERT INTO public.app_pins (pin_type, pin_hash) VALUES
  ('main_app', '1234'),
  ('history_summary', '5678'),
  ('owner', '9999'),
  ('admin', '123456');

-- Insert sample products
INSERT INTO public.products (name, price, category) VALUES
  ('Notebook A4', 45, 'Notebooks'),
  ('Notebook A5', 35, 'Notebooks'),
  ('Ballpoint Pen', 10, 'Pens'),
  ('Gel Pen', 25, 'Pens'),
  ('Pencil HB', 5, 'Pencils'),
  ('Mechanical Pencil', 40, 'Pencils'),
  ('Eraser', 8, 'Accessories'),
  ('Sharpener', 12, 'Accessories'),
  ('Ruler 30cm', 15, 'Accessories'),
  ('Scissors', 35, 'Accessories'),
  ('Glue Stick', 20, 'Accessories'),
  ('Highlighter Set', 60, 'Pens'),
  ('Sticky Notes', 30, 'Paper'),
  ('A4 Paper Pack', 150, 'Paper'),
  ('File Folder', 25, 'Storage'),
  ('Stapler', 80, 'Accessories'),
  ('Staple Pins', 15, 'Accessories'),
  ('Paper Clips', 10, 'Accessories'),
  ('Correction Tape', 35, 'Accessories'),
  ('Marker Set', 120, 'Pens');

