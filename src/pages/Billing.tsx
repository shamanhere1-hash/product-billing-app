import { useState, useEffect, useRef } from "react";
import { useBilling, Order, CartItem } from "@/context/BillingContext";
import { BackButton } from "@/components/BackButton";
import { OrderCard } from "@/components/OrderCard";
import {
  Receipt,
  Printer,
  CheckCircle2,
  ArrowLeft,
  Download,
  Save,
  AlertCircle,
  Search,
  X,
  Pencil,
  Tag,
} from "lucide-react";
import { format, isToday } from "date-fns";
import { toast } from "sonner";
import { CartItemComponent } from "@/components/CartItem";
import { ProductSelector } from "@/components/ProductSelector";
import { Product } from "@/context/BillingContext";

const Billing = () => {
  const { orders, updateOrderStatus, updateOrder, products } = useBilling();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Local editing state
  const [editingItems, setEditingItems] = useState<CartItem[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [editMode, setEditMode] = useState<'none' | 'items' | 'prices'>('none');

  // Track previously selected order ID so we only reinitialise items when a
  // DIFFERENT order is selected, not when the same order re-fetches from context.
  const [loadedOrderId, setLoadedOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedOrder && selectedOrder.id !== loadedOrderId) {
      setEditingItems(JSON.parse(JSON.stringify(selectedOrder.items)));
      setHasUnsavedChanges(false);
      setEditMode('none');
      setLoadedOrderId(selectedOrder.id);
    }
    if (!selectedOrder) {
      setLoadedOrderId(null);
    }
  }, [selectedOrder, loadedOrderId]);

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

  const packedOrders = filterOrders(orders.filter((o) => o.status === "packed"));
  const billedOrders = filterOrders(orders.filter((o) => o.status === "billed" && isToday(new Date(o.createdAt))));

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    if (quantity < 0) {
      return;
    } else {
      setEditingItems((prev) =>
        prev.map((item) =>
          item.product.id === productId ? { ...item, quantity } : item,
        ),
      );
      setHasUnsavedChanges(true);
    }
  };

  const handleUpdatePrice = (productId: string, price: number) => {
    setEditingItems((prev) =>
      prev.map((item) =>
        item.product.id === productId
          ? { ...item, overriddenPrice: price }
          : item,
      ),
    );
    setHasUnsavedChanges(true);
  };

  const handleRemoveItem = (productId: string) => {
    const itemToRemove = editingItems.find(
      (item) => item.product.id === productId,
    );

    setEditingItems((prev) =>
      prev.filter((item) => item.product.id !== productId),
    );
    setHasUnsavedChanges(true);

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
            setHasUnsavedChanges(true);
          },
        },
        duration: 5000,
      });
    }
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
    setHasUnsavedChanges(true);
    toast.success("Product added to order", { duration: 1500 });
  };

  const handleToggleStock = (productId: string) => {
    setEditingItems((prev) =>
      prev.map((item) =>
        item.product.id === productId
          ? { ...item, isOutOfStock: !item.isOutOfStock }
          : item,
      ),
    );
    setHasUnsavedChanges(true);
  };

  const calculateTotal = () => {
    return editingItems.reduce((sum, item) => {
      if (item.isOutOfStock) return sum;
      const price = item.overriddenPrice ?? item.product.price;
      return sum + price * item.quantity;
    }, 0);
  };

  const handleSaveChanges = async () => {
    if (!selectedOrder) return;

    const newTotal = calculateTotal();
    const success = await updateOrder(selectedOrder.id, editingItems, newTotal);

    if (success) {
      toast.success("Order updated successfully");
      setHasUnsavedChanges(false);
      setEditMode('none'); // Exit edit mode on save
      // Update selectedOrder locally to reflect saved state immediately if needed,
      // but Context should trigger re-render of `orders` list.
      // We'll trust the order selector to refresh or we can force it.
      setSelectedOrder((prev) =>
        prev ? { ...prev, items: editingItems, total: newTotal } : null,
      );
    } else {
      toast.error("Failed to save changes");
    }
  };

  const handlePrint = () => {
    if (hasUnsavedChanges) {
      toast.error("Please save changes before printing");
      return;
    }
    const safeName = (selectedOrder.customerName || "Guest").trim().replace(/\s+/g, '_') || 'Bill';
    const originalTitle = document.title;
    document.title = safeName;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 100);
  };

  const handleFinalize = async () => {
    if (hasUnsavedChanges) {
      toast.error("Please save changes before finalizing");
      return;
    }
    if (selectedOrder) {
      await updateOrderStatus(selectedOrder.id, "billed");
      toast.success("Bill Finalized!");
      setSelectedOrder(null); // Return to list implicitly or keep open? User said "moves bill to completed section", so deselecting makes sense to show it moving.
    }
  };

  if (selectedOrder) {
    const isCompleted = selectedOrder.status === "billed";
    const currentTotal = calculateTotal();

    return (
      <div className="page-container">
        {/* Header */}
        <div className="page-header no-print">
          <button
            onClick={() => {
              if (hasUnsavedChanges && !confirm("Discard unsaved changes?"))
                return;
              setSelectedOrder(null);
            }}
            className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1 flex justify-between items-center">
            <h1 className="page-title">
              {isCompleted ? "Bill Preview (Completed)" : "Finalize Bill"}
            </h1>
            {!isCompleted && (
              <div className="flex items-center gap-2">
                {editMode !== 'none' && (
                  <button
                    onClick={() => {
                      if (hasUnsavedChanges) handleSaveChanges();
                      else setEditMode('none');
                    }}
                    className="px-4 py-1.5 text-sm font-medium rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors mr-2"
                  >
                    Done
                  </button>
                )}
                <button
                  onClick={() => setEditMode(editMode === 'items' ? 'none' : 'items')}
                  className={`p-2 rounded-full transition-colors ${editMode === 'items' ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                  title="Edit Items"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setEditMode(editMode === 'prices' ? 'none' : 'prices')}
                  className={`p-2 rounded-full transition-colors ${editMode === 'prices' ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                  title="Edit Prices"
                >
                  <Tag className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bill/Editor */}
        <div className="bill-container max-w-2xl mx-auto">
          <div className="text-center border-b border-dashed border-border pb-4 mb-4">
            <h2 className="text-xl font-bold text-foreground">PH SUPPLIES</h2>
            <p className="text-sm text-muted-foreground">Invoice Receipt</p>
          </div>

          <div className="space-y-2 text-sm mb-4">
            {selectedOrder.customerName &&
              selectedOrder.customerName !== "Guest" && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Customer:</span>
                  <span className="font-medium">
                    {selectedOrder.customerName}
                  </span>
                </div>
              )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Order ID:</span>
              <span className="font-medium">
                {selectedOrder.orderNumber || selectedOrder.id}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date:</span>
              <span className="font-medium">
                {format(new Date(selectedOrder.createdAt), "dd/MM/yyyy")}
              </span>
            </div>
          </div>

          <div className="border-t border-dashed border-border pt-4 mb-4">
            {/* If completed OR NOT in edit mode, show static table. If pending/packed AND in edit mode, show Editable List, but ALWAYS show table when printing */}
            <div
              className={`${isCompleted || editMode === 'none' ? "block" : "hidden print:block"}`}
            >
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground">
                    <th className="text-left pb-2">Item</th>
                    <th className="text-center pb-2">Qty</th>
                    <th className="text-right pb-2">Price</th>
                    <th className="text-right pb-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {editingItems.map((item, index) => (
                    <tr
                      key={index}
                      className={`border-b border-border/50 last:border-0 ${item.isOutOfStock ? "bg-muted/30" : ""}`}
                    >
                      <td className="py-2 text-foreground">
                        <span
                          className={
                            item.isOutOfStock
                              ? "line-through decoration-destructive text-muted-foreground"
                              : ""
                          }
                        >
                          {item.product.name}
                        </span>
                      </td>
                      <td className="py-2 text-center text-muted-foreground">
                        {item.quantity}
                      </td>
                      {item.isOutOfStock ? (
                        /* Merge price + total columns for stock-out items */
                        <td colSpan={2} className="py-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-destructive font-medium text-xs">
                              Stock Out
                            </span>
                            {!isCompleted && (
                              <button
                                onClick={() => handleToggleStock(item.product.id)}
                                className="px-2 py-0.5 text-xs bg-success/10 text-success rounded border border-success/20 hover:bg-success/20 transition-colors no-print"
                              >
                                [Undo]
                              </button>
                            )}
                          </div>
                        </td>
                      ) : (
                        <>
                          <td className="py-2 text-right text-muted-foreground">
                            ₹{item.overriddenPrice ?? item.product.price}
                          </td>
                          <td className="py-2 text-right font-medium text-foreground">
                            ₹{(item.overriddenPrice ?? item.product.price) * item.quantity}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Editable List - Hidden when printing */}
            {!isCompleted && editMode !== 'none' && (
              <div className="space-y-2 print:hidden">
                {editMode === 'items' && (
                  <div className="mb-2">
                    <ProductSelector
                      products={products}
                      onSelect={handleAddProduct}
                    />
                  </div>
                )}
                {editMode === 'prices' && (
                  <p className="text-sm text-amber-600 font-medium pb-1.5 pt-1 text-center">
                    Price changes apply to this bill only
                  </p>
                )}
                {editingItems.map((item, index) => (
                  <CartItemComponent
                    key={`${item.product.id}-${index}`}
                    item={item}
                    onUpdateQuantity={handleUpdateQuantity}
                    onUpdatePrice={handleUpdatePrice}
                    onRemove={handleRemoveItem}
                    variant="responsive"
                    onToggleStock={handleToggleStock}
                    isPriceEditMode={editMode === 'prices'}
                    hideDelete={editMode === 'prices'}
                  />
                ))}
                {editingItems.length === 0 && (
                  <p className="text-center text-destructive py-4">
                    Order is empty!
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="border-t border-dashed border-border pt-4">
            <div className="flex justify-between items-center text-lg font-bold">
              <span>TOTAL</span>
              <span className="text-primary">₹{currentTotal}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 max-w-md mx-auto mt-6 no-print">
          {!isCompleted && hasUnsavedChanges && (
            <button
              onClick={handleSaveChanges}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-opacity flex items-center justify-center gap-2 animate-pulse"
            >
              <Save className="w-5 h-5" />
              Save Changes
            </button>
          )}

          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              className="flex-1 py-3 rounded-xl bg-secondary text-secondary-foreground font-medium hover:bg-secondary/80 transition-colors flex items-center justify-center gap-2"
            >
              <Printer className="w-5 h-5" />
              Print
            </button>
            <button
              onClick={handleFinalize}
              disabled={hasUnsavedChanges}
              className={`flex-1 py-3 rounded-xl font-medium transition-opacity flex items-center justify-center gap-2 ${hasUnsavedChanges
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-accent text-accent-foreground hover:opacity-90"
                }`}
            >
              <CheckCircle2 className="w-5 h-5" />
              Finalize Order
            </button>
          </div>
          {hasUnsavedChanges && (
            <p className="text-center text-xs text-destructive flex items-center justify-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Save changes before finalizing
            </p>
          )}
        </div>
      </div >
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <BackButton />
        <h1 className="page-title">Billing</h1>
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
        {/* Ready for Billing */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Receipt className="w-5 h-5 text-warning" />
            <h2 className="section-title mb-0">Ready for Billing</h2>
            {packedOrders.length > 0 && (
              <span className="px-2 py-0.5 bg-warning/10 text-warning rounded-full text-sm font-medium">
                {packedOrders.length}
              </span>
            )}
          </div>

          {packedOrders.length === 0 ? (
            <div className="bg-card rounded-xl p-8 text-center text-muted-foreground">
              <Receipt className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No orders ready for billing</p>
            </div>
          ) : (
            <div className="space-y-4">
              {packedOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onSelect={setSelectedOrder}
                  showItems
                />
              ))}
            </div>
          )}
        </div>

        {/* Completed Bills */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-success" />
            <h2 className="section-title mb-0">Completed</h2>
            {billedOrders.length > 0 && (
              <span className="px-2 py-0.5 bg-success/10 text-success rounded-full text-sm font-medium">
                {billedOrders.length}
              </span>
            )}
          </div>

          {billedOrders.length === 0 ? (
            <div className="bg-card rounded-xl p-8 text-center text-muted-foreground">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No completed bills</p>
            </div>
          ) : (
            <div className="space-y-4">
              {billedOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onSelect={setSelectedOrder}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Billing;
