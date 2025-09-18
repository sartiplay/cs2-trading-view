"use client";

import type React from "react";

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
import { useToast } from "@/hooks/use-toast";

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

function extractHashFromSteamUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/");
    const hashIndex = pathParts.findIndex((part) => part === "listings") + 2;
    if (hashIndex > 1 && pathParts[hashIndex]) {
      return decodeURIComponent(pathParts[hashIndex]);
    }
    return null;
  } catch {
    return null;
  }
}

function formatDisplayName(marketHashName: string): string {
  return marketHashName
    .replace(/\|/g, "|") // Keep pipe symbols
    .replace(/\s*$$([^)]+)$$\s*/g, " $1") // Remove parentheses but keep content
    .replace(/\s+/g, " ") // Normalize spaces
    .trim();
}

export function ItemForm() {
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [steamUrl, setSteamUrl] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [purchaseCurrency, setPurchaseCurrency] = useState("USD");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleUrlChange = (url: string) => {
    setSteamUrl(url);

    // Auto-fill display name if URL is valid and label is empty
    if (url.trim() && !label.trim()) {
      const marketHashName = extractHashFromSteamUrl(url.trim());
      if (marketHashName) {
        const displayName = formatDisplayName(marketHashName);
        setLabel(displayName);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !steamUrl.trim() ||
      !label.trim() ||
      !purchasePrice.trim() ||
      !quantity.trim() ||
      !purchaseCurrency
    )
      return;

    const marketHashName = extractHashFromSteamUrl(steamUrl.trim());
    if (!marketHashName) {
      toast({
        title: "Error",
        description: "Invalid Steam Market URL. Please check the URL format.",
        variant: "destructive",
      });
      return;
    }

    const price = Number.parseFloat(purchasePrice);
    if (isNaN(price) || price <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid purchase price.",
        variant: "destructive",
      });
      return;
    }

    const qty = Number.parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid quantity.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          market_hash_name: marketHashName,
          label: label.trim(),
          description: description.trim() || undefined,
          appid: 730,
          steam_url: steamUrl.trim(),
          purchase_price: price,
          quantity: qty,
          purchase_currency: purchaseCurrency,
        }),
      });

      if (response.ok) {
        console.log("[v0] Item added successfully, fetching price data...");

        try {
          const captureResponse = await fetch("/api/jobs/capture", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              market_hash_name: marketHashName,
            }),
          });

          if (captureResponse.ok) {
            const captureResult = await captureResponse.json();
            console.log("[v0] Price data fetched:", captureResult);
            toast({
              title: "Success",
              description: `Item added and price data fetched: ${captureResult.message}`,
            });
          } else {
            console.log("[v0] Price fetch failed, but item was added");
            toast({
              title: "Partial Success",
              description:
                "Item added successfully, but price data fetch failed. It will be fetched on the next scheduled update.",
            });
          }
        } catch (captureError) {
          console.error("[v0] Price capture error:", captureError);
          toast({
            title: "Partial Success",
            description:
              "Item added successfully, but price data fetch failed. It will be fetched on the next scheduled update.",
          });
        }

        setLabel("");
        setDescription("");
        setSteamUrl("");
        setPurchasePrice("");
        setQuantity("1");
        setPurchaseCurrency("USD");
        window.location.reload();
      } else {
        throw new Error("Failed to add item");
      }
    } catch (error) {
      console.error("[v0] Item submission error:", error);
      toast({
        title: "Error",
        description: "Failed to add item",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedCurrency = CURRENCIES.find((c) => c.code === purchaseCurrency);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="steam-url">Steam Market URL *</Label>
        <Input
          id="steam-url"
          placeholder="https://steamcommunity.com/market/listings/730/AK-47%20%7C%20Redline%20%28Field-Tested%29"
          value={steamUrl}
          onChange={(e) => handleUrlChange(e.target.value)}
          type="url"
          required
        />
        <p className="text-sm text-muted-foreground">
          Paste the Steam Market URL of the item you want to track
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="label">Display Label *</Label>
        <Input
          id="label"
          placeholder="e.g., AK-47 Redline FT"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          required
        />
        <p className="text-sm text-muted-foreground">
          Auto-filled from URL or enter custom name
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description (Optional)</Label>
        <Input
          id="description"
          placeholder="e.g., My favorite skin, bought for trading"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <p className="text-sm text-muted-foreground">
          Add personal notes or description for this item
        </p>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="purchase-price">Purchase Price *</Label>
          <Input
            id="purchase-price"
            placeholder="e.g., 25.50"
            value={purchasePrice}
            onChange={(e) => setPurchasePrice(e.target.value)}
            type="number"
            step="0.01"
            min="0"
            required
          />
          <p className="text-sm text-muted-foreground">Price per unit</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency">Currency *</Label>
          <Select value={purchaseCurrency} onValueChange={setPurchaseCurrency}>
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
          <p className="text-sm text-muted-foreground">Purchase currency</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity *</Label>
          <Input
            id="quantity"
            placeholder="e.g., 29"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            type="number"
            min="1"
            required
          />
          <p className="text-sm text-muted-foreground">How many units</p>
        </div>
      </div>
      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? "Adding..." : "Add Item"}
      </Button>
    </form>
  );
}
