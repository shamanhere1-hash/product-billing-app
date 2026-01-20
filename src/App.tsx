import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { BillingProvider } from "@/context/BillingContext";
import { AuthGate } from "@/components/AuthGate";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import Index from "./pages/Index";
import TakingOrder from "./pages/TakingOrder";
import PackCheck from "./pages/PackCheck";
import Billing from "./pages/Billing";
import Reset from "./pages/Reset";
import ProductManagement from "./pages/ProductManagement";
import History from "./pages/History";
import Summary from "./pages/Summary";
import OwnerSettings from "./pages/OwnerSettings";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthGate>
        <BillingProvider>
          <Toaster />
          <Sonner position="top-center" />
          <OfflineIndicator />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/taking-order" element={<TakingOrder />} />
              <Route path="/pack-check" element={<PackCheck />} />
              <Route path="/billing" element={<Billing />} />
              <Route path="/reset" element={<Reset />} />
              <Route path="/products" element={<ProductManagement />} />
              <Route path="/history" element={<History />} />
              <Route path="/summary" element={<Summary />} />
              <Route path="/owner-settings" element={<OwnerSettings />} />
              <Route path="/admin-dashboard" element={<AdminDashboard />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </BillingProvider>
      </AuthGate>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
