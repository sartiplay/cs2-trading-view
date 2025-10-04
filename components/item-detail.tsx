"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";
import { PriceChart } from "@/components/price-chart";
import {
  SettingsDialog,
  useSettings,
  type AppSettings,
} from "@/components/settings-dialog";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CategorySelector } from "@/components/category-selector";
import { ImageDialog } from "@/components/image-dialog";
import { ImageLoadingSpinner } from "@/components/image-loading-spinner";
import {
  DEFAULT_PINNED_PROVIDERS,
  TRADE_PROVIDERS,
  type TradeProviderMeta,
} from "@/lib/trade-providers";
import { useCurrency } from "@/contexts/currency-context";
import { getClientCurrencySymbol } from "@/lib/currency-utils";

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

interface PriceAlertConfig {
  lowerThreshold?: number | null;
  upperThreshold?: number | null;
  lowerTriggered?: boolean;
  upperTriggered?: boolean;
  lastTriggeredLower?: string | null;
  lastTriggeredUpper?: string | null;
  updatedAt?: string;
}

interface ItemDetailProps {
  hash: string; // This will be the item ID, not market_hash_name
}

interface ItemData {
  id: string;
  market_hash_name: string;
  label: string;
  appid: number;
  description?: string;
  category_id?: string;
  steam_url?: string;
  image_url?: string;
  price_history: PriceEntry[];
  price_alert_config?: PriceAlertConfig;
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

interface TradeListing {
  site: string;
  price: number;
  currency: string;
  float?: number | null;
  condition: string;
  url?: string;
}

const CONDITION_COLORS: Record<string, string> = {
  "Factory New": "bg-emerald-500/20 text-emerald-400",
  "Minimal Wear": "bg-sky-500/20 text-sky-400",
  "Field-Tested": "bg-amber-500/20 text-amber-400",
  "Well-Worn": "bg-orange-500/20 text-orange-400",
  "Battle-Scarred": "bg-rose-600/20 text-rose-400",
};

const getConditionBadgeClass = (condition: string): string => {
  return CONDITION_COLORS[condition] ?? "bg-muted text-muted-foreground";
};

export function ItemDetail({ hash }: ItemDetailProps) {
  const settings = useSettings();
  const [effectiveSettings, setEffectiveSettings] = useState(settings);
  const { displayCurrency } = useCurrency();
  
  console.log(`[ItemDetail] Component initialized with hash: ${hash}`);

  useEffect(() => {
    setEffectiveSettings(settings);
  }, [settings]);

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
  const [marketListings, setMarketListings] = useState<TradeListing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [listingsError, setListingsError] = useState<string | null>(null);
  const [listingsLoaded, setListingsLoaded] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleSettingsUpdate = (event: Event) => {
      const detail = (event as CustomEvent<Partial<AppSettings>>).detail;
      if (detail) {
        setEffectiveSettings((current) => ({ ...current, ...detail }));
      }
    };

    window.addEventListener(
      "app-settings-updated",
      handleSettingsUpdate as EventListener
    );

    return () => {
      window.removeEventListener(
        "app-settings-updated",
        handleSettingsUpdate as EventListener
      );
    };
  }, []);
  const [marketSettingsOpen, setMarketSettingsOpen] = useState(false);
  const [pinnedDraft, setPinnedDraft] = useState<string[]>(
    DEFAULT_PINNED_PROVIDERS
  );
  const [fetchLimitDraft, setFetchLimitDraft] = useState<string>("5");
  const [providerStatuses, setProviderStatuses] = useState<
    Array<{
      providerId: string;
      providerName: string;
      hasKey: boolean;
    }>
  >([]);
  const [providerStatusLoading, setProviderStatusLoading] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState<string>(
    TRADE_PROVIDERS[0].id
  );
  const [apiKeyValue, setApiKeyValue] = useState("");
  const [apiKeySaving, setApiKeySaving] = useState(false);
  const [marketSettingsSaving, setMarketSettingsSaving] = useState(false);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [alertLowerInput, setAlertLowerInput] = useState("");
  const [alertUpperInput, setAlertUpperInput] = useState("");
  const [alertSaving, setAlertSaving] = useState(false);
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | undefined>(undefined);
  const [categorySaving, setCategorySaving] = useState(false);
  const [categories, setCategories] = useState<Array<{id: string; name: string; color?: string}>>([]);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [externalPrice, setExternalPrice] = useState<any>(null);
  const [isFetchingExternalPrice, setIsFetchingExternalPrice] = useState(false);

  const resetAlertInputs = useCallback(() => {
    const config = item?.price_alert_config;
    setAlertLowerInput(
      config?.lowerThreshold != null ? String(config.lowerThreshold) : ""
    );
    setAlertUpperInput(
      config?.upperThreshold != null ? String(config.upperThreshold) : ""
    );
  }, [item?.price_alert_config]);

  useEffect(() => {
    resetAlertInputs();
  }, [resetAlertInputs]);
  const priceHistory = item?.price_history ?? EMPTY_PRICE_HISTORY;

  const providerStatusMap = useMemo(() => {
    const map = new Map<string, boolean>();
    providerStatuses.forEach((status) => {
      map.set(status.providerId, status.hasKey);
    });
    return map;
  }, [providerStatuses]);

  const loadProviderStatuses = useCallback(async () => {
    setProviderStatusLoading(true);
    try {
      const response = await fetch("/api/provider-keys");
      if (!response.ok) {
        throw new Error("Failed to load provider keys");
      }
      const data: {
        providers?: Array<{
          providerId: string;
          providerName: string;
          hasKey: boolean;
        }>;
      } = await response.json();
      setProviderStatuses(data.providers ?? []);
    } catch (error) {
      console.error("Failed to load provider key status:", error);
      toast({
        title: "API key status unavailable",
        description:
          "We could not load provider credentials. Try again shortly.",
        variant: "destructive",
      });
    } finally {
      setProviderStatusLoading(false);
    }
  }, [toast]);

  const selectedProviderMeta = useMemo(() => {
    return (
      TRADE_PROVIDERS.find((provider) => provider.id === selectedProviderId) ??
      TRADE_PROVIDERS[0]
    );
  }, [selectedProviderId]);

  const selectedProviderHasKey =
    providerStatusMap.get(selectedProviderId) ?? false;

  const handleTogglePinned = useCallback(
    (providerName: string, shouldSelect: boolean) => {
      setPinnedDraft((current) => {
        const normalized = TRADE_PROVIDERS.map(
          (provider) => provider.name
        ).filter((name) => current.includes(name));
        if (shouldSelect) {
          if (normalized.includes(providerName)) {
            return normalized;
          }
          if (normalized.length >= 3) {
            toast({
              title: "Limit reached",
              description: "You can pin up to three providers.",
              variant: "destructive",
            });
            return normalized;
          }
          const updated = [...normalized, providerName];
          return TRADE_PROVIDERS.map((provider) => provider.name)
            .filter((name) => updated.includes(name))
            .slice(0, 3);
        }
        const filtered = normalized.filter((name) => name !== providerName);
        return TRADE_PROVIDERS.map((provider) => provider.name)
          .filter((name) => filtered.includes(name))
          .slice(0, 3);
      });
    },
    [toast]
  );

  const handleSaveMarketSettings = useCallback(async () => {
    const normalizedPinned = TRADE_PROVIDERS.map((provider) => provider.name)
      .filter((name) => pinnedDraft.includes(name))
      .slice(0, 3);

    if (normalizedPinned.length === 0) {
      toast({
        title: "Select providers",
        description: "Choose at least one marketplace to pin.",
        variant: "destructive",
      });
      return;
    }

    const parsedLimit = Number.parseInt(fetchLimitDraft, 10);
    if (!Number.isFinite(parsedLimit) || parsedLimit < 1 || parsedLimit > 25) {
      toast({
        title: "Invalid fetch limit",
        description: "Enter a number between 1 and 25.",
        variant: "destructive",
      });
      return;
    }

    setMarketSettingsSaving(true);
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pinnedMarketSites: normalizedPinned,
          marketListingsFetchLimit: parsedLimit,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error ?? "Failed to save settings");
      }

      const nextSettings = {
        ...settings,
        pinnedMarketSites: normalizedPinned,
        marketListingsFetchLimit: parsedLimit,
      };

      toast({
        title: "Settings saved",
        description: "Market snapshot configuration updated.",
      });

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("app-settings-updated", { detail: nextSettings })
        );
      }

      setMarketSettingsOpen(false);
    } catch (error) {
      console.error("Failed to save market settings:", error);
      toast({
        title: "Unable to save",
        description:
          error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setMarketSettingsSaving(false);
    }
  }, [fetchLimitDraft, pinnedDraft, settings, toast]);
  const handleAlertDialogOpenChange = (open: boolean) => {
    setAlertDialogOpen(open);
    resetAlertInputs();
  };

  const handleSavePriceAlerts = useCallback(async () => {
    setAlertSaving(true);
    try {
      const parseValue = (raw: string, label: string): number | null => {
        const trimmed = raw.trim();
        if (trimmed.length === 0) {
          return null;
        }
        const parsed = Number(trimmed);
        if (!Number.isFinite(parsed) || parsed < 0) {
          throw new Error(`${label} threshold must be a positive number`);
        }
        return parsed;
      };

      const lower = parseValue(alertLowerInput, "Lower");
      const upper = parseValue(alertUpperInput, "Upper");

      const response = await fetch(
        `/api/items/${encodeURIComponent(hash)}/alerts`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lowerThreshold: lower,
            upperThreshold: upper,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error ?? "Failed to update price alerts");
      }

      const result: { config: PriceAlertConfig } = await response.json();
      setItem((prev) =>
        prev ? { ...prev, price_alert_config: result.config } : prev
      );
      setAlertLowerInput(lower != null ? String(lower) : "");
      setAlertUpperInput(upper != null ? String(upper) : "");
      resetAlertInputs();
      setAlertDialogOpen(false);
      toast({
        title: "Price alerts updated",
        description:
          "Discord notifications will trigger on the new thresholds.",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unexpected error";
      toast({
        title: "Unable to update alerts",
        description: message,
        variant: "destructive",
      });
    } finally {
      setAlertSaving(false);
    }
  }, [alertLowerInput, alertUpperInput, hash, resetAlertInputs, toast]);

  const submitApiKey = useCallback(
    async (value: string, successMessage: string) => {
      setApiKeySaving(true);
      try {
        const response = await fetch("/api/provider-keys", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            providerId: selectedProviderId,
            apiKey: value,
          }),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => null);
          throw new Error(error?.error ?? "Failed to update API key");
        }

        toast({
          title: "API key updated",
          description: successMessage,
        });

        setApiKeyValue("");
        await loadProviderStatuses();
      } catch (error) {
        console.error("Failed to update provider key:", error);
        toast({
          title: "Unable to update API key",
          description:
            error instanceof Error ? error.message : "Please try again later.",
          variant: "destructive",
        });
      } finally {
        setApiKeySaving(false);
      }
    },
    [loadProviderStatuses, selectedProviderId, toast]
  );

  const handleSaveApiKey = useCallback(async () => {
    const trimmed = apiKeyValue.trim();
    if (!trimmed) {
      toast({
        title: "Missing API key",
        description: "Add a value or use remove to clear the stored key.",
        variant: "destructive",
      });
      return;
    }

    await submitApiKey(
      trimmed,
      `Stored API key for ${selectedProviderMeta.name}.`
    );
  }, [apiKeyValue, submitApiKey, selectedProviderMeta, toast]);

  const handleRemoveApiKey = useCallback(async () => {
    if (!selectedProviderHasKey) {
      return;
    }
    await submitApiKey("", `Removed API key for ${selectedProviderMeta.name}.`);
  }, [selectedProviderHasKey, selectedProviderMeta, submitApiKey]);

  useEffect(() => {
    if (!marketSettingsOpen) {
      return;
    }

    const pinnedFromSettings = TRADE_PROVIDERS.map(
      (provider) => provider.name
    ).filter((name) =>
      (
        effectiveSettings.pinnedMarketSites ?? DEFAULT_PINNED_PROVIDERS
      ).includes(name)
    );

    const fallback = DEFAULT_PINNED_PROVIDERS.filter(
      (name) => !pinnedFromSettings.includes(name)
    );

    setPinnedDraft([...pinnedFromSettings, ...fallback].slice(0, 3));

    setFetchLimitDraft(
      String(
        Math.min(
          25,
          Math.max(1, effectiveSettings.marketListingsFetchLimit ?? 5)
        )
      )
    );

    setApiKeyValue("");
    void loadProviderStatuses();
  }, [
    loadProviderStatuses,
    marketSettingsOpen,
    effectiveSettings.marketListingsFetchLimit,
    effectiveSettings.pinnedMarketSites,
  ]);

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

  const marketFetchLimit = effectiveSettings.marketListingsFetchLimit ?? 5;

  const providerMetaMap = useMemo(() => {
    const map = new Map<string, TradeProviderMeta>();
    TRADE_PROVIDERS.forEach((provider) => map.set(provider.name, provider));
    return map;
  }, []);

  const pinnedProviders = useMemo(() => {
    const requested = (effectiveSettings.pinnedMarketSites ?? []).filter(
      (name) => providerMetaMap.has(name)
    );
    const fallback = DEFAULT_PINNED_PROVIDERS.filter(
      (name) => providerMetaMap.has(name) && !requested.includes(name)
    );
    return [...requested, ...fallback].slice(0, 3);
  }, [effectiveSettings.pinnedMarketSites, providerMetaMap]);

  useEffect(() => {
    const config = item?.price_alert_config;
    setAlertLowerInput(
      config?.lowerThreshold != null ? String(config.lowerThreshold) : ""
    );
    setAlertUpperInput(
      config?.upperThreshold != null ? String(config.upperThreshold) : ""
    );
  }, [item?.price_alert_config]);

  const groupedListings = useMemo(() => {
    const map = new Map<string, TradeListing[]>();
    marketListings.forEach((listing) => {
      const bucket = map.get(listing.site) ?? [];
      bucket.push(listing);
      map.set(listing.site, bucket);
    });

    const ordered: Array<{ site: string; listings: TradeListing[] }> =
      TRADE_PROVIDERS.map((provider) => ({
        site: provider.name,
        listings: map.get(provider.name) ?? [],
      }));

    map.forEach((listings, site) => {
      if (!providerMetaMap.has(site)) {
        ordered.push({ site, listings });
      }
    });

    const pinnedOrder = new Map<string, number>(
      pinnedProviders.map((name, index) => [name, index])
    );
    const pinnedSet = new Set(pinnedProviders);

    return ordered.sort((a, b) => {
      const aPinned = pinnedSet.has(a.site);
      const bPinned = pinnedSet.has(b.site);
      if (aPinned && bPinned) {
        return (pinnedOrder.get(a.site) ?? 0) - (pinnedOrder.get(b.site) ?? 0);
      }
      if (aPinned) return -1;
      if (bPinned) return 1;
      return a.site.localeCompare(b.site);
    });
  }, [marketListings, pinnedProviders, providerMetaMap]);

  const listingRows = useMemo(() => {
    const rows: Array<Array<{ site: string; listings: TradeListing[] }>> = [];
    for (let i = 0; i < groupedListings.length; i += 3) {
      rows.push(groupedListings.slice(i, i + 3));
    }
    return rows;
  }, [groupedListings]);

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
      const response = await fetch(`/api/items/${encodeURIComponent(hash)}?display_currency=${displayCurrency}`);
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
    if (
      !effectiveSettings.discordWebhookEnabled ||
      !effectiveSettings.discordDevelopmentMode
    ) {
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
  }, [
    effectiveSettings.discordWebhookEnabled,
    effectiveSettings.discordDevelopmentMode,
  ]);

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
    if (
      !effectiveSettings.discordWebhookEnabled ||
      !effectiveSettings.discordDevelopmentMode
    ) {
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

  const loadMarketListings = async () => {
    if (!item) {
      return;
    }

    const previouslyLoaded = listingsLoaded;
    setListingsError(null);
    setListingsLoaded(false);
    setListingsLoading(true);

    try {
      const response = await fetch(
        `/api/item-listings?market_hash_name=${encodeURIComponent(
          item.market_hash_name
        )}&limit=${marketFetchLimit}`
      );
      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || "Failed to fetch listings");
      }

      const result: { listings: TradeListing[] } = await response.json();
      setMarketListings(result.listings);
      setListingsLoaded(true);
    } catch (error) {
      console.error("Failed to load market listings:", error);
      setListingsError(
        error instanceof Error ? error.message : "Unexpected error occurred"
      );
      setListingsLoaded(previouslyLoaded);
    } finally {
      setListingsLoading(false);
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

  const startEditingCategory = () => {
    setEditingCategoryId(item?.category_id);
    setIsEditingCategory(true);
  };

  const cancelEditingCategory = () => {
    setIsEditingCategory(false);
    setEditingCategoryId(undefined);
  };

  const loadItemData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/items/${encodeURIComponent(hash)}?display_currency=${displayCurrency}`);
      if (response.ok) {
        const data = await response.json();
        console.log(`[ItemDetail] Item data loaded:`, { marketHashName: data.market_hash_name, itemId: data.id });
        setItem(data);
      } else {
        console.error("Failed to fetch item:", response.statusText);
        setItem(null);
      }
    } catch (error) {
      console.error("Error fetching item:", error);
      setItem(null);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories");
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const loadExistingExternalPrice = async () => {
    if (!item?.market_hash_name) return;
    
    try {
      console.log(`[ItemDetail] Loading existing external price data for: ${item.market_hash_name}`);
      // Load the most recent data (could be from any source)
      const response = await fetch(`/api/external-prices?market_hash_name=${encodeURIComponent(item.market_hash_name)}`);
      if (response.ok) {
        const data = await response.json();
        if (data) {
          console.log(`[ItemDetail] Loaded existing data:`, data);
          setExternalPrice(data);
        }
      }
    } catch (error) {
      console.error("Error loading existing external price:", error);
    }
  };

  const fetchExternalPriceForSource = async (source: "csgoskins.gg" | "skinsmonkey") => {
    if (!item?.market_hash_name) return;
    
    console.log(`[ItemDetail] fetchExternalPriceForSource called with:`, { source, itemName: item.market_hash_name });
    setIsFetchingExternalPrice(true);
    try {
      // Only load from existing data - no scraping
      const apiUrl = `/api/external-prices?market_hash_name=${encodeURIComponent(item.market_hash_name)}&source=${source}`;
      console.log(`[ItemDetail] Making API call to: ${apiUrl}`);
      
      const existingResponse = await fetch(apiUrl);
      console.log(`[ItemDetail] API response status: ${existingResponse.status}`);
      
      if (existingResponse.ok) {
        const existingData = await existingResponse.json();
        console.log(`[ItemDetail] API response data:`, existingData);
        
        if (existingData) {
          console.log(`[ItemDetail] Setting external price data:`, existingData);
          setExternalPrice(existingData);
        } else {
          console.log(`[ItemDetail] No existing ${source} data found for: ${item.market_hash_name}`);
          setExternalPrice(null);
        }
      } else {
        console.log(`[ItemDetail] API error - status: ${existingResponse.status}`);
        setExternalPrice(null);
      }
    } catch (error) {
      console.error("Error loading external price from storage:", error);
      setExternalPrice(null);
    } finally {
      setIsFetchingExternalPrice(false);
    }
  };

  const fetchExternalPrice = async () => {
    if (!item?.market_hash_name) return;
    
    const source = externalPrice?.source || "csgoskins.gg";
    setIsFetchingExternalPrice(true);
    try {
      // This function is for manual scraping only (Update Price button)
      console.log(`[ItemDetail] Manually scraping ${source} data for: ${item.market_hash_name}`);
      const response = await fetch("/api/external-prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          market_hash_name: item.market_hash_name,
          source: source
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setExternalPrice(result.data);
          const priceText = source === "skinsmonkey" 
            ? (result.data.trade_value ? `${getClientCurrencySymbol(displayCurrency)}${result.data.trade_value}` : "Trade value")
            : `${getClientCurrencySymbol(displayCurrency)}${result.data.current_price}`;
          
          toast({
            title: "Price Updated",
            description: `Updated ${source === "skinsmonkey" ? "SkinsMonkey" : "CSGOSKINS.GG"} price: ${priceText}`,
          });
        } else {
          throw new Error(result.error || "Failed to fetch external price");
        }
      } else {
        throw new Error("Failed to fetch external price");
      }
    } catch (error) {
      console.error("Error fetching external price:", error);
      toast({
        title: "Error",
        description: "Failed to fetch external price data",
        variant: "destructive",
      });
    } finally {
      setIsFetchingExternalPrice(false);
    }
  };


  const getCategoryInfo = (categoryId: string) => {
    return categories.find(cat => cat.id === categoryId);
  };

  const saveCategory = async () => {
    if (!item) return;

    setCategorySaving(true);
    try {
      const response = await fetch(`/api/items/${encodeURIComponent(hash)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category_id: editingCategoryId,
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Category updated successfully",
        });
        await fetchItem(); // Refresh item data
        await fetchCategories(); // Refresh categories list
        setIsEditingCategory(false);
      } else {
        throw new Error("Failed to update category");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update category",
        variant: "destructive",
      });
    } finally {
      setCategorySaving(false);
    }
  };

  useEffect(() => {
    loadItemData();
    fetchCategories();

    const handleCategoryCreated = () => {
      fetchCategories();
    };

    window.addEventListener("categoryCreated", handleCategoryCreated);

    return () => {
      window.removeEventListener("categoryCreated", handleCategoryCreated);
    };
  }, [hash, displayCurrency]);

  // Load CSGOSKINS.GG data when item loads (since it's the default selection)
  useEffect(() => {
    if (item?.market_hash_name) {
      console.log(`[ItemDetail] Item loaded, automatically loading CSGOSKINS.GG data for: ${item.market_hash_name}`);
      fetchExternalPriceForSource("csgoskins.gg");
    }
  }, [item?.market_hash_name]);


  useEffect(() => {
    setMarketListings([]);
    setListingsLoaded(false);
    setListingsError(null);
    setListingsLoading(false);
  }, [item?.market_hash_name]);

  if (isLoading) {
    return <div className="text-center py-8">Loading item details...</div>;
  }

  if (!item) {
    return <div className="text-center py-8">Item not found</div>;
  }

  const showDevWebhookTools =
    effectiveSettings.discordWebhookEnabled &&
    effectiveSettings.discordDevelopmentMode;
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
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-background via-background/80 to-muted/20 shadow-lg">
        <div className="flex flex-col gap-6 p-6 lg:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" size="sm" asChild>
                <Link href="/">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
              <span className="inline-flex items-center gap-2 rounded-full border border-border/40 bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground">
                App ID {item.appid}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {item.steam_url && (
                <Button variant="outline" size="sm" asChild className="gap-2">
                  <a
                    href={item.steam_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Steam Market
                  </a>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAlertDialogOpenChange(true)}
                className="gap-2"
              >
                Price Alerts
              </Button>
              <div className="flex-shrink-0">
                <SettingsDialog />
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.label}
                    className="w-16 h-16 lg:w-20 lg:h-20 object-contain rounded-lg border bg-card cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => setImageDialogOpen(true)}
                    onError={(e) => {
                      // Hide image if it fails to load
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <ImageLoadingSpinner size="lg" className="w-16 h-16 lg:w-20 lg:h-20" />
                )}
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold lg:text-4xl text-foreground">
                  {item.label}
                </h1>
                <p className="text-sm text-muted-foreground text-pretty">
                  {item.market_hash_name}
                </p>
              </div>
            </div>
          </div>
          {item.description && (
            <p className="text-sm text-muted-foreground/90 leading-relaxed text-pretty">
              {item.description}
            </p>
          )}
          {/* Category Section */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {!isEditingCategory ? (
                <>
                  <span className="text-sm text-muted-foreground">Category:</span>
                  {item.category_id ? (
                    (() => {
                      const categoryInfo = getCategoryInfo(item.category_id);
                      return categoryInfo ? (
                        <div className="flex items-center gap-2">
                          {categoryInfo.color && (
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: categoryInfo.color }}
                            />
                          )}
                          <Badge variant="secondary">
                            {categoryInfo.name}
                          </Badge>
                        </div>
                      ) : (
                        <Badge variant="secondary">
                          {item.category_id}
                        </Badge>
                      );
                    })()
                  ) : (
                    <span className="text-sm text-muted-foreground italic">No category</span>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-sm text-muted-foreground">Category:</span>
                  <CategorySelector
                    value={editingCategoryId}
                    onValueChange={setEditingCategoryId}
                    placeholder="Select a category"
                    showCreateButton={true}
                    onCategoryCreated={() => fetchCategories()}
                  />
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {!isEditingCategory ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={startEditingCategory}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {item.category_id ? "Change" : "Set Category"}
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={cancelEditingCategory}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={saveCategory}
                    disabled={categorySaving}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {categorySaving ? "Saving..." : "Save"}
                  </Button>
                </>
              )}
            </div>
          </div>
          {(item.price_alert_config?.lowerThreshold != null ||
            item.price_alert_config?.upperThreshold != null) && (
            <div className="flex flex-wrap gap-2 text-xs">
              {item.price_alert_config?.lowerThreshold != null && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-3 py-1 font-medium text-red-300">
                  Stop Loss: {getClientCurrencySymbol(displayCurrency)}
                  {item.price_alert_config.lowerThreshold.toFixed(2)}
                </span>
              )}
              {item.price_alert_config?.upperThreshold != null && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 font-medium text-emerald-300">
                  Take Profit: {getClientCurrencySymbol(displayCurrency)}
                  {item.price_alert_config.upperThreshold.toFixed(2)}
                </span>
              )}
            </div>
          )}
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
                  {getClientCurrencySymbol(displayCurrency)}{latestPrice.median_price.toFixed(2)}
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
                <div className="text-xs text-muted-foreground mt-1">
                  Steam Market (Tracked)
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
              {getClientCurrencySymbol(displayCurrency)}{avgPrice.toFixed(2)}
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
                  {getClientCurrencySymbol(displayCurrency)}{maxPrice.toFixed(2)}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Low:</span>{" "}
                <span className="font-medium text-red-400">
                  {getClientCurrencySymbol(displayCurrency)}{minPrice.toFixed(2)}
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

      {/* Steam Market Chart Section */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="text-card-foreground">
            Price Timeline - Steam Market
          </CardTitle>
          <CardDescription>
            Historical price data from Steam Market with {totalDataPoints} data points
          </CardDescription>
        </CardHeader>
        <CardContent>
          {priceHistory.length > 0 ? (
            <div className="space-y-4">
              {priceChartElement}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No price history available
            </div>
          )}
        </CardContent>
      </Card>

      {/* External Price Section */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="text-card-foreground">
            Current Price - {externalPrice?.source === "skinsmonkey" ? "SkinsMonkey" : "CSGOSKINS.GG"}
          </CardTitle>
          <CardDescription>
            Real-time price data from {externalPrice?.source === "skinsmonkey" ? "SkinsMonkey trading platform" : "CSGOSKINS.GG"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <select
                value={externalPrice?.source || "csgoskins.gg"}
                onChange={(e) => {
                  const newSource = e.target.value as "csgoskins.gg" | "skinsmonkey";
                  console.log(`[ItemDetail] Dropdown changed to source: ${newSource}`);
                  console.log(`[ItemDetail] Item market hash name: ${item?.market_hash_name}`);
                  // Clear current price data when switching sources
                  setExternalPrice(null);
                  // Fetch data for the new source
                  fetchExternalPriceForSource(newSource);
                }}
                className="px-3 py-1 text-sm border border-border rounded-md bg-background text-foreground"
              >
                <option value="csgoskins.gg">CSGOSKINS.GG</option>
                <option value="skinsmonkey">SkinsMonkey</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchExternalPrice}
                disabled={isFetchingExternalPrice}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isFetchingExternalPrice ? "animate-spin" : ""}`} />
                {isFetchingExternalPrice ? "Fetching..." : "Update Price"}
              </Button>
              {externalPrice && (
                <span className="text-xs text-muted-foreground">
                  Last updated: {new Date(externalPrice.last_updated).toLocaleString()}
                </span>
              )}
            </div>
          </div>

          {externalPrice ? (
            <div className="space-y-4">
              <div className="h-64 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-lg border border-border/50 flex items-center justify-center">
                <div className="text-center space-y-4">
                  {externalPrice.source === "skinsmonkey" ? (
                    <>
                      <div className="text-3xl font-bold text-card-foreground">
                        {externalPrice.trade_value ? `${getClientCurrencySymbol(displayCurrency)}${externalPrice.trade_value.toFixed(2)}` : "Integration coming soon"}
                      </div>
                      <div className="text-lg text-muted-foreground">
                        Current SkinsMonkey Trade Value
                      </div>
                      {externalPrice.offers_count !== undefined && (
                        <div className="text-lg font-semibold text-blue-400">
                          {externalPrice.offers_count} Active Offers
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="text-3xl font-bold text-card-foreground">
                        {getClientCurrencySymbol(displayCurrency)}{externalPrice.current_price?.toFixed(2) || "N/A"}
                      </div>
                      <div className="text-lg text-muted-foreground">
                        Current CSGOSKINS.GG Price
                      </div>
                      {externalPrice.price_change_24h_percent !== undefined && (
                        <div className={`text-lg font-semibold ${
                          externalPrice.price_change_24h_percent > 0 ? "text-green-400" : 
                          externalPrice.price_change_24h_percent < 0 ? "text-red-400" : "text-muted-foreground"
                        }`}>
                          {externalPrice.price_change_24h_percent > 0 ? "+" : ""}{externalPrice.price_change_24h_percent.toFixed(1)}% (24h)
                        </div>
                      )}
                    </>
                  )}
                  <div className="text-sm text-muted-foreground">
                    Last updated: {new Date(externalPrice.last_updated).toLocaleString()}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {externalPrice.source === "skinsmonkey" ? (
                  <>
                    {externalPrice.offers_count !== undefined && (
                      <div className="text-center p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                        <div className="text-muted-foreground mb-1">Active Offers</div>
                        <div className="font-semibold text-blue-400">
                          {externalPrice.offers_count}
                        </div>
                      </div>
                    )}
                    <div className="text-center p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                      <div className="text-muted-foreground mb-1">Platform</div>
                      <div className="font-semibold text-green-400">
                        SkinsMonkey
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {externalPrice.week_low && (
                      <div className="text-center p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                        <div className="text-muted-foreground mb-1">Week Low</div>
                        <div className="font-semibold text-red-400">
                          {getClientCurrencySymbol(displayCurrency)}{externalPrice.week_low.toFixed(2)}
                        </div>
                      </div>
                    )}
                    {externalPrice.week_high && (
                      <div className="text-center p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                        <div className="text-muted-foreground mb-1">Week High</div>
                        <div className="font-semibold text-green-400">
                          {getClientCurrencySymbol(displayCurrency)}{externalPrice.week_high.toFixed(2)}
                        </div>
                      </div>
                    )}
                    {externalPrice.all_time_low && (
                      <div className="text-center p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                        <div className="text-muted-foreground mb-1">All-Time Low</div>
                        <div className="font-semibold text-red-400">
                          {getClientCurrencySymbol(displayCurrency)}{externalPrice.all_time_low.toFixed(2)}
                        </div>
                      </div>
                    )}
                    {externalPrice.all_time_high && (
                      <div className="text-center p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                        <div className="text-muted-foreground mb-1">All-Time High</div>
                        <div className="font-semibold text-green-400">
                          {getClientCurrencySymbol(displayCurrency)}{externalPrice.all_time_high.toFixed(2)}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="flex flex-wrap gap-4 justify-center text-sm text-muted-foreground">
                {externalPrice.trading_volume_24h && (
                  <span>24h Volume: {externalPrice.trading_volume_24h.toLocaleString()}</span>
                )}
                {externalPrice.popularity && (
                  <span>Popularity: {externalPrice.popularity}</span>
                )}
                {externalPrice.community_rating && (
                  <span>Rating: {externalPrice.community_rating.toFixed(1)}/5</span>
                )}
              </div>

              {externalPrice.url && (
                <div className="text-center">
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={externalPrice.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View on {externalPrice.source === "skinsmonkey" ? "SkinsMonkey" : "CSGOSKINS.GG"}
                    </a>
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No external price data available. Click "Update Price" to fetch current data.
            </div>
          )}
        </CardContent>
      </Card>

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
                <Label htmlFor="dev-current-price">Current price ({displayCurrency})</Label>
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
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-card-foreground">
                Market Listings Snapshot
              </CardTitle>
              <CardDescription>
                Fetch up to five live offers from each supported marketplace.
              </CardDescription>
              <div className="text-xs text-muted-foreground mt-1">
                Pinned providers: {pinnedProviders.join(", ")}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setMarketSettingsOpen(true)}
              >
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Snapshot Settings
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={loadMarketListings}
                disabled={listingsLoading}
              >
                {listingsLoading
                  ? "Loading..."
                  : listingsLoaded
                  ? "Refresh"
                  : "Load"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {listingsError && (
            <div className="text-sm text-red-500">{listingsError}</div>
          )}

          {!listingsLoading &&
            listingsLoaded &&
            marketListings.length === 0 && (
              <div className="text-sm text-muted-foreground">
                No listings found for this item across the configured providers.
              </div>
            )}

          {listingsLoading && (
            <div className="flex items-center justify-center py-6">
              <div className="h-10 w-10 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
            </div>
          )}

          {listingsLoaded && listingRows.length > 0 && (
            <div className="space-y-6">
              {listingRows.map((row, rowIndex) => (
                <div
                  key={`listing-row-${rowIndex}`}
                  className="grid gap-4 md:grid-cols-3"
                >
                  {row.map(({ site, listings }) => {
                    const meta = providerMetaMap.get(site);
                    const accent = meta?.accentColor ?? "bg-muted";
                    return (
                      <div
                        key={site}
                        className="rounded-lg border border-border/60 bg-background/60 p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
                            <span
                              className={`inline-block h-2 w-2 rounded-full ${accent}`}
                            />
                            {site}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {Math.min(listings.length, 5)} offers
                          </span>
                        </div>
                        <div className="space-y-3">
                          {listings.slice(0, 5).map((listing, index) => (
                            <div
                              key={`${site}-${index}`}
                              className="space-y-2 rounded-md border border-border/50 bg-background/50 p-3"
                            >
                              <div className="flex items-center justify-between text-sm font-medium">
                                <span
                                  className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${getConditionBadgeClass(
                                    listing.condition
                                  )}`}
                                >
                                  {listing.condition}
                                </span>
                                <span>${listing.price.toFixed(2)}</span>
                              </div>
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>
                                  Float:{" "}
                                  {listing.float != null
                                    ? listing.float.toFixed(3)
                                    : "—"}
                                </span>
                                <span>{listing.currency}</span>
                              </div>
                              {listing.url && (
                                <a
                                  href={listing.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-primary hover:underline"
                                >
                                  View offer
                                </a>
                              )}
                            </div>
                          ))}
                          {listings.length === 0 && (
                            <div className="rounded-md border border-dashed border-border/50 bg-background/40 p-4 text-xs text-muted-foreground">
                              No offers captured for this provider.
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {row.length < 3 &&
                    Array.from({ length: 3 - row.length }).map((_, index) => (
                      <div
                        key={`placeholder-${rowIndex}-${index}`}
                        className="hidden md:block"
                      />
                    ))}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={alertDialogOpen} onOpenChange={handleAlertDialogOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Price Alerts</DialogTitle>
            <DialogDescription>
              Receive Discord notifications when this item's price crosses your
              thresholds.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="price-alert-lower">
                Lower threshold (Stop Loss)
              </Label>
              <Input
                id="price-alert-lower"
                type="number"
                min="0"
                step="0.01"
                placeholder="Leave blank to disable"
                value={alertLowerInput}
                onChange={(event) => setAlertLowerInput(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Notify when the price falls to or below this value.
              </p>
              {item?.price_alert_config?.lastTriggeredLower && (
                <p className="text-xs text-amber-500">
                  Last triggered{" "}
                  {new Date(
                    item.price_alert_config.lastTriggeredLower
                  ).toLocaleString()}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="price-alert-upper">
                Upper threshold (Take Profit)
              </Label>
              <Input
                id="price-alert-upper"
                type="number"
                min="0"
                step="0.01"
                placeholder="Leave blank to disable"
                value={alertUpperInput}
                onChange={(event) => setAlertUpperInput(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Notify when the price rises to or above this value.
              </p>
              {item?.price_alert_config?.lastTriggeredUpper && (
                <p className="text-xs text-amber-500">
                  Last triggered{" "}
                  {new Date(
                    item.price_alert_config.lastTriggeredUpper
                  ).toLocaleString()}
                </p>
              )}
            </div>
            {item?.price_alert_config?.updatedAt && (
              <p className="text-xs text-muted-foreground">
                Updated{" "}
                {new Date(item.price_alert_config.updatedAt).toLocaleString()}
              </p>
            )}
          </div>
          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleAlertDialogOpenChange(false)}
              disabled={alertSaving}
            >
              Cancel
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setAlertLowerInput("");
                  setAlertUpperInput("");
                }}
                disabled={alertSaving}
              >
                Clear
              </Button>
              <Button
                type="button"
                onClick={handleSavePriceAlerts}
                disabled={alertSaving}
              >
                {alertSaving ? "Saving..." : "Save alerts"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={marketSettingsOpen} onOpenChange={setMarketSettingsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Market Snapshot Settings</DialogTitle>
            <DialogDescription>
              Choose which marketplaces to pin, control fetch limits, and manage
              provider API keys stored locally.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-2">
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium text-card-foreground">
                  Pinned providers
                </h4>
                <p className="text-xs text-muted-foreground">
                  Select up to three marketplaces to highlight in market
                  snapshots.
                </p>
              </div>
              <div className="space-y-2">
                {TRADE_PROVIDERS.map((provider) => {
                  const checked = pinnedDraft.includes(provider.name);
                  return (
                    <label
                      key={provider.id}
                      className="flex items-center justify-between gap-3 rounded-md border border-border/40 bg-background/60 px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-card-foreground">
                          {provider.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {provider.baseUrl.replace(/^https?:\/\//, "")}
                        </p>
                      </div>
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) =>
                          handleTogglePinned(provider.name, value === true)
                        }
                      />
                    </label>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                {pinnedDraft.length} of 3 selected.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="market-fetch-limit">Listings per provider</Label>
              <Input
                id="market-fetch-limit"
                type="number"
                min={1}
                max={25}
                value={fetchLimitDraft}
                onChange={(event) => setFetchLimitDraft(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Control how many offers are fetched from each marketplace
                (1-25).
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-card-foreground">
                    API keys
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Stored securely in your local .env.local file.
                  </p>
                </div>
                {providerStatusLoading ? (
                  <Badge variant="secondary">Checking...</Badge>
                ) : selectedProviderHasKey ? (
                  <Badge variant="secondary">Key stored</Badge>
                ) : (
                  <Badge variant="outline">No key</Badge>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="api-key-provider">Provider</Label>
                <Select
                  value={selectedProviderId}
                  onValueChange={setSelectedProviderId}
                >
                  <SelectTrigger id="api-key-provider">
                    <SelectValue placeholder="Choose provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRADE_PROVIDERS.map((provider) => (
                      <SelectItem key={provider.id} value={provider.id}>
                        {provider.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="api-key-value">
                  {selectedProviderMeta.name} API key
                </Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    id="api-key-value"
                    type="text"
                    value={apiKeyValue}
                    onChange={(event) => setApiKeyValue(event.target.value)}
                    placeholder="Paste API key"
                    className="sm:flex-1"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleSaveApiKey}
                      disabled={apiKeySaving}
                    >
                      {apiKeySaving ? "Saving..." : "Save"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleRemoveApiKey}
                      disabled={!selectedProviderHasKey || apiKeySaving}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Keys are saved locally; leave the field empty and click remove
                  to clear a stored key.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setMarketSettingsOpen(false)}
              disabled={marketSettingsSaving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveMarketSettings}
              disabled={marketSettingsSaving}
            >
              {marketSettingsSaving ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      <ImageDialog
        open={imageDialogOpen}
        onOpenChange={setImageDialogOpen}
        imageUrl={item?.image_url || ""}
        itemName={item?.label || ""}
      />
    </div>
  );
}
