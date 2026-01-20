import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ShoppingBag, Check, User } from 'lucide-react';
import { useBilling } from '@/context/BillingContext';
import { ProductCard } from '@/components/ProductCard';
import { CartItemComponent } from '@/components/CartItem';
import { BackButton } from '@/components/BackButton';
import { toast } from 'sonner';

const TakingOrder = () => {
  const navigate = useNavigate();
  const {
    products,
    cart,
    addToCart,
    updateQuantity,
    updatePrice,
    removeFromCart,
    clearCart,
    createOrder,
    getCartTotal,
    getCartItemCount
  } = useBilling();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');

  const categories = [...new Set(products.map(p => p.category))];

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCreateOrder = async () => {
    if (!customerName.trim()) {
      toast.error('Customer Name is required', {
        description: 'Please enter customer name to proceed',
      });
      return;
    }

    const order = await createOrder(customerName);
    if (order) {
      toast.success('Order created successfully!', {
        description: `Order ${order.orderNumber} for ${order.customerName} - ₹${order.total}`,
      });
      setCustomerName('');
      navigate('/pack-check');
    } else {
      toast.error('Cart is empty', {
        description: 'Add some products to create an order',
      });
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <BackButton />
        <h1 className="page-title">Taking Order</h1>
      </div>

      <div className="flex flex-col-reverse lg:flex-row gap-6">
        {/* Products Section */}
        <div className="flex-1">
          {/* Search & Filter */}
          <div className="mb-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-card border border-input focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${!selectedCategory
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
              >
                All
              </button>
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === category
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Products Grid */}
          <div className="grid-products">
            {filteredProducts.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onAdd={addToCart}
              />
            ))}
          </div>
        </div>

        {/* Cart Section */}
        <div className="lg:w-96 sticky top-0 lg:top-4 z-50 lg:self-start bg-background/95 backdrop-blur pb-4 lg:bg-transparent lg:pb-0 max-h-[calc(100vh-2rem)] overflow-y-auto no-scrollbar transition-all duration-300">
          <div className="bg-card rounded-xl p-4 shadow-sm border border-border mt-4 lg:mt-0">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingBag className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-foreground">Cart</h2>
              {getCartItemCount() > 0 && (
                <span className="ml-auto px-2 py-0.5 bg-primary/10 text-primary rounded-full text-sm font-medium">
                  {getCartItemCount()} items
                </span>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingBag className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>Cart is empty</p>
                <p className="text-sm">Tap products to add</p>
              </div>
            ) : (
              <>
                <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
                  {cart.map(item => (
                    <CartItemComponent
                      key={item.product.id}
                      item={item}
                      onUpdateQuantity={updateQuantity}
                      onRemove={removeFromCart}
                    />
                  ))}
                </div>

                <div className="border-t border-border pt-4 space-y-3">
                  {/* Customer Name Input */}
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Customer name (optional)"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCreateOrder();
                        }
                      }}
                      className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-background border border-input focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                    />
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total</span>
                    <span className="text-2xl font-bold text-primary">₹{getCartTotal()}</span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={clearCart}
                      className="flex-1 py-3 rounded-xl bg-secondary text-secondary-foreground font-medium hover:bg-secondary/80 transition-colors"
                    >
                      Clear
                    </button>
                    <button
                      onClick={handleCreateOrder}
                      className="flex-1 py-3 rounded-xl bg-accent text-accent-foreground font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                    >
                      <Check className="w-5 h-5" />
                      Create Order
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TakingOrder;
