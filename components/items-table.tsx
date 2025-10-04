"use client";

import { JSX, useEffect, useState, useMemo } from "react";

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
import { Badge } from "@/components/ui/badge";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { 
  Trash2, 
  Eye, 
  ExternalLink, 
  Edit, 
  Search, 
  Filter, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  X,
  RefreshCw
} from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/contexts/currency-context";
import { getClientCurrencySymbol } from "@/lib/currency-utils";

import Link from "next/link";

import { EditItemDialog } from "@/components/edit-item-dialog";

import { DeleteItemDialog } from "@/components/delete-file-dialog";

import { ImageDialog } from "@/components/image-dialog";
import { ImageLoadingSpinner } from "@/components/image-loading-spinner";
import { PriceSourceToggle } from "@/components/price-source-toggle";

type Customization = {
  name: string;

  steam_url: string;

  price: number;

  currency: string;
};

interface Item {
  id: string;

  market_hash_name: string;

  label: string;

  description?: string;

  category_id?: string;

  appid: number;

  steam_url?: string;

  image_url?: string;

  purchase_price: number;

  purchase_price_usd: number;

  purchase_currency: string;

  quantity: number;

  latest_price?: number;

  last_updated?: string;

  profit_loss?: number | null;

  profit_loss_percentage?: number | null;

  stickers?: Customization[];

  charms?: Customization[];

  patches?: Customization[];
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",

  EUR: "?",

  GBP: "?",

  JPY: "?",

  CAD: "C$",

  AUD: "A$",

  CHF: "CHF",

  CNY: "?",

  SEK: "kr",

  NOK: "kr",

  DKK: "kr",

  PLN: "z?",

  CZK: "K?",

  HUF: "Ft",

  RUB: "?",

  BRL: "R$",

  MXN: "$",

  INR: "?",

  KRW: "?",

  SGD: "S$",
};

const MAX_CUSTOMIZATION_PREVIEW = 2;

const formatCustomizationPreview = (
  customizations: Customization[] | undefined,

  maxVisible = MAX_CUSTOMIZATION_PREVIEW
): { preview: string; tooltip: string } | null => {
  if (!customizations || customizations.length === 0) {
    return null;
  }

  const names = customizations

    .map((customization) => customization.name?.trim())

    .filter((name): name is string => Boolean(name));

  if (names.length === 0) {
    return null;
  }

  const previewNames = names.slice(0, maxVisible);

  const preview =
    names.length > maxVisible
      ? `${previewNames.join(" | ")} | ...`
      : previewNames.join(" | ");

  return {
    preview,

    tooltip: names.join(" | "),
  };
};

const renderCustomizationRow = (
  customizations: Customization[] | undefined,

  label: string,

  labelColorClass: string
): JSX.Element | null => {
  const previewData = formatCustomizationPreview(customizations);

  if (!previewData) {
    return null;
  }

  return (
    <div className="text-xs text-muted-foreground">
      <span className={`font-medium ${labelColorClass}`}>{label}:</span>{" "}
      <span
        className="inline-block max-w-[260px] whitespace-nowrap overflow-hidden text-ellipsis"
        title={previewData.tooltip}
      >
        {previewData.preview}
      </span>
    </div>
  );
};

type SortField = 
  | "label" 
  | "category_id" 
  | "quantity" 
  | "purchase_price" 
  | "latest_price" 
  | "profit_loss" 
  | "profit_loss_percentage"
  | "last_updated";

type SortDirection = "asc" | "desc";

interface FilterState {
  search: string;
  category: string;
  minPrice: string;
  maxPrice: string;
  minProfitLoss: string;
  maxProfitLoss: string;
  profitLossFilter: "all" | "profit" | "loss" | "neutral";
  hasCustomizations: "all" | "yes" | "no";
}

export function ItemsTable() {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Array<{id: string; name: string; color?: string}>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<Item | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState("");
  const [selectedImageItemName, setSelectedImageItemName] = useState("");
  const { displayCurrency } = useCurrency();
  
  // Filter and sort state
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    category: "all",
    minPrice: "",
    maxPrice: "",
    minProfitLoss: "",
    maxProfitLoss: "",
    profitLossFilter: "all",
    hasCustomizations: "all",
  });
  const [sortField, setSortField] = useState<SortField>("label");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [showFilters, setShowFilters] = useState(false);
  const [priceSource, setPriceSource] = useState<"steam" | "csgoskins.gg" | "skinsmonkey">("steam");
  const [externalPrices, setExternalPrices] = useState<Record<string, any>>({});
  const [isUpdatingPrices, setIsUpdatingPrices] = useState(false);

  const { toast } = useToast();

  const fetchItems = async () => {
    try {
      const response = await fetch(`/api/items?display_currency=${displayCurrency}`);

      if (response.ok) {
        const data = await response.json();

        setItems(data);
      }
    } catch (error) {
      console.error("Failed to fetch items:", error);
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

  const getCategoryInfo = (categoryId: string) => {
    return categories.find(cat => cat.id === categoryId);
  };

  const fetchExternalPrices = async () => {
    try {
      const response = await fetch("/api/external-prices");
      if (response.ok) {
        const externalData = await response.json();
        const priceMap: Record<string, any> = {};
        externalData.forEach((item: any) => {
          priceMap[item.market_hash_name] = item;
        });
        setExternalPrices(priceMap);
      }
    } catch (error) {
      console.error("Error fetching external prices:", error);
    }
  };

  const handlePriceSourceChange = (newSource: "steam" | "csgoskins.gg" | "skinsmonkey") => {
    setPriceSource(newSource);
    
    // If switching to external sources, fetch external prices if we don't have them
    if ((newSource === "csgoskins.gg" || newSource === "skinsmonkey") && Object.keys(externalPrices).length === 0) {
      fetchExternalPrices();
    }
    
    // Dispatch event to update header stats
    window.dispatchEvent(new CustomEvent('priceSourceChanged', {
      detail: { priceSource: newSource }
    }));
  };

  const updateExternalPrices = async () => {
    if (priceSource === "steam") {
      toast({
        title: "Error",
        description: "External prices can only be updated when CSGOSKINS.GG or SkinsMonkey is selected as the price source.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdatingPrices(true);
    try {
      const marketHashNames = items.map(item => item.market_hash_name);
      
      const response = await fetch("/api/external-prices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          market_hash_names: marketHashNames,
          source: priceSource,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        
        // Refresh external prices from the API
        await fetchExternalPrices();
        
        const sourceName = priceSource === "skinsmonkey" ? "SkinsMonkey" : "CSGOSKINS.GG";
        toast({
          title: "Prices Updated",
          description: `Successfully updated prices for ${result.scraped_count}/${result.total_count} items from ${sourceName}`,
        });
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to update external prices");
      }
    } catch (error) {
      console.error("Error updating external prices:", error);
      toast({
        title: "Error",
        description: `Failed to update external prices: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    } finally {
      setIsUpdatingPrices(false);
    }
  };

  // Filter and sort logic
  const filteredAndSortedItems = useMemo(() => {
    let filtered = items.filter((item) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          item.label.toLowerCase().includes(searchLower) ||
          item.market_hash_name.toLowerCase().includes(searchLower) ||
          (item.description && item.description.toLowerCase().includes(searchLower));
        if (!matchesSearch) return false;
      }

      // Category filter
      if (filters.category !== "all") {
        if (filters.category === "none" && item.category_id) return false;
        if (filters.category !== "none" && item.category_id !== filters.category) return false;
      }

      // Price range filter
      if (filters.minPrice) {
        const minPrice = parseFloat(filters.minPrice);
        if (item.latest_price && item.latest_price < minPrice) return false;
      }
      if (filters.maxPrice) {
        const maxPrice = parseFloat(filters.maxPrice);
        if (item.latest_price && item.latest_price > maxPrice) return false;
      }

      // Profit/Loss range filter
      if (filters.minProfitLoss) {
        const minProfitLoss = parseFloat(filters.minProfitLoss);
        if (item.profit_loss !== null && item.profit_loss < minProfitLoss) return false;
      }
      if (filters.maxProfitLoss) {
        const maxProfitLoss = parseFloat(filters.maxProfitLoss);
        if (item.profit_loss !== null && item.profit_loss > maxProfitLoss) return false;
      }

      // Profit/Loss type filter
      if (filters.profitLossFilter !== "all") {
        if (item.profit_loss === null) return false;
        if (filters.profitLossFilter === "profit" && item.profit_loss <= 0) return false;
        if (filters.profitLossFilter === "loss" && item.profit_loss >= 0) return false;
        if (filters.profitLossFilter === "neutral" && item.profit_loss !== 0) return false;
      }

      // Customizations filter
      if (filters.hasCustomizations !== "all") {
        const hasCustomizations = (item.stickers?.length || 0) > 0 || 
                                 (item.charms?.length || 0) > 0 || 
                                 (item.patches?.length || 0) > 0;
        if (filters.hasCustomizations === "yes" && !hasCustomizations) return false;
        if (filters.hasCustomizations === "no" && hasCustomizations) return false;
      }

      return true;
    });

    // Sort the filtered items
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case "label":
          aValue = a.label.toLowerCase();
          bValue = b.label.toLowerCase();
          break;
        case "category_id":
          aValue = a.category_id || "";
          bValue = b.category_id || "";
          break;
        case "quantity":
          aValue = a.quantity;
          bValue = b.quantity;
          break;
        case "purchase_price":
          aValue = a.purchase_price;
          bValue = b.purchase_price;
          break;
        case "latest_price":
          aValue = a.latest_price || 0;
          bValue = b.latest_price || 0;
          break;
        case "profit_loss":
          aValue = a.profit_loss || 0;
          bValue = b.profit_loss || 0;
          break;
        case "profit_loss_percentage":
          aValue = a.profit_loss_percentage || 0;
          bValue = b.profit_loss_percentage || 0;
          break;
        case "last_updated":
          aValue = new Date(a.last_updated || 0).getTime();
          bValue = new Date(b.last_updated || 0).getTime();
          break;
        default:
          aValue = a.label.toLowerCase();
          bValue = b.label.toLowerCase();
      }

      if (sortDirection === "asc") {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });

    return filtered;
  }, [items, filters, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      category: "all",
      minPrice: "",
      maxPrice: "",
      minProfitLoss: "",
      maxProfitLoss: "",
      profitLossFilter: "all",
      hasCustomizations: "all",
    });
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />;
    return sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  const handleDeleteItem = (item: Item) => {
    setDeletingItem(item);

    setDeleteDialogOpen(true);
  };

  const handleItemDeleted = () => {
    fetchItems(); // Refresh the items list

    window.dispatchEvent(new Event("refreshItems"));
  };

  const handleImageClick = (imageUrl: string, itemName: string) => {
    setSelectedImageUrl(imageUrl);
    setSelectedImageItemName(itemName);
    setImageDialogOpen(true);
  };

  const handleEditItem = (item: Item) => {
    if (!item) return;

    setEditingItem({
      id: item.id,
      market_hash_name: item.market_hash_name,
      label: item.label,
      description: item.description,
      category_id: item.category_id,
      appid: item.appid,
      steam_url: item.steam_url,
      image_url: item.image_url,
      purchase_price: item.purchase_price,
      purchase_price_usd: item.purchase_price_usd,
      purchase_currency: item.purchase_currency,
      quantity: item.quantity,
      stickers: item.stickers,
      charms: item.charms,
      patches: item.patches,
    });

    setEditDialogOpen(true);
  };

  useEffect(() => {
    fetchItems();
    fetchCategories();

    const handleRefresh = () => {
      fetchItems();
    };

    const handleCategoryCreated = () => {
      fetchCategories();
    };

    window.addEventListener("refreshItems", handleRefresh);
    window.addEventListener("categoryCreated", handleCategoryCreated);

    return () => {
      window.removeEventListener("refreshItems", handleRefresh);
      window.removeEventListener("categoryCreated", handleCategoryCreated);
    };
  }, [displayCurrency]);

  // Fetch initial price source from settings
  useEffect(() => {
    const fetchInitialSettings = async () => {
      try {
        const response = await fetch("/api/settings");
        if (response.ok) {
          const settings = await response.json();
          setPriceSource(settings.priceSource || "steam");
        }
      } catch (error) {
        console.error("Failed to fetch initial settings for price source:", error);
      }
    };
    fetchInitialSettings();
  }, []);

  if (isLoading) {
    return <div className="text-center py-4">Loading items...</div>;
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        No items tracked yet
      </div>
    );
  }

  if (filteredAndSortedItems.length === 0 && items.length > 0) {
    return (
      <div className="space-y-4">
        {/* Filter and Search Controls */}
        <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search items..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Filters
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Clear
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              Showing 0 of {items.length} items
            </div>
          </div>
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
              <div className="space-y-2">
                <Label htmlFor="category-filter">Category</Label>
                <Select
                  value={filters.category}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    <SelectItem value="none">No category</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center gap-2">
                          {category.color && (
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: category.color }}
                            />
                          )}
                          {category.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Other filter controls would go here - same as above */}
            </div>
          )}
        </div>
        <div className="text-center py-8 text-muted-foreground">
          <div className="text-lg font-medium mb-2">No items match your filters</div>
          <div className="text-sm">Try adjusting your search criteria or clearing the filters</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      {/* Filter and Search Controls */}
      <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <PriceSourceToggle onSourceChange={handlePriceSourceChange} />
            {(priceSource === "csgoskins.gg" || priceSource === "skinsmonkey") && (
              <Button
                variant="outline"
                size="sm"
                onClick={updateExternalPrices}
                disabled={isUpdatingPrices}
                className="h-8"
              >
                {isUpdatingPrices ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Update Prices
                  </>
                )}
              </Button>
            )}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search items..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Clear
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            Showing {filteredAndSortedItems.length} of {items.length} items
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
            <div className="space-y-2">
              <Label htmlFor="category-filter">Category</Label>
              <Select
                value={filters.category}
                onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  <SelectItem value="none">No category</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        {category.color && (
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                        )}
                        {category.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price-range">Price Range</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Min"
                  value={filters.minPrice}
                  onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value }))}
                  type="number"
                  step="0.01"
                />
                <Input
                  placeholder="Max"
                  value={filters.maxPrice}
                  onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
                  type="number"
                  step="0.01"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="profit-loss-range">Profit/Loss Range</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Min"
                  value={filters.minProfitLoss}
                  onChange={(e) => setFilters(prev => ({ ...prev, minProfitLoss: e.target.value }))}
                  type="number"
                  step="0.01"
                />
                <Input
                  placeholder="Max"
                  value={filters.maxProfitLoss}
                  onChange={(e) => setFilters(prev => ({ ...prev, maxProfitLoss: e.target.value }))}
                  type="number"
                  step="0.01"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="profit-loss-type">Profit/Loss Type</Label>
              <Select
                value={filters.profitLossFilter}
                onValueChange={(value: "all" | "profit" | "loss" | "neutral") => 
                  setFilters(prev => ({ ...prev, profitLossFilter: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="profit">Profit Only</SelectItem>
                  <SelectItem value="loss">Loss Only</SelectItem>
                  <SelectItem value="neutral">Break Even</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customizations-filter">Customizations</Label>
              <Select
                value={filters.hasCustomizations}
                onValueChange={(value: "all" | "yes" | "no") => 
                  setFilters(prev => ({ ...prev, hasCustomizations: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Items</SelectItem>
                  <SelectItem value="yes">With Customizations</SelectItem>
                  <SelectItem value="no">Without Customizations</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      <div className="border rounded-md overflow-hidden">
        <div className="max-h-[600px] overflow-auto">
          <Table className="min-w-full">
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-[8%] min-w-[80px] text-center">
                  Image
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 w-[20%] min-w-[180px]"
                  onClick={() => handleSort("label")}
                >
                  <div className="flex items-center gap-2">
                    Item
                    {getSortIcon("label")}
                  </div>
                </TableHead>

                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 w-[12%] min-w-[100px]"
                  onClick={() => handleSort("category_id")}
                >
                  <div className="flex items-center gap-2">
                    Category
                    {getSortIcon("category_id")}
                  </div>
                </TableHead>

                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 w-[8%] min-w-[80px] text-center"
                  onClick={() => handleSort("quantity")}
                >
                  <div className="flex items-center gap-2 justify-center">
                    Qty
                    {getSortIcon("quantity")}
                  </div>
                </TableHead>

                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 w-[12%] min-w-[100px] text-right"
                  onClick={() => handleSort("purchase_price")}
                >
                  <div className="flex items-center gap-2 justify-end">
                    Purchase
                    {getSortIcon("purchase_price")}
                  </div>
                </TableHead>

                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 w-[12%] min-w-[100px] text-right"
                  onClick={() => handleSort("latest_price")}
                >
                  <div className="flex items-center gap-2 justify-end">
                    Current
                    {getSortIcon("latest_price")}
                  </div>
                </TableHead>

                <TableHead className="w-[12%] min-w-[100px] text-right">Total Value</TableHead>

                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 w-[15%] min-w-[120px] text-right"
                  onClick={() => handleSort("profit_loss")}
                >
                  <div className="flex items-center gap-2 justify-end">
                    Profit/Loss
                    {getSortIcon("profit_loss")}
                  </div>
                </TableHead>

                <TableHead className="w-[4%] min-w-[80px] text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredAndSortedItems.map((item) => {
                const currencySymbol = getClientCurrencySymbol(displayCurrency);

                return (
                  <TableRow key={item.id}>
                    <TableCell className="w-[8%] min-w-[80px] text-center">
                      {item.image_url ? (
                        <div className="flex items-center justify-center">
                          <img
                            src={item.image_url}
                            alt={item.label}
                            className="w-12 h-12 object-contain rounded cursor-pointer hover:scale-110 transition-transform border bg-card"
                            onClick={() => handleImageClick(item.image_url!, item.label)}
                            onError={(e) => {
                              // Hide image if it fails to load
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      ) : (
                        <ImageLoadingSpinner size="md" />
                      )}
                    </TableCell>
                    <TableCell className="w-[20%] min-w-[180px]">
                      <div className="space-y-1">
                        <div className="font-medium truncate" title={item.label}>
                          {item.label}
                        </div>

                        <div className="text-xs text-muted-foreground truncate" title={item.market_hash_name}>
                          {item.market_hash_name}
                        </div>

                        {item.description && (
                          <div className="text-xs text-muted-foreground italic truncate" title={item.description}>
                            {item.description}
                          </div>
                        )}

                        {(item.stickers?.length !== 0 ||
                          item.charms?.length !== 0 ||
                          item.patches?.length !== 0) && (
                          <div className="text-xs text-muted-foreground">
                            {item.stickers?.length || 0} stickers, {item.charms?.length || 0} charms, {item.patches?.length || 0} patches
                          </div>
                        )}

                        {(() => {
                          // Determine which URL to use based on price source
                          const externalPrice = externalPrices[item.market_hash_name];
                          const shouldUseExternalUrl = (priceSource === "csgoskins.gg" || priceSource === "skinsmonkey") && externalPrice?.url;
                          let linkUrl = item.steam_url;
                          let linkText = "Steam Market";
                          
                          if (shouldUseExternalUrl) {
                            linkUrl = externalPrice.url;
                            linkText = priceSource === "skinsmonkey" ? "SkinsMonkey" : "CSGOSKINS.GG";
                          }
                          
                          return linkUrl && (
                            <a
                              href={linkUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" />
                              {linkText}
                            </a>
                          );
                        })()}
                      </div>
                    </TableCell>

                    <TableCell className="w-[12%] min-w-[100px]">
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
                              <span className="text-sm">{categoryInfo.name}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">{item.category_id}</span>
                          );
                        })()
                      ) : (
                        <span className="text-sm text-muted-foreground italic">No category</span>
                      )}
                    </TableCell>

                    <TableCell className="w-[8%] min-w-[80px] text-center">
                      <div className="font-medium">{item.quantity}x</div>
                    </TableCell>

                    <TableCell className="w-[12%] min-w-[100px] text-right">
                      <div className="font-medium">
                        {currencySymbol}
                        {item.purchase_price_usd.toFixed(2)}
                      </div>

                      {item.purchase_currency !== displayCurrency && (
                        <div className="text-xs text-muted-foreground">
                          Original: {getClientCurrencySymbol(item.purchase_currency)}{item.purchase_price.toFixed(2)}
                        </div>
                      )}

                      <div className="text-xs text-muted-foreground">
                        Total: {currencySymbol}{(item.purchase_price_usd * item.quantity).toFixed(2)}
                      </div>
                    </TableCell>

                    <TableCell className="w-[12%] min-w-[100px] text-right">
                      {(() => {
                        const externalPrice = externalPrices[item.market_hash_name];
                        let currentPrice = item.latest_price;
                        let lastUpdated = item.last_updated;
                        
                        if (externalPrice) {
                          if (priceSource === "csgoskins.gg" && externalPrice.current_price) {
                            currentPrice = externalPrice.current_price;
                            lastUpdated = externalPrice.last_updated;
                          } else if (priceSource === "skinsmonkey" && externalPrice.trade_value) {
                            currentPrice = externalPrice.trade_value;
                            lastUpdated = externalPrice.last_updated;
                          }
                        }

                        if (currentPrice) {
                          return (
                            <div>
                              <div className="font-medium">
                                {currencySymbol}{currentPrice.toFixed(2)}
                              </div>
                              {externalPrice && priceSource !== "steam" && (
                                <div className="text-xs text-muted-foreground">
                                  {priceSource === "skinsmonkey" ? "SkinsMonkey" : "CSGOSKINS.GG"}
                                </div>
                              )}
                              {lastUpdated && (
                                <div className="text-xs text-muted-foreground">
                                  {new Date(lastUpdated).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          );
                        } else if (priceSource === "skinsmonkey") {
                          return (
                            <div className="text-sm text-muted-foreground">
                              <div>SkinsMonkey</div>
                              <div className="text-xs">Integration coming soon</div>
                            </div>
                          );
                        } else {
                          return <span className="text-muted-foreground">No data</span>;
                        }
                      })()}
                    </TableCell>

                    <TableCell className="w-[12%] min-w-[100px] text-right">
                      {(() => {
                        const externalPrice = externalPrices[item.market_hash_name];
                        let currentPrice = item.latest_price;
                        
                        if (externalPrice) {
                          if (priceSource === "csgoskins.gg" && externalPrice.current_price) {
                            currentPrice = externalPrice.current_price;
                          } else if (priceSource === "skinsmonkey" && externalPrice.trade_value) {
                            currentPrice = externalPrice.trade_value;
                          }
                        }

                        if (currentPrice) {
                          return (
                            <div className="font-medium">
                              {currencySymbol}{(currentPrice * item.quantity).toFixed(2)}
                            </div>
                          );
                        } else {
                          return <span className="text-muted-foreground">No data</span>;
                        }
                      })()}
                    </TableCell>

                    <TableCell className="w-[15%] min-w-[120px] text-right">
                      {(() => {
                        const externalPrice = externalPrices[item.market_hash_name];
                        let currentPrice = item.latest_price;
                        
                        if (externalPrice) {
                          if (priceSource === "csgoskins.gg" && externalPrice.current_price) {
                            currentPrice = externalPrice.current_price;
                          } else if (priceSource === "skinsmonkey" && externalPrice.trade_value) {
                            currentPrice = externalPrice.trade_value;
                          }
                        }

                        if (currentPrice) {
                          const totalPurchaseValue = item.purchase_price_usd * item.quantity;
                          const totalCurrentValue = currentPrice * item.quantity;
                          const profitLoss = totalCurrentValue - totalPurchaseValue;
                          
                          // Use backend-calculated percentage for Steam prices, calculate for external prices
                          let profitLossPercentage;
                          if (priceSource === "steam" && item.profit_loss_percentage !== null && item.profit_loss_percentage !== undefined) {
                            profitLossPercentage = item.profit_loss_percentage;
                          } else {
                            profitLossPercentage = totalPurchaseValue > 0 
                              ? (profitLoss / totalPurchaseValue) * 100 
                              : 0;
                          }

                          return (
                            <div>
                              <div
                                className={`font-medium ${
                                  profitLoss >= 0
                                    ? "text-green-600"
                                    : "text-red-600"
                                }`}
                              >
                                {profitLoss >= 0 ? "+" : ""}{currencySymbol}
                                {profitLoss.toFixed(2)}
                              </div>

                              <div
                                className={`text-xs ${
                                  profitLossPercentage >= 0
                                    ? "text-green-600"
                                    : "text-red-600"
                                }`}
                              >
                                {profitLossPercentage >= 0 ? "+" : ""}
                                {profitLossPercentage.toFixed(1)}%
                              </div>
                            </div>
                          );
                        } else {
                          return <span className="text-muted-foreground">No data</span>;
                        }
                      })()}
                    </TableCell>

                    <TableCell className="w-[4%] min-w-[80px] text-center">
                      <div className="flex gap-1 justify-center">
                        <Button variant="outline" size="sm" asChild>
                          <Link
                            href={`/item/${encodeURIComponent(
                              item.market_hash_name
                            )}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditItem(item)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteItem(item)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <EditItemDialog
        item={editingItem}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onItemUpdated={handleItemDeleted}
      />

      <DeleteItemDialog
        item={deletingItem}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onItemDeleted={handleItemDeleted}
      />

      <ImageDialog
        open={imageDialogOpen}
        onOpenChange={setImageDialogOpen}
        imageUrl={selectedImageUrl}
        itemName={selectedImageItemName}
      />
    </div>
  );
}
