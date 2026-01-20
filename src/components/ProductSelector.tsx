import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Product } from '@/context/BillingContext';

interface ProductSelectorProps {
    products: Product[];
    onSelect: (product: Product) => void;
}

export function ProductSelector({ products, onSelect }: ProductSelectorProps) {
    const [open, setOpen] = useState(false);
    const [value, setValue] = useState("");

    const handleSelect = (currentValue: string) => {
        // currentValue from command is lowercase
        const product = products.find((p) => p.name.toLowerCase() === currentValue.toLowerCase());
        if (product) {
            onSelect(product);
            setOpen(false);
            setValue("");
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                >
                    <span className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Add Product...
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
                <Command>
                    <CommandInput placeholder="Search product..." />
                    <CommandList>
                        <CommandEmpty>No product found.</CommandEmpty>
                        <CommandGroup>
                            {products.map((product) => (
                                <CommandItem
                                    key={product.id}
                                    value={product.name}
                                    onSelect={handleSelect}
                                >
                                    <div className="flex flex-col">
                                        <span>{product.name}</span>
                                        <span className="text-xs text-muted-foreground">₹{product.price}</span>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
