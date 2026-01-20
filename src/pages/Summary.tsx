import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BackButton } from "@/components/BackButton";
import { PinDialog } from "@/components/PinDialog";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, TrendingUp, Package, Loader2 } from "lucide-react";
import { format, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { useBilling, Order } from "@/context/BillingContext";

interface ProductSales {
  name: string;
  quantity: number;
  revenue: number;
}

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export default function Summary() {
  const navigate = useNavigate();
  const { verifyHistoryPin } = useAuth();
  const { orders, loading } = useBilling();

  const [showPinDialog, setShowPinDialog] = useState(true);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [billedOrders, setBilledOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (orders) {
      // Filter for billed orders
      const completed = orders.filter((o) => o.status === "billed");
      setBilledOrders(completed);
    }
  }, [orders]);

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

  // Daily summary (today)
  const getTodaysBills = () => {
    const today = format(new Date(), "yyyy-MM-dd");
    return billedOrders.filter(
      (bill) => format(new Date(bill.createdAt), "yyyy-MM-dd") === today,
    );
  };

  // Weekly summary
  const getWeeklyBills = () => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    return billedOrders.filter((bill) => {
      const billDate = new Date(bill.createdAt);
      return isWithinInterval(billDate, { start: weekStart, end: weekEnd });
    });
  };

  // Product analytics
  const getProductSales = (ordersData: Order[]): ProductSales[] => {
    const productMap = new Map<string, ProductSales>();

    ordersData.forEach((bill) => {
      if (Array.isArray(bill.items)) {
        bill.items.forEach((item) => {
          const existing = productMap.get(item.product.name);
          const price = item.overriddenPrice ?? item.product.price;

          if (existing) {
            existing.quantity += item.quantity;
            existing.revenue += price * item.quantity;
          } else {
            productMap.set(item.product.name, {
              name: item.product.name,
              quantity: item.quantity,
              revenue: price * item.quantity,
            });
          }
        });
      }
    });

    return Array.from(productMap.values()).sort(
      (a, b) => b.quantity - a.quantity,
    );
  };

  // Day-wise totals for the week
  const getDayWiseTotals = () => {
    const weeklyBills = getWeeklyBills();
    return DAYS_OF_WEEK.map((day) => {
      const dayBills = weeklyBills.filter(
        (bill) => format(new Date(bill.createdAt), "EEEE") === day,
      );
      return {
        day,
        bills: dayBills.length,
        total: dayBills.reduce((sum, bill) => sum + Number(bill.total), 0),
      };
    });
  };

  if (!isUnlocked) {
    return (
      <PinDialog
        open={showPinDialog}
        onOpenChange={handlePinCancel}
        title="Summary Access"
        description="Enter your History/Summary PIN to view analytics"
        onSubmit={handlePinSubmit}
        onSuccess={handlePinSuccess}
      />
    );
  }

  const todaysBills = getTodaysBills();
  const weeklyBills = getWeeklyBills();
  const todayTotal = todaysBills.reduce(
    (sum, bill) => sum + Number(bill.total),
    0,
  );
  const weeklyTotal = weeklyBills.reduce(
    (sum, bill) => sum + Number(bill.total),
    0,
  );
  const todayProducts = getProductSales(todaysBills);
  const weeklyProducts = getProductSales(weeklyBills);
  const dayWiseTotals = getDayWiseTotals();

  return (
    <div className="page-container">
      <div className="page-header">
        <BackButton />
        <h1 className="page-title">Sales Summary</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue="daily" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="daily" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Daily
              </TabsTrigger>
              <TabsTrigger value="weekly" className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Weekly
              </TabsTrigger>
              <TabsTrigger value="products" className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Products
              </TabsTrigger>
            </TabsList>

            <TabsContent value="daily" className="space-y-6">
              <div className="bg-card rounded-xl border border-border p-6">
                <h3 className="text-lg font-semibold mb-4">Today's Summary</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {format(new Date(), "EEEE, dd MMMM yyyy")}
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/50 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-primary">
                      ₹{todayTotal.toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Total Sales
                    </p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold">{todaysBills.length}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Total Bills
                    </p>
                  </div>
                </div>

                {todayProducts.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium mb-3">Top Selling Products</h4>
                    <div className="space-y-2">
                      {todayProducts.slice(0, 5).map((product, idx) => (
                        <div
                          key={product.name}
                          className="flex items-center justify-between p-2 bg-muted/30 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-bold">
                              {idx + 1}
                            </span>
                            <span className="font-medium">{product.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-semibold">
                              {product.quantity} sold
                            </span>
                            <span className="text-muted-foreground ml-2">
                              ₹{product.revenue.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="weekly" className="space-y-6">
              <div className="bg-card rounded-xl border border-border p-6">
                <h3 className="text-lg font-semibold mb-4">Weekly Summary</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {format(
                    startOfWeek(new Date(), { weekStartsOn: 1 }),
                    "dd MMM",
                  )}{" "}
                  -{" "}
                  {format(
                    endOfWeek(new Date(), { weekStartsOn: 1 }),
                    "dd MMM yyyy",
                  )}
                </p>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-muted/50 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-primary">
                      ₹{weeklyTotal.toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Total Sales
                    </p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold">{weeklyBills.length}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Total Bills
                    </p>
                  </div>
                </div>

                <h4 className="font-medium mb-3">Day-wise Breakdown</h4>
                <div className="space-y-2">
                  {dayWiseTotals.map(({ day, bills, total }) => (
                    <div
                      key={day}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                    >
                      <span className="font-medium">{day}</span>
                      <div className="text-right">
                        <span className="text-muted-foreground mr-4">
                          {bills} bills
                        </span>
                        <span className="font-semibold text-primary">
                          ₹{total.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {weeklyProducts.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium mb-3">
                      Top Selling Products (Week)
                    </h4>
                    <div className="space-y-2">
                      {weeklyProducts.slice(0, 5).map((product, idx) => (
                        <div
                          key={product.name}
                          className="flex items-center justify-between p-2 bg-muted/30 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-bold">
                              {idx + 1}
                            </span>
                            <span className="font-medium">{product.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-semibold">
                              {product.quantity} sold
                            </span>
                            <span className="text-muted-foreground ml-2">
                              ₹{product.revenue.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="products" className="space-y-6">
              <div className="bg-card rounded-xl border border-border p-6">
                <h3 className="text-lg font-semibold mb-4">
                  Product Analytics
                </h3>

                {weeklyProducts.length > 0 ? (
                  <div className="space-y-2">
                    {weeklyProducts.map((product, idx) => (
                      <div
                        key={product.name}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-bold">
                            {idx + 1}
                          </span>
                          <span className="font-medium">{product.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">
                            {product.quantity} units
                          </p>
                          <p className="text-sm text-muted-foreground">
                            ₹{product.revenue.toFixed(2)} revenue
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No product data available for this period
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
