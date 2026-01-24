import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ShoppingBag, Check, User, ChevronUp, ChevronDown } from "lucide-react";
import { useBilling } from "@/context/BillingContext";
import { ProductCard } from "@/components/ProductCard";
import { CartItemComponent } from "@/components/CartItem";
import { BackButton } from "@/components/BackButton";
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
                onClick={() => setSelectedCategory(selectedCategory === "Selected" ? null : "Selected")}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === "Selected"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
              >
                Selected
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === category
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Products Grid */}
          <div className="grid-products">
            {filteredProducts.length === 0 && selectedCategory === "Selected" ? (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <p>No items selected</p>
              </div>
            ) : (
              filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAdd={addToCart}
                />
              ))
            )}
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

            {/* Customer Name Input - Always Visible */}
            <div className="relative mb-4">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Customer name (optional)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreateOrder();
                  }
                }}
                className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-background border border-input focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
              />
            </div>

            {cart.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingBag className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>Cart is empty</p>
                <p className="text-sm">Tap products to add</p>
              </div>
            ) : (
              <>
                {/* Collapsed View Summary */}
                {!isCartExpanded && (
                  <div className="mb-4 flex justify-between items-center">
                    <span className="text-muted-foreground">Total Amount</span>
                    <span className="text-xl font-bold text-primary">
                      ₹{getCartTotal()}
                    </span>
                  </div>
                )}

                {/* Expand/Collapse Button */}
                <button
                  onClick={() => setIsCartExpanded(!isCartExpanded)}
                  className="w-full flex items-center justify-center gap-2 py-2 mb-4 text-sm font-medium text-primary hover:bg-primary/5 rounded-lg transition-colors"
                >
                  {isCartExpanded ? (
                    <>
                      <ChevronUp className="w-4 h-4" />
                      Hide Cart
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      View Cart
                    </>
                  )}
                </button>

                {/* Expanded Cart Items */}
                {isCartExpanded && (
                  <div className="space-y-2 max-h-60 overflow-y-auto mb-4 animate-fade-in">
                    {cart.map((item) => (
                      <CartItemComponent
                        key={item.product.id}
                        item={item}
                        onUpdateQuantity={updateQuantity}
                        onRemove={removeFromCart}
                      />
                    ))}
                  </div>
                )}

                {/* Total and Actions (Always visible or conditioned?) */}
                {/* The requirement says: "Display the full cart details (all added products) only when the user clicks the View Cart button." */}
                {/* It also says: "When the cart is collapsed, keep the layout compact and avoid vertical expansion." */}
                {/* So I should probably keep the Total and Actions visible? Or maybe just the Total in collapsed and everything in expanded? */}
                {/* Requirement: "By default, show only: Customer Name, Total Amount, Add a 'View Cart' button" */}

                {isCartExpanded && (
                  <div className="border-t border-border pt-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Total</span>
                      <span className="text-2xl font-bold text-primary">
                        ₹{getCartTotal()}
                      </span>
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
                )}

                {/* If collapsed, we might still want the Create Order button available? 
                   The requirement says "By default, show only: Customer Name, Total Amount".
                   It doesn't explicitly say "Hide Create Order button". 
                   However, "Display the full cart details... only when View Cart".
                   Usually you want to be able to create order quickly. 
                   But strictly following "show only...", and keeping layout compact. 
                   I will hide the big action buttons when collapsed, assuming the user reviews first.
                   Wait, "Billing" often implies speed.
                   If I hide the "Create Order" button, they HAVE to expand to finish.
                   Let's stick to the prompt: "When the cart is collapsed, keep the layout compact".
                   I will put a compact "Create Order" or just rely on the expanded view for actions.
                   Let's assume Actions are part of "Full Cart Details" or strictly follow the "Show only..." list.
                   "Show only: Customer Name, Total Amount, View Cart Button".
                   So I will hide the action buttons when collapsed.
                */}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TakingOrder;
