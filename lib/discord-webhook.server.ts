import type { AppSettings } from "@/components/settings-dialog";
import { getSettings } from "@/lib/settings.server";

interface DiscordEmbed {
  author?: {
    name: string;
    url?: string;
  };
  title: string;
  url?: string;
  description?: string;
  color: number;
  timestamp: string;
  fields: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  image?: {
    url: string;
  };
  thumbnail?: {
    url: string;
  };
  footer?: {
    text: string;
    icon_url?: string;
  };
}

interface DiscordWebhookPayload {
  embeds: DiscordEmbed[];
}

interface PriceChangeData {
  market_hash_name: string;
  display_name: string;
  current_price: number;
  previous_price?: number;
  change_amount?: number;
  change_percentage?: number;
}

export async function sendDiscordNotification(
  webhookUrl: string,
  captureData: {
    timestamp: string;
    totalValue: number;
    previousTotalValue?: number;
    priceChanges: PriceChangeData[];
  },
  developmentMode = false
) {
  if (!webhookUrl) return;

  try {
    const totalChange = captureData.previousTotalValue
      ? captureData.totalValue - captureData.previousTotalValue
      : 0;
    const changeColor = totalChange >= 0 ? 0x00ff00 : 0xff0000; // Green for positive, red for negative

    const embeds: DiscordEmbed[] = [];

    // Create base embed with summary information
    const baseEmbed: DiscordEmbed = {
      author: {
        name: "CS2 Item Price Tracker",
        url: "https://steamcommunity.com/market/",
      },
      title: developmentMode
        ? "🔧 Development Mode - Price Capture"
        : "🎯 Price Capture Complete",
      description: `Inventory tracking update completed at ${new Date(
        captureData.timestamp
      ).toLocaleString()}`,
      color: changeColor,
      timestamp: captureData.timestamp,
      fields: [
        {
          name: "📊 Total Inventory Value",
          value: `$${captureData.totalValue.toFixed(2)}`,
          inline: true,
        },
      ],
      footer: {
        text: "CS2 Item Price Tracker",
        icon_url: "https://steamcommunity.com/favicon.ico",
      },
    };

    // Add total change if available
    if (captureData.previousTotalValue) {
      baseEmbed.fields.push({
        name: "📈 Total Change",
        value: `${totalChange >= 0 ? "+" : ""}$${totalChange.toFixed(2)} (${(
          (totalChange / captureData.previousTotalValue) *
          100
        ).toFixed(2)}%)`,
        inline: true,
      });
    }

    // Add items processed count
    baseEmbed.fields.push({
      name: "📋 Items Processed",
      value: `${captureData.priceChanges.length} items`,
      inline: true,
    });

    const itemsToShow = developmentMode
      ? captureData.priceChanges.sort(
          (a, b) => b.current_price - a.current_price
        ) // Show all items sorted by price
      : captureData.priceChanges
          .filter(
            (item) => item.change_amount && Math.abs(item.change_amount) > 0.01
          )
          .sort(
            (a, b) =>
              Math.abs(b.change_amount || 0) - Math.abs(a.change_amount || 0)
          );

    const maxItemsPerEmbed = 22;
    const itemChunks: PriceChangeData[][] = [];

    for (let i = 0; i < itemsToShow.length; i += maxItemsPerEmbed) {
      itemChunks.push(itemsToShow.slice(i, i + maxItemsPerEmbed));
    }

    if (itemChunks.length === 0) {
      // No items to show, just send the base embed
      embeds.push(baseEmbed);
    } else {
      // Add items to the first embed
      const firstChunk = itemChunks[0];
      firstChunk.forEach((item, index) => {
        if (developmentMode) {
          baseEmbed.fields.push({
            name: `💰 ${item.display_name}`,
            value: `$${item.current_price.toFixed(2)}${
              item.change_amount
                ? ` (${
                    item.change_amount >= 0 ? "+" : ""
                  }$${item.change_amount.toFixed(2)})`
                : ""
            }`,
            inline: true,
          });
        } else {
          const changeSymbol = (item.change_amount || 0) >= 0 ? "+" : "";
          const changePercent = item.previous_price
            ? ` (${changeSymbol}${(
                ((item.change_amount || 0) / item.previous_price) *
                100
              ).toFixed(1)}%)`
            : "";

          baseEmbed.fields.push({
            name: `${(item.change_amount || 0) >= 0 ? "📈" : "📉"} ${
              item.display_name
            }`,
            value: `$${item.current_price.toFixed(2)} ${changeSymbol}$${(
              item.change_amount || 0
            ).toFixed(2)}${changePercent}`,
            inline: true,
          });
        }
      });

      embeds.push(baseEmbed);

      for (let i = 1; i < itemChunks.length; i++) {
        const additionalEmbed: DiscordEmbed = {
          title: developmentMode
            ? `🔧 All Items (Part ${i + 1})`
            : `🎯 Price Changes (Part ${i + 1})`,
          color: changeColor,
          timestamp: captureData.timestamp,
          fields: [],
          footer: {
            text: "CS2 Item Price Tracker",
            icon_url: "https://steamcommunity.com/favicon.ico",
          },
        };

        itemChunks[i].forEach((item) => {
          if (developmentMode) {
            additionalEmbed.fields.push({
              name: `💰 ${item.display_name}`,
              value: `$${item.current_price.toFixed(2)}${
                item.change_amount
                  ? ` (${
                      item.change_amount >= 0 ? "+" : ""
                    }$${item.change_amount.toFixed(2)})`
                  : ""
              }`,
              inline: true,
            });
          } else {
            const changeSymbol = (item.change_amount || 0) >= 0 ? "+" : "";
            const changePercent = item.previous_price
              ? ` (${changeSymbol}${(
                  ((item.change_amount || 0) / item.previous_price) *
                  100
                ).toFixed(1)}%)`
              : "";

            additionalEmbed.fields.push({
              name: `${(item.change_amount || 0) >= 0 ? "📈" : "📉"} ${
                item.display_name
              }`,
              value: `$${item.current_price.toFixed(2)} ${changeSymbol}$${(
                item.change_amount || 0
              ).toFixed(2)}${changePercent}`,
              inline: true,
            });
          }
        });

        embeds.push(additionalEmbed);
      }
    }

    for (let i = 0; i < embeds.length; i++) {
      const payload: DiscordWebhookPayload = {
        embeds: [embeds[i]],
      };

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(
          `Discord webhook failed: ${response.status} ${response.statusText}`
        );
      }

      // Small delay between multiple webhook calls to avoid rate limiting
      if (i < embeds.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    console.log(`[Discord] ${embeds.length} notification(s) sent successfully`);
  } catch (error) {
    console.error("[Discord] Failed to send notification:", error);
  }
}

export async function getDiscordSettings(): Promise<{
  enabled: boolean;
  webhookUrl: string;
  developmentMode: boolean;
} | null> {
  try {
    console.log("[Discord] Loading settings...");
    const settings: AppSettings = await getSettings();

    console.log("[Discord] Settings loaded:", settings);

    return {
      enabled: settings.discordWebhookEnabled,
      webhookUrl: settings.discordWebhookUrl,
      developmentMode: settings.discordDevelopmentMode,
    };
  } catch (error) {
    console.error("[Discord] Failed to load settings:", error);
    return null;
  }
}
