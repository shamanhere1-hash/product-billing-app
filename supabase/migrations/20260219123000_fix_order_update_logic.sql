
-- Create a function to update order items transactionally
CREATE OR REPLACE FUNCTION public.update_order_items(
  p_order_id UUID,
  p_total NUMERIC,
  p_items JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  item JSONB;
BEGIN
  -- Update order total
  UPDATE public.orders
  SET total = p_total
  WHERE id = p_order_id;

  -- Delete existing items
  DELETE FROM public.order_items
  WHERE order_id = p_order_id;

  -- Insert new items[
  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.order_items (
      order_id,
      product_id,
      product_name,
      product_price,
      quantity,
      is_out_of_stock
    ) VALUES (
      p_order_id,
      (item->>'product_id')::UUID,
      item->>'product_name',
      (item->>'product_price')::NUMERIC,
      (item->>'quantity')::INTEGER,
      COALESCE((item->>'is_out_of_stock')::BOOLEAN, false)
    );
  END LOOP;
END;
$$;
