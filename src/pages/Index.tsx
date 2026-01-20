import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShoppingCart,
  Package,
  Receipt,
  RotateCcw,
  Settings,
  History,
  BarChart3,
  Shield,
  ShieldAlert,
} from "lucide-react";
import { useBilling } from "@/context/BillingContext";
import { useAuth } from "@/hooks/useAuth";
import { PinDialog } from "@/components/PinDialog";

const Index = () => {
  const navigate = useNavigate();
  const { orders, getCartItemCount } = useBilling();
  const {
    isOwnerAuthenticated,
    logout,
    verifyPin,
    checkAdminStatus,
    setupAdmin,
  } = useAuth();
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showAdminSetup, setShowAdminSetup] = useState(false);

  const pendingOrders = orders.filter((o) => o.status === "pending").length;
  const packedOrders = orders.filter((o) => o.status === "packed").length;

  const handleAdminLogin = async (pin: string) => {
    return await verifyPin(pin, "admin");
  };

  return (
    <div className="page-container flex flex-col min-h-screen">
      {/* Header */}
      <header className="text-center mb-8 md:mb-12 animate-fade-in">
        <div className="flex items-center justify-center gap-3">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            PH SUPPLIES
          </h1>

          <div className="flex gap-2">
            <button
              onClick={() => navigate("/products")}
              className="p-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
              title="Manage Products"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowAdminLogin(true)}
              className="p-2 rounded-lg bg-accent/10 text-accent-foreground hover:bg-accent/20 transition-colors"
              title="Admin Dashboard"
            >
              <ShieldAlert className="w-5 h-5 text-destructive" />
            </button>
            {isOwnerAuthenticated && (
              <button
                onClick={() => navigate("/owner-settings")}
                className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                title="Owner Settings"
              >
                <Shield className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
        <p className="text-muted-foreground">
          Fast and efficient billing for your retail shop
        </p>
      </header>

      {/* Navigation Grid */}
      <div className="flex-1 flex items-center justify-center">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 w-full max-w-3xl">
          {/* Taking Order */}
          <button
            onClick={() => navigate("/taking-order")}
            className="nav-button aspect-square md:aspect-auto md:py-12 relative"
          >
            <ShoppingCart className="w-10 h-10 md:w-12 md:h-12" />
            <span className="text-base md:text-xl">Taking Order</span>
            {getCartItemCount() > 0 && (
              <span className="badge-count">{getCartItemCount()}</span>
            )}
          </button>

          {/* Pack & Check */}
          <button
            onClick={() => navigate("/pack-check")}
            className="nav-button nav-button-accent aspect-square md:aspect-auto md:py-12 relative"
          >
            <Package className="w-10 h-10 md:w-12 md:h-12" />
            <span className="text-base md:text-xl">Pack & Check</span>
            {pendingOrders > 0 && (
              <span className="badge-count">{pendingOrders}</span>
            )}
          </button>

          {/* Billing */}
          <button
            onClick={() => navigate("/billing")}
            className="nav-button nav-button-warning aspect-square md:aspect-auto md:py-12 relative"
          >
            <Receipt className="w-10 h-10 md:w-12 md:h-12" />
            <span className="text-base md:text-xl">Billing</span>
            {packedOrders > 0 && (
              <span className="badge-count">{packedOrders}</span>
            )}
          </button>

          {/* History */}
          <button
            onClick={() => navigate("/history")}
            className="nav-button nav-button-secondary aspect-square md:aspect-auto md:py-12"
          >
            <History className="w-10 h-10 md:w-12 md:h-12" />
            <span className="text-base md:text-xl">History</span>
          </button>

          {/* Summary */}
          <button
            onClick={() => navigate("/summary")}
            className="nav-button nav-button-accent aspect-square md:aspect-auto md:py-12"
          >
            <BarChart3 className="w-10 h-10 md:w-12 md:h-12" />
            <span className="text-base md:text-xl">Summary</span>
          </button>

          {/* Reset All Bills */}
          <button
            onClick={() => navigate("/reset")}
            className="nav-button nav-button-danger aspect-square md:aspect-auto md:py-12"
          >
            <RotateCcw className="w-10 h-10 md:w-12 md:h-12" />
            <span className="text-base md:text-xl">Reset All</span>
          </button>
        </div>
      </div>

      {/* Stats Footer */}
      <footer className="mt-8 text-center animate-fade-in">
        <div className="inline-flex items-center gap-6 bg-card rounded-xl px-6 py-3 shadow-sm border border-border">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{orders.length}</p>
            <p className="text-xs text-muted-foreground">Total Orders</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-center">
            <p className="text-2xl font-bold text-warning">{pendingOrders}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-center">
            <p className="text-2xl font-bold text-accent">{packedOrders}</p>
            <p className="text-xs text-muted-foreground">Ready</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Lock App
        </button>
      </footer>

      <PinDialog
        open={showAdminLogin}
        onOpenChange={setShowAdminLogin}
        title="Admin Access"
        description="Enter Admin Code to access dashboard"
        onSubmit={handleAdminLogin}
        onSuccess={() => {
          setShowAdminLogin(false);
          navigate("/admin-dashboard");
        }}
      />
    </div>
  );
};

export default Index;
