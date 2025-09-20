"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  ArrowLeft,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  Plus,
  Trash2,
  Edit,
  Save,
  Send,
  X,
} from "lucide-react";
import Link from "next/link";
import { PriceChart } from "@/components/price-chart";
import { SettingsDialog, useSettings } from "@/components/settings-dialog";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";

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

interface PriceEntry {
  date: string;
  median_price: number;
}

const EMPTY_PRICE_HISTORY: PriceEntry[] = [];

interface Customization {
  name: string;
  steam_url: string;
  price: number;
  currency: string;
}

interface ItemData {
  market_hash_name: string;
  label: string;
  appid: number;
  description?: string;
  steam_url?: string;
  price_history: PriceEntry[];
  stickers?: Customization[];
  charms?: Customization[];
  patches?: Customization[];
}

interface ItemDetailProps {
  hash: string;
}

interface ItemOption {
  market_hash_name: string;
  label: string;
}

type PriceStats = {
  latestPrice?: PriceEntry;
  previousPrice?: PriceEntry;
  priceChange: number;
  priceChangePercent: number;
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  uniqueDays: number;
  totalDataPoints: number;
};

export function ItemDetail({ hash }: ItemDetailProps) {
  const settings = useSettings();
  const [item, setItem] = useState<ItemData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isEditingCustomizations, setIsEditingCustomizations] = useState(false);
  const [editingStickers, setEditingStickers] = useState<Customization[]>([]);
  const [editingCharms, setEditingCharms] = useState<Customization[]>([]);
  const [editingPatches, setEditingPatches] = useState<Customization[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [availableItems, setAvailableItems] = useState<ItemOption[]>([]);
  const [selectedItemHash, setSelectedItemHash] = useState<string>(hash);
  const [customCurrentPrice, setCustomCurrentPrice] = useState<string>("");
  const [customPreviousPrice, setCustomPreviousPrice] = useState<string>("");
  const [customChangePercent, setCustomChangePercent] = useState<string>("");
  const [customTimeWindow, setCustomTimeWindow] = useState<string>("5");
  const [customNote, setCustomNote] = useState<string>("");
  const [customDirection, setCustomDirection] = useState<"up" | "down">("up");
  const [isSendingDevNotification, setIsSendingDevNotification] =
    useState(false);
  const { toast } = useToast();

  const priceHistory = item?.price_history ?? EMPTY_PRICE_HISTORY;

  const priceStats = useMemo<PriceStats>(() => {
    if (priceHistory.length === 0) {
      return {
        priceChange: 0,
        priceChangePercent: 0,
        minPrice: 0,
        maxPrice: 0,
        avgPrice: 0,
        uniqueDays: 0,
        totalDataPoints: 0,
      };
    }

    const latest = priceHistory[priceHistory.length - 1];
    const previous =
      priceHistory.length > 1
        ? priceHistory[priceHistory.length - 2]
        : undefined;

    let change = 0;
    let changePercent = 0;
    if (latest && previous) {
      change = latest.median_price - previous.median_price;
      changePercent =
        previous.median_price !== 0
          ? (change / previous.median_price) * 100
          : 0;
    }

    const prices = priceHistory.map((entry) => entry.median_price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = prices.reduce((sum, price) => sum + price, 0) / prices.length;

    const dayCount = new Set(
      priceHistory.map((entry) => entry.date.split("T")[0])
    ).size;

    return {
      latestPrice: latest,
      previousPrice: previous,
      priceChange: change,
      priceChangePercent: changePercent,
      minPrice: min,
      maxPrice: max,
      avgPrice: avg,
      uniqueDays: dayCount,
      totalDataPoints: priceHistory.length,
    };
  }, [priceHistory]);

  const priceHistoryData = useMemo(() => {
    if (priceHistory.length === 0) {
      return EMPTY_PRICE_HISTORY;
    }
    return priceHistory.length > 200 ? priceHistory.slice(-200) : priceHistory;
  }, [priceHistory]);

  const priceChartElement = useMemo(() => {
    return <PriceChart data={priceHistoryData} />;
  }, [priceHistoryData]);

  const {
    latestPrice,
    previousPrice,
    priceChange,
    priceChangePercent,
    minPrice,
    maxPrice,
    avgPrice,
    uniqueDays,
    totalDataPoints,
  } = priceStats;

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

  const fetchItem = async () => {
    try {
      const response = await fetch(`/api/items/${encodeURIComponent(hash)}`);
      if (response.ok) {
        const data = await response.json();
        setItem(data);
      }
    } catch (error) {
      console.error("Failed to fetch item:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const capturePrice = async () => {
    setIsCapturing(true);
    try {
      const response = await fetch("/api/jobs/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ market_hash_name: hash }),
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Success",
          description: result.message,
        });
        await fetchItem(); // Refresh the item data
      } else {
        throw new Error("Failed to capture price");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to capture price",
        variant: "destructive",
      });
    } finally {
      setIsCapturing(false);
    }
  };

  const startEditingCustomizations = () => {
    setEditingStickers(item?.stickers || []);
    setEditingCharms(item?.charms || []);
    setEditingPatches(item?.patches || []);
    setIsEditingCustomizations(true);
  };

  const cancelEditingCustomizations = () => {
    setIsEditingCustomizations(false);
    setEditingStickers([]);
    setEditingCharms([]);
    setEditingPatches([]);
  };

  const saveCustomizations = async () => {
    if (!item) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/items/${encodeURIComponent(hash)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stickers: editingStickers.filter((s) => s.name.trim()),
          charms: editingCharms.filter((c) => c.name.trim()),
          patches: editingPatches.filter((p) => p.name.trim()),
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Customizations updated successfully",
        });
        await fetchItem(); // Refresh item data
        setIsEditingCustomizations(false);
      } else {
        throw new Error("Failed to update customizations");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update customizations",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (!settings.discordWebhookEnabled || !settings.discordDevelopmentMode) {
      setAvailableItems([]);
      return;
    }

    let isMounted = true;

    const loadItems = async () => {
      try {
        const response = await fetch("/api/items");
        if (!response.ok) {
          throw new Error("Failed to load items list");
        }
        const data = await response.json();
        if (!isMounted) {
          return;
        }
        const options: ItemOption[] = data
          .map((entry: any) => ({
            market_hash_name: entry.market_hash_name,
            label: entry.label ?? entry.market_hash_name,
          }))
          .sort((a: ItemOption, b: ItemOption) =>
            a.label.localeCompare(b.label)
          );

        setAvailableItems((prev) => {
          const map = new Map<string, ItemOption>();
          [...prev, ...options].forEach((opt) => {
            map.set(opt.market_hash_name, opt);
          });
          return Array.from(map.values());
        });
      } catch (error) {
        console.error("Failed to load items for development webhook:", error);
      }
    };

    loadItems();

    return () => {
      isMounted = false;
    };
  }, [settings.discordWebhookEnabled, settings.discordDevelopmentMode]);

  useEffect(() => {
    if (!item) {
      return;
    }

    setSelectedItemHash(item.market_hash_name);
    setAvailableItems((prev) => {
      if (prev.some((opt) => opt.market_hash_name === item.market_hash_name)) {
        return prev;
      }
      return [
        ...prev,
        { market_hash_name: item.market_hash_name, label: item.label },
      ];
    });

    const latest =
      item.price_history.length > 0
        ? item.price_history[item.price_history.length - 1]
        : null;
    const previous =
      item.price_history.length > 1
        ? item.price_history[item.price_history.length - 2]
        : null;

    if (latest) {
      setCustomCurrentPrice(latest.median_price.toFixed(2));
    }
    if (previous) {
      setCustomPreviousPrice(previous.median_price.toFixed(2));
      const diff = latest ? latest.median_price - previous.median_price : 0;
      setCustomChangePercent(
        previous.median_price !== 0
          ? ((diff / previous.median_price) * 100).toFixed(2)
          : ""
      );
      setCustomDirection(diff < 0 ? "down" : "up");
    }
  }, [item]);

  const sendDevelopmentWebhook = async () => {
    if (!settings.discordWebhookEnabled || !settings.discordDevelopmentMode) {
      toast({
        title: "Development mode disabled",
        description: "Enable Discord development mode in settings first.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedItemHash) {
      toast({
        title: "Select an item",
        description: "Choose which item to reference in the Discord message.",
        variant: "destructive",
      });
      return;
    }

    const priceValue = Number.parseFloat(customCurrentPrice);
    if (Number.isNaN(priceValue)) {
      toast({
        title: "Invalid current price",
        description: "Enter a valid numeric current price.",
        variant: "destructive",
      });
      return;
    }

    const previousValue = customPreviousPrice.trim()
      ? Number.parseFloat(customPreviousPrice)
      : undefined;
    if (
      previousValue !== undefined &&
      (Number.isNaN(previousValue) || previousValue < 0)
    ) {
      toast({
        title: "Invalid previous price",
        description: "Previous price must be a positive number.",
        variant: "destructive",
      });
      return;
    }

    const changePercentValue = customChangePercent.trim()
      ? Number.parseFloat(customChangePercent)
      : undefined;
    if (changePercentValue !== undefined && Number.isNaN(changePercentValue)) {
      toast({
        title: "Invalid percentage",
        description: "Change percentage must be numeric.",
        variant: "destructive",
      });
      return;
    }

    const timeWindowValue = customTimeWindow.trim()
      ? Number.parseFloat(customTimeWindow)
      : undefined;
    if (
      timeWindowValue !== undefined &&
      (Number.isNaN(timeWindowValue) || timeWindowValue < 0)
    ) {
      toast({
        title: "Invalid time window",
        description: "Time window must be zero or greater.",
        variant: "destructive",
      });
      return;
    }

    setIsSendingDevNotification(true);
    try {
      const changeAmountValue =
        previousValue !== undefined ? priceValue - previousValue : undefined;

      const response = await fetch("/api/discord/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          market_hash_name: selectedItemHash,
          current_price: priceValue,
          previous_price: previousValue,
          change_amount: changeAmountValue,
          change_percentage: changePercentValue,
          direction: customDirection,
          note: customNote.trim() || undefined,
          time_window_minutes: timeWindowValue,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || "Failed to send Discord notification");
      }

      toast({
        title: "Discord notification sent",
        description: "Development webhook dispatched successfully.",
      });
    } catch (error) {
      console.error("Failed to send development webhook:", error);
      toast({
        title: "Failed to send notification",
        description:
          error instanceof Error ? error.message : "Unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSendingDevNotification(false);
    }
  };

  const addSticker = () => {
    if (editingStickers.length < 6) {
      setEditingStickers([
        ...editingStickers,
        { name: "", steam_url: "", price: 0, currency: "USD" },
      ]);
    }
  };

  const addCharm = () => {
    if (editingCharms.length < 1) {
      setEditingCharms([
        ...editingCharms,
        { name: "", steam_url: "", price: 0, currency: "USD" },
      ]);
    }
  };

  const addPatch = () => {
    setEditingPatches([
      ...editingPatches,
      { name: "", steam_url: "", price: 0, currency: "USD" },
    ]);
  };

  const removeSticker = (index: number) => {
    setEditingStickers(editingStickers.filter((_, i) => i !== index));
  };

  const removeCharm = (index: number) => {
    setEditingCharms(editingCharms.filter((_, i) => i !== index));
  };

  const removePatch = (index: number) => {
    setEditingPatches(editingPatches.filter((_, i) => i !== index));
  };

  const updateSticker = (
    index: number,
    field: keyof Customization,
    value: string | number
  ) => {
    const updated = [...editingStickers];
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

    setEditingStickers(updated);
  };

  const updateCharm = (
    index: number,
    field: keyof Customization,
    value: string | number
  ) => {
    const updated = [...editingCharms];
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

    setEditingCharms(updated);
  };

  const updatePatch = (
    index: number,
    field: keyof Customization,
    value: string | number
  ) => {
    const updated = [...editingPatches];
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

    setEditingPatches(updated);
  };

  useEffect(() => {
    fetchItem();
  }, [hash]);

  if (isLoading) {
    return <div className="text-center py-8">Loading item details...</div>;
  }

  if (!item) {
    return <div className="text-center py-8">Item not found</div>;
  }

  const showDevWebhookTools =
    settings.discordWebhookEnabled && settings.discordDevelopmentMode;
  const devItemOptions: ItemOption[] = showDevWebhookTools
    ? availableItems.length > 0
      ? availableItems
      : [
          {
            market_hash_name: item.market_hash_name,
            label: item.label,
          },
        ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-balance text-foreground">
            {item.label}
          </h1>
          <p className="text-muted-foreground text-pretty">
            {item.market_hash_name}
          </p>
          {item.description && (
            <p className="text-sm text-muted-foreground mt-2 italic">
              {item.description}
            </p>
          )}
          {item.steam_url && (
            <div className="mt-2">
              <a
                href={item.steam_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                View on Steam Market
              </a>
            </div>
          )}
        </div>
        <div className="flex-shrink-0">
          <SettingsDialog />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-card-foreground">
              Latest Price
            </CardTitle>
            {previousPrice && latestPrice && (
              <div className="flex items-center">
                {priceChange > 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-400" />
                ) : priceChange < 0 ? (
                  <TrendingDown className="h-4 w-4 text-red-400" />
                ) : (
                  <Minus className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            )}
          </CardHeader>
          <CardContent>
            {latestPrice ? (
              <div>
                <div className="text-2xl font-bold text-card-foreground">
                  ${latestPrice.median_price.toFixed(2)}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">
                    {new Date(latestPrice.date).toLocaleDateString()}
                  </span>
                  {previousPrice && (
                    <span
                      className={`font-medium ${
                        priceChange > 0
                          ? "text-green-400"
                          : priceChange < 0
                          ? "text-red-400"
                          : "text-muted-foreground"
                      }`}
                    >
                      {priceChange > 0 ? "+" : ""}
                      {priceChangePercent.toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground">
                No price data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-card-foreground">
              Average Price
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">
              ${avgPrice.toFixed(2)}
            </div>
            <div className="text-sm text-muted-foreground">
              All-time average
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-card-foreground">
              Price Range
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="text-sm">
                <span className="text-muted-foreground">High:</span>{" "}
                <span className="font-medium text-green-400">
                  ${maxPrice.toFixed(2)}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Low:</span>{" "}
                <span className="font-medium text-red-400">
                  ${minPrice.toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-card-foreground">
              Data Points
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">
              {totalDataPoints}
            </div>
            <div className="text-xs text-muted-foreground mb-2">
              {uniqueDays} unique days
            </div>
            <Button
              onClick={capturePrice}
              disabled={isCapturing}
              size="sm"
              className="w-full"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isCapturing ? "animate-spin" : ""}`}
              />
              {isCapturing ? "Capturing..." : "Capture Now"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {showDevWebhookTools && (
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-card-foreground">
              Development Webhook Tester
            </CardTitle>
            <CardDescription>
              Send a manual Discord notification while development mode is
              active.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="dev-item">Item</Label>
                <Select
                  value={selectedItemHash}
                  onValueChange={setSelectedItemHash}
                >
                  <SelectTrigger id="dev-item">
                    <SelectValue placeholder="Choose an item" />
                  </SelectTrigger>
                  <SelectContent>
                    {devItemOptions.map((option) => (
                      <SelectItem
                        key={option.market_hash_name}
                        value={option.market_hash_name}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dev-current-price">Current price (USD)</Label>
                <Input
                  id="dev-current-price"
                  type="number"
                  step="0.01"
                  value={customCurrentPrice}
                  onChange={(event) =>
                    setCustomCurrentPrice(event.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dev-previous-price">Previous price</Label>
                <Input
                  id="dev-previous-price"
                  type="number"
                  step="0.01"
                  value={customPreviousPrice}
                  onChange={(event) =>
                    setCustomPreviousPrice(event.target.value)
                  }
                  placeholder="Optional"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dev-change-percent">Change percentage</Label>
                <Input
                  id="dev-change-percent"
                  type="number"
                  step="0.01"
                  value={customChangePercent}
                  onChange={(event) =>
                    setCustomChangePercent(event.target.value)
                  }
                  placeholder="Optional"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dev-direction">Direction</Label>
                <Select
                  value={customDirection}
                  onValueChange={(value) =>
                    setCustomDirection(value as "up" | "down")
                  }
                >
                  <SelectTrigger id="dev-direction">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="up">Price increase</SelectItem>
                    <SelectItem value="down">Price decrease</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dev-window">Time window (minutes)</Label>
                <Input
                  id="dev-window"
                  type="number"
                  step="0.5"
                  value={customTimeWindow}
                  onChange={(event) => setCustomTimeWindow(event.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dev-note">Notes</Label>
              <Textarea
                id="dev-note"
                value={customNote}
                onChange={(event) => setCustomNote(event.target.value)}
                placeholder="Context for this manual notification"
                rows={3}
              />
            </div>

            <div className="flex justify-end">
              <Button
                onClick={sendDevelopmentWebhook}
                disabled={isSendingDevNotification}
              >
                <Send
                  className={`h-4 w-4 mr-2 ${
                    isSendingDevNotification ? "animate-pulse" : ""
                  }`}
                />
                {isSendingDevNotification
                  ? "Sending..."
                  : "Send Test Notification"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="text-card-foreground">Price History</CardTitle>
          <CardDescription>
            Price trend with {totalDataPoints} data points across {uniqueDays}{" "}
            days
          </CardDescription>
        </CardHeader>
        <CardContent className="bg-background/20 rounded-lg p-4">
          {priceChartElement}
        </CardContent>
      </Card>

      {(item.stickers?.length ||
        item.charms?.length ||
        item.patches?.length ||
        isEditingCustomizations) && (
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-card-foreground">
                  CS2 Customizations
                </CardTitle>
                <CardDescription>
                  Stickers, charms, and patches applied to this item
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {!isEditingCustomizations ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={startEditingCustomizations}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={cancelEditingCustomizations}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={saveCustomizations}
                      disabled={isSaving}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isSaving ? "Saving..." : "Save"}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Stickers Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-blue-400">
                  Stickers (
                  {isEditingCustomizations
                    ? editingStickers.length
                    : item.stickers?.length || 0}
                  /6)
                </h4>
                {isEditingCustomizations && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addSticker}
                    disabled={editingStickers.length >= 6}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Sticker
                  </Button>
                )}
              </div>

              {isEditingCustomizations ? (
                <div className="space-y-3">
                  {editingStickers.map((sticker, index) => (
                    <div
                      key={index}
                      className="flex gap-2 items-end p-3 border rounded-lg bg-background/50"
                    >
                      <div className="flex-1 space-y-2">
                        <Label className="text-xs">Name</Label>
                        <Input
                          placeholder="Sticker name"
                          value={sticker.name}
                          onChange={(e) =>
                            updateSticker(index, "name", e.target.value)
                          }
                        />
                      </div>
                      <div className="flex-1 space-y-2">
                        <Label className="text-xs">Steam URL</Label>
                        <Input
                          placeholder="Steam Market URL"
                          value={sticker.steam_url}
                          onChange={(e) =>
                            updateSticker(index, "steam_url", e.target.value)
                          }
                        />
                      </div>
                      <div className="w-24 space-y-2">
                        <Label className="text-xs">Price</Label>
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
                      <div className="w-20 space-y-2">
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
                        variant="outline"
                        size="sm"
                        onClick={() => removeSticker(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                item.stickers &&
                item.stickers.length > 0 && (
                  <div className="grid gap-3 md:grid-cols-2">
                    {item.stickers.map((sticker, index) => (
                      <div
                        key={index}
                        className="p-3 border rounded-lg bg-background/50"
                      >
                        <div className="font-medium text-sm">
                          {sticker.name}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          ${sticker.price.toFixed(2)} {sticker.currency}
                        </div>
                        {sticker.steam_url && (
                          <a
                            href={sticker.steam_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 hover:underline mt-2"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View on Steam
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>

            {/* Charms Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-green-400">
                  Charms (
                  {isEditingCustomizations
                    ? editingCharms.length
                    : item.charms?.length || 0}
                  /1)
                </h4>
                {isEditingCustomizations && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addCharm}
                    disabled={editingCharms.length >= 1}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Charm
                  </Button>
                )}
              </div>

              {isEditingCustomizations ? (
                <div className="space-y-3">
                  {editingCharms.map((charm, index) => (
                    <div
                      key={index}
                      className="flex gap-2 items-end p-3 border rounded-lg bg-background/50"
                    >
                      <div className="flex-1 space-y-2">
                        <Label className="text-xs">Name</Label>
                        <Input
                          placeholder="Charm name"
                          value={charm.name}
                          onChange={(e) =>
                            updateCharm(index, "name", e.target.value)
                          }
                        />
                      </div>
                      <div className="flex-1 space-y-2">
                        <Label className="text-xs">Steam URL</Label>
                        <Input
                          placeholder="Steam Market URL"
                          value={charm.steam_url}
                          onChange={(e) =>
                            updateCharm(index, "steam_url", e.target.value)
                          }
                        />
                      </div>
                      <div className="w-24 space-y-2">
                        <Label className="text-xs">Price</Label>
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
                      <div className="w-20 space-y-2">
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
                        variant="outline"
                        size="sm"
                        onClick={() => removeCharm(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                item.charms &&
                item.charms.length > 0 && (
                  <div className="grid gap-3 md:grid-cols-2">
                    {item.charms.map((charm, index) => (
                      <div
                        key={index}
                        className="p-3 border rounded-lg bg-background/50"
                      >
                        <div className="font-medium text-sm">{charm.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          ${charm.price.toFixed(2)} {charm.currency}
                        </div>
                        {charm.steam_url && (
                          <a
                            href={charm.steam_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-green-400 hover:text-green-300 hover:underline mt-2"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View on Steam
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>

            {/* Patches Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-purple-400">
                  Patches (
                  {isEditingCustomizations
                    ? editingPatches.length
                    : item.patches?.length || 0}
                  )
                </h4>
                {isEditingCustomizations && (
                  <Button variant="outline" size="sm" onClick={addPatch}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Patch
                  </Button>
                )}
              </div>

              {isEditingCustomizations ? (
                <div className="space-y-3">
                  {editingPatches.map((patch, index) => (
                    <div
                      key={index}
                      className="flex gap-2 items-end p-3 border rounded-lg bg-background/50"
                    >
                      <div className="flex-1 space-y-2">
                        <Label className="text-xs">Name</Label>
                        <Input
                          placeholder="Patch name"
                          value={patch.name}
                          onChange={(e) =>
                            updatePatch(index, "name", e.target.value)
                          }
                        />
                      </div>
                      <div className="flex-1 space-y-2">
                        <Label className="text-xs">Steam URL</Label>
                        <Input
                          placeholder="Steam Market URL"
                          value={patch.steam_url}
                          onChange={(e) =>
                            updatePatch(index, "steam_url", e.target.value)
                          }
                        />
                      </div>
                      <div className="w-24 space-y-2">
                        <Label className="text-xs">Price</Label>
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
                      <div className="w-20 space-y-2">
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
                        variant="outline"
                        size="sm"
                        onClick={() => removePatch(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                item.patches &&
                item.patches.length > 0 && (
                  <div className="grid gap-3 md:grid-cols-2">
                    {item.patches.map((patch, index) => (
                      <div
                        key={index}
                        className="p-3 border rounded-lg bg-background/50"
                      >
                        <div className="font-medium text-sm">{patch.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          ${patch.price.toFixed(2)} {patch.currency}
                        </div>
                        {patch.steam_url && (
                          <a
                            href={patch.steam_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 hover:underline mt-2"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View on Steam
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
