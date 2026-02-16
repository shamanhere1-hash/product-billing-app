import { Product } from "@/context/BillingContext";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ProductCardProps {
  product: Product;
  onAdd: (product: Product) => void;
  quantity?: number;
}

export function ProductCard({ product, onAdd, quantity = 0 }: ProductCardProps) {
  const [isClicked, setIsClicked] = useState(false);

  const handleClick = () => {
    setIsClicked(true);
    onAdd(product);

    // Haptic feedback if available (using Vibration API)
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }

    // Reset click state after animation
    setTimeout(() => setIsClicked(false), 300);

    toast.success(`${product.name} added`, {
      description: `Quantity: ${quantity + 1}`,
      duration: 2000,
      position: "bottom-center",
    });
  };

  return (
    <div
      className={`product-card animate-fade-in group relative overflow-visible transition-all duration-200
        ${quantity > 0 ? "border-[#10b981] ring-1 ring-[#10b981]" : ""}
        ${isClicked ? "bg-[#10b981]/10 scale-95" : "hover:scale-[1.02]"}
      `}
      onClick={handleClick}
    >
      {/* Quantity Badge */}
      {quantity > 0 && (
        <div className="absolute -top-2 -right-2 z-10 w-6 h-6 rounded-full bg-[#10b981] text-white flex items-center justify-center text-xs font-bold shadow-sm border-2 border-background animate-scale-in">
          {quantity > 99 ? "99+" : quantity}
        </div>
      )}

      <div className="flex flex-col h-full">
        <div className="flex-1">
          <h3 className="font-medium text-foreground text-sm md:text-base line-clamp-2 mb-1">
            {product.name}
          </h3>
          <p className="text-xs text-muted-foreground">{product.category}</p>
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <span className="font-bold text-primary text-lg">
            ₹{product.price}
          </span>
          <button
            className={`quantity-btn transition-all duration-200 
              ${quantity > 0
                ? "bg-[#10b981] text-white opacity-100 rotate-0"
                : "opacity-0 group-hover:opacity-100 rotate-90"
              }`}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
