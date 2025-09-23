"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  Palette
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DEFAULT_PINNED_PROVIDERS } from "@/lib/trade-providers";

const AVAILABLE_CURRENCIES = [
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "CHF", name: "Swiss Franc" },
  { code: "CNY", name: "Chinese Yuan" },
  { code: "SEK", name: "Swedish Krona" },
  { code: "NOK", name: "Norwegian Krone" },
  { code: "DKK", name: "Danish Krone" },
  { code: "PLN", name: "Polish Zloty" },
  { code: "CZK", name: "Czech Koruna" },
  { code: "HUF", name: "Hungarian Forint" },
  { code: "RUB", name: "Russian Ruble" },
  { code: "BRL", name: "Brazilian Real" },
  { code: "MXN", name: "Mexican Peso" },
  { code: "INR", name: "Indian Rupee" },
  { code: "KRW", name: "South Korean Won" },
  { code: "SGD", name: "Singapore Dollar" },
];

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
  categorySettings: {
    showCategoryFilter: boolean;
    defaultCategoryId: string;
    allowCustomCategories: boolean;
    maxCategories: number;
  };
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
  categorySettings: {
    showCategoryFilter: true,
    defaultCategoryId: "default-trading",
    allowCustomCategories: true,
    maxCategories: 20,
  },
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
          <TabsList className="grid w-full grid-cols-4">
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
                  max="10000"
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
                  Delay between Steam API requests (500-10000ms)
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
                    {AVAILABLE_CURRENCIES.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.code} - {currency.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
