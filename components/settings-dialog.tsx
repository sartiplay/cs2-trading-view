"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Settings, 
  Save, 
  Clock, 
  Bell, 
  Tag, 
  Plus, 
  Edit, 
  Trash2,
  Palette,
  Download,
  Check,
  X,
  RefreshCw,
  Database
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DEFAULT_PINNED_PROVIDERS } from "@/lib/trade-providers";
import { SUPPORTED_CURRENCIES } from "@/lib/currency-utils";

export interface AppSettings {
  timelineResolution:
    | "5s"
    | "30s"
    | "1m"
    | "5min"
    | "30min"
    | "1h"
    | "4h"
    | "1d";
  cronDelayMinutes: number;
  fetchDelayMs: number;
  displayCurrency: string;
  discordWebhookEnabled: boolean;
  discordWebhookUrl: string;
  discordDevelopmentMode: boolean;
  discordPriceSpikeEnabled: boolean;
  discordPriceAlertMentions: string[];
  pinnedMarketSites: string[];
  marketListingsFetchLimit: number;
  schedulerEnabled: boolean;
  schedulerRunning: boolean;
  imageLoadingDelayMs: number;
  categorySettings: {
    showCategoryFilter: boolean;
    defaultCategoryId: string;
    allowCustomCategories: boolean;
    maxCategories: number;
  };
  workerStatusVisible: boolean;
  priceSource: "steam" | "csgoskins.gg" | "skinsmonkey";
}

const defaultSettings: AppSettings = {
  timelineResolution: "1d",
  cronDelayMinutes: 1440, // 24 hours
  fetchDelayMs: 2000, // 2 seconds
  discordWebhookEnabled: false,
  discordWebhookUrl: "",
  discordDevelopmentMode: false,
  discordPriceSpikeEnabled: false,
  discordPriceAlertMentions: [],
  pinnedMarketSites: DEFAULT_PINNED_PROVIDERS,
  marketListingsFetchLimit: 5,
  schedulerEnabled: false,
  schedulerRunning: false,
  displayCurrency: "USD",
  imageLoadingDelayMs: 3000, // 3 seconds delay between image requests
  categorySettings: {
    showCategoryFilter: true,
    defaultCategoryId: "default-trading",
    allowCustomCategories: true,
    maxCategories: 20,
  },
  workerStatusVisible: true,
  priceSource: "steam",
};

interface CategoryConfig {
  id: string;
  name: string;
  color?: string;
  includeInInventoryValue: boolean;
  includeInProfitLoss: boolean;
  created_at: string;
  updated_at: string;
}

interface SteamItem {
  assetid: string;
  classid: string;
  instanceid: string;
  amount: string;
  market_hash_name: string;
  market_name: string;
  name: string;
  icon_url: string;
  icon_url_large?: string;
  type: string;
  tradable: number;
  marketable: number;
  commodity: number;
  market_tradable_restriction?: number;
  market_marketable_restriction?: number;
  fraudwarnings?: string[];
  descriptions?: Array<{
    type: string;
    value: string;
    color?: string;
  }>;
  actions?: Array<{
    link: string;
    name: string;
  }>;
  market_actions?: Array<{
    link: string;
    name: string;
  }>;
  tags?: Array<{
    category: string;
    internal_name: string;
    localized_category_name: string;
    localized_tag_name: string;
    color?: string;
  }>;
}

export function SettingsDialog() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [alertMentionsInput, setAlertMentionsInput] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [categories, setCategories] = useState<CategoryConfig[]>([]);
  const [editingCategory, setEditingCategory] = useState<CategoryConfig | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("#3B82F6");
  const [newCategoryIncludeInventory, setNewCategoryIncludeInventory] = useState(true);
  const [newCategoryIncludeProfitLoss, setNewCategoryIncludeProfitLoss] = useState(true);
  
  // Import state
  const [steamInventoryUrl, setSteamInventoryUrl] = useState("");
  const [steamItems, setSteamItems] = useState<SteamItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [importLoading, setImportLoading] = useState(false);
  const [importStep, setImportStep] = useState<"url" | "select" | "importing">("url");
  const [isReloadingImages, setIsReloadingImages] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isLoadingBackup, setIsLoadingBackup] = useState(false);
  const [showLoadBackupConfirm, setShowLoadBackupConfirm] = useState(false);
  
  const { toast } = useToast();

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

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch("/api/settings");
        if (response.ok) {
          const apiSettings = await response.json();
          setSettings({
            ...defaultSettings,
            ...apiSettings,
            discordPriceAlertMentions:
              apiSettings.discordPriceAlertMentions ?? [],
          });
          setAlertMentionsInput(
            (apiSettings.discordPriceAlertMentions ?? []).join("\n")
          );
        }
      } catch (error) {
        console.error("Failed to load settings from API:", error);
        const res = await fetch("/api/settings");
        const savedSettings = await res.json();
        if (savedSettings) {
          try {
            const parsed = savedSettings;
            setSettings({
              ...defaultSettings,
              ...parsed,
              discordPriceAlertMentions: parsed.discordPriceAlertMentions ?? [],
            });
            setAlertMentionsInput(
              (parsed.discordPriceAlertMentions ?? []).join("\n")
            );
          } catch (error) {
            console.error("Failed to parse saved settings:", error);
          }
        }
      }
    };

    loadSettings();
    fetchCategories();
  }, []);

  const saveSettings = async () => {
    if (
      settings.discordWebhookEnabled &&
      !isValidWebhookUrl(settings.discordWebhookUrl)
    ) {
      toast({
        title: "Invalid Webhook URL",
        description: "Please enter a valid Discord webhook URL.",
        variant: "destructive",
      });
      return;
    }

    if (settings.discordWebhookEnabled && !settings.discordWebhookUrl.trim()) {
      toast({
        title: "Webhook URL Required",
        description:
          "Please enter a Discord webhook URL when notifications are enabled.",
        variant: "destructive",
      });
      return;
    }

    try {
      const normalizedMentions = parseAlertMentions(alertMentionsInput);
      const payload = {
        ...settings,
        discordPriceAlertMentions: normalizedMentions,
      };
      setSettings((prev) => ({
        ...prev,
        discordPriceAlertMentions: normalizedMentions,
      }));
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to save settings to API");
      }

      toast({
        title: "Settings saved",
        description: "Your preferences have been updated successfully.",
      });

      setIsOpen(false);

      window.location.reload();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getTimelineLabel = (resolution: string) => {
    switch (resolution) {
      case "5s":
        return "5 Seconds";
      case "30s":
        return "30 Seconds";
      case "1m":
        return "1 Minute";
      case "5min":
        return "5 Minutes";
      case "30min":
        return "30 Minutes";
      case "1h":
        return "1 Hour";
      case "4h":
        return "4 Hours";
      case "1d":
        return "1 Day";
      default:
        return resolution;
    }
  };

  const getCronLabel = (minutes: number) => {
    if (minutes < 60) return `${minutes} minutes`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)} hours`;
    return `${Math.floor(minutes / 1440)} days`;
  };

  const isValidWebhookUrl = (url: string): boolean => {
    if (!url) return true;
    try {
      const urlObj = new URL(url);
      return (
        urlObj.hostname === "discord.com" ||
        urlObj.hostname === "discordapp.com"
      );
    } catch {
      return false;
    }
  };

  const parseAlertMentions = (value: string): string[] => {
    return value
      .split(/[\n,]/)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  };

  const handleAlertMentionsChange = (value: string) => {
    setAlertMentionsInput(value);
    const normalized = parseAlertMentions(value);
    setSettings((prev) => ({
      ...prev,
      discordPriceAlertMentions: normalized,
    }));
  };

  const createCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({
        title: "Error",
        description: "Category name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCategoryName.trim(),
          color: newCategoryColor,
          includeInInventoryValue: newCategoryIncludeInventory,
          includeInProfitLoss: newCategoryIncludeProfitLoss,
        }),
      });

      if (response.ok) {
        const newCategory = await response.json();
        setCategories((prev) => [...prev, newCategory]);
        setNewCategoryName("");
        setNewCategoryColor("#3B82F6");
        setNewCategoryIncludeInventory(true);
        setNewCategoryIncludeProfitLoss(true);
        toast({
          title: "Success",
          description: `Category "${newCategory.name}" created successfully`,
        });
        // Dispatch event to notify other components about the new category
        window.dispatchEvent(new CustomEvent('categoryCreated', { detail: newCategory }));
      } else {
        throw new Error("Failed to create category");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create category",
        variant: "destructive",
      });
    }
  };

  const updateCategory = async (categoryId: string, updates: Partial<CategoryConfig>) => {
    try {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const updatedCategory = await response.json();
        setCategories((prev) =>
          prev.map((cat) => (cat.id === categoryId ? updatedCategory : cat))
        );
        setEditingCategory(null);
        toast({
          title: "Success",
          description: `Category "${updatedCategory.name}" updated successfully`,
        });
      } else {
        throw new Error("Failed to update category");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update category",
        variant: "destructive",
      });
    }
  };

  const deleteCategory = async (categoryId: string) => {
    try {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setCategories((prev) => prev.filter((cat) => cat.id !== categoryId));
        toast({
          title: "Success",
          description: "Category deleted successfully",
        });
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete category");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete category",
        variant: "destructive",
      });
    }
  };

  const startEditingCategory = (category: CategoryConfig) => {
    setEditingCategory({ ...category });
  };

  const cancelEditingCategory = () => {
    setEditingCategory(null);
  };

  const saveEditingCategory = () => {
    if (editingCategory && editingCategory.name.trim()) {
      updateCategory(editingCategory.id, {
        name: editingCategory.name.trim(),
        color: editingCategory.color,
        includeInInventoryValue: editingCategory.includeInInventoryValue,
        includeInProfitLoss: editingCategory.includeInProfitLoss,
      });
    }
  };

  // Import functions
  const parseSteamIdFromUrl = (url: string): string | null => {
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname.includes('steamcommunity.com')) {
        const pathParts = urlObj.pathname.split('/').filter(part => part.length > 0);
        
        // Handle different Steam URL formats:
        // /id/username/inventory/730/ (old format)
        // /profiles/76561198123456789/inventory/730/ (old format)
        // /id/username/inventory#730 (new format with hash)
        // /profiles/76561198123456789/inventory#730 (new format with hash)
        // /inventory/730/ (for current user)
        
        if (pathParts.includes('inventory')) {
          const inventoryIndex = pathParts.findIndex(part => part === 'inventory');
          
          // If inventory is at the beginning, this is a current user URL
          if (inventoryIndex === 0) {
            return 'current_user';
          }
          
          // Look for Steam ID before inventory
          if (inventoryIndex > 0) {
            const potentialSteamId = pathParts[inventoryIndex - 1];
            
            // Check if it's a numeric Steam ID (64-bit)
            if (/^\d{17}$/.test(potentialSteamId)) {
              return potentialSteamId;
            }
            
            // Check if it's a custom URL (id/username)
            if (pathParts[inventoryIndex - 2] === 'id' && potentialSteamId) {
              // For custom URLs, we need to resolve them to Steam ID
              // This will be handled by the API
              return `custom_${potentialSteamId}`;
            }
            
            // Check if it's a profile URL (profiles/steamid)
            if (pathParts[inventoryIndex - 2] === 'profiles' && potentialSteamId) {
              return potentialSteamId;
            }
          }
        }
        
        // Handle the new hash-based format: /id/username/inventory#730
        // Check if URL ends with inventory and has a hash fragment
        if (pathParts[pathParts.length - 1] === 'inventory' && urlObj.hash) {
          if (pathParts.length >= 3 && pathParts[pathParts.length - 3] === 'id') {
            const customId = pathParts[pathParts.length - 2];
            return `custom_${customId}`;
          } else if (pathParts.length >= 3 && pathParts[pathParts.length - 3] === 'profiles') {
            const steamId = pathParts[pathParts.length - 2];
            if (/^\d{17}$/.test(steamId)) {
              return steamId;
            }
          }
        }
      }
      return null;
    } catch {
      return null;
    }
  };

  const fetchSteamInventory = async () => {
    if (!steamInventoryUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter a Steam inventory URL",
        variant: "destructive",
      });
      return;
    }

    setImportLoading(true);
    try {
      const steamId = parseSteamIdFromUrl(steamInventoryUrl);
      console.log('Parsed Steam ID:', steamId);
      console.log('Original URL:', steamInventoryUrl);
      
      if (!steamId) {
        throw new Error("Invalid Steam inventory URL");
      }

      const response = await fetch(`/api/steam-inventory?steamid=${encodeURIComponent(steamId)}`);
      if (!response.ok) {
        throw new Error("Failed to fetch Steam inventory");
      }

      const data = await response.json();
      if (data.success && data.items) {
        // Filter for CS2 items only
        const cs2Items = data.items.filter((item: SteamItem) => 
          item.market_hash_name && 
          (item.market_hash_name.includes('AK-47') || 
           item.market_hash_name.includes('M4A4') ||
           item.market_hash_name.includes('M4A1') ||
           item.market_hash_name.includes('AWP') ||
           item.market_hash_name.includes('Glock') ||
           item.market_hash_name.includes('USP') ||
           item.market_hash_name.includes('Desert Eagle') ||
           item.market_hash_name.includes('P250') ||
           item.market_hash_name.includes('Tec-9') ||
           item.market_hash_name.includes('Five-SeveN') ||
           item.market_hash_name.includes('CZ75') ||
           item.market_hash_name.includes('Dual Berettas') ||
           item.market_hash_name.includes('P2000') ||
           item.market_hash_name.includes('UMP') ||
           item.market_hash_name.includes('MAC-10') ||
           item.market_hash_name.includes('MP9') ||
           item.market_hash_name.includes('MP7') ||
           item.market_hash_name.includes('MP5') ||
           item.market_hash_name.includes('Galil') ||
           item.market_hash_name.includes('FAMAS') ||
           item.market_hash_name.includes('SG 553') ||
           item.market_hash_name.includes('AUG') ||
           item.market_hash_name.includes('SSG 08') ||
           item.market_hash_name.includes('SCAR-20') ||
           item.market_hash_name.includes('G3SG1') ||
           item.market_hash_name.includes('XM1014') ||
           item.market_hash_name.includes('Nova') ||
           item.market_hash_name.includes('Sawed-Off') ||
           item.market_hash_name.includes('MAG-7') ||
           item.market_hash_name.includes('M249') ||
           item.market_hash_name.includes('Negev') ||
           item.market_hash_name.includes('Knife') ||
           item.market_hash_name.includes('Gloves') ||
           item.market_hash_name.includes('Sticker') ||
           item.market_hash_name.includes('Case') ||
           item.market_hash_name.includes('Key') ||
           item.market_hash_name.includes('Graffiti') ||
           item.market_hash_name.includes('Music Kit') ||
           item.market_hash_name.includes('Pin') ||
           item.market_hash_name.includes('Patch'))
        );
        
        setSteamItems(cs2Items);
        setSelectedItems(new Set(cs2Items.map((item: SteamItem) => item.classid)));
        setImportStep("select");
        toast({
          title: "Success",
          description: `Found ${cs2Items.length} CS2 items in your inventory`,
        });
      } else {
        throw new Error(data.error || "Failed to parse inventory");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch Steam inventory",
        variant: "destructive",
      });
    } finally {
      setImportLoading(false);
    }
  };

  const toggleItemSelection = (classid: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(classid)) {
      newSelected.delete(classid);
    } else {
      newSelected.add(classid);
    }
    setSelectedItems(newSelected);
  };

  const selectAllItems = () => {
    setSelectedItems(new Set(steamItems.map(item => item.classid)));
  };

  const deselectAllItems = () => {
    setSelectedItems(new Set());
  };

  const importSelectedItems = async () => {
    if (selectedItems.size === 0) {
      toast({
        title: "Error",
        description: "Please select at least one item to import",
        variant: "destructive",
      });
      return;
    }

    setImportLoading(true);
    setImportStep("importing");
    
    try {
      const itemsToImport = steamItems.filter(item => selectedItems.has(item.classid));
      
      const response = await fetch("/api/import-steam-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: itemsToImport,
          defaultCategory: settings.categorySettings.defaultCategoryId,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Success",
          description: `Successfully imported ${result.importedCount} items`,
        });
        
        // Reset import state
        setImportStep("url");
        setSteamInventoryUrl("");
        setSteamItems([]);
        setSelectedItems(new Set());
      } else {
        throw new Error("Failed to import items");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to import items",
        variant: "destructive",
      });
    } finally {
      setImportLoading(false);
    }
  };

  const resetImport = () => {
    setImportStep("url");
    setSteamInventoryUrl("");
    setSteamItems([]);
    setSelectedItems(new Set());
  };

  const reloadAllImages = async () => {
    setIsReloadingImages(true);
    try {
      const response = await fetch("/api/items/reload-images", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageLoadingDelayMs: settings.imageLoadingDelayMs,
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Image Reload Complete",
          description: `Successfully loaded ${result.success} images. ${result.failed > 0 ? `${result.failed} failed.` : ''}`,
        });
      } else {
        throw new Error("Failed to reload images");
      }
    } catch (error) {
      console.error("Error reloading images:", error);
      toast({
        title: "Error",
        description: "Failed to reload images. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsReloadingImages(false);
    }
  };

  const backupData = async () => {
    setIsBackingUp(true);
    try {
      const response = await fetch("/api/backup-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Backup Complete",
          description: `Data backup created successfully as ${result.backupFile}`,
        });
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to create backup");
      }
    } catch (error) {
      console.error("Error creating backup:", error);
      toast({
        title: "Error",
        description: `Failed to create backup: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  const loadBackupData = async () => {
    setIsLoadingBackup(true);
    try {
      const response = await fetch("/api/load-backup-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Backup Loaded",
          description: `Data restored successfully from ${result.backupFile}. ${result.hadExistingData ? 'Previous data was replaced.' : ''}`,
        });
        setShowLoadBackupConfirm(false);
        // Optionally reload the page to reflect changes
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to load backup");
      }
    } catch (error) {
      console.error("Error loading backup:", error);
      toast({
        title: "Error",
        description: `Failed to load backup: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
      setShowLoadBackupConfirm(false);
    } finally {
      setIsLoadingBackup(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Application Settings</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="discord" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Discord
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Categories
            </TabsTrigger>
            <TabsTrigger value="import" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Import
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Advanced
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6 mt-6 max-h-[60vh] overflow-y-auto">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">General Settings</h3>
              
              <div className="space-y-2">
                <Label htmlFor="timeline-resolution">
                  Chart Timeline Resolution
                </Label>
                <Select
                  value={settings.timelineResolution}
                  onValueChange={(value: AppSettings["timelineResolution"]) =>
                    setSettings({ ...settings, timelineResolution: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5s">5 Seconds</SelectItem>
                    <SelectItem value="30s">30 Seconds</SelectItem>
                    <SelectItem value="1m">1 Minute</SelectItem>
                    <SelectItem value="5min">5 Minutes</SelectItem>
                    <SelectItem value="30min">30 Minutes</SelectItem>
                    <SelectItem value="1h">1 Hour</SelectItem>
                    <SelectItem value="4h">4 Hours</SelectItem>
                    <SelectItem value="1d">1 Day</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Current: {getTimelineLabel(settings.timelineResolution)}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cron-delay">Auto-Fetch Interval</Label>
                <Select
                  value={settings.cronDelayMinutes.toString()}
                  onValueChange={(value) =>
                    setSettings({
                      ...settings,
                      cronDelayMinutes: Number.parseInt(value),
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 minutes</SelectItem>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="240">4 hours</SelectItem>
                    <SelectItem value="720">12 hours</SelectItem>
                    <SelectItem value="1440">24 hours</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Current: {getCronLabel(settings.cronDelayMinutes)}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fetch-delay">Request Delay (milliseconds)</Label>
                <Input
                  id="fetch-delay"
                  type="number"
                  min="500"
                  step="500"
                  value={settings.fetchDelayMs}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      fetchDelayMs: Number.parseInt(e.target.value) || 2000,
                    })
                  }
                />
                <p className="text-sm text-muted-foreground">
                  Delay between Steam API requests (minimum 500ms, no maximum limit)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="display-currency">Display Currency</Label>
                <Select
                  value={settings.displayCurrency}
                  onValueChange={(value) =>
                    setSettings({ ...settings, displayCurrency: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_CURRENCIES.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.code} - {currency.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="price-source">Price Source</Label>
                <Select
                  value={settings.priceSource}
                  onValueChange={(value: "steam" | "csgoskins.gg" | "skinsmonkey") =>
                    setSettings({ ...settings, priceSource: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="steam">Steam Market</SelectItem>
                    <SelectItem value="csgoskins.gg">CSGOSKINS.GG</SelectItem>
                    <SelectItem value="skinsmonkey">SkinsMonkey</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Choose where to fetch current prices from. Steam Market prices are tracked with the scheduler, while CSGOSKINS.GG and SkinsMonkey prices are real-time only.
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="discord" className="space-y-6 mt-6 max-h-[60vh] overflow-y-auto">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Discord Notifications</h3>

              <div className="flex items-center space-x-2">
                <Switch
                  id="discord-enabled"
                  checked={settings.discordWebhookEnabled}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, discordWebhookEnabled: checked })
                  }
                />
                <Label htmlFor="discord-enabled">
                  Enable Discord notifications
                </Label>
              </div>

              {settings.discordWebhookEnabled && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="webhook-url">Discord Webhook URL</Label>
                    <Input
                      id="webhook-url"
                      type="url"
                      placeholder="https://discord.com/api/webhooks/..."
                      value={settings.discordWebhookUrl}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          discordWebhookUrl: e.target.value,
                        })
                      }
                      className={
                        !isValidWebhookUrl(settings.discordWebhookUrl)
                          ? "border-red-500"
                          : ""
                      }
                    />
                    <p className="text-sm text-muted-foreground">
                      Get your webhook URL from Discord Server Settings →
                      Integrations → Webhooks
                    </p>
                    {!isValidWebhookUrl(settings.discordWebhookUrl) &&
                      settings.discordWebhookUrl && (
                        <p className="text-sm text-red-500">
                          Please enter a valid Discord webhook URL
                        </p>
                      )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="discord-price-spikes"
                      checked={settings.discordPriceSpikeEnabled}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          discordPriceSpikeEnabled: checked,
                        })
                      }
                    />
                    <Label htmlFor="discord-price-spikes">
                      Price spike notifications
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Alert Discord when an item's market price surges or drops
                    sharply in minutes.
                  </p>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="discord-dev-mode"
                      checked={settings.discordDevelopmentMode}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          discordDevelopmentMode: checked,
                        })
                      }
                    />
                    <Label htmlFor="discord-dev-mode">Development mode</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Send all items in webhook regardless of price changes (for
                    testing)
                  </p>

                  <div className="space-y-2">
                    <Label htmlFor="discord-alert-mentions">
                      Price alert mentions
                    </Label>
                    <Textarea
                      id="discord-alert-mentions"
                      rows={3}
                      placeholder="123456789012345678\n987654321098765432"
                      value={alertMentionsInput}
                      disabled={!settings.discordWebhookEnabled}
                      onChange={(event) =>
                        handleAlertMentionsChange(event.target.value)
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter Discord user IDs (one per line or separated by commas)
                      to mention when price alerts trigger.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="categories" className="space-y-6 mt-6 max-h-[60vh] overflow-y-auto">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Category Management</h3>
              
              {/* Create New Category */}
              <div className="space-y-4 p-4 border rounded-lg">
                <h4 className="font-medium">Create New Category</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-category-name">Category Name</Label>
                    <Input
                      id="new-category-name"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Enter category name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-category-color">Color</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="new-category-color"
                        type="color"
                        value={newCategoryColor}
                        onChange={(e) => setNewCategoryColor(e.target.value)}
                        className="w-16 h-10"
                      />
                      <Input
                        value={newCategoryColor}
                        onChange={(e) => setNewCategoryColor(e.target.value)}
                        placeholder="#3B82F6"
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="new-category-inventory"
                      checked={newCategoryIncludeInventory}
                      onCheckedChange={setNewCategoryIncludeInventory}
                    />
                    <Label htmlFor="new-category-inventory">
                      Include in Inventory Value (Default: Yes)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="new-category-profit"
                      checked={newCategoryIncludeProfitLoss}
                      onCheckedChange={setNewCategoryIncludeProfitLoss}
                    />
                    <Label htmlFor="new-category-profit">
                      Include in Profit/Loss Calculations
                    </Label>
                  </div>
                </div>
                
                <Button onClick={createCategory} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Category
                </Button>
              </div>

              {/* Existing Categories */}
              <div className="space-y-4">
                <h4 className="font-medium">Existing Categories</h4>
                <div className="space-y-3">
                  {categories.map((category) => (
                    <div key={category.id} className="p-4 border rounded-lg">
                      {editingCategory?.id === category.id ? (
                        // Edit Mode
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <Input
                              value={editingCategory.name}
                              onChange={(e) =>
                                setEditingCategory({
                                  ...editingCategory,
                                  name: e.target.value,
                                })
                              }
                              className="flex-1"
                            />
                            <Input
                              type="color"
                              value={editingCategory.color || "#3B82F6"}
                              onChange={(e) =>
                                setEditingCategory({
                                  ...editingCategory,
                                  color: e.target.value,
                                })
                              }
                              className="w-16 h-10"
                            />
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={editingCategory.includeInInventoryValue}
                                onCheckedChange={(checked) =>
                                  setEditingCategory({
                                    ...editingCategory,
                                    includeInInventoryValue: checked,
                                  })
                                }
                              />
                              <Label className="text-sm">Include in Inventory Value</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={editingCategory.includeInProfitLoss}
                                onCheckedChange={(checked) =>
                                  setEditingCategory({
                                    ...editingCategory,
                                    includeInProfitLoss: checked,
                                  })
                                }
                              />
                              <Label className="text-sm">Include in Profit/Loss</Label>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={saveEditingCategory}
                              disabled={!editingCategory.name.trim()}
                            >
                              <Save className="h-4 w-4 mr-2" />
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={cancelEditingCategory}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        // View Mode
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: category.color || "#3B82F6" }}
                            />
                            <div>
                              <div className="font-medium">{category.name}</div>
                              <div className="flex gap-2 text-sm text-muted-foreground">
                                {category.includeInInventoryValue && (
                                  <Badge variant="secondary" className="text-xs">
                                    Inventory Value
                                  </Badge>
                                )}
                                {category.includeInProfitLoss && (
                                  <Badge variant="secondary" className="text-xs">
                                    Profit/Loss
                                  </Badge>
                                )}
                                {!category.includeInInventoryValue && !category.includeInProfitLoss && (
                                  <Badge variant="outline" className="text-xs">
                                    Excluded from calculations
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEditingCategory(category)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteCategory(category.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="import" className="space-y-6 mt-6 max-h-[60vh] overflow-y-auto">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Steam Inventory Import</h3>
              
              {importStep === "url" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="steam-inventory-url">Steam Inventory URL</Label>
                    <Input
                      id="steam-inventory-url"
                      type="url"
                      placeholder="https://steamcommunity.com/id/yourusername/inventory#730"
                      value={steamInventoryUrl}
                      onChange={(e) => setSteamInventoryUrl(e.target.value)}
                    />
                    <p className="text-sm text-muted-foreground">
                      Enter your public Steam inventory URL. Make sure your inventory is set to public.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      💡 <strong>How to get the correct URL:</strong> Go to your Steam profile → Inventory → Select "Counter-Strike 2" → Copy the URL from your browser address bar
                    </p>
                  </div>
                  
                  <Button 
                    onClick={fetchSteamInventory} 
                    disabled={importLoading}
                    className="w-full"
                  >
                    {importLoading ? "Fetching Inventory..." : "Fetch Steam Inventory"}
                  </Button>
                </div>
              )}

              {importStep === "select" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Select Items to Import</h4>
                      <p className="text-sm text-muted-foreground">
                        Found {steamItems.length} CS2 items. Select which ones you want to import.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={selectAllItems}>
                        <Check className="h-4 w-4 mr-2" />
                        Select All
                      </Button>
                      <Button variant="outline" size="sm" onClick={deselectAllItems}>
                        <X className="h-4 w-4 mr-2" />
                        Deselect All
                      </Button>
                    </div>
                  </div>

                  <div className="max-h-96 overflow-y-auto border rounded-lg">
                    <div className="grid grid-cols-1 gap-2 p-4">
                      {steamItems.map((item) => (
                        <div
                          key={item.classid}
                          className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedItems.has(item.classid)
                              ? "bg-primary/10 border-primary"
                              : "hover:bg-muted/50"
                          }`}
                          onClick={() => toggleItemSelection(item.classid)}
                        >
                          <div className="flex items-center justify-center w-6 h-6 border rounded">
                            {selectedItems.has(item.classid) && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          <img
                            src={`https://steamcommunity-a.akamaihd.net/economy/image/${item.icon_url}`}
                            alt={item.name}
                            className="w-12 h-12 object-contain"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{item.name}</div>
                            <div className="text-sm text-muted-foreground truncate">
                              {item.market_hash_name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Quantity: {item.amount}
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {item.tradable ? "Tradable" : "Not Tradable"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={importSelectedItems} disabled={selectedItems.size === 0}>
                      Import {selectedItems.size} Selected Items
                    </Button>
                    <Button variant="outline" onClick={resetImport}>
                      Back
                    </Button>
                  </div>
                </div>
              )}

              {importStep === "importing" && (
                <div className="text-center py-8">
                  <div className="text-lg font-medium mb-2">Importing Items...</div>
                  <div className="text-sm text-muted-foreground">
                    Please wait while we import your selected items.
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-6 mt-6 max-h-[60vh] overflow-y-auto">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Advanced Settings</h3>
              
              <div className="space-y-2">
                <Label htmlFor="market-listings-limit">Market Listings Fetch Limit</Label>
                <Input
                  id="market-listings-limit"
                  type="number"
                  min="1"
                  max="20"
                  value={settings.marketListingsFetchLimit}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      marketListingsFetchLimit: Number.parseInt(e.target.value) || 5,
                    })
                  }
                />
                <p className="text-sm text-muted-foreground">
                  Number of market listings to fetch per item (1-20)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pinned-providers">Pinned Market Providers</Label>
                <Textarea
                  id="pinned-providers"
                  rows={3}
                  value={settings.pinnedMarketSites.join("\n")}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      pinnedMarketSites: e.target.value.split("\n").filter(Boolean),
                    })
                  }
                  placeholder="CS.MONEY\nSkinsMonkey\nCSFloat"
                />
                <p className="text-sm text-muted-foreground">
                  One provider per line
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="scheduler-enabled"
                  checked={settings.schedulerEnabled}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, schedulerEnabled: checked })
                  }
                />
                <Label htmlFor="scheduler-enabled">
                  Enable Automatic Price Updates
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Automatically fetch price updates based on the interval set in General settings
              </p>

              <div className="space-y-2">
                <Label htmlFor="image-loading-delay">Image Loading Delay (milliseconds)</Label>
                <Input
                  id="image-loading-delay"
                  type="number"
                  min="1000"
                  max="10000"
                  step="500"
                  value={settings.imageLoadingDelayMs}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      imageLoadingDelayMs: Number.parseInt(e.target.value) || 3000,
                    })
                  }
                />
                <p className="text-sm text-muted-foreground">
                  Delay between image requests to avoid rate limiting (1000-10000ms). Recommended: 3000ms (3 seconds)
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="worker-status-visible"
                  checked={settings.workerStatusVisible}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, workerStatusVisible: checked })
                  }
                />
                <Label htmlFor="worker-status-visible">Show Worker Status</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Display the worker status panel to monitor background operations like price captures and image loading
              </p>

              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-medium">Item Images</h4>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    onClick={reloadAllImages}
                    disabled={isReloadingImages}
                    className="w-full"
                  >
                    {isReloadingImages ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Reloading Images...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Reload All Item Images
                      </>
                    )}
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Load images for all items that don't have them yet. This may take a while.
                  </p>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-medium">Data Management</h4>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    onClick={backupData}
                    disabled={isBackingUp}
                    className="w-full"
                  >
                    {isBackingUp ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Creating Backup...
                      </>
                    ) : (
                      <>
                        <Database className="h-4 w-4 mr-2" />
                        Backup Data
                      </>
                    )}
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Create a backup copy of your data.json file as backup.data.json. This will replace any existing backup.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowLoadBackupConfirm(true)}
                    disabled={isLoadingBackup}
                    className="w-full"
                  >
                    {isLoadingBackup ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Loading Backup...
                      </>
                    ) : (
                      <>
                        <Database className="h-4 w-4 mr-2" />
                        Load Backup Data
                      </>
                    )}
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Replace current data.json with backup.data.json. This action cannot be undone and will replace all current data.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={saveSettings}>
            <Save className="h-4 w-4 mr-2" />
            Save Settings
          </Button>
        </div>
      </DialogContent>

      {/* 2-Step Verification Dialog for Load Backup */}
      <AlertDialog open={showLoadBackupConfirm} onOpenChange={setShowLoadBackupConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Confirm Data Replacement</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                <strong>This action will permanently replace all your current data!</strong>
              </p>
              <p>
                You are about to replace your current <code>data.json</code> file with the contents of <code>backup.data.json</code>.
              </p>
              <p className="text-red-600 dark:text-red-400 font-medium">
                ⚠️ This action cannot be undone and will permanently delete all your current items, categories, and settings.
              </p>
              <p>
                Are you absolutely sure you want to proceed?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoadingBackup}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={loadBackupData}
              disabled={isLoadingBackup}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isLoadingBackup ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                "Yes, Replace All Data"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

export function useSettings(): AppSettings {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch("/api/settings");
        if (response.ok) {
          const apiSettings = await response.json();
          setSettings({
            ...defaultSettings,
            ...apiSettings,
            discordPriceAlertMentions:
              apiSettings.discordPriceAlertMentions ?? [],
          });
        }
      } catch (error) {
        console.error("Failed to load settings from API:", error);
        const savedSettings = localStorage.getItem("cs2-tracker-settings");
        if (savedSettings) {
          try {
            const parsed = JSON.parse(savedSettings);
            setSettings({
              ...defaultSettings,
              ...parsed,
              discordPriceAlertMentions: parsed.discordPriceAlertMentions ?? [],
            });
          } catch (error) {
            console.error("Failed to parse saved settings:", error);
          }
        }
      }
    };

    loadSettings();
  }, []);

  return settings;
}
