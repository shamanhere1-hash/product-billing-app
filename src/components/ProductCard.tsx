import { Product } from "@/context/BillingContext";
import { Plus } from "lucide-react";

interface ProductCardProps {
  product: Product;
  onAdd: (product: Product) => void;
}

export function ProductCard({ product, onAdd }: ProductCardProps) {
  return (
    <div
      className="product-card animate-fade-in group"
      onClick={() => onAdd(product)}
    >
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
          <button className="quantity-btn quantity-btn-plus opacity-0 group-hover:opacity-100 transition-opacity">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
