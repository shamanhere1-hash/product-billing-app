import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useOfflineSync } from '@/hooks/useOfflineSync';

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  overriddenPrice?: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  items: CartItem[];
  total: number;
  createdAt: Date;
  status: 'pending' | 'packed' | 'billed' | 'deleted';
}

interface BillingContextType {
  products: Product[];
  cart: CartItem[];
  orders: Order[];
  loading: boolean;
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updatePrice: (productId: string, price: number) => void;
  clearCart: () => void;
  createOrder: (customerName: string) => Promise<Order | null>;
  updateOrder: (orderId: string, items: CartItem[], total: number) => Promise<boolean>;
  updateOrderStatus: (orderId: string, status: Order['status']) => Promise<void>;
  softDeleteOrder: (orderId: string) => Promise<void>;
  resetAllBills: () => Promise<void>;
  getCartTotal: () => number;
  getCartItemCount: () => number;
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (id: string, product: Omit<Product, 'id'>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
}

const BillingContext = createContext<BillingContextType | undefined>(undefined);

export function BillingProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('ph_cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Persist cart to local storage whenever it changes
  useEffect(() => {
    localStorage.setItem('ph_cart', JSON.stringify(cart));
  }, [cart]);

  const { isOnline, addPendingOperation, pendingOperations, removePendingOperation } = useOfflineSync();

  // Sync Processor
  useEffect(() => {
    const processQueue = async () => {
      if (!isOnline || pendingOperations.length === 0) return;

      const op = pendingOperations[0]; // Process one at a time (FIFO)
      let success = false;

      try {
        console.log('Processing pending op:', op.type);
        if (op.type === 'create_order') {
          const { order, items } = op.data;
          // Upsert order
          const { error: orderError } = await supabase.from('orders').upsert(order);
          if (!orderError) {
            const { error: itemsError } = await supabase.from('order_items').insert(items);
            if (!itemsError) success = true;
          }
        } else if (op.type === 'update_order') {
          const { orderId, total, items } = op.data;
          const { error: orderError } = await supabase.from('orders').update({ total }).eq('id', orderId);
          if (!orderError) {
            await supabase.from('order_items').delete().eq('order_id', orderId);
            // Re-insert items (map to DB format if needed, but assuming data is prepared)
            // The op.data.items should be pre-formatted for DB in updateOrder
            const { error: itemsError } = await supabase.from('order_items').insert(items);
            if (!itemsError) success = true;
          }
        } else if (op.type === 'update_status') {
          const { orderId, status } = op.data;
          const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
          if (!error) success = true;
        }
      } catch (e) {
        console.error('Sync failed for op:', op.id, e);
      }

      if (success) {
        removePendingOperation(op.id);
      }
    };

    if (isOnline && pendingOperations.length > 0) {
      processQueue();
    }
  }, [isOnline, pendingOperations, removePendingOperation]);

  // Fetch products from database
  const fetchProducts = async () => {
    // 1. Load from cache first
    const cachedProducts = localStorage.getItem('ph_products');
    if (cachedProducts) {
      setProducts(JSON.parse(cachedProducts));
    }

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching products:', error);
      return;
    }

    const mappedProducts = data.map(p => ({
      id: p.id,
      name: p.name,
      price: Number(p.price),
      category: p.category
    }));

    setProducts(mappedProducts);
    localStorage.setItem('ph_products', JSON.stringify(mappedProducts));
  };

  // Fetch orders from database
  const fetchOrders = async () => {
    // 1. Load from cache
    const cachedOrders = localStorage.getItem('ph_orders');
    if (cachedOrders) {
      setOrders(JSON.parse(cachedOrders));
    }

    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .neq('status', 'deleted')
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      return;
    }

    const { data: itemsData, error: itemsError } = await supabase
      .from('order_items')
      .select('*');

    if (itemsError) {
      console.error('Error fetching order items:', itemsError);
      return;
    }

    const ordersWithItems: Order[] = ordersData.map(order => ({
      id: order.id,
      orderNumber: order.order_number,
      customerName: order.customer_name,
      total: Number(order.total),
      status: order.status as Order['status'],
      createdAt: new Date(order.created_at),
      items: itemsData
        .filter(item => item.order_id === order.id)
        .map(item => ({
          product: {
            id: item.product_id,
            name: item.product_name,
            price: Number(item.product_price),
            category: ''
          },
          quantity: item.quantity
        }))
    }));

    setOrders(ordersWithItems);
    localStorage.setItem('ph_orders', JSON.stringify(ordersWithItems));
  };

  // Initial fetch
  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      await Promise.all([fetchProducts(), fetchOrders()]);
      setLoading(false);
    };
    initData();
  }, []);

  // Real-time subscriptions
  useEffect(() => {
    const ordersChannel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchOrders();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_items' },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    const productsChannel = supabase
      .channel('products-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          fetchProducts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(productsChannel);
    };
  }, []);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev =>
      prev.map(item =>
        item.product.id === productId
          ? { ...item, quantity }
          : item
      )
    );
  };

  const updatePrice = (productId: string, price: number) => {
    setCart(prev =>
      prev.map(item =>
        item.product.id === productId
          ? { ...item, overriddenPrice: price }
          : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const generateBillNumber = async (): Promise<string> => {
    const today = new Date();
    const yy = format(today, 'yy');
    const MM = format(today, 'MM');
    const dd = format(today, 'dd');
    const datePrefix = `PH-${yy}${MM}${dd}`;

    // 1. Check local state (fastest & most accurate for offline)
    const localDailyOrders = orders
      .filter(o => o.orderNumber.startsWith(datePrefix))
      .map(o => o.orderNumber);

    let maxCounter = 0;
    localDailyOrders.forEach(num => {
      // Format: PH-YYMMDDNNN
      // We need to extract the last 3 digits.
      // The prefix length is 3 (PH-) + 6 (YYMMDD) = 9 chars.
      // So the number starts at index 9 (if 0-indexed)?
      // PH-260119001 -> 'PH-' is 3, '260119' is 6. Total 9.
      // The rest is the counter.
      const suffix = num.replace(datePrefix, '');
      const c = parseInt(suffix);
      if (!isNaN(c) && c > maxCounter) maxCounter = c;
    });

    // 2. Fallback to DB if empty (only if online and no local state found)
    if (maxCounter === 0 && isOnline) {
      const { data } = await supabase
        .from('orders')
        .select('order_number')
        .ilike('order_number', `${datePrefix}%`)
        .order('order_number', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        // e.g. PH-260119005
        const lastNum = data[0].order_number;
        const suffix = lastNum.replace(datePrefix, '');
        const c = parseInt(suffix);
        if (!isNaN(c)) {
          maxCounter = c;
        }
      }
    }

    return `${datePrefix}${String(maxCounter + 1).padStart(3, '0')}`;
  };

  const createOrder = async (customerName: string): Promise<Order | null> => {
    if (cart.length === 0) return null;
    if (!customerName || customerName.trim() === '') {
      console.error("Customer name is mandatory");
      return null;
    }

    const total = getCartTotal();
    const orderNumber = await generateBillNumber();

    // OPTIMISTIC UPDATE
    const newId = crypto.randomUUID();
    const newOrderData = {
      id: newId,
      order_number: orderNumber,
      customer_name: customerName.trim(),
      total,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    const newOrder: Order = {
      id: newId,
      orderNumber: orderNumber,
      customerName: customerName.trim(),
      items: [...cart],
      total,
      createdAt: new Date(),
      status: 'pending'
    };

    // Update Local immediately
    const updatedOrders = [newOrder, ...orders];
    setOrders(updatedOrders);
    localStorage.setItem('ph_orders', JSON.stringify(updatedOrders));
    clearCart();

    const dbItems = cart.map(item => ({
      order_id: newId,
      product_id: item.product.id,
      product_name: item.product.name,
      product_price: item.overriddenPrice ?? item.product.price,
      quantity: item.quantity
    }));

    // If Offline or Sync fails, queue it
    if (!isOnline) {
      addPendingOperation('create_order', { order: newOrderData, items: dbItems });
      return newOrder;
    }

    try {
      const { error: orderError } = await supabase.from('orders').insert(newOrderData);
      if (orderError) throw orderError;
      const { error: itemsError } = await supabase.from('order_items').insert(dbItems);
      if (itemsError) throw itemsError;
    } catch (e) {
      console.error('Online creation failed, queuing offline:', e);
      addPendingOperation('create_order', { order: newOrderData, items: dbItems });
    }

    return newOrder;
  };

  const addProduct = async (product: Omit<Product, 'id'>) => {
    const { error } = await supabase
      .from('products')
      .insert({
        name: product.name,
        price: product.price,
        category: product.category
      });

    if (error) {
      console.error('Error adding product:', error);
    }
  };

  const updateProduct = async (id: string, product: Omit<Product, 'id'>) => {
    const { error } = await supabase
      .from('products')
      .update({
        name: product.name,
        price: product.price,
        category: product.category
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating product:', error);
    }
  };

  const deleteProduct = async (id: string) => {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting product:', error);
    }
  };

  // 5. Refactor `updateOrder` to use optimistic updates and fallback to offline queue on failure.
  const updateOrder = async (orderId: string, items: CartItem[], total: number): Promise<boolean> => {
    // OPTIMISTIC UPDATE
    const updatedOrders = orders.map(o =>
      o.id === orderId ? { ...o, items, total } : o
    );
    setOrders(updatedOrders);
    localStorage.setItem('ph_orders', JSON.stringify(updatedOrders));

    const dbItems = items.map(item => ({
      order_id: orderId,
      product_id: item.product.id,
      product_name: item.product.name,
      product_price: item.overriddenPrice ?? item.product.price,
      quantity: item.quantity
    }));

    if (!isOnline) {
      addPendingOperation('update_order', { orderId, total, items: dbItems });
      return true;
    }

    try {
      const { error: orderError } = await supabase.from('orders').update({ total }).eq('id', orderId);
      if (orderError) throw orderError;

      await supabase.from('order_items').delete().eq('order_id', orderId);
      const { error: insertError } = await supabase.from('order_items').insert(dbItems);
      if (insertError) throw insertError;
    } catch (e) {
      console.error('Online update failed, queuing offline:', e);
      addPendingOperation('update_order', { orderId, total, items: dbItems });
    }

    return true;
  };

  // 5. Refactor `updateOrderStatus` to use optimistic updates and fallback to offline queue on failure.
  const updateOrderStatus = async (orderId: string, status: Order['status']) => {
    // Optimistic Update
    const updatedOrders = orders.map(o =>
      o.id === orderId ? { ...o, status } : o
    );
    setOrders(updatedOrders);
    localStorage.setItem('ph_orders', JSON.stringify(updatedOrders));

    if (!isOnline) {
      addPendingOperation('update_status', { orderId, status });
      return;
    }

    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId);

    if (error) {
      console.error('Error updating order status:', error);
      // Revert optimism? Or Queue it? Queueing is safer.
      addPendingOperation('update_status', { orderId, status });
    }
  };

  const softDeleteOrder = async (orderId: string) => {
    await updateOrderStatus(orderId, 'deleted');
  };

  const resetAllBills = async () => {
    const { error } = await supabase
      .from('orders')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (error) {
      console.error('Error resetting bills:', error);
    }
    setCart([]);
  };

  const getCartTotal = () => {
    return cart.reduce((sum, item) => {
      const price = item.overriddenPrice ?? item.product.price;
      return sum + price * item.quantity;
    }, 0);
  };

  const getCartItemCount = () => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  };

  return (
    <BillingContext.Provider
      value={{
        products,
        cart,
        orders,
        loading,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        createOrder,
        updateOrder,
        updateOrderStatus,
        softDeleteOrder,
        resetAllBills,
        getCartTotal,
        getCartItemCount,
        addProduct,
        updateProduct,
        updatePrice,
        deleteProduct,
      }}
    >
      {children}
    </BillingContext.Provider>
  );
}

export function useBilling() {
  const context = useContext(BillingContext);
  if (context === undefined) {
    throw new Error('useBilling must be used within a BillingProvider');
  }
  return context;
}
