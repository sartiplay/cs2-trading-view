"use client";

import type React from "react";
import { useState, useEffect } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast"; // Import useToast
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

interface Customization {
  name: string;
  steam_url: string;
  price: number;
  currency: string;
}

interface Item {
  market_hash_name: string;
  label: string;
  description?: string;
  category_id?: string;
  appid: number;
  steam_url?: string;
  purchase_price: number;
  purchase_currency: string;
  quantity: number;
  stickers?: Customization[];
  charms?: Customization[];
  patches?: Customization[];
}

interface EditItemDialogProps {
  item: Item | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onItemUpdated: () => void;
}

export function EditItemDialog({
  item,
  open,
  onOpenChange,
  onItemUpdated,
}: EditItemDialogProps) {
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [purchaseCurrency, setPurchaseCurrency] = useState("USD");

  const [stickers, setStickers] = useState<Customization[]>([]);
  const [charms, setCharms] = useState<Customization[]>([]);
  const [patches, setPatches] = useState<Customization[]>([]);
  const [includeCustomizationCosts, setIncludeCustomizationCosts] =
    useState(false);
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);

  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast(); // Declare useToast

  useEffect(() => {
    if (item && open) {
      setLabel(item.label);
      setDescription(item.description || "");
      setPurchasePrice(item.purchase_price.toString());
      setQuantity(item.quantity.toString());
      setPurchaseCurrency(item.purchase_currency);
      setStickers(item.stickers || []);
      setCharms(item.charms || []);
      setPatches(item.patches || []);
      setCategoryId(item.category_id);
    }
  }, [item, open]);

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
      setCharms([
        ...charms,
        { name: "", steam_url: "", price: 0, currency: "USD" },
      ]);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !item ||
      !label.trim() ||
      !purchasePrice.trim() ||
      !quantity.trim() ||
      !purchaseCurrency
    )
      return;

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
      const response = await fetch(
        `/api/items/${encodeURIComponent(item.market_hash_name)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: label.trim(),
            description: description.trim() || undefined,
            purchase_price: price,
            quantity: qty,
            purchase_currency: purchaseCurrency,
            category_id: categoryId,
            stickers: stickers.filter((s) => s.name.trim()),
            charms: charms.filter((c) => c.name.trim()),
            patches: patches.filter((p) => p.name.trim()),
            include_customization_costs: includeCustomizationCosts,
          }),
        }
      );

      if (response.ok) {
        toast({
          title: "Success",
          description: "Item updated successfully",
        });
        onItemUpdated();
        onOpenChange(false);
      } else {
        throw new Error("Failed to update item");
      }
    } catch (error) {
      console.error("Item update error:", error);
      toast({
        title: "Error",
        description: "Failed to update item",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Item</DialogTitle>
          <DialogDescription>
            Update the details for {item.market_hash_name}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-label">Display Label *</Label>
            <Input
              id="edit-label"
              placeholder="e.g., AK-47 Redline FT"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description (Optional)</Label>
            <Input
              id="edit-description"
              placeholder="e.g., My favorite skin, bought for trading"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-category">Category (Optional)</Label>
            <CategorySelector
              value={categoryId}
              onValueChange={setCategoryId}
              placeholder="Select a category for this item"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-purchase-price">Purchase Price *</Label>
              <Input
                id="edit-purchase-price"
                placeholder="e.g., 25.50"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                type="number"
                step="0.01"
                min="0"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-currency">Currency *</Label>
              <Select
                value={purchaseCurrency}
                onValueChange={setPurchaseCurrency}
              >
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
            <div className="space-y-2">
              <Label htmlFor="edit-quantity">Quantity *</Label>
              <Input
                id="edit-quantity"
                placeholder="e.g., 1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                type="number"
                min="1"
                required
              />
            </div>
          </div>

          <Card className="bg-background/50">
            <CardHeader>
              <CardTitle className="text-lg">
                CS2 Customizations (Optional)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Stickers */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-blue-400">Stickers (Max 6)</Label>
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
                <div className="space-y-3">
                  {stickers.map((sticker, index) => (
                    <div key={index} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Input
                          placeholder="Sticker name"
                          value={sticker.name}
                          onChange={(e) =>
                            updateSticker(index, "name", e.target.value)
                          }
                        />
                      </div>
                      <div className="flex-1">
                        <Input
                          placeholder="Steam Market URL"
                          value={sticker.steam_url}
                          onChange={(e) =>
                            updateSticker(index, "steam_url", e.target.value)
                          }
                        />
                      </div>
                      <div className="w-24">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0"
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
                      <div className="w-20">
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
                              <SelectItem
                                key={currency.code}
                                value={currency.code}
                              >
                                {currency.symbol}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeSticker(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Charms */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-green-400">Charms (Max 1)</Label>
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
                <div className="space-y-3">
                  {charms.map((charm, index) => (
                    <div key={index} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Input
                          placeholder="Charm name"
                          value={charm.name}
                          onChange={(e) =>
                            updateCharm(index, "name", e.target.value)
                          }
                        />
                      </div>
                      <div className="flex-1">
                        <Input
                          placeholder="Steam Market URL"
                          value={charm.steam_url}
                          onChange={(e) =>
                            updateCharm(index, "steam_url", e.target.value)
                          }
                        />
                      </div>
                      <div className="w-24">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0"
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
                      <div className="w-20">
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
                              <SelectItem
                                key={currency.code}
                                value={currency.code}
                              >
                                {currency.symbol}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeCharm(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Patches */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-purple-400">
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
                <div className="space-y-3">
                  {patches.map((patch, index) => (
                    <div key={index} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Input
                          placeholder="Patch name"
                          value={patch.name}
                          onChange={(e) =>
                            updatePatch(index, "name", e.target.value)
                          }
                        />
                      </div>
                      <div className="flex-1">
                        <Input
                          placeholder="Steam Market URL"
                          value={patch.steam_url}
                          onChange={(e) =>
                            updatePatch(index, "steam_url", e.target.value)
                          }
                        />
                      </div>
                      <div className="w-24">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0"
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
                      <div className="w-20">
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
                              <SelectItem
                                key={currency.code}
                                value={currency.code}
                              >
                                {currency.symbol}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removePatch(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-customization-costs"
                  checked={includeCustomizationCosts}
                  onCheckedChange={(checked) =>
                    setIncludeCustomizationCosts(checked === true)
                  }
                />
                <Label
                  htmlFor="include-customization-costs"
                  className="text-sm"
                >
                  Include customization costs in selling price calculations
                </Label>
              </div>
            </CardContent>
          </Card>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Updating..." : "Update Item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Utility functions for Steam URL name extraction
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
