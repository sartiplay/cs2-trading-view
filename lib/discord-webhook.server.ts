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

export interface PriceSpikeNotificationPayload {
  marketHashName: string;
  label: string;
  steamUrl?: string;
  previousPrice: number;
  newPrice: number;
  changeAmount: number;
  changePercentage: number;
  direction: "up" | "down";
  previousTimestamp: string;
  currentTimestamp: string;
  timeWindowMinutes: number;
}

export interface PriceAlertNotificationPayload {
  marketHashName: string;
  label: string;
  steamUrl?: string;
  direction: "lower" | "upper";
  threshold: number;
  price: number;
}

export interface DiscordSettings {
  enabled: boolean;
  webhookUrl: string;
  developmentMode: boolean;
  priceSpikeEnabled: boolean;
  alertMentions?: string[];
}

export interface DevelopmentWebhookPayload {
  item: {
    marketHashName: string;
    label: string;
    steamUrl?: string;
  };
  currentPrice: number;
  previousPrice?: number;
  changeAmount?: number;
  changePercentage?: number;
  direction?: "up" | "down";
  note?: string;
  timeWindowMinutes?: number;
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

export async function sendPriceSpikeNotification(
  payload: PriceSpikeNotificationPayload
) {
  try {
    const discordSettings = await getDiscordSettings();
    if (
      !discordSettings ||
      !discordSettings.enabled ||
      !discordSettings.priceSpikeEnabled ||
      !discordSettings.webhookUrl
    ) {
      return;
    }

    const directionEmoji = payload.direction === "up" ? "📈" : "📉";
    const color = payload.direction === "up" ? 0x22c55e : 0xef4444;
    const changeSymbol = payload.changeAmount >= 0 ? "+" : "-";
    const percentFormatted = Math.abs(payload.changePercentage).toFixed(1);
    const changeFormatted = `${changeSymbol}$${Math.abs(
      payload.changeAmount
    ).toFixed(2)} (${changeSymbol}${percentFormatted}%)`;
    const timeWindowLabel =
      payload.timeWindowMinutes < 1
        ? `${Math.max(1, Math.round(payload.timeWindowMinutes * 60))} seconds`
        : `${payload.timeWindowMinutes.toFixed(1)} minutes`;

    const embed: DiscordEmbed = {
      title: `${directionEmoji} ${payload.label}`,
      url: payload.steamUrl,
      description: `Price ${
        payload.direction === "up" ? "jumped" : "dropped"
      } ${changeSymbol}${percentFormatted}% in ${timeWindowLabel}.`,
      color,
      timestamp: payload.currentTimestamp,
      fields: [
        {
          name: "Old Price",
          value: `$${payload.previousPrice.toFixed(2)}`,
          inline: true,
        },
        {
          name: "New Price",
          value: `$${payload.newPrice.toFixed(2)}`,
          inline: true,
        },
        {
          name: "Change",
          value: changeFormatted,
          inline: true,
        },
        {
          name: "Window",
          value: timeWindowLabel,
          inline: true,
        },
        {
          name: "Market Hash",
          value: `\`${payload.marketHashName}\``,
          inline: false,
        },
      ],
      footer: {
        text: "CS2 Price Spike Alert",
        icon_url: "https://steamcommunity.com/favicon.ico",
      },
    };

    const payloadBody: DiscordWebhookPayload = {
      embeds: [embed],
    };

    const response = await fetch(discordSettings.webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payloadBody),
    });

    if (!response.ok) {
      throw new Error(
        `Discord webhook failed: ${response.status} ${response.statusText}`
      );
    }

    console.log(
      `[Discord] Price spike notification sent for ${payload.marketHashName}`
    );
  } catch (error) {
    console.error("[Discord] Failed to send price spike notification:", error);
  }
}

export async function sendPriceAlertNotification(
  payload: PriceAlertNotificationPayload
) {
  try {
    const settings = await getDiscordSettings();
    if (!settings || !settings.enabled || !settings.webhookUrl) {
      return;
    }

    const directionIsUpper = payload.direction === "upper";
    const directionLabel = directionIsUpper
      ? "Upper Threshold"
      : "Lower Threshold";
    const directionKeyword = directionIsUpper ? "Take Profit" : "Stop Loss";
    const color = directionIsUpper ? 0x22c55e : 0xef4444;

    const embed: DiscordEmbed = {
      title: "Price Alert • " + payload.label,
      url: payload.steamUrl,
      description:
        directionKeyword +
        " alert triggered at " +
        directionLabel.toLowerCase(),
      color,
      timestamp: new Date().toISOString(),
      fields: [
        {
          name: "Current Price",
          value: "$" + payload.price.toFixed(2),
          inline: true,
        },
        {
          name: "Threshold",
          value:
            "$" + payload.threshold.toFixed(2) + " (" + directionLabel + ")",
          inline: true,
        },
        {
          name: "Market Hash",
          value: "`" + payload.marketHashName + "`",
          inline: false,
        },
      ],
      footer: {
        text: "CS2 Price Alert",
        icon_url: "https://steamcommunity.com/favicon.ico",
      },
    };

    const payloadBody: { embeds: DiscordEmbed[]; content?: string } = {
      embeds: [embed],
    };

    const mentions = Array.isArray(settings.alertMentions)
      ? settings.alertMentions
          .filter(
            (value) => typeof value === "string" && value.trim().length > 0
          )
          .map((value) => value.trim())
      : [];

    if (mentions.length > 0) {
      const mentionText = mentions.map((value) => "<@" + value + ">").join(" ");
      if (mentionText.length > 0) {
        payloadBody.content = mentionText;
      }
    }

    const response = await fetch(settings.webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payloadBody),
    });

    if (!response.ok) {
      throw new Error(
        "Discord webhook failed: " + response.status + " " + response.statusText
      );
    }

    console.log(
      "[Discord] Price alert notification sent for " + payload.marketHashName
    );
  } catch (error) {
    console.error("[Discord] Failed to send price alert:", error);
  }
}

export async function sendDevelopmentTestNotification(
  payload: DevelopmentWebhookPayload
) {
  try {
    const settings = await getDiscordSettings();
    if (
      !settings ||
      !settings.enabled ||
      !settings.developmentMode ||
      !settings.webhookUrl
    ) {
      console.warn(
        "[Discord] Development notification aborted – webhook disabled or development mode off."
      );
      return;
    }

    const changeAmount = payload.changeAmount;
    const changePercentage = payload.changePercentage;
    const previousPrice = payload.previousPrice;
    const inferredDirection = (() => {
      if (payload.direction) return payload.direction;
      if (changeAmount !== undefined) {
        return changeAmount < 0 ? "down" : "up";
      }
      if (changePercentage !== undefined) {
        return changePercentage < 0 ? "down" : "up";
      }
      return "up";
    })();
    const direction = inferredDirection;
    const directionEmoji = direction === "down" ? "📉" : "📈";
    const color = direction === "down" ? 0xef4444 : 0x22c55e;
    const changeSummaryParts: string[] = [];

    if (changeAmount !== undefined) {
      const sign = changeAmount >= 0 ? "+" : "-";
      changeSummaryParts.push(`${sign}$${Math.abs(changeAmount).toFixed(2)}`);
    }

    if (changePercentage !== undefined) {
      const sign = changePercentage >= 0 ? "+" : "-";
      changeSummaryParts.push(
        `${sign}${Math.abs(changePercentage).toFixed(2)}%`
      );
    }

    const changeSummary = changeSummaryParts.join(" / ") || "N/A";

    const embed: DiscordEmbed = {
      title: `${directionEmoji} Dev Test • ${payload.item.label}`,
      url: payload.item.steamUrl,
      color,
      timestamp: new Date().toISOString(),
      description:
        payload.note?.trim() ||
        "Manual development notification triggered from the dashboard.",
      fields: [
        {
          name: "Item",
          value: `\`${payload.item.marketHashName}\``,
          inline: false,
        },
        {
          name: "Current Price",
          value: `$${payload.currentPrice.toFixed(2)}`,
          inline: true,
        },
      ],
      footer: {
        text: "CS2 Price Tracker • Dev Mode",
        icon_url: "https://steamcommunity.com/favicon.ico",
      },
    };

    if (previousPrice !== undefined) {
      embed.fields.push({
        name: "Previous Price",
        value: `$${previousPrice.toFixed(2)}`,
        inline: true,
      });
    }

    embed.fields.push({
      name: "Change",
      value: changeSummary,
      inline: true,
    });

    if (payload.timeWindowMinutes !== undefined) {
      embed.fields.push({
        name: "Time Window",
        value: `${payload.timeWindowMinutes.toFixed(1)} min`,
        inline: true,
      });
    }

    const response = await fetch(settings.webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ embeds: [embed] }),
    });

    if (!response.ok) {
      throw new Error(
        `Discord webhook failed: ${response.status} ${response.statusText}`
      );
    }

    console.log(
      `[Discord] Development notification sent for ${payload.item.marketHashName}`
    );
  } catch (error) {
    console.error("[Discord] Failed to send development notification:", error);
    throw error;
  }
}

export async function getDiscordSettings(): Promise<DiscordSettings | null> {
  try {
    console.log("[Discord] Loading settings...");
    const settings: AppSettings = await getSettings();

    console.log("[Discord] Settings loaded:", settings);
    const alertMentions =
      typeof settings === "object" &&
      settings !== null &&
      Array.isArray(
        (settings as unknown as Record<string, unknown>)
          .discordPriceAlertMentions
      )
        ? (
            (settings as unknown as Record<string, unknown>)
              .discordPriceAlertMentions as string[]
          )
            .filter(
              (value) => typeof value === "string" && value.trim().length > 0
            )
            .map((value) => value.trim())
        : [];

    return {
      enabled: settings.discordWebhookEnabled,
      webhookUrl: settings.discordWebhookUrl,
      developmentMode: settings.discordDevelopmentMode,
      priceSpikeEnabled: settings.discordPriceSpikeEnabled,
      alertMentions,
    };
  } catch (error) {
    console.error("[Discord] Failed to load settings:", error);
    return null;
  }
}
