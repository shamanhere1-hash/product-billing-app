import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ShoppingBag, Check, User, ChevronUp, ChevronDown } from "lucide-react";
import { useBilling } from "@/context/BillingContext";
import { ProductCard } from "@/components/ProductCard";
import { CartItemComponent } from "@/components/CartItem";
import { CartDrawer } from "@/components/CartDrawer";
import { BackButton } from "@/components/BackButton";
import { SelectedProductCard } from "@/components/SelectedProductCard";
import { toast } from "sonner";

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
    getCartItemCount,
  } = useBilling();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [isCartExpanded, setIsCartExpanded] = useState(false);

  const categories = [...new Set(products.map((p) => p.category))];

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    let matchesCategory = true;
    if (selectedCategory === "Selected") {
      matchesCategory = cart.some((item) => item.product.id === product.id);
    } else if (selectedCategory) {
      matchesCategory = product.category === selectedCategory;
    }

    return matchesSearch && matchesCategory;
  });

  const handleCreateOrder = async () => {
    if (!customerName.trim()) {
      toast.error("Customer Name is required", {
        description: "Please enter customer name to proceed",
      });
      return;
    }

    const order = await createOrder(customerName);
    if (order) {
      toast.success("Order created successfully!", {
        description: `Order ${order.orderNumber} for ${order.customerName} - ₹${order.total}`,
      });
      setCustomerName("");
      navigate("/pack-check");
    } else {
      toast.error("Cart is empty", {
        description: "Add some products to create an order",
      });
    }
  };

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveItem(productId);
    } else {
      updateQuantity(productId, quantity);
    }
  };

  const handleRemoveItem = (productId: string) => {
    const itemToRemove = cart.find((item) => item.product.id === productId);
    if (!itemToRemove) return;

    removeFromCart(productId);

    toast("Item removed", {
      description: `${itemToRemove.product.name} removed from cart`,
      action: {
        label: "Undo",
        onClick: () => addToCart(itemToRemove.product, itemToRemove.quantity),
      },
      duration: 5000,
    });
  };

  return (
    <div className="page-container pb-24">
      {/* Sticky Header Group */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm -mx-4 px-4 pt-4 pb-2 border-b border-border shadow-sm mb-4">
        {/* Top Row: Title & Back */}
        <div className="flex items-center gap-4 mb-3">
          <BackButton />
          <h1 className="page-title text-xl md:text-2xl">Taking Order</h1>

          {/* Cart Summary Bar - Compact & Right Aligned */}
          <div className="ml-auto flex items-center gap-3">
            <div className="flex flex-col items-end mr-2">
              <span className="text-xs text-muted-foreground">Total</span>
              <span className="font-bold text-primary">₹{getCartTotal()}</span>
            </div>

            <button
              onClick={() => setIsCartExpanded(true)}
              className="relative p-2.5 rounded-xl bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-transform active:scale-95 flex items-center gap-2"
            >
              <div className="relative">
                <ShoppingBag className="w-5 h-5" />
                {cart.length > 0 && (
                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-primary">
                    {cart.length}
                  </span>
                )}
              </div>
              <span className="font-semibold text-sm hidden sm:inline">View Cart</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-secondary/50 border border-input/50 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 [&::-webkit-scrollbar]:hidden">
          <button
            onClick={() => setSelectedCategory(selectedCategory === "Selected" ? null : "Selected")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${selectedCategory === "Selected"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background text-secondary-foreground border-border hover:bg-secondary/50"
              }`}
          >
            Selected ({cart.length})
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${selectedCategory === category
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-secondary-foreground border-border hover:bg-secondary/50"
                }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid - Scrolls naturally beneath sticky header */}
      <div className="grid-products pb-20">
        {filteredProducts.length === 0 && selectedCategory === "Selected" ? (
          <div className="col-span-full text-center py-12 text-muted-foreground bg-card rounded-xl border border-dashed border-border p-8">
            <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium">No items in cart</p>
            <p className="text-sm opacity-70">Add products from other categories</p>
          </div>
        ) : (
          filteredProducts.map((product) => {
            const cartItem = cart.find((item) => item.product.id === product.id);

            if (selectedCategory === "Selected" && cartItem) {
              return (
                <SelectedProductCard
                  key={product.id}
                  cartItem={cartItem}
                  onUpdateQuantity={handleUpdateQuantity}
                  onRemove={handleRemoveItem}
                />
              );
            }

            return (
              <ProductCard
                key={product.id}
                product={product}
                onAdd={addToCart}
                quantity={cartItem ? cartItem.quantity : 0}
              />
            );
          })
        )}
      </div>

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartExpanded}
        onOpenChange={setIsCartExpanded}
        cart={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemove={handleRemoveItem}
        total={getCartTotal()}
        onCreateOrder={handleCreateOrder}
        customerName={customerName}
        onCustomerNameChange={setCustomerName}
      />
    </div>
  );
};

export default TakingOrder;
