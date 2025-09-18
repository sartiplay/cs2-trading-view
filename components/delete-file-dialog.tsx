"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Trash2, DollarSign } from "lucide-react";

const CURRENCIES = [
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
  { code: "SEK", name: "Swedish Krona", symbol: "kr" },
  { code: "NOK", name: "Norwegian Krone", symbol: "kr" },
  { code: "DKK", name: "Danish Krone", symbol: "kr" },
  { code: "PLN", name: "Polish Zloty", symbol: "zł" },
  { code: "CZK", name: "Czech Koruna", symbol: "Kč" },
  { code: "HUF", name: "Hungarian Forint", symbol: "Ft" },
  { code: "RUB", name: "Russian Ruble", symbol: "₽" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$" },
  { code: "MXN", name: "Mexican Peso", symbol: "$" },
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "KRW", name: "South Korean Won", symbol: "₩" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$" },
];

interface Item {
  market_hash_name: string;
  label: string;
  latest_price?: number;
  purchase_currency: string;
}

interface DeleteItemDialogProps {
  item: Item | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onItemDeleted: () => void;
}

export function DeleteItemDialog({
  item,
  open,
  onOpenChange,
  onItemDeleted,
}: DeleteItemDialogProps) {
  const [mode, setMode] = useState<"choose" | "delete" | "sell">("choose");
  const [soldPrice, setSoldPrice] = useState("");
  const [soldCurrency, setSoldCurrency] = useState("USD");
  const [useMarketPrice, setUseMarketPrice] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!item) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/items/${encodeURIComponent(item.market_hash_name)}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        toast({
          title: "Success",
          description: "Item deleted successfully",
        });
        onItemDeleted();
        onOpenChange(false);
        resetDialog();
      } else {
        throw new Error("Failed to delete item");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSell = async () => {
    if (!item) return;

    const finalPrice =
      useMarketPrice && item.latest_price
        ? item.latest_price
        : Number.parseFloat(soldPrice);

    if (!finalPrice || finalPrice <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid sold price",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/items/sell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          market_hash_name: item.market_hash_name,
          sold_price: finalPrice,
          sold_currency: soldCurrency,
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Item marked as sold successfully",
        });
        onItemDeleted();
        onOpenChange(false);
        resetDialog();
      } else {
        throw new Error("Failed to mark item as sold");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark item as sold",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetDialog = () => {
    setMode("choose");
    setSoldPrice("");
    setSoldCurrency("USD");
    setUseMarketPrice(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetDialog();
    }
    onOpenChange(newOpen);
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "choose" && "Remove Item"}
            {mode === "delete" && "Delete Item"}
            {mode === "sell" && "Mark as Sold"}
          </DialogTitle>
          <DialogDescription>
            {mode === "choose" &&
              `What would you like to do with "${item.label}"?`}
            {mode === "delete" &&
              `Are you sure you want to permanently delete "${item.label}"? This action cannot be undone.`}
            {mode === "sell" && `Enter the sold price for "${item.label}"`}
          </DialogDescription>
        </DialogHeader>

        {mode === "choose" && (
          <div className="flex flex-col gap-3">
            <Button
              variant="outline"
              onClick={() => setMode("sell")}
              className="flex items-center gap-2 h-12"
            >
              <DollarSign className="h-4 w-4" />
              Mark as Sold
            </Button>
            <Button
              variant="outline"
              onClick={() => setMode("delete")}
              className="flex items-center gap-2 h-12 text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
              Delete Permanently
            </Button>
          </div>
        )}

        {mode === "sell" && (
          <div className="space-y-4">
            {item.latest_price && (
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="use-market-price"
                  checked={useMarketPrice}
                  onChange={(e) => setUseMarketPrice(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="use-market-price">
                  Use current market price (${item.latest_price.toFixed(2)})
                </Label>
              </div>
            )}

            {!useMarketPrice && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sold-price">Sold Price *</Label>
                  <Input
                    id="sold-price"
                    placeholder="e.g., 30.00"
                    value={soldPrice}
                    onChange={(e) => setSoldPrice(e.target.value)}
                    type="number"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sold-currency">Currency *</Label>
                  <Select value={soldCurrency} onValueChange={setSoldCurrency}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((currency) => (
                        <SelectItem key={currency.code} value={currency.code}>
                          {currency.symbol} {currency.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (mode === "choose") {
                onOpenChange(false);
              } else {
                setMode("choose");
              }
            }}
          >
            {mode === "choose" ? "Cancel" : "Back"}
          </Button>

          {mode === "delete" && (
            <Button
              onClick={handleDelete}
              disabled={isLoading}
              variant="destructive"
            >
              {isLoading ? "Deleting..." : "Delete"}
            </Button>
          )}

          {mode === "sell" && (
            <Button onClick={handleSell} disabled={isLoading}>
              {isLoading ? "Processing..." : "Mark as Sold"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
