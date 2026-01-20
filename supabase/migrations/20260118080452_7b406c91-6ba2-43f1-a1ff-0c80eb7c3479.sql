-- Create products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create orders table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL DEFAULT 'Guest',
  total NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'packed', 'billed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create order_items table
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  product_name TEXT NOT NULL,
  product_price NUMERIC NOT NULL,
  quantity INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security (allow all for now as no auth)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (public shop access)
CREATE POLICY "Allow all access to products" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to order_items" ON public.order_items FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime for orders and order_items
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;

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