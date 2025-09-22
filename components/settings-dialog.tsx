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
import { Settings, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DEFAULT_PINNED_PROVIDERS } from "@/lib/trade-providers";

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
  discordWebhookEnabled: boolean;
  discordWebhookUrl: string;
  discordDevelopmentMode: boolean;
  discordPriceSpikeEnabled: boolean;
  pinnedMarketSites: string[];
  marketListingsFetchLimit: number;
  schedulerEnabled: boolean;
  schedulerRunning: boolean;
}

const defaultSettings: AppSettings = {
  timelineResolution: "1d",
  cronDelayMinutes: 1440, // 24 hours
  fetchDelayMs: 2000, // 2 seconds
  discordWebhookEnabled: false,
  discordWebhookUrl: "",
  discordDevelopmentMode: false,
  discordPriceSpikeEnabled: false,
  pinnedMarketSites: DEFAULT_PINNED_PROVIDERS,
  marketListingsFetchLimit: 5,
  schedulerEnabled: false,
  schedulerRunning: false,
};

export function SettingsDialog() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [alertMentionsInput, setAlertMentionsInput] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

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
          setAlertMentionsInput((apiSettings.discordPriceAlertMentions ?? []).join("\n"));
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
              discordPriceAlertMentions:
                parsed.discordPriceAlertMentions ?? [],
            });
            setAlertMentionsInput((parsed.discordPriceAlertMentions ?? []).join("\n"));
          } catch (error) {
            console.error("Failed to parse saved settings:", error);
          }
        }
      }
    };

    loadSettings();
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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Application Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
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
            <Label htmlFor="cron-delay">Auto-Fetch Interval (minutes)</Label>
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

          <div className="space-y-4 border-t pt-4">
            <h3 className="text-sm font-medium">Discord Notifications</h3>

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
                  Get your webhook URL from Discord Server Settings â†’
                  Integrations â†’ Webhooks
                </p>
                {!isValidWebhookUrl(settings.discordWebhookUrl) &&
                  settings.discordWebhookUrl && (
                    <p className="text-sm text-red-500">
                      Please enter a valid Discord webhook URL
                    </p>
                  )}

                <div className="flex items-center space-x-2 mt-4">
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

                <div className="flex items-center space-x-2 mt-4">
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

                <div className="space-y-2 mt-4">
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
                    Enter Discord user IDs (one per line or separated by commas) to
                    mention when price alerts trigger.
                  </p>
                </div>
              </div>
            )}
          </div>

          <Button onClick={saveSettings} className="w-full">
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
              discordPriceAlertMentions:
                parsed.discordPriceAlertMentions ?? [],
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







