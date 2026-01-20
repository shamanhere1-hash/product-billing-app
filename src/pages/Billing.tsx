import { useState, useEffect } from "react";
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
} from "lucide-react";
import { format } from "date-fns";
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
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    if (selectedOrder) {
      setEditingItems(selectedOrder.items);
      setHasUnsavedChanges(false);
      setIsEditMode(false); // Reset edit mode when selecting new order
    }
  }, [selectedOrder]);

  const packedOrders = orders.filter((o) => o.status === "packed");
  const billedOrders = orders.filter((o) => o.status === "billed");

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    setEditingItems((prev) => {
      if (quantity <= 0) {
        return prev.filter((item) => item.product.id !== productId);
      }
      return prev.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item,
      );
    });
    setHasUnsavedChanges(true); // Simplified dirty check
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
    setEditingItems((prev) =>
      prev.filter((item) => item.product.id !== productId),
    );
    setHasUnsavedChanges(true);
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

  const calculateTotal = () => {
    return editingItems.reduce((sum, item) => {
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
      setIsEditMode(false); // Exit edit mode on save
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
    window.print();
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
                <span className="text-sm font-medium text-muted-foreground">
                  Edit Mode
                </span>
                <button
                  onClick={() => setIsEditMode(!isEditMode)}
                  className={`w-12 h-6 rounded-full p-1 transition-colors ${isEditMode ? "bg-primary" : "bg-muted"}`}
                >
                  <div
                    className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${isEditMode ? "translate-x-6" : "translate-x-0"}`}
                  />
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
              className={`${isCompleted || !isEditMode ? "block" : "hidden print:block"}`}
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
                      className="border-b border-border/50 last:border-0"
                    >
                      <td className="py-2 text-foreground">
                        {item.product.name}
                      </td>
                      <td className="py-2 text-center text-muted-foreground">
                        {item.quantity}
                      </td>
                      <td className="py-2 text-right text-muted-foreground">
                        ₹{item.overriddenPrice ?? item.product.price}
                      </td>
                      <td className="py-2 text-right font-medium text-foreground">
                        ₹
                        {(item.overriddenPrice ?? item.product.price) *
                          item.quantity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Editable List - Hidden when printing */}
            {!isCompleted && isEditMode && (
              <div className="space-y-2 print:hidden">
                <div className="mb-2">
                  <ProductSelector
                    products={products}
                    onSelect={handleAddProduct}
                  />
                </div>
                {editingItems.map((item) => (
                  <CartItemComponent
                    key={item.product.id}
                    item={item}
                    onUpdateQuantity={handleUpdateQuantity}
                    onUpdatePrice={handleUpdatePrice}
                    onRemove={handleRemoveItem}
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
              className={`flex-1 py-3 rounded-xl font-medium transition-opacity flex items-center justify-center gap-2 ${
                hasUnsavedChanges
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
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <BackButton />
        <h1 className="page-title">Billing</h1>
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
