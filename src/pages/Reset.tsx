import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBilling } from '@/context/BillingContext';
import { BackButton } from '@/components/BackButton';
import { AlertTriangle, RotateCcw, X } from 'lucide-react';
import { toast } from 'sonner';

const Reset = () => {
  const navigate = useNavigate();
  const { orders, resetAllBills } = useBilling();
  const [showConfirm, setShowConfirm] = useState(false);

  const totalOrders = orders.length;
  const totalAmount = orders.reduce((sum, order) => sum + order.total, 0);

  const handleReset = async () => {
    await resetAllBills();
    toast.success('All data has been reset!', {
      description: 'Cart and orders cleared successfully',
    });
    navigate('/');
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <BackButton />
        <h1 className="page-title">Reset All Bills</h1>
      </div>

      <div className="max-w-md mx-auto">
        <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              Reset All Data?
            </h2>
            <p className="text-muted-foreground">
              This action will permanently delete all orders and clear the cart.
            </p>
          </div>

          {/* Summary */}
          <div className="bg-muted rounded-lg p-4 mb-6 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Orders</span>
              <span className="font-medium text-foreground">{totalOrders}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Amount</span>
              <span className="font-medium text-foreground">₹{totalAmount}</span>
            </div>
          </div>

          {!showConfirm ? (
            <button
              onClick={() => setShowConfirm(true)}
              disabled={totalOrders === 0}
              className="w-full py-3 rounded-xl bg-destructive text-destructive-foreground font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-5 h-5" />
              Reset All Bills
            </button>
          ) : (
            <div className="space-y-3 animate-scale-in">
              <p className="text-center text-sm font-medium text-destructive">
                Are you absolutely sure?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 py-3 rounded-xl bg-secondary text-secondary-foreground font-medium hover:bg-secondary/80 transition-colors flex items-center justify-center gap-2"
                >
                  <X className="w-5 h-5" />
                  Cancel
                </button>
                <button
                  onClick={handleReset}
                  className="flex-1 py-3 rounded-xl bg-destructive text-destructive-foreground font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-5 h-5" />
                  Confirm
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reset;
