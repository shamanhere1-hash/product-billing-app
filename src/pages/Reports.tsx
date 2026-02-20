import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BackButton } from "@/components/BackButton";
import { PinDialog } from "@/components/PinDialog";
import { useAuth } from "@/hooks/useAuth";
import { useBilling, Order, CartItem, Product } from "@/context/BillingContext";
import { toast } from "sonner";
import {
    Settings,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    Loader2,
    Calendar,
    TrendingUp,
    Package,
} from "lucide-react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import {
    format,
    startOfWeek,
    endOfWeek,
    isWithinInterval,
    startOfMonth,
    endOfMonth,
    isSameDay,
    addMonths,
    subMonths,
    getDay,
    getDaysInMonth,
} from "date-fns";

// ─── Types ────────────────────────────────────────────────────────

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

// ─── Profit Helpers ───────────────────────────────────────────────

function calcItemProfit(item: CartItem, costPrice: number): number {
    if (item.isOutOfStock) return 0;
    const sellingPrice = item.overriddenPrice ?? item.product.price;
    const cp = costPrice || 0;
    return (sellingPrice - cp) * item.quantity;
}

function calcOrderProfit(
    order: Order,
    productMap: Map<string, Product>
): number {
    return order.items.reduce((sum, item) => {
        const product = productMap.get(item.product.id);
        const costPrice = product?.costPrice ?? 0;
        return sum + calcItemProfit(item, costPrice);
    }, 0);
}

function calcOrderCost(
    order: Order,
    productMap: Map<string, Product>
): number {
    return order.items.reduce((sum, item) => {
        if (item.isOutOfStock) return sum;
        const product = productMap.get(item.product.id);
        const costPrice = product?.costPrice ?? 0;
        return sum + costPrice * item.quantity;
    }, 0);
}

// ─── Component ────────────────────────────────────────────────────

export default function Reports() {
    const navigate = useNavigate();
    const { verifyHistoryPin, verifyCostSettingsPin } = useAuth();
    const { orders, products, updateProduct, loading } = useBilling();

    // PIN gates
    const [showPinDialog, setShowPinDialog] = useState(true);
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [showCostPinDialog, setShowCostPinDialog] = useState(false);

    // Page state
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [showSettings, setShowSettings] = useState(false);
    const [selectedDay, setSelectedDay] = useState<Date | null>(null);
    const [expandedBillId, setExpandedBillId] = useState<string | null>(null);

    // Cost price editor state
    const [costPriceEdits, setCostPriceEdits] = useState<Record<string, string>>(
        {}
    );

    // ─── Product map ────────────────────────────────────────────────
    const productMap = useMemo(
        () => new Map(products.map((p) => [p.id, p])),
        [products]
    );

    // ─── Billed orders ─────────────────────────────────────────────
    const billedOrders = useMemo(
        () => orders.filter((o) => o.status === "billed"),
        [orders]
    );

    // ─── Summary Calculations ─────────────────────────────────────

    const getTodaysBills = () => {
        const today = format(new Date(), "yyyy-MM-dd");
        return billedOrders.filter(
            (bill) => format(new Date(bill.createdAt), "yyyy-MM-dd") === today
        );
    };

    const getWeeklyBills = () => {
        const now = new Date();
        const weekStart = startOfWeek(now, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
        return billedOrders.filter((bill) => {
            const billDate = new Date(bill.createdAt);
            return isWithinInterval(billDate, { start: weekStart, end: weekEnd });
        });
    };

    const getProductSales = (ordersData: Order[]): ProductSales[] => {
        const productSalesMap = new Map<string, ProductSales>();

        ordersData.forEach((bill) => {
            if (Array.isArray(bill.items)) {
                bill.items.forEach((item) => {
                    const existing = productSalesMap.get(item.product.name);
                    const price = item.overriddenPrice ?? item.product.price;

                    if (existing) {
                        existing.quantity += item.quantity;
                        existing.revenue += price * item.quantity;
                    } else {
                        productSalesMap.set(item.product.name, {
                            name: item.product.name,
                            quantity: item.quantity,
                            revenue: price * item.quantity,
                        });
                    }
                });
            }
        });

        return Array.from(productSalesMap.values()).sort(
            (a, b) => b.quantity - a.quantity
        );
    };

    const getDayWiseTotals = () => {
        const weeklyBills = getWeeklyBills();
        return DAYS_OF_WEEK.map((day) => {
            const dayBills = weeklyBills.filter(
                (bill) => format(new Date(bill.createdAt), "EEEE") === day
            );
            return {
                day,
                bills: dayBills.length,
                total: dayBills.reduce((sum, bill) => sum + Number(bill.total), 0),
            };
        });
    };

    // ─── Profit Calculations ──────────────────────────────────────

    const dailyProfitMap = useMemo(() => {
        const map = new Map<
            string,
            { profit: number; revenue: number; cost: number; orders: Order[] }
        >();
        billedOrders.forEach((order) => {
            const dateKey = format(new Date(order.createdAt), "yyyy-MM-dd");
            const profit = calcOrderProfit(order, productMap);
            const cost = calcOrderCost(order, productMap);
            const revenue = Number(order.total);
            const existing = map.get(dateKey);
            if (existing) {
                existing.profit += profit;
                existing.revenue += revenue;
                existing.cost += cost;
                existing.orders.push(order);
            } else {
                map.set(dateKey, { profit, revenue, cost, orders: [order] });
            }
        });
        return map;
    }, [billedOrders, productMap]);

    const today = new Date();
    const todayKey = format(today, "yyyy-MM-dd");
    const todayProfit = dailyProfitMap.get(todayKey)?.profit ?? 0;

    const thisMonthProfit = useMemo(() => {
        let total = 0;
        dailyProfitMap.forEach((val, key) => {
            const d = new Date(key);
            if (d >= startOfMonth(today) && d <= endOfMonth(today)) {
                total += val.profit;
            }
        });
        return total;
    }, [dailyProfitMap, today]);

    const bestDay = useMemo(() => {
        let best: { date: string; profit: number } | null = null;
        dailyProfitMap.forEach((val, key) => {
            const d = new Date(key);
            if (d >= startOfMonth(today) && d <= endOfMonth(today)) {
                if (!best || val.profit > best.profit) {
                    best = { date: key, profit: val.profit };
                }
            }
        });
        return best;
    }, [dailyProfitMap, today]);

    // ─── Calendar data ─────────────────────────────────────────────
    const monthStart = startOfMonth(currentMonth);
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDayOfWeek = getDay(monthStart);

    const calendarDays = useMemo(() => {
        const days: (Date | null)[] = [];
        for (let i = 0; i < firstDayOfWeek; i++) days.push(null);
        for (let d = 1; d <= daysInMonth; d++) {
            days.push(
                new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d)
            );
        }
        return days;
    }, [currentMonth, daysInMonth, firstDayOfWeek]);

    const maxProfitInMonth = useMemo(() => {
        let max = 0;
        calendarDays.forEach((day) => {
            if (!day) return;
            const key = format(day, "yyyy-MM-dd");
            const dp = dailyProfitMap.get(key);
            if (dp && dp.profit > max) max = dp.profit;
        });
        return max;
    }, [calendarDays, dailyProfitMap]);

    // ─── Selected day detail ───────────────────────────────────────
    const selectedDayData = selectedDay
        ? dailyProfitMap.get(format(selectedDay, "yyyy-MM-dd"))
        : null;

    // ─── Top sold products for selected day or today ───────────────
    const topSoldProducts = useMemo(() => {
        if (selectedDay) {
            const dayKey = format(selectedDay, "yyyy-MM-dd");
            const dayOrders = billedOrders.filter(
                (o) => format(new Date(o.createdAt), "yyyy-MM-dd") === dayKey
            );
            return getProductSales(dayOrders);
        }
        return getProductSales(getTodaysBills());
    }, [selectedDay, billedOrders, orders]);

    // ─── Green intensity helper ────────────────────────────────────
    const getGreenStyle = (profit: number): string => {
        if (profit <= 0 || maxProfitInMonth <= 0) return "";
        const ratio = profit / maxProfitInMonth;
        const lightness = 85 - ratio * 55;
        return `hsl(142, 76%, ${lightness}%)`;
    };

    // ─── Settings handlers ─────────────────────────────────────────
    const openSettings = () => {
        setShowCostPinDialog(true);
    };

    const onCostPinSuccess = () => {
        setShowCostPinDialog(false);
        const edits: Record<string, string> = {};
        products.forEach((p) => {
            edits[p.id] = p.costPrice.toString();
        });
        setCostPriceEdits(edits);
        setShowSettings(true);
    };

    const saveCostPrices = async () => {
        let changed = 0;
        for (const product of products) {
            const newVal = parseFloat(costPriceEdits[product.id] || "0");
            if (!isNaN(newVal) && newVal !== product.costPrice) {
                await updateProduct(product.id, {
                    name: product.name,
                    price: product.price,
                    costPrice: newVal,
                    category: product.category,
                });
                changed++;
            }
        }
        setShowSettings(false);
        if (changed > 0) {
            toast.success(
                `Updated cost prices for ${changed} product${changed > 1 ? "s" : ""}`
            );
        } else {
            toast.info("No changes to save");
        }
    };

    // ─── PIN gate ──────────────────────────────────────────────────
    const handlePinSubmit = async (pin: string) => {
        return await verifyHistoryPin(pin);
    };

    const handleCostPinSubmit = async (pin: string) => {
        return await verifyCostSettingsPin(pin);
    };

    if (!isUnlocked) {
        return (
            <PinDialog
                open={showPinDialog}
                onOpenChange={() => {
                    setShowPinDialog(false);
                    navigate("/");
                }}
                title="Reports Access"
                description="Enter PIN to view reports"
                onSubmit={handlePinSubmit}
                onSuccess={() => setIsUnlocked(true)}
            />
        );
    }

    // ─── Computed summary values ───────────────────────────────────
    const todaysBills = getTodaysBills();
    const weeklyBills = getWeeklyBills();
    const todayTotal = todaysBills.reduce(
        (sum, bill) => sum + Number(bill.total),
        0
    );
    const weeklyTotal = weeklyBills.reduce(
        (sum, bill) => sum + Number(bill.total),
        0
    );
    const dayWiseTotals = getDayWiseTotals();

    // ─── Render ────────────────────────────────────────────────────
    return (
        <div className="page-container">
            {/* Header */}
            <div className="page-header flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <BackButton />
                    <h1 className="page-title mb-0">Reports</h1>
                </div>
                <button
                    onClick={openSettings}
                    className="p-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                    title="Cost Price Settings"
                >
                    <Settings className="w-5 h-5" />
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : (
                <div className="max-w-4xl mx-auto space-y-8">
                    {/* ═══════════════════════════════════════════════════════
              SECTION 1 — SUMMARY
              ═══════════════════════════════════════════════════════ */}

                    {/* 1A — Daily Revenue */}
                    <div className="bg-card rounded-xl border border-border p-6">
                        <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-primary" />
                            Today's Revenue
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            {format(new Date(), "EEEE, dd MMMM yyyy")}
                        </p>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-muted/50 rounded-lg p-4 text-center">
                                <p className="text-3xl font-bold text-primary">
                                    ₹{todayTotal.toFixed(2)}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Total Revenue
                                </p>
                            </div>
                            <div className="bg-muted/50 rounded-lg p-4 text-center">
                                <p className="text-3xl font-bold">{todaysBills.length}</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Total Bills
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 1B — Weekly Revenue */}
                    <div className="bg-card rounded-xl border border-border p-6">
                        <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-accent" />
                            Weekly Revenue
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            {format(
                                startOfWeek(new Date(), { weekStartsOn: 1 }),
                                "dd MMM"
                            )}{" "}
                            –{" "}
                            {format(
                                endOfWeek(new Date(), { weekStartsOn: 1 }),
                                "dd MMM yyyy"
                            )}
                        </p>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-muted/50 rounded-lg p-4 text-center">
                                <p className="text-3xl font-bold text-primary">
                                    ₹{weeklyTotal.toFixed(2)}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Total Revenue
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
                    </div>

                    {/* 1C — Top Sold Products */}
                    <div className="bg-card rounded-xl border border-border p-6">
                        <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
                            <Package className="w-5 h-5 text-warning" />
                            Top Sold Products
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            {selectedDay
                                ? format(selectedDay, "dd MMMM yyyy")
                                : "Today"}
                        </p>

                        {topSoldProducts.length > 0 ? (
                            <div className="space-y-2">
                                {topSoldProducts.slice(0, 10).map((product, idx) => (
                                    <div
                                        key={product.name}
                                        className="flex items-center justify-between p-2 bg-muted/30 rounded-lg"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="w-7 h-7 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-bold">
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
                        ) : (
                            <p className="text-center text-muted-foreground py-8">
                                No sales data available
                            </p>
                        )}
                    </div>

                    {/* ═══════════════════════════════════════════════════════
              SECTION 2 — PROFIT
              ═══════════════════════════════════════════════════════ */}

                    {/* Profit Summary Cards */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-card rounded-xl border border-border p-4 text-center">
                            <p className="text-xs text-muted-foreground mb-1">
                                Today's Profit
                            </p>
                            <p className="text-lg font-bold text-green-500">
                                ₹{todayProfit.toFixed(0)}
                            </p>
                        </div>
                        <div className="bg-card rounded-xl border border-border p-4 text-center">
                            <p className="text-xs text-muted-foreground mb-1">This Month</p>
                            <p className="text-lg font-bold text-green-500">
                                ₹{thisMonthProfit.toFixed(0)}
                            </p>
                        </div>
                        <div className="bg-card rounded-xl border border-border p-4 text-center">
                            <p className="text-xs text-muted-foreground mb-1">Best Day</p>
                            {bestDay ? (
                                <>
                                    <p className="text-lg font-bold text-green-500">
                                        ₹{bestDay.profit.toFixed(0)}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                        {format(new Date(bestDay.date), "dd MMM")}
                                    </p>
                                </>
                            ) : (
                                <p className="text-sm text-muted-foreground">—</p>
                            )}
                        </div>
                    </div>

                    {/* Calendar */}
                    <div className="bg-card rounded-xl border border-border p-4">
                        {/* Month navigator */}
                        <div className="flex items-center justify-between mb-4">
                            <button
                                onClick={() =>
                                    setCurrentMonth(subMonths(currentMonth, 1))
                                }
                                className="p-2 rounded-lg hover:bg-secondary transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <h2 className="text-lg font-semibold text-foreground">
                                {format(currentMonth, "MMMM yyyy")}
                            </h2>
                            <button
                                onClick={() =>
                                    setCurrentMonth(addMonths(currentMonth, 1))
                                }
                                className="p-2 rounded-lg hover:bg-secondary transition-colors"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Day headers */}
                        <div className="grid grid-cols-7 gap-1 mb-1">
                            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                                (d) => (
                                    <div
                                        key={d}
                                        className="text-center text-xs font-medium text-muted-foreground py-1"
                                    >
                                        {d}
                                    </div>
                                )
                            )}
                        </div>

                        {/* Day cells */}
                        <div className="grid grid-cols-7 gap-1">
                            {calendarDays.map((day, idx) => {
                                if (!day) {
                                    return (
                                        <div key={`empty-${idx}`} className="aspect-square" />
                                    );
                                }

                                const dateKey = format(day, "yyyy-MM-dd");
                                const dayData = dailyProfitMap.get(dateKey);
                                const profit = dayData?.profit ?? 0;
                                const isToday = isSameDay(day, today);
                                const hasProfit = profit > 0;
                                const isSelected =
                                    selectedDay && isSameDay(day, selectedDay);
                                const greenBg = hasProfit
                                    ? getGreenStyle(profit)
                                    : undefined;

                                return (
                                    <button
                                        key={dateKey}
                                        onClick={() => {
                                            if (dayData) {
                                                setSelectedDay(day);
                                                setExpandedBillId(null);
                                            }
                                        }}
                                        disabled={!dayData}
                                        className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-colors relative ${dayData
                                                ? "cursor-pointer hover:opacity-80"
                                                : "cursor-default"
                                            } ${isSelected
                                                ? "ring-2 ring-primary ring-offset-1"
                                                : ""
                                            }`}
                                        style={
                                            greenBg
                                                ? { backgroundColor: greenBg }
                                                : undefined
                                        }
                                    >
                                        <span
                                            className={`font-medium ${isToday
                                                    ? "bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center"
                                                    : hasProfit
                                                        ? "text-white"
                                                        : "text-foreground"
                                                }`}
                                        >
                                            {day.getDate()}
                                        </span>
                                        {hasProfit && (
                                            <span className="text-[9px] font-semibold text-white/90 mt-0.5 leading-none">
                                                ₹
                                                {profit >= 1000
                                                    ? `${(profit / 1000).toFixed(1)}k`
                                                    : profit.toFixed(0)}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Selected Day Profit Detail */}
                    {selectedDay && selectedDayData && (
                        <div className="bg-card rounded-xl border border-border p-6">
                            <h3 className="text-lg font-semibold mb-4">
                                {format(selectedDay, "EEEE, dd MMMM yyyy")}
                            </h3>

                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div className="bg-muted/50 rounded-lg p-3 text-center">
                                    <p className="text-xs text-muted-foreground mb-1">
                                        Revenue
                                    </p>
                                    <p className="text-xl font-bold text-primary">
                                        ₹{selectedDayData.revenue.toFixed(2)}
                                    </p>
                                </div>
                                <div className="bg-muted/50 rounded-lg p-3 text-center">
                                    <p className="text-xs text-muted-foreground mb-1">
                                        Total Cost
                                    </p>
                                    <p className="text-xl font-bold text-orange-500">
                                        ₹{selectedDayData.cost.toFixed(2)}
                                    </p>
                                </div>
                                <div className="bg-muted/50 rounded-lg p-3 text-center">
                                    <p className="text-xs text-muted-foreground mb-1">
                                        Net Profit
                                    </p>
                                    <p className="text-xl font-bold text-green-500">
                                        ₹{selectedDayData.profit.toFixed(2)}
                                    </p>
                                </div>
                                <div className="bg-muted/50 rounded-lg p-3 text-center">
                                    <p className="text-xs text-muted-foreground mb-1">
                                        Margin
                                    </p>
                                    <p className="text-xl font-bold text-blue-500">
                                        {selectedDayData.revenue > 0
                                            ? (
                                                (selectedDayData.profit /
                                                    selectedDayData.revenue) *
                                                100
                                            ).toFixed(1)
                                            : "0"}
                                        %
                                    </p>
                                </div>
                            </div>

                            {/* Bill-level breakdown */}
                            <h4 className="font-medium mb-2">Bills</h4>
                            <div className="space-y-2">
                                {selectedDayData.orders.map((order) => {
                                    const orderProfit = calcOrderProfit(order, productMap);
                                    const isExpanded = expandedBillId === order.id;

                                    return (
                                        <div
                                            key={order.id}
                                            className="bg-secondary/30 rounded-xl border border-border overflow-hidden"
                                        >
                                            <button
                                                onClick={() =>
                                                    setExpandedBillId(
                                                        isExpanded ? null : order.id
                                                    )
                                                }
                                                className="w-full flex items-center justify-between p-3 hover:bg-secondary/50 transition-colors"
                                            >
                                                <div className="text-left">
                                                    <p className="font-mono text-sm font-medium text-foreground">
                                                        {order.orderNumber}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {order.customerName || "Guest"}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-green-500 text-sm">
                                                        ₹{orderProfit.toFixed(2)}
                                                    </span>
                                                    <ChevronDown
                                                        className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""
                                                            }`}
                                                    />
                                                </div>
                                            </button>

                                            {isExpanded && (
                                                <div className="border-t border-border bg-background/50 px-3 py-2 space-y-1.5">
                                                    {order.items.map((item, idx) => {
                                                        const product = productMap.get(
                                                            item.product.id
                                                        );
                                                        const costPrice =
                                                            product?.costPrice ?? 0;
                                                        const lineProfit = calcItemProfit(
                                                            item,
                                                            costPrice
                                                        );

                                                        if (item.isOutOfStock) {
                                                            return (
                                                                <div
                                                                    key={idx}
                                                                    className="flex justify-between text-xs text-muted-foreground py-0.5"
                                                                >
                                                                    <span className="line-through">
                                                                        {item.product.name}
                                                                    </span>
                                                                    <span className="text-destructive font-medium">
                                                                        Stock Out
                                                                    </span>
                                                                </div>
                                                            );
                                                        }

                                                        return (
                                                            <div
                                                                key={idx}
                                                                className="flex justify-between text-xs py-0.5"
                                                            >
                                                                <div>
                                                                    <span className="text-foreground font-medium">
                                                                        {item.product.name}
                                                                    </span>
                                                                    <span className="text-muted-foreground ml-1">
                                                                        ×{item.quantity}
                                                                    </span>
                                                                    {costPrice > 0 && (
                                                                        <span className="text-muted-foreground ml-1">
                                                                            (CP: ₹{costPrice})
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <span className="text-green-500 font-medium">
                                                                    ₹{lineProfit.toFixed(2)}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ─── Secondary PIN Dialog for Cost Settings ──────────────── */}
            <PinDialog
                open={showCostPinDialog}
                onOpenChange={setShowCostPinDialog}
                title="Cost Price Settings"
                description="Enter Cost Settings PIN to access cost prices"
                onSubmit={handleCostPinSubmit}
                onSuccess={onCostPinSuccess}
            />

            {/* ─── Cost Price Settings Sheet ──────────────────────────── */}
            <Sheet open={showSettings} onOpenChange={setShowSettings}>
                <SheetContent side="bottom" className="max-h-[85vh] flex flex-col">
                    <SheetHeader>
                        <SheetTitle>Cost Price Settings</SheetTitle>
                        <SheetDescription>
                            Set the cost price for each product to calculate profit
                        </SheetDescription>
                    </SheetHeader>

                    <div className="flex-1 overflow-y-auto mt-4 space-y-2 pr-1">
                        {products.map((product) => (
                            <div
                                key={product.id}
                                className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0"
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm text-foreground truncate">
                                        {product.name}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-sm text-muted-foreground w-16 text-right">
                                        ₹{product.price}
                                    </span>
                                    <input
                                        type="number"
                                        inputMode="decimal"
                                        min="0"
                                        step="0.01"
                                        value={costPriceEdits[product.id] ?? ""}
                                        onChange={(e) =>
                                            setCostPriceEdits((prev) => ({
                                                ...prev,
                                                [product.id]: e.target.value,
                                            }))
                                        }
                                        placeholder="Cost"
                                        className="w-20 px-2 py-1.5 text-sm text-right rounded-lg bg-background border border-input focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={saveCostPrices}
                        className="w-full mt-4 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
                    >
                        Save
                    </button>
                </SheetContent>
            </Sheet>
        </div>
    );
}
