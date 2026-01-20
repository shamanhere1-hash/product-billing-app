import { useState } from "react";
import { CartItem as CartItemType } from "@/context/BillingContext";
import { Minus, Plus, Trash2, Edit2, Check, X } from "lucide-react";

interface CartItemProps {
  item: CartItemType;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onUpdatePrice?: (productId: string, price: number) => void;
  onRemove: (productId: string) => void;
  readOnly?: boolean;
}

export function CartItemComponent({
  item,
  onUpdateQuantity,
  onUpdatePrice,
  onRemove,
  readOnly = false,
}: CartItemProps) {
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [editPriceValue, setEditPriceValue] = useState(
    String(item.overriddenPrice ?? item.product.price),
  );

  const handleSavePrice = () => {
    const newPrice = parseFloat(editPriceValue);
    if (!isNaN(newPrice) && newPrice >= 0 && onUpdatePrice) {
      onUpdatePrice(item.product.id, newPrice);
    }
    setIsEditingPrice(false);
  };

  const handleCancelPrice = () => {
    setEditPriceValue(String(item.overriddenPrice ?? item.product.price));
    setIsEditingPrice(false);
  };

  const displayPrice = item.overriddenPrice ?? item.product.price;

  return (
    <div className="cart-item animate-slide-in">
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-foreground text-sm truncate">
          {item.product.name}
        </h4>

        {isEditingPrice && !readOnly ? (
          <div className="flex items-center gap-1 mt-1">
            <input
              type="number"
              className="w-20 px-1 py-0.5 text-xs border rounded"
              value={editPriceValue}
              onChange={(e) => setEditPriceValue(e.target.value)}
              autoFocus
            />
            <button
              onClick={handleSavePrice}
              className="p-0.5 text-success hover:bg-success/10 rounded"
            >
              <Check className="w-3 h-3" />
            </button>
            <button
              onClick={handleCancelPrice}
              className="p-0.5 text-destructive hover:bg-destructive/10 rounded"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs text-muted-foreground">
              ₹{displayPrice} × {item.quantity}
            </p>
            {!readOnly && onUpdatePrice && (
              <button
                onClick={() => {
                  setEditPriceValue(String(displayPrice));
                  setIsEditingPrice(true);
                }}
                className="text-muted-foreground hover:text-primary transition-colors"
                title="Edit Price"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {!readOnly && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
            className="quantity-btn quantity-btn-minus no-print"
          >
            <Minus className="w-3 h-3" />
          </button>

          <input
            type="number"
            min="1"
            value={item.quantity}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (!isNaN(val) && val > 0) {
                onUpdateQuantity(item.product.id, val);
              }
            }}
            className="w-12 text-center font-semibold text-sm bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-primary/50 rounded appearance-none"
            style={{ MozAppearance: "textfield" }}
          />

          <button
            onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
            className="quantity-btn quantity-btn-plus no-print"
          >
            <Plus className="w-3 h-3" />
          </button>
          <button
            onClick={() => onRemove(item.product.id)}
            className="ml-2 p-1.5 rounded-full text-destructive hover:bg-destructive/10 transition-colors no-print"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {readOnly && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            ×{item.quantity}
          </span>
          <span className="font-semibold text-foreground">
            ₹{displayPrice * item.quantity}
          </span>
        </div>
      )}
    </div>
  );
}
