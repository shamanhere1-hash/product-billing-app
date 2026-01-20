import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BackButton } from "@/components/BackButton";
import { PinDialog } from "@/components/PinDialog";
import { useAuth } from "@/hooks/useAuth";
import {
  ChevronRight,
  Calendar,
  FileText,
  User,
  Clock,
  Loader2,
  ChevronDown,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { useBilling, Order } from "@/context/BillingContext";

export default function History() {
  const navigate = useNavigate();
  const { verifyHistoryPin } = useAuth();
  const { orders, loading } = useBilling();

  const [showPinDialog, setShowPinDialog] = useState(true);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedBill, setSelectedBill] = useState<Order | null>(null);

  // Grouping Logic
  const getGroupedOrders = () => {
    const billedOrders = orders
      .filter(
        (o) =>
          o.status === "billed" ||
          o.status === "packed" ||
          o.status === "pending",
      ) // For debugging, usually just 'billed'. User requested completed orders.
      .filter((o) => o.status === "billed") // STRICTLY BILLED as per request
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

    const groups: {
      month: string;
      dates: { date: string; displayDate: string; orders: Order[] }[];
    }[] = [];

    billedOrders.forEach((order) => {
      const dateObj = new Date(order.createdAt);
      const monthKey = format(dateObj, "MMMM yyyy");
      const dateKey = format(dateObj, "yyyy-MM-dd");
      const displayDate = format(dateObj, "EEEE, dd MMM");

      let monthGroup = groups.find((g) => g.month === monthKey);
      if (!monthGroup) {
        monthGroup = { month: monthKey, dates: [] };
        groups.push(monthGroup);
      }

      let dateGroup = monthGroup.dates.find((d) => d.date === dateKey);
      if (!dateGroup) {
        dateGroup = { date: dateKey, displayDate, orders: [] };
        monthGroup.dates.push(dateGroup);
      }

      dateGroup.orders.push(order);
    });

    return groups;
  };

  const groupedOrders = getGroupedOrders();

  const handlePinSubmit = async (pin: string) => {
    return await verifyHistoryPin(pin);
  };

  const handlePinSuccess = () => {
    setIsUnlocked(true);
  };

  const handlePinCancel = () => {
    setShowPinDialog(false);
    navigate("/");
  };

  if (!isUnlocked) {
    return (
      <PinDialog
        open={showPinDialog}
        onOpenChange={handlePinCancel}
        title="History Access"
        description="Enter your History PIN to view billing history"
        onSubmit={handlePinSubmit}
        onSuccess={handlePinSuccess}
      />
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <BackButton />
        <h1 className="page-title">Billing History</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="max-w-3xl mx-auto space-y-8">
          {groupedOrders.length === 0 ? (
            <div className="text-center text-muted-foreground py-10">
              No completed bills found.
            </div>
          ) : (
            groupedOrders.map((monthGroup) => (
              <div key={monthGroup.month} className="space-y-4">
                <h2 className="text-xl font-bold text-foreground sticky top-0 bg-background/95 backdrop-blur py-2 z-10 border-b border-border/50">
                  {monthGroup.month}
                </h2>

                <div className="space-y-3">
                  {monthGroup.dates.map((dateGroup) => {
                    const isExpanded = selectedDate === dateGroup.date;
                    const totalRevenue = dateGroup.orders.reduce(
                      (sum, o) => sum + o.total,
                      0,
                    );

                    return (
                      <div
                        key={dateGroup.date}
                        className="bg-card rounded-xl border border-border overflow-hidden"
                      >
                        <button
                          onClick={() =>
                            setSelectedDate(isExpanded ? null : dateGroup.date)
                          }
                          className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Calendar className="w-5 h-5 text-primary" />
                            <span className="font-medium text-lg">
                              {dateGroup.displayDate}
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-muted-foreground">
                              {dateGroup.orders.length} bills
                            </span>
                            <span className="font-bold text-primary">
                              ₹{totalRevenue.toFixed(2)}
                            </span>
                            <ChevronRight
                              className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                            />
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="border-t border-border bg-muted/20">
                            {dateGroup.orders.map((bill) => (
                              <button
                                key={bill.id}
                                onClick={() => setSelectedBill(bill)}
                                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0"
                              >
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
                                    <FileText className="w-5 h-5" />
                                  </div>
                                  <div className="text-left">
                                    <p className="font-mono font-medium text-foreground">
                                      {bill.orderNumber}
                                    </p>
                                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                                      <User className="w-3 h-3" />
                                      {bill.customerName || "Guest"}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-foreground">
                                    ₹{bill.total.toFixed(2)}
                                  </p>
                                  <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                                    <Clock className="w-3 h-3" />
                                    {format(
                                      new Date(bill.createdAt),
                                      "hh:mm a",
                                    )}
                                  </p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Invoice Modal */}
      <Dialog open={!!selectedBill} onOpenChange={() => setSelectedBill(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono">
              {selectedBill?.orderNumber}
            </DialogTitle>
          </DialogHeader>

          {selectedBill && (
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Customer</span>
                <span className="font-medium">{selectedBill.customerName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Date</span>
                <span>
                  {format(new Date(selectedBill.createdAt), "dd MMM yyyy")}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Time</span>
                <span>
                  {format(new Date(selectedBill.createdAt), "hh:mm a")}
                </span>
              </div>

              <div className="border-t border-border pt-4">
                <h4 className="font-medium mb-2">Items</h4>
                <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2">
                  {selectedBill.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between text-sm py-1 border-b border-border/30 last:border-0"
                    >
                      <div>
                        <span className="font-medium">{item.product.name}</span>
                        <div className="text-xs text-muted-foreground">
                          Qty: {item.quantity} × ₹
                          {item.overriddenPrice ?? item.product.price}
                        </div>
                      </div>
                      <span className="font-medium">
                        ₹
                        {(
                          (item.overriddenPrice ?? item.product.price) *
                          item.quantity
                        ).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-border pt-4 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-primary">
                  ₹{selectedBill.total.toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
