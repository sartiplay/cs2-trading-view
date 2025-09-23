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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Plus } from "lucide-react";
import { CategorySelector } from "@/components/category-selector";

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

function extractNameFromSteamUrl(url: string): string {
  const marketHashName = extractHashFromSteamUrl(url);
  if (marketHashName) {
    return formatDisplayName(marketHashName);
  }
  return "";
}

interface Customization {
  name: string;
  steam_url: string;
  price: number;
  currency: string;
}

export function ItemForm() {
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [steamUrl, setSteamUrl] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [purchaseCurrency, setPurchaseCurrency] = useState("USD");
  const [stickers, setStickers] = useState<Customization[]>([]);
  const [charms, setCharms] = useState<Customization[]>([]);
  const [patches, setPatches] = useState<Customization[]>([]);
  const [includeCustomizationsInPrice, setIncludeCustomizationsInPrice] =
    useState(false);
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

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
      // Load item image first
      setIsLoadingImage(true);
      let imageUrl: string | undefined;
      
      try {
        const imageResponse = await fetch("/api/items/load-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            market_hash_name: marketHashName,
            appid: 730,
          }),
        });
        
        if (imageResponse.ok) {
          const imageData = await imageResponse.json();
          imageUrl = imageData.image_url;
          if (imageUrl) {
            toast({
              title: "Success",
              description: "Item image loaded successfully!",
            });
          } else {
            toast({
              title: "Warning",
              description: "Item image could not be loaded, but item will still be added.",
              variant: "destructive",
            });
          }
        }
      } catch (imageError) {
        console.error("Error loading item image:", imageError);
        toast({
          title: "Warning",
          description: "Could not load item image, but item will still be added.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingImage(false);
      }

      const response = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          market_hash_name: marketHashName,
          label: label.trim(),
          description: description.trim() || undefined,
          appid: 730,
          steam_url: steamUrl.trim(),
          image_url: imageUrl,
          purchase_price: price,
          quantity: qty,
          purchase_currency: purchaseCurrency,
          category_id: categoryId,
          stickers: stickers.filter((s) => s.name.trim() && s.steam_url.trim()),
          charms: charms.filter((c) => c.name.trim() && c.steam_url.trim()),
          patches: patches.filter((p) => p.name.trim() && p.steam_url.trim()),
          include_customizations_in_price: includeCustomizationsInPrice,
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
        setStickers([]);
        setCharms([]);
        setPatches([]);
        setIncludeCustomizationsInPrice(false);
        setCategoryId(undefined);
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

  const addSticker = () => {
    if (stickers.length < 6) {
      setStickers([
        ...stickers,
        { name: "", steam_url: "", price: 0, currency: "USD" },
      ]);
    }
  };

  const addCharm = () => {
    if (charms.length < 1) {
      setCharms([{ name: "", steam_url: "", price: 0, currency: "USD" }]);
    }
  };

  const addPatch = () => {
    setPatches([
      ...patches,
      { name: "", steam_url: "", price: 0, currency: "USD" },
    ]);
  };

  const removeSticker = (index: number) => {
    setStickers(stickers.filter((_, i) => i !== index));
  };

  const removeCharm = (index: number) => {
    setCharms(charms.filter((_, i) => i !== index));
  };

  const removePatch = (index: number) => {
    setPatches(patches.filter((_, i) => i !== index));
  };

  const updateSticker = (
    index: number,
    field: keyof Customization,
    value: string | number
  ) => {
    const updated = [...stickers];
    updated[index] = { ...updated[index], [field]: value };

    if (
      field === "steam_url" &&
      typeof value === "string" &&
      value.trim() &&
      !updated[index].name.trim()
    ) {
      const extractedName = extractNameFromSteamUrl(value.trim());
      if (extractedName) {
        updated[index].name = extractedName;
      }
    }

    setStickers(updated);
  };

  const updateCharm = (
    index: number,
    field: keyof Customization,
    value: string | number
  ) => {
    const updated = [...charms];
    updated[index] = { ...updated[index], [field]: value };

    if (
      field === "steam_url" &&
      typeof value === "string" &&
      value.trim() &&
      !updated[index].name.trim()
    ) {
      const extractedName = extractNameFromSteamUrl(value.trim());
      if (extractedName) {
        updated[index].name = extractedName;
      }
    }

    setCharms(updated);
  };

  const updatePatch = (
    index: number,
    field: keyof Customization,
    value: string | number
  ) => {
    const updated = [...patches];
    updated[index] = { ...updated[index], [field]: value };

    if (
      field === "steam_url" &&
      typeof value === "string" &&
      value.trim() &&
      !updated[index].name.trim()
    ) {
      const extractedName = extractNameFromSteamUrl(value.trim());
      if (extractedName) {
        updated[index].name = extractedName;
      }
    }

    setPatches(updated);
  };

  const selectedCurrency = CURRENCIES.find((c) => c.code === purchaseCurrency);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
      <div className="space-y-2">
        <Label htmlFor="category">Category (Optional)</Label>
        <CategorySelector
          value={categoryId}
          onValueChange={setCategoryId}
          placeholder="Select a category for this item"
        />
        <p className="text-sm text-muted-foreground">
          Organize your items by category. You can create custom categories.
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

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            CS2 Customizations (Optional)
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Add stickers, charms, or patches applied to this item
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Stickers (Max 6)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addSticker}
                disabled={stickers.length >= 6}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Sticker
              </Button>
            </div>
            {stickers.map((sticker, index) => (
              <div key={index} className="space-y-2 p-3 border rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Name</Label>
                    <Input
                      placeholder="e.g., Katowice 2014"
                      value={sticker.name}
                      onChange={(e) =>
                        updateSticker(index, "name", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Steam URL</Label>
                    <Input
                      placeholder="Steam Market URL"
                      value={sticker.steam_url}
                      onChange={(e) =>
                        updateSticker(index, "steam_url", e.target.value)
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 items-end">
                  <div>
                    <Label className="text-xs">Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={sticker.price}
                      onChange={(e) =>
                        updateSticker(
                          index,
                          "price",
                          Number.parseFloat(e.target.value) || 0
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Currency</Label>
                    <Select
                      value={sticker.currency}
                      onValueChange={(value) =>
                        updateSticker(index, "currency", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((currency) => (
                          <SelectItem key={currency.code} value={currency.code}>
                            {currency.symbol}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeSticker(index)}
                      className="w-full"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Charms (Max 1)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addCharm}
                disabled={charms.length >= 1}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Charm
              </Button>
            </div>
            {charms.map((charm, index) => (
              <div key={index} className="space-y-2 p-3 border rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Name</Label>
                    <Input
                      placeholder="e.g., Dust II Pin"
                      value={charm.name}
                      onChange={(e) =>
                        updateCharm(index, "name", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Steam URL</Label>
                    <Input
                      placeholder="Steam Market URL"
                      value={charm.steam_url}
                      onChange={(e) =>
                        updateCharm(index, "steam_url", e.target.value)
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 items-end">
                  <div>
                    <Label className="text-xs">Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={charm.price}
                      onChange={(e) =>
                        updateCharm(
                          index,
                          "price",
                          Number.parseFloat(e.target.value) || 0
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Currency</Label>
                    <Select
                      value={charm.currency}
                      onValueChange={(value) =>
                        updateCharm(index, "currency", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((currency) => (
                          <SelectItem key={currency.code} value={currency.code}>
                            {currency.symbol}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeCharm(index)}
                      className="w-full"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">
                Patches (Character Skins)
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addPatch}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Patch
              </Button>
            </div>
            {patches.map((patch, index) => (
              <div key={index} className="space-y-2 p-3 border rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Name</Label>
                    <Input
                      placeholder="e.g., Team Liquid"
                      value={patch.name}
                      onChange={(e) =>
                        updatePatch(index, "name", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Steam URL</Label>
                    <Input
                      placeholder="Steam Market URL"
                      value={patch.steam_url}
                      onChange={(e) =>
                        updatePatch(index, "steam_url", e.target.value)
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 items-end">
                  <div>
                    <Label className="text-xs">Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={patch.price}
                      onChange={(e) =>
                        updatePatch(
                          index,
                          "price",
                          Number.parseFloat(e.target.value) || 0
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Currency</Label>
                    <Select
                      value={patch.currency}
                      onValueChange={(value) =>
                        updatePatch(index, "currency", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((currency) => (
                          <SelectItem key={currency.code} value={currency.code}>
                            {currency.symbol}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removePatch(index)}
                      className="w-full"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="include-customizations"
              checked={includeCustomizationsInPrice}
              onCheckedChange={(checked) =>
                setIncludeCustomizationsInPrice(checked === true)
              }
            />
            <Label htmlFor="include-customizations" className="text-sm">
              Include customization costs in selling price calculations
            </Label>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoadingImage ? "Loading image..." : isLoading ? "Adding..." : "Add Item"}
      </Button>
    </form>
  );
}
