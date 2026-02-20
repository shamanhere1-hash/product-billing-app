import { useState, useMemo } from "react";
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
    TrendingUp,
    Package,
    Trophy,
    X,
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

function abbreviate(val: number): string {
    if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
    return `${val.toFixed(0)}`;
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
    const [activeTab, setActiveTab] = useState<"calendar" | "products">("calendar");
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [showSettings, setShowSettings] = useState(false);
    const [selectedDay, setSelectedDay] = useState<Date | null>(null);
    const [expandedBillId, setExpandedBillId] = useState<string | null>(null);
    const [productsFilter, setProductsFilter] = useState<"today" | "week" | "month">("today");

    // Cost price editor state
    const [costPriceEdits, setCostPriceEdits] = useState<Record<string, string>>({});

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

    // ─── Profit Calculations ──────────────────────────────────────
    const today = new Date();
    const todayKey = format(today, "yyyy-MM-dd");

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

    const todayProfit = dailyProfitMap.get(todayKey)?.profit ?? 0;

    const thisMonthProfit = useMemo(() => {
        let total = 0;
        const mStart = startOfMonth(today);
        const mEnd = endOfMonth(today);
        dailyProfitMap.forEach((val, key) => {
            const d = new Date(key);
            if (d >= mStart && d <= mEnd) {
                total += val.profit;
            }
        });
        return total;
    }, [dailyProfitMap]);

    const bestDay = useMemo(() => {
        let best: { date: string; profit: number } | null = null;
        const mStart = startOfMonth(today);
        const mEnd = endOfMonth(today);
        dailyProfitMap.forEach((val, key) => {
            const d = new Date(key);
            if (d >= mStart && d <= mEnd) {
                if (!best || val.profit > best.profit) {
                    best = { date: key, profit: val.profit };
                }
            }
        });
        return best;
    }, [dailyProfitMap]);

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

    const getGreenStyle = (profit: number): string => {
        if (profit <= 0 || maxProfitInMonth <= 0) return "";
        const ratio = profit / maxProfitInMonth;
        const lightness = 85 - ratio * 55;
        return `hsl(142, 76%, ${lightness}%)`;
    };

    // ─── Selected day detail ───────────────────────────────────────
    const selectedDayData = selectedDay
        ? dailyProfitMap.get(format(selectedDay, "yyyy-MM-dd"))
        : null;

    // ─── Products tab helpers ──────────────────────────────────────
    const getOrdersForFilter = (filter: "today" | "week" | "month"): Order[] => {
        if (filter === "today") {
            return billedOrders.filter(
                (o) => format(new Date(o.createdAt), "yyyy-MM-dd") === todayKey
            );
        }
        if (filter === "week") {
            const ws = startOfWeek(today, { weekStartsOn: 1 });
            const we = endOfWeek(today, { weekStartsOn: 1 });
            return billedOrders.filter((o) =>
                isWithinInterval(new Date(o.createdAt), { start: ws, end: we })
            );
        }
        // month
        const ms = startOfMonth(today);
        const me = endOfMonth(today);
        return billedOrders.filter((o) =>
            isWithinInterval(new Date(o.createdAt), { start: ms, end: me })
        );
    };

    const getProductSales = (ordersData: Order[]): ProductSales[] => {
        const salesMap = new Map<string, ProductSales>();
        ordersData.forEach((bill) => {
            if (Array.isArray(bill.items)) {
                bill.items.forEach((item) => {
                    const price = item.overriddenPrice ?? item.product.price;
                    const existing = salesMap.get(item.product.name);
                    if (existing) {
                        existing.quantity += item.quantity;
                        existing.revenue += price * item.quantity;
                    } else {
                        salesMap.set(item.product.name, {
                            name: item.product.name,
                            quantity: item.quantity,
                            revenue: price * item.quantity,
                        });
                    }
                });
            }
        });
        return Array.from(salesMap.values()).sort((a, b) => b.quantity - a.quantity);
    };

    const filteredProductSales = useMemo(
        () => getProductSales(getOrdersForFilter(productsFilter)),
        [billedOrders, productsFilter, productMap]
    );

    // ─── Settings handlers ─────────────────────────────────────────
    const openSettings = () => setShowCostPinDialog(true);

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
            toast.success(`Updated cost prices for ${changed} product${changed > 1 ? "s" : ""}`);
        } else {
            toast.info("No changes to save");
        }
    };

    // ─── PIN gate ──────────────────────────────────────────────────
    const handlePinSubmit = async (pin: string) => await verifyHistoryPin(pin);
    const handleCostPinSubmit = async (pin: string) => await verifyCostSettingsPin(pin);

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

    // ─── Rank badge color helper ───────────────────────────────────
    const getRankStyle = (rank: number) => {
        if (rank === 1) return "bg-amber-500/20 text-amber-500";
        if (rank === 2) return "bg-zinc-400/20 text-zinc-400";
        if (rank === 3) return "bg-orange-500/20 text-orange-500";
        return "bg-primary/10 text-primary";
    };

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
                <div className="max-w-2xl mx-auto space-y-5">
                    {/* ═══════ Section 1 — Hero Profit Cards ═══════ */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-card rounded-xl border border-border p-4 text-center">
                            <p className="text-xs text-muted-foreground mb-1">Today's Profit</p>
                            <p className="text-lg font-bold text-green-500">₹{todayProfit.toFixed(0)}</p>
                        </div>
                        <div className="bg-card rounded-xl border border-border p-4 text-center">
                            <p className="text-xs text-muted-foreground mb-1">This Month</p>
                            <p className="text-lg font-bold text-green-500">₹{abbreviate(thisMonthProfit)}</p>
                        </div>
                        <div className="bg-card rounded-xl border border-border p-4 text-center">
                            <p className="text-xs text-muted-foreground mb-1">Best Day</p>
                            {bestDay ? (
                                <>
                                    <p className="text-lg font-bold text-amber-500">₹{abbreviate(bestDay.profit)}</p>
                                    <p className="text-[10px] text-muted-foreground">{format(new Date(bestDay.date), "dd MMM")}</p>
                                </>
                            ) : (
                                <p className="text-sm text-muted-foreground">—</p>
                            )}
                        </div>
                    </div>

                    {/* ═══════ Section 2 — Tab Bar ═══════ */}
                    <div className="bg-secondary/50 p-1 rounded-xl flex">
                        <button
                            onClick={() => setActiveTab("calendar")}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "calendar"
                                    ? "bg-card shadow-sm text-foreground"
                                    : "text-muted-foreground"
                                }`}
                        >
                            <TrendingUp className="w-4 h-4" />
                            Profit Calendar
                        </button>
                        <button
                            onClick={() => setActiveTab("products")}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "products"
                                    ? "bg-card shadow-sm text-foreground"
                                    : "text-muted-foreground"
                                }`}
                        >
                            <Package className="w-4 h-4" />
                            Products
                        </button>
                    </div>

                    {/* ═══════ Tab A — Profit Calendar ═══════ */}
                    {activeTab === "calendar" && (
                        <>
                            <div className="bg-card rounded-xl border border-border p-4">
                                {/* Month navigator */}
                                <div className="flex items-center justify-between mb-4">
                                    <button
                                        onClick={() => {
                                            setCurrentMonth(subMonths(currentMonth, 1));
                                            setSelectedDay(null);
                                        }}
                                        className="p-2 rounded-lg hover:bg-secondary transition-colors"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <h2 className="text-lg font-semibold text-foreground">
                                        {format(currentMonth, "MMMM yyyy")}
                                    </h2>
                                    <button
                                        onClick={() => {
                                            setCurrentMonth(addMonths(currentMonth, 1));
                                            setSelectedDay(null);
                                        }}
                                        className="p-2 rounded-lg hover:bg-secondary transition-colors"
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Weekday header */}
                                <div className="grid grid-cols-7 gap-1 mb-1">
                                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                                        <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">
                                            {d}
                                        </div>
                                    ))}
                                </div>

                                {/* Day cells */}
                                <div className="grid grid-cols-7 gap-1">
                                    {calendarDays.map((day, idx) => {
                                        if (!day) return <div key={`empty-${idx}`} className="aspect-square" />;

                                        const dateKey = format(day, "yyyy-MM-dd");
                                        const dayData = dailyProfitMap.get(dateKey);
                                        const profit = dayData?.profit ?? 0;
                                        const isToday = isSameDay(day, today);
                                        const hasProfit = profit > 0;
                                        const isSelected = selectedDay && isSameDay(day, selectedDay);
                                        const greenBg = hasProfit ? getGreenStyle(profit) : undefined;

                                        return (
                                            <button
                                                key={dateKey}
                                                onClick={() => {
                                                    if (dayData) {
                                                        if (isSelected) {
                                                            setSelectedDay(null);
                                                        } else {
                                                            setSelectedDay(day);
                                                            setExpandedBillId(null);
                                                        }
                                                    }
                                                }}
                                                disabled={!dayData}
                                                className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-colors relative ${dayData ? "cursor-pointer hover:opacity-80" : "cursor-default"
                                                    } ${isSelected ? "ring-2 ring-primary ring-offset-1" : ""}`}
                                                style={greenBg ? { backgroundColor: greenBg } : undefined}
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
                                                        ₹{profit >= 1000 ? `${(profit / 1000).toFixed(1)}k` : profit.toFixed(0)}
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Heatmap legend */}
                                <div className="flex items-center justify-end gap-1.5 mt-3">
                                    <span className="text-[10px] text-muted-foreground">Low</span>
                                    {[0.1, 0.3, 0.55, 0.75, 1.0].map((ratio) => (
                                        <div
                                            key={ratio}
                                            className="w-4 h-4 rounded"
                                            style={{ backgroundColor: `hsl(142, 76%, ${85 - ratio * 55}%)` }}
                                        />
                                    ))}
                                    <span className="text-[10px] text-muted-foreground">High</span>
                                </div>
                            </div>

                            {/* Inline Day Detail */}
                            {selectedDay && selectedDayData ? (
                                <div className="bg-card rounded-xl border border-border p-5">
                                    {/* Header */}
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-base font-semibold">
                                            {format(selectedDay, "EEEE, dd MMMM yyyy")}
                                        </h3>
                                        <button
                                            onClick={() => { setSelectedDay(null); setExpandedBillId(null); }}
                                            className="p-1 rounded-lg hover:bg-secondary transition-colors"
                                        >
                                            <X className="w-4 h-4 text-muted-foreground" />
                                        </button>
                                    </div>

                                    {/* 3-stat grid */}
                                    <div className="grid grid-cols-3 gap-3 mb-5">
                                        <div className="text-center">
                                            <p className="text-xs text-muted-foreground mb-0.5">Revenue</p>
                                            <p className="text-lg font-bold text-primary">₹{selectedDayData.revenue.toFixed(0)}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs text-muted-foreground mb-0.5">Net Profit</p>
                                            <p className="text-lg font-bold text-green-500">₹{selectedDayData.profit.toFixed(0)}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs text-muted-foreground mb-0.5">Margin</p>
                                            <p className="text-lg font-bold text-blue-500">
                                                {selectedDayData.revenue > 0
                                                    ? ((selectedDayData.profit / selectedDayData.revenue) * 100).toFixed(1)
                                                    : "0"}%
                                            </p>
                                        </div>
                                    </div>

                                    {/* Bills */}
                                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                                        Bills ({selectedDayData.orders.length})
                                    </p>
                                    <div className="space-y-2">
                                        {selectedDayData.orders.map((order) => {
                                            const orderProfit = calcOrderProfit(order, productMap);
                                            const isExpanded = expandedBillId === order.id;
                                            return (
                                                <div key={order.id} className="bg-secondary/30 rounded-xl border border-border overflow-hidden">
                                                    <button
                                                        onClick={() => setExpandedBillId(isExpanded ? null : order.id)}
                                                        className="w-full flex items-center justify-between p-3 hover:bg-secondary/50 transition-colors"
                                                    >
                                                        <div className="text-left">
                                                            <p className="font-mono text-sm font-medium text-foreground">{order.orderNumber}</p>
                                                            <p className="text-xs text-muted-foreground">{order.customerName || "Guest"}</p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-green-500 text-sm">₹{orderProfit.toFixed(0)}</span>
                                                            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                                                        </div>
                                                    </button>
                                                    {isExpanded && (
                                                        <div className="border-t border-border bg-background/50 px-3 py-2 space-y-1.5">
                                                            {order.items.map((item, idx) => {
                                                                const product = productMap.get(item.product.id);
                                                                const costPrice = product?.costPrice ?? 0;
                                                                const lineProfit = calcItemProfit(item, costPrice);

                                                                if (item.isOutOfStock) {
                                                                    return (
                                                                        <div key={idx} className="flex justify-between text-xs text-muted-foreground py-0.5">
                                                                            <span className="line-through">{item.product.name}</span>
                                                                            <span className="text-destructive font-medium">Stock Out</span>
                                                                        </div>
                                                                    );
                                                                }
                                                                return (
                                                                    <div key={idx} className="flex justify-between text-xs py-0.5">
                                                                        <div>
                                                                            <span className="text-foreground font-medium">{item.product.name}</span>
                                                                            <span className="text-muted-foreground ml-1">×{item.quantity}</span>
                                                                            {costPrice > 0 && (
                                                                                <span className="text-muted-foreground ml-1">(CP: ₹{costPrice})</span>
                                                                            )}
                                                                        </div>
                                                                        <span className="text-green-500 font-medium">₹{lineProfit.toFixed(0)}</span>
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
                            ) : !selectedDay ? (
                                <p className="text-center text-muted-foreground text-sm py-4">
                                    Tap any highlighted day to see its profit detail
                                </p>
                            ) : null}
                        </>
                    )}

                    {/* ═══════ Tab B — Products ═══════ */}
                    {activeTab === "products" && (
                        <>
                            {/* Filter toggle */}
                            <div className="bg-secondary/50 p-1 rounded-xl flex">
                                {([["today", "Today"], ["week", "This Week"], ["month", "This Month"]] as const).map(([key, label]) => (
                                    <button
                                        key={key}
                                        onClick={() => setProductsFilter(key)}
                                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${productsFilter === key
                                                ? "bg-card shadow-sm text-foreground"
                                                : "text-muted-foreground"
                                            }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>

                            {/* Top Sold Products */}
                            <div className="bg-card rounded-xl border border-border overflow-hidden">
                                <div className="p-4 pb-3 flex items-center gap-2">
                                    <Trophy className="w-5 h-5 text-amber-500" />
                                    <h3 className="text-base font-semibold">Top Sold Products</h3>
                                </div>

                                {filteredProductSales.length > 0 ? (
                                    <div className="divide-y divide-border/50">
                                        {filteredProductSales.slice(0, 10).map((product, idx) => {
                                            const rank = idx + 1;
                                            return (
                                                <div key={product.name} className="flex items-center gap-3 px-4 py-3">
                                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${getRankStyle(rank)}`}>
                                                        {rank}
                                                    </span>
                                                    <span className="flex-1 font-medium truncate">{product.name}</span>
                                                    <div className="text-right shrink-0">
                                                        <span className="font-semibold text-sm">{product.quantity} sold</span>
                                                        <span className="text-muted-foreground text-xs ml-2">₹{product.revenue.toFixed(0)}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                        <Package className="w-8 h-8 mb-2" />
                                        <p className="text-sm">No sales data for this period</p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ─── Cost PIN Dialog ──────────────────── */}
            <PinDialog
                open={showCostPinDialog}
                onOpenChange={setShowCostPinDialog}
                title="Cost Price Settings"
                description="Enter Cost Settings PIN to access cost prices"
                onSubmit={handleCostPinSubmit}
                onSuccess={onCostPinSuccess}
            />

            {/* ─── Cost Price Settings Sheet ──────────── */}
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
                                    <p className="font-medium text-sm text-foreground truncate">{product.name}</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-sm text-muted-foreground w-16 text-right">₹{product.price}</span>
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
