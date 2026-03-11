import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerFooter,
    DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Minus, Plus, Trash2, X } from "lucide-react";
import { CartItem } from "@/context/BillingContext";

interface CartDrawerProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    cart: CartItem[];
    onUpdateQuantity: (productId: string, quantity: number) => void;
    onRemove: (productId: string) => void;
    total: number;
    onCreateOrder: () => void;
    customerName: string;
    onCustomerNameChange: (name: string) => void;
}

export function CartDrawer({
    isOpen,
    onOpenChange,
    cart,
    onUpdateQuantity,
    onRemove,
    total,
    onCreateOrder,
    customerName,
    onCustomerNameChange,
}: CartDrawerProps) {
    return (
        <Drawer open={isOpen} onOpenChange={onOpenChange}>
            <DrawerContent className="h-[85vh] flex flex-col max-h-[90vh]">
                <DrawerHeader className="border-b border-border/50 pb-4 shrink-0">
                    <div className="flex items-center justify-between">
                        <DrawerTitle className="text-2xl font-bold">Current Order</DrawerTitle>
                        <DrawerClose asChild>
                            <Button variant="ghost" size="icon" className="rounded-full">
                                <X className="w-5 h-5" />
                            </Button>
                        </DrawerClose>
                    </div>
                </DrawerHeader>

                <div className="p-4 flex-1 overflow-hidden flex flex-col min-h-0">
                    {/* Bill View Header */}
                    <div className="grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground mb-2 px-2 shrink-0">
                        <div className="col-span-5">Item</div>
                        <div className="col-span-3 text-center">Qty</div>
                        <div className="col-span-2 text-right">Price</div>
                        <div className="col-span-2 text-right">Total</div>
                    </div>

                    <ScrollArea className="flex-1 -mx-4 px-4 h-full">
                        <div className="space-y-4 pb-4">
                            {cart.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <p>Cart is empty</p>
                                </div>
                            ) : (
                                cart.map((item) => (
                                    <div key={item.product.id} className={`grid grid-cols-12 gap-2 items-center text-sm py-2 border-b border-border/50 last:border-none ${item.quantity === 0 ? "grayscale opacity-60" : ""}`}>
                                        {/* Product Name */}
                                        <div className="col-span-5 font-medium truncate pr-2">
                                            {item.product.name}
                                        </div>

                                        {/* Quantity Controls */}
                                        <div className="col-span-3 flex items-center justify-center gap-1">
                                            <button
                                                onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                                                className="w-6 h-6 flex items-center justify-center rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50"
                                                disabled={item.quantity <= 0}
                                            >
                                                <Minus className="w-3 h-3" />
                                            </button>
                                            <span className={`w-6 text-center font-medium ${item.quantity === 0 ? "text-destructive" : ""}`}>{item.quantity}</span>
                                            <button
                                                onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                                                className="w-6 h-6 flex items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                                            >
                                                <Plus className="w-3 h-3" />
                                            </button>
                                        </div>

                                        {/* Unit Price */}
                                        <div className="col-span-2 text-right text-muted-foreground">
                                            ₹{item.overriddenPrice ?? item.product.price}
                                        </div>

                                        {/* Line Total */}
                                        <div className="col-span-2 text-right font-medium">
                                            ₹{(item.overriddenPrice ?? item.product.price) * item.quantity}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </div>

                <div className="p-4 border-t border-border bg-muted/20 shrink-0">
                    <div className="mb-4">
                        <input
                            type="text"
                            placeholder="Customer Name"
                            value={customerName}
                            onChange={(e) => onCustomerNameChange(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                        />
                    </div>

                    <div className="flex justify-between items-center mb-6 text-xl font-bold">
                        <span>Grand Total</span>
                        <span className="text-primary">₹{total}</span>
                    </div>

                    <div className="flex gap-3">
                        <DrawerClose asChild>
                            <Button variant="outline" className="flex-1 h-12 text-base rounded-xl">
                                Continue Ordering
                            </Button>
                        </DrawerClose>
                        <Button
                            onClick={() => {
                                onCreateOrder();
                                onOpenChange(false);
                            }}
                            className="flex-1 h-12 text-base rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                            disabled={cart.length === 0}
                        >
                            Confirm Order
                        </Button>
                    </div>
                </div>
            </DrawerContent>
        </Drawer>
    );
}
