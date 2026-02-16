
import { Product, CartItem } from "@/context/BillingContext";
import { Plus, Minus, Trash2 } from "lucide-react";

interface SelectedProductCardProps {
    cartItem: CartItem;
    onUpdateQuantity: (productId: string, quantity: number) => void;
    onRemove: (productId: string) => void;
}

export function SelectedProductCard({
    cartItem,
    onUpdateQuantity,
    onRemove,
}: SelectedProductCardProps) {
    const { product, quantity } = cartItem;

    return (
        <div className="product-card animate-fade-in group flex flex-col h-full bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
            <div className="flex-1">
                <h3 className="font-medium text-foreground text-sm md:text-base line-clamp-2 mb-1">
                    {product.name}
                </h3>
                <p className="text-xs text-muted-foreground mb-2">{product.category}</p>
                <div className="font-bold text-primary text-lg">
                    ₹{product.price}
                </div>
            </div>

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                <div className="flex items-center gap-2 bg-secondary/50 rounded-lg p-1">
                    <button
                        onClick={() => onUpdateQuantity(product.id, quantity - 1)}
                        className="p-1.5 rounded-md hover:bg-background text-foreground transition-colors disabled:opacity-50"
                        disabled={quantity <= 1}
                    >
                        <Minus className="w-3.5 h-3.5" />
                    </button>

                    <input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (!isNaN(val) && val > 0) {
                                onUpdateQuantity(product.id, val);
                            }
                        }}
                        className="w-8 text-center font-semibold text-sm bg-transparent border-none focus:outline-none p-0 appearance-none"
                    />

                    <button
                        onClick={() => onUpdateQuantity(product.id, quantity + 1)}
                        className="p-1.5 rounded-md hover:bg-background text-foreground transition-colors"
                    >
                        <Plus className="w-3.5 h-3.5" />
                    </button>
                </div>

                <button
                    onClick={() => onRemove(product.id)}
                    className="p-2 rounded-full text-destructive hover:bg-destructive/10 transition-colors"
                    title="Remove from cart"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
