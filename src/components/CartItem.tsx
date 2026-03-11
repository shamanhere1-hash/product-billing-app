import { useState } from "react";
import { CartItem as CartItemType } from "@/context/BillingContext";
import { Minus, Plus, Trash2, Edit2, Check, X } from "lucide-react";

interface CartItemProps {
  item: CartItemType;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onUpdatePrice?: (productId: string, price: number) => void;
  onRemove: (productId: string) => void;
  readOnly?: boolean;
  variant?: "default" | "responsive";
  hideDelete?: boolean;
  onClick?: () => void;
  onToggleStock?: (productId: string) => void;
  isPriceEditMode?: boolean;
}

export function CartItemComponent({
  item,
  onUpdateQuantity,
  onUpdatePrice,
  onRemove,
  readOnly = false,
  variant = "default",
  hideDelete = false,
  onClick,
  onToggleStock,
  isPriceEditMode = false,
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

  const isResponsive = variant === "responsive";

  return (
    <div
      className={`cart-item animate-slide-in ${isResponsive ? "flex-wrap sm:flex-nowrap gap-y-3" : ""
        } ${onClick ? "cursor-pointer hover:bg-muted/50 transition-colors" : ""
        } ${item.quantity === 0 && !item.isOutOfStock ? "grayscale opacity-50" : ""
        }`}
      onClick={(e) => {
        if (onClick) {
          // Only trigger if clicking the container, not interactive elements
          const target = e.target as HTMLElement;
          if (!target.closest("button") && !target.closest("input")) {
            onClick();
          }
        }
      }}
    >
      <div className={`flex-1 min-w-0 ${isResponsive ? "min-w-[120px]" : ""}`}>
        <h4
          className={`font-medium text-sm truncate ${isResponsive ? "pr-2" : ""
            } ${item.isOutOfStock ? "line-through decoration-destructive text-muted-foreground" : (item.quantity === 0 ? "text-destructive" : "text-foreground")}`}
        >
          {item.product.name}
        </h4>

        {isEditingPrice && !readOnly && !isPriceEditMode ? (
          <div
            className={`flex items-center ${isResponsive ? "gap-2 mt-2" : "gap-1 mt-1"
              }`}
          >
            <input
              type="number"
              className={`${isResponsive
                ? "w-24 px-2 py-1.5 text-sm"
                : "w-20 px-1 py-0.5 text-xs"
                } border rounded bg-background`}
              value={editPriceValue}
              onChange={(e) => setEditPriceValue(e.target.value)}
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSavePrice();
              }}
              className={`${isResponsive
                ? "p-2 rounded-full focus:ring-2 focus:ring-success/20 ring-offset-1"
                : "p-0.5 rounded"
                } text-success hover:bg-success/10 transition-all`}
              aria-label="Save price"
            >
              <Check className={isResponsive ? "w-4 h-4" : "w-3 h-3"} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCancelPrice();
              }}
              className={`${isResponsive
                ? "p-2 rounded-full focus:ring-2 focus:ring-destructive/20 ring-offset-1"
                : "p-0.5 rounded"
                } text-destructive hover:bg-destructive/10 transition-all`}
              aria-label="Cancel price edit"
            >
              <X className={isResponsive ? "w-4 h-4" : "w-3 h-3"} />
            </button>
          </div>
        ) : (
          <div
            className={`flex items-center gap-2 ${isResponsive ? "mt-1" : "mt-0.5"
              }`}
          >
            {!item.isOutOfStock && !isPriceEditMode && (
              <>
                <p className="text-xs text-muted-foreground mr-1">
                  ₹{displayPrice} &times; {item.quantity}
                </p>
                {!readOnly && onUpdatePrice && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditPriceValue(String(displayPrice));
                      setIsEditingPrice(true);
                    }}
                    className={`${isResponsive
                      ? "p-1.5 -ml-1.5 rounded-full"
                      : "p-0.5 hover:bg-muted"
                      } text-muted-foreground hover:text-primary transition-colors`}
                    title="Edit Price"
                  >
                    <Edit2
                      className={isResponsive ? "w-3.5 h-3.5" : "w-3 h-3"}
                    />
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {!readOnly && (
        <div
          className={`flex items-center ${isResponsive ? "gap-3 ml-auto sm:ml-0" : "gap-2"
            }`}
        >
          {item.isOutOfStock ? (
            /* Out-of-stock: show quantity read-only + Stock Out + Undo */
            <div className="flex items-center gap-2">
              <span className={`text-center font-semibold text-sm text-muted-foreground ${isResponsive ? "w-14" : "w-12"}`}>
                {item.quantity}
              </span>
              <span className="text-xs font-bold text-destructive whitespace-nowrap">
                Stock Out
              </span>
              {onToggleStock && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleStock(item.product.id);
                  }}
                  className="px-2 py-0.5 text-xs bg-success/10 text-success rounded border border-success/20 hover:bg-success/20 transition-colors no-print whitespace-nowrap"
                >
                  [Undo]
                </button>
              )}
            </div>
          ) : isPriceEditMode ? (
            <div className="flex items-center gap-2 w-full justify-end">
              <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">× {item.quantity}</span>
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm flex items-center justify-center">₹</span>
                <input
                  type="number"
                  min="0"
                  value={item.overriddenPrice ?? item.product.price}
                  onChange={(e) => {
                    const price = parseFloat(e.target.value);
                    if (!isNaN(price) && price >= 0 && onUpdatePrice) {
                      onUpdatePrice(item.product.id, price);
                    }
                  }}
                  className="w-24 pl-6 pr-2 py-1.5 text-sm font-medium border rounded bg-background focus:ring-2 focus:ring-primary/20 outline-none text-right"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          ) : (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateQuantity(item.product.id, item.quantity - 1);
                }}
                className={`quantity-btn quantity-btn-minus no-print ${isResponsive ? "w-11 h-11" : "w-8 h-8"}`}
                aria-label="Decrease quantity"
              >
                <Minus className={isResponsive ? "w-4 h-4" : "w-3 h-3"} />
              </button>

              <input
                type="number"
                min="0"
                value={item.quantity}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val) && val >= 0) {
                    onUpdateQuantity(item.product.id, val);
                  }
                }}
                className={`${isResponsive ? "w-14 h-11" : "w-12 h-8"} text-center font-semibold text-sm bg-transparent border ${isResponsive ? "border-input" : "border-none"} rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none ${item.quantity === 0 ? "text-destructive" : ""}`}
                style={{ MozAppearance: "textfield" }}
                aria-label="Quantity"
              />

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateQuantity(item.product.id, item.quantity + 1);
                }}
                className={`quantity-btn quantity-btn-plus no-print ${isResponsive ? "w-11 h-11" : "w-8 h-8"}`}
                aria-label="Increase quantity"
              >
                <Plus className={isResponsive ? "w-4 h-4" : "w-3 h-3"} />
              </button>

              {!hideDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(item.product.id);
                  }}
                  className={`${isResponsive
                    ? "ml-1 w-11 h-11 rounded-full flex items-center justify-center"
                    : "ml-2 p-1.5 rounded-full"
                    } text-destructive hover:bg-destructive/10 transition-colors no-print`}
                  title="Remove item"
                  aria-label="Remove item"
                >
                  <Trash2 className={isResponsive ? "w-4 h-4" : "w-4 h-4"} />
                </button>
              )}
            </>
          )}
        </div>
      )}

      {readOnly && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            ×{item.quantity}
          </span>
          {item.isOutOfStock ? (
            <span className="text-xs font-bold text-destructive">Stock Out</span>
          ) : (
            <span className="font-semibold text-foreground">
              ₹{displayPrice * item.quantity}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
