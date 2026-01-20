import { Order } from "@/context/BillingContext";
import { Package, Clock, CheckCircle2, Receipt } from "lucide-react";
import { format } from "date-fns";

interface OrderCardProps {
  order: Order;
  onSelect?: (order: Order) => void;
  showItems?: boolean;
}

const statusConfig = {
  pending: {
    icon: Clock,
    label: "Pending",
    className: "bg-warning/10 text-warning",
  },
  packed: {
    icon: Package,
    label: "Packed",
    className: "bg-accent/10 text-accent",
  },
  billed: {
    icon: CheckCircle2,
    label: "Billed",
    className: "bg-success/10 text-success",
  },
};

export function OrderCard({
  order,
  onSelect,
  showItems = false,
}: OrderCardProps) {
  const config = statusConfig[order.status];
  const StatusIcon = config.icon;

  return (
    <div
      className={`bg-card rounded-xl p-4 shadow-sm border border-border animate-fade-in ${
        onSelect
          ? "cursor-pointer hover:border-primary/30 transition-colors"
          : ""
      }`}
      onClick={() => onSelect?.(order)}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold text-foreground">
              {order.orderNumber || order.id}
            </span>
          </div>
          {order.customerName && order.customerName !== "Guest" && (
            <p className="text-sm font-medium text-primary mt-1">
              {order.customerName}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-0.5">
            {format(new Date(order.createdAt), "MMM d, yyyy • h:mm a")}
          </p>
        </div>
        <div
          className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${config.className}`}
        >
          <StatusIcon className="w-3 h-3" />
          {config.label}
        </div>
      </div>

      {showItems && (
        <div className="space-y-2 mb-3 py-3 border-y border-border">
          {order.items.map((item) => (
            <div key={item.product.id} className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {item.product.name} × {item.quantity}
              </span>
              <span className="font-medium text-foreground">
                ₹{item.product.price * item.quantity}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {order.items.length} item{order.items.length > 1 ? "s" : ""}
        </span>
        <span className="font-bold text-lg text-primary">₹{order.total}</span>
      </div>
    </div>
  );
}
