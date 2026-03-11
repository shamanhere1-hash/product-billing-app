import { useState, useRef } from "react";
import { useBilling, Order, CartItem, Product } from "@/context/BillingContext";
import { BackButton } from "@/components/BackButton";
import { OrderCard } from "@/components/OrderCard";
import { Package, CheckCircle2, Trash2, Edit2, Save, Search, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CartItemComponent } from "@/components/CartItem";
import { ProductSelector } from "@/components/ProductSelector";

const PackCheck = () => {
  const { orders, updateOrderStatus, softDeleteOrder, updateOrder, products } =
    useBilling();

  // Edit State
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editingItems, setEditingItems] = useState<CartItem[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activePopoverId, setActivePopoverId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filterOrders = (orderList: Order[]) => {
    if (!searchTerm.trim()) return orderList;
    const cleaned = searchTerm.trim().replace(/\s+/g, " ").toLowerCase();
    return orderList.filter((order) => {
      const nameTarget = (order.customerName || "").trim().toLowerCase();
      const numTarget = (order.orderNumber || "").trim().toLowerCase();
      return nameTarget.includes(cleaned) || numTarget.includes(cleaned);
    });
  };

  const pendingOrders = filterOrders(orders.filter((o) => o.status === "pending"));
  const packedOrders = filterOrders(orders.filter((o) => o.status === "packed"));

  const handleMarkPacked = async (orderId: string) => {
    await updateOrderStatus(orderId, "packed");
    toast.success("Order marked as packed!", {
      description: "Ready for billing",
    });
  };

  const handleDelete = async (orderId: string) => {
    if (confirm("Are you sure you want to delete this order?")) {
      await softDeleteOrder(orderId);
      toast.info("Order deleted");
    }
  };

  // Edit Handlers
  const handleEditClick = (order: Order) => {
    setEditingOrder(order);
    setEditingItems(JSON.parse(JSON.stringify(order.items))); // Deep copy to avoid reference issues
    setIsDialogOpen(true);
  };

  const handleAddProduct = (product: Product) => {
    setEditingItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    toast.success("Product added to order");
  };

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveItem(productId);
    } else {
      setEditingItems((prev) =>
        prev.map((item) =>
          item.product.id === productId ? { ...item, quantity } : item,
        ),
      );
    }
  };

  const handleRemoveItem = (productId: string) => {
    const itemToRemove = editingItems.find(
      (item) => item.product.id === productId,
    );

    setEditingItems((prev) =>
      prev.filter((item) => item.product.id !== productId),
    );

    if (itemToRemove) {
      toast("Item removed", {
        description: `${itemToRemove.product.name} removed from order`,
        action: {
          label: "Undo",
          onClick: () => {
            setEditingItems((prev) => {
              if (prev.find((i) => i.product.id === itemToRemove.product.id)) {
                return prev;
              }
              return [...prev, itemToRemove];
            });
          },
        },
        duration: 5000,
      });
    }
  };

  const handleToggleStock = (productId: string) => {
    setEditingItems((prev) =>
      prev.map((item) =>
        item.product.id === productId
          ? { ...item, isOutOfStock: !item.isOutOfStock }
          : item,
      ),
    );
  };

  const handleDeleteProduct = (productId: string) => {
    handleRemoveItem(productId);
    setActivePopoverId(null);
  };

  const calculateTotal = () => {
    return editingItems
      .filter((item) => !item.isOutOfStock)
      .reduce((sum, item) => {
        const price = item.overriddenPrice ?? item.product.price;
        return sum + price * item.quantity;
      }, 0);
  };

  const handleSaveChanges = async () => {
    if (!editingOrder) return;

    // Check if empty
    if (editingItems.length === 0) {
      if (confirm("Order is empty. Delete it?")) {
        await softDeleteOrder(editingOrder.id);
        setIsDialogOpen(false);
        setEditingOrder(null);
        return;
      } else {
        return;
      }
    }

    const newTotal = calculateTotal();
    const success = await updateOrder(editingOrder.id, editingItems, newTotal);

    if (success) {
      toast.success("Order updated successfully");
      setIsDialogOpen(false);
      setEditingOrder(null);
    } else {
      toast.error("Failed to update order");
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <BackButton />
        <h1 className="page-title">Pack & Check</h1>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search by customer name or order number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-10 py-3 rounded-xl bg-card border border-input focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
        />
        {searchTerm && (
          <button
            onClick={() => {
              setSearchTerm("");
              searchInputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Pending Orders */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-warning" />
            <h2 className="section-title mb-0">Pending Orders</h2>
            {pendingOrders.length > 0 && (
              <span className="px-2 py-0.5 bg-warning/10 text-warning rounded-full text-sm font-medium">
                {pendingOrders.length}
              </span>
            )}
          </div>

          {pendingOrders.length === 0 ? (
            <div className="bg-card rounded-xl p-8 text-center text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No pending orders</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingOrders.map((order) => (
                <div key={order.id} className="space-y-3">
                  <OrderCard order={order} showItems />
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleEditClick(order)}
                      className="py-3 rounded-xl bg-secondary text-secondary-foreground font-medium hover:bg-secondary/80 transition-colors flex items-center justify-center gap-2"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleMarkPacked(order.id)}
                      className="py-3 rounded-xl bg-accent text-accent-foreground font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      Pack
                    </button>
                  </div>
                  <button
                    onClick={() => handleDelete(order.id)}
                    className="w-full py-3 rounded-xl bg-destructive/10 text-destructive font-medium hover:bg-destructive/20 transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-5 h-5" />
                    Delete Order
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Packed Orders */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-accent" />
            <h2 className="section-title mb-0">Packed & Ready</h2>
            {packedOrders.length > 0 && (
              <span className="px-2 py-0.5 bg-accent/10 text-accent rounded-full text-sm font-medium">
                {packedOrders.length}
              </span>
            )}
          </div>

          {packedOrders.length === 0 ? (
            <div className="bg-card rounded-xl p-8 text-center text-muted-foreground">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No packed orders</p>
            </div>
          ) : (
            <div className="space-y-4">
              {packedOrders.map((order) => (
                <OrderCard key={order.id} order={order} showItems />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Order</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-2 space-y-2 my-4">
            <div className="mb-4">
              <ProductSelector
                products={products}
                onSelect={handleAddProduct}
              />
            </div>
            {editingItems.map((item) => (
              <Popover
                key={item.product.id}
                open={activePopoverId === item.product.id}
                onOpenChange={(open) => {
                  if (open) setActivePopoverId(item.product.id);
                  else setActivePopoverId(null);
                }}
              >
                <PopoverTrigger asChild>
                  <div className="w-full">
                    <CartItemComponent
                      item={item}
                      onUpdateQuantity={handleUpdateQuantity}
                      onRemove={handleRemoveItem}
                      hideDelete={true}
                      onClick={() => setActivePopoverId(item.product.id)}
                      onToggleStock={handleToggleStock}
                    />
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2" align="end">
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleToggleStock(item.product.id)}
                      className={`w-full py-2 px-3 rounded-md text-sm font-medium transition-colors ${item.isOutOfStock
                        ? "bg-success/10 text-success hover:bg-success/20"
                        : "bg-warning/10 text-warning hover:bg-warning/20"
                        }`}
                    >
                      {item.isOutOfStock ? "Mark In Stock" : "Out of Stock"}
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(item.product.id)}
                      className="w-full py-2 px-3 rounded-md text-sm font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                    >
                      Delete Product
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
            ))}
            {editingItems.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Order is empty
              </p>
            )}
          </div>

          <DialogFooter className="flex gap-2 sm:justify-between items-center border-t pt-4">
            <div className="text-lg font-bold">
              Total: <span className="text-primary">₹{calculateTotal()}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsDialogOpen(false)}
                className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveChanges}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PackCheck;
