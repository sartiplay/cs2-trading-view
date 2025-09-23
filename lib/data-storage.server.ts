import { promises as fs } from "fs";
import path from "path";
import { convertCurrency } from "./currency-converter.server";
import {
  sendPriceSpikeNotification,
  type PriceSpikeNotificationPayload,
  sendPriceAlertNotification,
} from "./discord-webhook.server";
import { startWorkerTask, updateWorkerTaskProgress, completeWorkerTask } from "./worker-storage.server";

interface PriceEntry {
  date: string;
  median_price: number;
}

export interface Customization {
  name: string;
  steam_url: string;
  price: number;
  currency: string;
}

export interface CustomizationWithHistory extends Customization {
  price_history: PriceEntry[];
}

export interface PriceAlertConfig {
  lowerThreshold?: number | null;
  upperThreshold?: number | null;
  lowerTriggered?: boolean;
  upperTriggered?: boolean;
  lastTriggeredLower?: string | null;
  lastTriggeredUpper?: string | null;
  updatedAt?: string;
}

export interface Item {
  id: string; // Unique identifier for this specific item instance
  market_hash_name: string;
  label: string;
  description?: string;
  category_id?: string; // Reference to category in the categories object
  appid: number;
  steam_url: string;
  image_url?: string; // URL to the item's image from Steam
  purchase_price: number;
  quantity: number;
  purchase_currency: string;
  stickers?: CustomizationWithHistory[]; // Max 6 for weapons
  charms?: CustomizationWithHistory[]; // Max 1 for weapons
  patches?: CustomizationWithHistory[]; // For character skins
  include_customizations_in_price?: boolean; // Whether to include customization costs in selling price
  price_alert_config?: PriceAlertConfig;
  created_at: string; // When this item instance was created
}

export interface CategoryConfig {
  id: string;
  name: string;
  color?: string; // Hex color for UI display
  includeInInventoryValue: boolean; // Whether items in this category should be included in total inventory value calculations
  includeInProfitLoss: boolean; // Whether items in this category should be included in profit/loss calculations
  created_at: string;
  updated_at: string;
}

export interface ItemWithHistory extends Item {
  price_history: PriceEntry[];
}

export interface SoldItem {
  id: string; // Unique identifier for this specific item instance
  market_hash_name: string;
  label: string;
  description?: string;
  category_id?: string; // Reference to category in the categories object
  appid: number;
  steam_url: string;
  image_url?: string; // URL to the item's image from Steam
  purchase_price: number;
  purchase_price_usd: number;
  purchase_currency: string;
  quantity: number;
  sold_price: number;
  sold_price_usd: number;
  sold_currency: string;
  sold_date: string;
  profit_loss: number;
  profit_loss_percentage: number;
  stickers?: Array<{
    name: string;
    steam_url: string;
    purchase_price: number;
    current_price?: number;
    currency: string;
  }>;
  charms?: Array<{
    name: string;
    steam_url: string;
    purchase_price: number;
    current_price?: number;
    currency: string;
  }>;
  patches?: Array<{
    name: string;
    steam_url: string;
    purchase_price: number;
    current_price?: number;
    currency: string;
  }>;
  customization_total_purchase_cost?: number;
  customization_total_current_value?: number;
  include_customizations_in_price?: boolean;
}

export interface DataStore {
  categories: Record<string, CategoryConfig>;
  items: Record<string, ItemWithHistory>; // Key is now item.id instead of market_hash_name
  sold_items: SoldItem[];
  portfolio_history: Array<{
    timestamp: string;
    date: string;
    total_inventory_value: number;
    total_money_invested: number;
  }>;
  metadata: {
    last_capture: string | null;
    total_captures: number;
    created_at: string;
  };
}

const DATA_FILE = path.join(process.cwd(), "data.json");

const PRICE_SPIKE_PERCENT_THRESHOLD = 15; // percent change
const PRICE_SPIKE_MIN_ABSOLUTE = 1; // USD difference

// Generate a unique ID for items
function generateItemId(): string {
  return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
const PRICE_SPIKE_TIME_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

interface PriceAlertTrigger {
  marketHashName: string;
  label: string;
  steamUrl?: string;
  direction: "lower" | "upper";
  threshold: number;
  price: number;
}

async function readDataFile(): Promise<DataStore> {
  try {
    const data = await fs.readFile(DATA_FILE, "utf-8");
    const parsed = JSON.parse(data);

    if (!parsed.metadata) {
      parsed.metadata = {
        last_capture: null,
        total_captures: 0,
        created_at: new Date().toISOString(),
      };
    }

    if (!parsed.sold_items) {
      parsed.sold_items = [];
    }

    if (!parsed.portfolio_history) {
      parsed.portfolio_history = [];
    }

    return parsed;
  } catch (error) {
    console.log("[Data Storage] Creating new data file");
    return {
      items: {},
      categories: {},
      sold_items: [],
      portfolio_history: [],
      metadata: {
        last_capture: null,
        total_captures: 0,
        created_at: new Date().toISOString(),
      },
    };
  }
}

async function writeDataFile(data: DataStore): Promise<void> {
  try {
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
    console.log("[Data Storage] Data saved successfully");
  } catch (error) {
    console.error("[Data Storage] Failed to write data:", error);
    throw error;
  }
}

let dataUpdateQueue: Promise<void> = Promise.resolve();

function queueUpdate<T>(task: () => Promise<T>): Promise<T> {
  const run = dataUpdateQueue.then(task);
  dataUpdateQueue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

async function updateData<T>(
  mutator: (data: DataStore) => T | Promise<T>
): Promise<T> {
  return queueUpdate(async () => {
    const data = await readDataFile();
    const result = await mutator(data);
    await writeDataFile(data);
    return result;
  });
}

export async function readData(): Promise<DataStore> {
  return readDataFile();
}

export async function writeData(data: DataStore): Promise<void> {
  await queueUpdate(() => writeDataFile(data));
}

export async function addOrUpdateItem(item: Item): Promise<string> {
  let itemId: string = "";
  
  await updateData((data) => {
    // If item has an ID and exists, update it; otherwise create a new one
    if (item.id && data.items[item.id]) {
      // Update existing item
      const existingItem = data.items[item.id];
      existingItem.label = item.label;
      existingItem.description = item.description;
      existingItem.category_id = item.category_id;
      existingItem.appid = item.appid;
      existingItem.steam_url = item.steam_url;
      existingItem.image_url = item.image_url !== undefined ? item.image_url : existingItem.image_url;
      existingItem.purchase_price = item.purchase_price;
      existingItem.quantity = item.quantity;
      existingItem.purchase_currency = item.purchase_currency;
      existingItem.include_customizations_in_price = item.include_customizations_in_price;
      existingItem.price_alert_config = item.price_alert_config ?? existingItem.price_alert_config;

      existingItem.stickers = item.stickers?.map((sticker, index) => ({
        ...sticker,
        price_history:
          (existingItem.stickers?.[index] as CustomizationWithHistory)
            ?.price_history || [],
      }));
      existingItem.charms = item.charms?.map((charm, index) => ({
        ...charm,
        price_history:
          (existingItem.charms?.[index] as CustomizationWithHistory)
            ?.price_history || [],
      }));
      existingItem.patches = item.patches?.map((patch, index) => ({
        ...patch,
        price_history:
          (existingItem.patches?.[index] as CustomizationWithHistory)
            ?.price_history || [],
      }));
      
      itemId = item.id;
    } else {
      // Create new item with new ID
      itemId = generateItemId();
      const itemWithHistory: ItemWithHistory = {
        ...item,
        id: itemId,
        created_at: new Date().toISOString(),
        price_alert_config: item.price_alert_config,
        price_history: [],
        stickers: item.stickers?.map((sticker) => ({
          ...sticker,
          price_history: [],
        })),
        charms: item.charms?.map((charm) => ({ ...charm, price_history: [] })),
        patches: item.patches?.map((patch) => ({
          ...patch,
          price_history: [],
        })),
      };
      data.items[itemId] = itemWithHistory;
    }
  });
  
  return itemId;
}

export async function updatePriceAlertConfig(
  marketHashName: string,
  config: PriceAlertConfig
): Promise<PriceAlertConfig> {
  return updateData((data) => {
    // Find the item by market hash name
    const item = Object.values(data.items).find(item => item.market_hash_name === marketHashName);
    if (!item) {
      throw new Error("Item not found");
    }

    const existing = item.price_alert_config ?? {};
    const nextConfig: PriceAlertConfig = {
      ...existing,
    };

    if (config.lowerThreshold !== undefined) {
      nextConfig.lowerThreshold =
        config.lowerThreshold !== null ? Number(config.lowerThreshold) : null;
      nextConfig.lowerTriggered = false;
      nextConfig.lastTriggeredLower = null;
    } else if (nextConfig.lowerThreshold === undefined) {
      nextConfig.lowerThreshold = null;
      nextConfig.lowerTriggered = false;
      nextConfig.lastTriggeredLower = null;
    }

    if (config.upperThreshold !== undefined) {
      nextConfig.upperThreshold =
        config.upperThreshold !== null ? Number(config.upperThreshold) : null;
      nextConfig.upperTriggered = false;
      nextConfig.lastTriggeredUpper = null;
    } else if (nextConfig.upperThreshold === undefined) {
      nextConfig.upperThreshold = null;
      nextConfig.upperTriggered = false;
      nextConfig.lastTriggeredUpper = null;
    }

    nextConfig.updatedAt = new Date().toISOString();

    item.price_alert_config = nextConfig;

    return nextConfig;
  });
}
export async function removeItem(itemId: string): Promise<void> {
  await updateData((data) => {
    delete data.items[itemId];
  });
}

export async function addPriceEntry(
  marketHashName: string,
  price: number
): Promise<void> {
  let spikeNotification: PriceSpikeNotificationPayload | null = null;
  const alertNotifications: PriceAlertTrigger[] = [];

  await updateData((data) => {
    // Find all items with this market_hash_name and update their prices
    const itemsWithHashName = Object.values(data.items).filter(
      item => item.market_hash_name === marketHashName
    );
    
    const now = new Date();
    const nowIso = now.toISOString();
    
    for (const item of itemsWithHashName) {
    const history = item.price_history;
    const previousEntry =
      history.length > 0 ? history[history.length - 1] : null;

    if (previousEntry) {
      const previousTime = new Date(previousEntry.date).getTime();
      const currentTime = now.getTime();
      const timeDiffMs = currentTime - previousTime;

      if (timeDiffMs >= 0) {
        const previousPrice = previousEntry.median_price;
        const priceDiff = price - previousPrice;
        const absDiff = Math.abs(priceDiff);
        const percentChange =
          previousPrice > 0 ? (absDiff / previousPrice) * 100 : 0;

        if (
          timeDiffMs <= PRICE_SPIKE_TIME_WINDOW_MS &&
          (absDiff >= PRICE_SPIKE_MIN_ABSOLUTE ||
            percentChange >= PRICE_SPIKE_PERCENT_THRESHOLD)
        ) {
          const direction: PriceSpikeNotificationPayload["direction"] =
            priceDiff >= 0 ? "up" : "down";
          const minutes = timeDiffMs / (60 * 1000);

          spikeNotification = {
            marketHashName,
            label: item.label,
            steamUrl: item.steam_url,
            previousPrice,
            newPrice: price,
            changeAmount: priceDiff,
            changePercentage: percentChange,
            direction,
            previousTimestamp: previousEntry.date,
            currentTimestamp: nowIso,
            timeWindowMinutes: minutes,
          };

          console.log(
            `[Data Storage] Price spike detected for ${item.label}: ${
              direction === "up" ? "UP" : "DOWN"
            } $${absDiff.toFixed(2)} (${percentChange.toFixed(
              1
            )}%) over ${minutes.toFixed(1)} minutes`
          );
        }
      }
    }

    history.push({
      date: nowIso,
      median_price: price,
    });

    history.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const config = item.price_alert_config ?? (item.price_alert_config = {});
    const lowerThreshold =
      config.lowerThreshold !== undefined ? config.lowerThreshold : null;
    if (typeof lowerThreshold === "number" && Number.isFinite(lowerThreshold)) {
      if (price <= lowerThreshold) {
        if (!config.lowerTriggered) {
          config.lowerTriggered = true;
          config.lastTriggeredLower = nowIso;
          alertNotifications.push({
            marketHashName,
            label: item.label,
            steamUrl: item.steam_url,
            direction: "lower",
            threshold: lowerThreshold,
            price,
          });
          config.lowerThreshold = null;
          config.lowerTriggered = false;
        }
      } else if (config.lowerTriggered) {
        config.lowerTriggered = false;
      }
    } else {
      config.lowerTriggered = false;
      config.lastTriggeredLower = null;
    }

    const upperThreshold =
      config.upperThreshold !== undefined ? config.upperThreshold : null;
    if (typeof upperThreshold === "number" && Number.isFinite(upperThreshold)) {
      if (price >= upperThreshold) {
        if (!config.upperTriggered) {
          config.upperTriggered = true;
          config.lastTriggeredUpper = nowIso;
          alertNotifications.push({
            marketHashName,
            label: item.label,
            steamUrl: item.steam_url,
            direction: "upper",
            threshold: upperThreshold,
            price,
          });
          config.upperThreshold = null;
          config.upperTriggered = false;
        }
      } else if (config.upperTriggered) {
        config.upperTriggered = false;
      }
    } else {
      config.upperTriggered = false;
      config.lastTriggeredUpper = null;
    }

      config.updatedAt = nowIso;

      // Add the new price entry to the history
      item.price_history.push({
        date: nowIso,
        median_price: price,
      });

      // Sort the price history by date
      item.price_history.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    }

    data.metadata.last_capture = nowIso;
    data.metadata.total_captures += 1;

    console.log(
      `[Data Storage] Added price entry for ${marketHashName}: $${price.toFixed(
        2
      )}`
    );
  });

  if (spikeNotification) {
    try {
      await sendPriceSpikeNotification(spikeNotification);
    } catch (error) {
      console.error(
        `[Data Storage] Failed to send price spike notification for ${marketHashName}:`,
        error
      );
    }
  }

  if (alertNotifications.length > 0) {
    for (const alert of alertNotifications) {
      try {
        await sendPriceAlertNotification({
          marketHashName: alert.marketHashName,
          label: alert.label,
          steamUrl: alert.steamUrl,
          direction: alert.direction,
          threshold: alert.threshold,
          price: alert.price,
        });
      } catch (error) {
        console.error(
          `[Data Storage] Failed to send price alert for ${alert.marketHashName}:`,
          error
        );
      }
    }
  }
}

export async function getAllItems(): Promise<ItemWithHistory[]> {
  const data = await readData();
  return Object.values(data.items);
}

export async function getItem(
  itemId: string
): Promise<ItemWithHistory | null> {
  const data = await readData();
  return data.items[itemId] || null;
}

export async function getItemByMarketHashName(
  marketHashName: string
): Promise<ItemWithHistory | null> {
  const data = await readData();
  // Find the first item with this market_hash_name
  return Object.values(data.items).find(item => item.market_hash_name === marketHashName) || null;
}

export async function getCaptureStats(): Promise<{
  last_capture: string | null;
  total_captures: number;
  total_items: number;
}> {
  const data = await readData();
  return {
    last_capture: data.metadata.last_capture,
    total_captures: data.metadata.total_captures,
    total_items: Object.keys(data.items).length,
  };
}

export async function getItemWithProfitLoss(marketHashName: string): Promise<
  | (ItemWithHistory & {
      current_price: number | null;
      profit_loss: number | null;
      profit_loss_percentage: number | null;
    })
  | null
> {
  const item = await getItem(marketHashName);
  if (!item) return null;

  const purchasePriceUsd = await convertCurrency(
    item.purchase_price,
    item.purchase_currency,
    "USD"
  );

  const latestPrice =
    item.price_history.length > 0
      ? item.price_history[item.price_history.length - 1].median_price
      : null;

  const profitLoss = latestPrice
    ? (latestPrice - purchasePriceUsd) * item.quantity
    : null;
  const profitLossPercentage = latestPrice
    ? ((latestPrice - purchasePriceUsd) / purchasePriceUsd) * 100
    : null;

  return {
    ...item,
    current_price: latestPrice,
    profit_loss: profitLoss,
    profit_loss_percentage: profitLossPercentage,
  };
}

async function calculateInventoryValue(data: DataStore, externalPrices?: any[]): Promise<{
  total_purchase_value: number;
  total_current_value: number;
  total_profit_loss: number;
  total_profit_loss_percentage: number;
  timeline: Array<{ date: string; total_value: number }>;
}> {
  const items = Object.values(data.items);

  let totalPurchaseValue = 0;
  let totalCurrentValue = 0;
  const dateValueMap: Record<string, number> = {};

  for (const item of items) {
    // Check if item's category should be included in inventory value calculations
    if (item.category_id) {
      const category = data.categories[item.category_id];
      if (category && !category.includeInInventoryValue) {
        continue; // Skip this item if its category is excluded from inventory value
      }
    }
    const purchasePriceUsd = await convertCurrency(
      item.purchase_price,
      item.purchase_currency,
      "USD"
    );

    const includeCustomizations = Boolean(item.include_customizations_in_price);

    let customizationPurchaseCostUsd = 0;
    let customizationCurrentValueUsd = 0;
    const customizationData: Array<{
      purchaseCostUsd: number;
      priceHistory: PriceEntry[];
    }> = [];

    const collectCustomizationData = async (
      customizations?: CustomizationWithHistory[]
    ) => {
      if (!includeCustomizations || !customizations) {
        return;
      }

      for (const customization of customizations) {
        const purchaseCostUsd = await convertCurrency(
          customization.price,
          customization.currency,
          "USD"
        );
        customizationPurchaseCostUsd += purchaseCostUsd;

        const history = (customization.price_history ?? [])
          .slice()
          .sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
          );

        const latestValue =
          history.length > 0
            ? history[history.length - 1].median_price
            : purchaseCostUsd;

        customizationCurrentValueUsd += latestValue;
        customizationData.push({
          purchaseCostUsd,
          priceHistory: history,
        });
      }
    };

    await collectCustomizationData(item.stickers);
    await collectCustomizationData(item.charms);
    await collectCustomizationData(item.patches);

    const perUnitPurchaseUsd = includeCustomizations
      ? purchasePriceUsd + customizationPurchaseCostUsd
      : purchasePriceUsd;
    totalPurchaseValue += perUnitPurchaseUsd * item.quantity;

    // Use external price if available, otherwise use Steam Market price
    let latestItemPrice;
    if (externalPrices) {
      const externalPrice = externalPrices.find(ep => ep.market_hash_name === item.market_hash_name);
      latestItemPrice = externalPrice ? externalPrice.current_price : 
        (item.price_history.length > 0
          ? item.price_history[item.price_history.length - 1].median_price
          : purchasePriceUsd);
    } else {
      latestItemPrice =
        item.price_history.length > 0
          ? item.price_history[item.price_history.length - 1].median_price
          : purchasePriceUsd;
    }

    const perUnitCurrentValue = includeCustomizations
      ? latestItemPrice + customizationCurrentValueUsd
      : latestItemPrice;

    totalCurrentValue += perUnitCurrentValue * item.quantity;

    const customizationValueAt = (timestamp: number): number => {
      if (!includeCustomizations || customizationData.length === 0) {
        return 0;
      }

      let total = 0;
      for (const customization of customizationData) {
        let value = customization.purchaseCostUsd;
        for (const entry of customization.priceHistory) {
          if (new Date(entry.date).getTime() <= timestamp) {
            value = entry.median_price;
          } else {
            break;
          }
        }
        total += value;
      }
      return total;
    };

    const perItemDailyValues = new Map<string, number>();
    for (const entry of item.price_history) {
      const dateOnly = entry.date.split("T")[0];
      const timestamp = new Date(entry.date).getTime();
      let entryValue = entry.median_price;
      if (includeCustomizations) {
        entryValue += customizationValueAt(timestamp);
      }
      perItemDailyValues.set(dateOnly, entryValue * item.quantity);
    }

    for (const [date, value] of perItemDailyValues) {
      dateValueMap[date] = (dateValueMap[date] ?? 0) + value;
    }
  }

  const timeline = Object.entries(dateValueMap)
    .map(([date, total_value]) => ({ date, total_value }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const totalProfitLoss = totalCurrentValue - totalPurchaseValue;
  const totalProfitLossPercentage =
    totalPurchaseValue > 0 ? (totalProfitLoss / totalPurchaseValue) * 100 : 0;

  return {
    total_purchase_value: totalPurchaseValue,
    total_current_value: totalCurrentValue,
    total_profit_loss: totalProfitLoss,
    total_profit_loss_percentage: totalProfitLossPercentage,
    timeline,
  };
}

export async function getInventoryValue(externalPrices?: any[]): Promise<{
  total_purchase_value: number;
  total_current_value: number;
  total_profit_loss: number;
  total_profit_loss_percentage: number;
  timeline: Array<{ date: string; total_value: number }>;
}> {
  const data = await readData();
  return calculateInventoryValue(data, externalPrices);
}

export async function getLatestPrices(): Promise<
  Array<{
    market_hash_name: string;
    label: string;
    current_price: number | null;
    previous_price: number | null;
    price_change: number | null;
    price_change_percentage: number | null;
    quantity: number;
    purchase_price: number;
  }>
> {
  const data = await readData();
  const items = Object.values(data.items);

  return items.map((item) => {
    const priceHistory = item.price_history;
    const currentPrice =
      priceHistory.length > 0
        ? priceHistory[priceHistory.length - 1].median_price
        : null;
    const previousPrice =
      priceHistory.length > 1
        ? priceHistory[priceHistory.length - 2].median_price
        : null;

    const priceChange =
      currentPrice && previousPrice ? currentPrice - previousPrice : null;
    const priceChangePercentage =
      currentPrice && previousPrice && previousPrice > 0
        ? ((currentPrice - previousPrice) / previousPrice) * 100
        : null;

    return {
      market_hash_name: item.market_hash_name,
      label: item.label,
      current_price: currentPrice,
      previous_price: previousPrice,
      price_change: priceChange,
      price_change_percentage: priceChangePercentage,
      quantity: item.quantity,
      purchase_price: item.purchase_price,
    };
  });
}

export async function markItemAsSold(
  itemId: string,
  soldPrice: number,
  soldCurrency: string,
  soldPriceUsd: number
): Promise<void> {
  await updateData(async (data) => {
    const item = data.items[itemId];

    if (!item) {
      throw new Error("Item not found");
    }

    const purchasePriceUsd = await convertCurrency(
      item.purchase_price,
      item.purchase_currency,
      "USD"
    );

    let customizationPurchaseCost = 0;
    let customizationCurrentValue = 0;

    const soldStickers = item.stickers
      ? await Promise.all(
          item.stickers.map(async (sticker) => {
            const stickerPurchaseCostUsd = await convertCurrency(
              sticker.price,
              sticker.currency,
              "USD"
            );
            const latestPrice =
              sticker.price_history && sticker.price_history.length > 0
                ? sticker.price_history[sticker.price_history.length - 1]
                    .median_price
                : null;

            customizationPurchaseCost += stickerPurchaseCostUsd;
            if (latestPrice) customizationCurrentValue += latestPrice;

            return {
              name: sticker.name,
              steam_url: sticker.steam_url,
              purchase_price: sticker.price,
              current_price: latestPrice ?? undefined,
              currency: sticker.currency,
            };
          })
        )
      : undefined;

    const soldCharms = item.charms
      ? await Promise.all(
          item.charms.map(async (charm) => {
            const charmPurchaseCostUsd = await convertCurrency(
              charm.price,
              charm.currency,
              "USD"
            );
            const latestPrice =
              charm.price_history && charm.price_history.length > 0
                ? charm.price_history[charm.price_history.length - 1]
                    .median_price
                : null;

            customizationPurchaseCost += charmPurchaseCostUsd;
            if (latestPrice) customizationCurrentValue += latestPrice;

            return {
              name: charm.name,
              steam_url: charm.steam_url,
              purchase_price: charm.price,
              current_price: latestPrice ?? undefined,
              currency: charm.currency,
            };
          })
        )
      : undefined;

    const soldPatches = item.patches
      ? await Promise.all(
          item.patches.map(async (patch) => {
            const patchPurchaseCostUsd = await convertCurrency(
              patch.price,
              patch.currency,
              "USD"
            );
            const latestPrice =
              patch.price_history && patch.price_history.length > 0
                ? patch.price_history[patch.price_history.length - 1]
                    .median_price
                : null;

            customizationPurchaseCost += patchPurchaseCostUsd;
            if (latestPrice) customizationCurrentValue += latestPrice;

            return {
              name: patch.name,
              steam_url: patch.steam_url,
              purchase_price: patch.price,
              current_price: latestPrice ?? undefined,
              currency: patch.currency,
            };
          })
        )
      : undefined;

    const totalPurchaseUsd = item.include_customizations_in_price
      ? (purchasePriceUsd + customizationPurchaseCost) * item.quantity
      : purchasePriceUsd * item.quantity;
    const totalSoldUsd = soldPriceUsd * item.quantity;
    const profitLoss = totalSoldUsd - totalPurchaseUsd;
    const profitLossPercentage =
      totalPurchaseUsd > 0 ? (profitLoss / totalPurchaseUsd) * 100 : 0;

    const soldItem: SoldItem = {
      id: item.id,
      market_hash_name: item.market_hash_name,
      label: item.label,
      description: item.description,
      category_id: item.category_id,
      appid: item.appid,
      steam_url: item.steam_url,
      image_url: item.image_url,
      purchase_price: item.purchase_price,
      purchase_price_usd: purchasePriceUsd,
      purchase_currency: item.purchase_currency,
      quantity: item.quantity,
      sold_price: soldPrice,
      sold_price_usd: soldPriceUsd,
      sold_currency: soldCurrency,
      sold_date: new Date().toISOString(),
      profit_loss: profitLoss,
      profit_loss_percentage: profitLossPercentage,
      stickers: soldStickers,
      charms: soldCharms,
      patches: soldPatches,
      customization_total_purchase_cost: customizationPurchaseCost,
      customization_total_current_value: customizationCurrentValue,
      include_customizations_in_price: item.include_customizations_in_price,
    };

    data.sold_items.push(soldItem);
    delete data.items[itemId];

    console.log(
      `[Data Storage] Marked item as sold: ${item.market_hash_name} (${itemId}) for ${soldCurrency}${soldPrice}`
    );
  });
}

export async function getSoldItems(): Promise<SoldItem[]> {
  const data = await readData();
  return data.sold_items.sort(
    (a, b) => new Date(b.sold_date).getTime() - new Date(a.sold_date).getTime()
  );
}

export async function getSoldItemsSummary(): Promise<{
  total_sold_items: number;
  total_sold_value_usd: number;
  total_profit_loss: number;
  total_profit_loss_percentage: number;
}> {
  const data = await readData();
  const soldItems = data.sold_items;

  if (soldItems.length === 0) {
    return {
      total_sold_items: 0,
      total_sold_value_usd: 0,
      total_profit_loss: 0,
      total_profit_loss_percentage: 0,
    };
  }

  const totalSoldValueUsd = soldItems.reduce(
    (sum, item) => sum + item.sold_price_usd * item.quantity,
    0
  );
  const totalProfitLoss = soldItems.reduce(
    (sum, item) => sum + item.profit_loss,
    0
  );
  const totalPurchaseValueUsd = soldItems.reduce((sum, item) => {
    const customizationCost = item.include_customizations_in_price
      ? item.customization_total_purchase_cost ?? 0
      : 0;
    const perUnitPurchaseUsd = item.purchase_price_usd + customizationCost;
    return sum + perUnitPurchaseUsd * item.quantity;
  }, 0);
  const totalProfitLossPercentage =
    totalPurchaseValueUsd > 0
      ? (totalProfitLoss / totalPurchaseValueUsd) * 100
      : 0;

  return {
    total_sold_items: soldItems.length,
    total_sold_value_usd: totalSoldValueUsd,
    total_profit_loss: totalProfitLoss,
    total_profit_loss_percentage: totalProfitLossPercentage,
  };
}

export async function addCustomizationPriceEntry(
  marketHashName: string,
  customizationType: "stickers" | "charms" | "patches",
  customizationIndex: number,
  price: number
): Promise<void> {
  await updateData((data) => {
    // Find the item by market hash name
    const item = Object.values(data.items).find(item => item.market_hash_name === marketHashName);
    if (!item) {
      return;
    }
    const customizations = item[customizationType] as
      | CustomizationWithHistory[]
      | undefined;

    if (!customizations || !customizations[customizationIndex]) {
      return;
    }

    const now = new Date().toISOString();

    if (!customizations[customizationIndex].price_history) {
      customizations[customizationIndex].price_history = [];
    }

    customizations[customizationIndex].price_history.push({
      date: now,
      median_price: price,
    });

    customizations[customizationIndex].price_history.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    console.log(
      `[Data Storage] Added customization price entry for ${marketHashName} ${customizationType}[${customizationIndex}]: $${price.toFixed(
        2
      )}`
    );
  });
}

export async function getAllCustomizations(): Promise<
  Array<{
    market_hash_name: string;
    customization_type: "stickers" | "charms" | "patches";
    customization_index: number;
    customization_hash: string;
    steam_url: string;
  }>
> {
  const data = await readData();
  const customizations: Array<{
    market_hash_name: string;
    customization_type: "stickers" | "charms" | "patches";
    customization_index: number;
    customization_hash: string;
    steam_url: string;
  }> = [];

  for (const [marketHashName, item] of Object.entries(data.items)) {
    if (item.stickers) {
      item.stickers.forEach((sticker, index) => {
        if (sticker.steam_url) {
          const hash = extractHashFromSteamUrl(sticker.steam_url);
          if (hash) {
            customizations.push({
              market_hash_name: marketHashName,
              customization_type: "stickers",
              customization_index: index,
              customization_hash: hash,
              steam_url: sticker.steam_url,
            });
          }
        }
      });
    }

    if (item.charms) {
      item.charms.forEach((charm, index) => {
        if (charm.steam_url) {
          const hash = extractHashFromSteamUrl(charm.steam_url);
          if (hash) {
            customizations.push({
              market_hash_name: marketHashName,
              customization_type: "charms",
              customization_index: index,
              customization_hash: hash,
              steam_url: charm.steam_url,
            });
          }
        }
      });
    }

    if (item.patches) {
      item.patches.forEach((patch, index) => {
        if (patch.steam_url) {
          const hash = extractHashFromSteamUrl(patch.steam_url);
          if (hash) {
            customizations.push({
              market_hash_name: marketHashName,
              customization_type: "patches",
              customization_index: index,
              customization_hash: hash,
              steam_url: patch.steam_url,
            });
          }
        }
      });
    }
  }

  return customizations;
}

export async function addPortfolioSnapshot(): Promise<void> {
  await updateData(async (data) => {
    const inventoryValue = await calculateInventoryValue(data);

    const now = new Date().toISOString();
    const dateOnly = now.split("T")[0];

    const snapshot = {
      timestamp: now,
      date: dateOnly,
      total_inventory_value: inventoryValue.total_current_value,
      total_money_invested: inventoryValue.total_purchase_value,
    };

    data.portfolio_history.push(snapshot);

    data.portfolio_history.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    data.portfolio_history = data.portfolio_history.filter(
      (entry) => new Date(entry.timestamp) >= oneYearAgo
    );

    console.log(`[Data Storage] Added portfolio snapshot for ${now}`);
  });
}

export async function getPortfolioHistory(): Promise<
  Array<{
    timestamp: string;
    date: string;
    total_inventory_value: number;
    total_money_invested: number;
  }>
> {
  const data = await readData();
  return data.portfolio_history.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

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

// Category management functions
export async function getAllCategories(): Promise<CategoryConfig[]> {
  const data = await readData();
  return Object.values(data.categories).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getCategory(categoryId: string): Promise<CategoryConfig | null> {
  const data = await readData();
  return data.categories[categoryId] || null;
}

export async function createCategory(category: Omit<CategoryConfig, 'id' | 'created_at' | 'updated_at'>): Promise<CategoryConfig> {
  const newCategory: CategoryConfig = {
    ...category,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await updateData((data) => {
    data.categories[newCategory.id] = newCategory;
  });

  console.log(`[Data Storage] Created category: ${newCategory.name} (${newCategory.id})`);
  return newCategory;
}

export async function updateCategory(categoryId: string, updates: Partial<Omit<CategoryConfig, 'id' | 'created_at'>>): Promise<CategoryConfig> {
  return updateData((data) => {
    const category = data.categories[categoryId];
    if (!category) {
      throw new Error("Category not found");
    }

    const updatedCategory: CategoryConfig = {
      ...category,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    data.categories[categoryId] = updatedCategory;
    console.log(`[Data Storage] Updated category: ${updatedCategory.name} (${categoryId})`);
    return updatedCategory;
  });
}

export async function deleteCategory(categoryId: string): Promise<void> {
  await updateData((data) => {
    const category = data.categories[categoryId];
    if (!category) {
      throw new Error("Category not found");
    }

    // Check if any items are using this category
    const itemsUsingCategory = Object.values(data.items).filter(item => item.category_id === categoryId);
    if (itemsUsingCategory.length > 0) {
      throw new Error(`Cannot delete category "${category.name}" because ${itemsUsingCategory.length} item(s) are using it`);
    }

    // Check if any sold items are using this category
    const soldItemsUsingCategory = data.sold_items.filter(item => item.category_id === categoryId);
    if (soldItemsUsingCategory.length > 0) {
      throw new Error(`Cannot delete category "${category.name}" because ${soldItemsUsingCategory.length} sold item(s) are using it`);
    }

    delete data.categories[categoryId];
    console.log(`[Data Storage] Deleted category: ${category.name} (${categoryId})`);
  });
}

export async function getItemsByCategory(categoryId: string): Promise<ItemWithHistory[]> {
  const data = await readData();
  return Object.values(data.items).filter(item => item.category_id === categoryId);
}

export async function getSoldItemsByCategory(categoryId: string): Promise<SoldItem[]> {
  const data = await readData();
  return data.sold_items.filter(item => item.category_id === categoryId);
}

/**
 * Reloads image URL for a specific item
 */
export async function reloadItemImage(marketHashName: string): Promise<string | null> {
  console.log(`[DEBUG] reloadItemImage called for: ${marketHashName}`);
  
  // Start worker task for individual image loading
  const taskId = await startWorkerTask(
    "image_fetch",
    "Loading Item Image",
    `Fetching image for ${marketHashName}`,
    { marketHashName }
  );
  
  try {
    const imageLoaderModule = await import('./image-loader.server');
    console.log(`[DEBUG] Image loader module imported:`, Object.keys(imageLoaderModule));
    const { getItemImageUrl } = imageLoaderModule;
    console.log(`[DEBUG] getItemImageUrl function:`, typeof getItemImageUrl);
    console.log(`[DEBUG] Calling getItemImageUrl now...`);
    const imageUrl = await getItemImageUrl(marketHashName);
    console.log(`[DEBUG] getItemImageUrl returned: ${imageUrl}`);
    
    if (imageUrl) {
      await updateData((data) => {
        // Find all items with this market hash name and update their images
        const itemsWithHashName = Object.values(data.items).filter(
          item => item.market_hash_name === marketHashName
        );
        
        for (const item of itemsWithHashName) {
          item.image_url = imageUrl;
        }
      });
    }
    
    // Complete worker task
    await completeWorkerTask(taskId, true);
    
    return imageUrl;
  } catch (error) {
    // Complete worker task with error
    await completeWorkerTask(taskId, false, error instanceof Error ? error.message : String(error));
    throw error;
  }
}

/**
 * Reloads image URLs for all items that don't have images
 */
export async function reloadAllItemImages(imageLoadingDelayMs: number = 3000): Promise<{ success: number; failed: number; errors: string[] }> {
  console.log(`[DEBUG] reloadAllItemImages called`);
  const imageLoaderModule = await import('./image-loader.server');
  console.log(`[DEBUG] Image loader module imported in reloadAllItemImages:`, Object.keys(imageLoaderModule));
  const { getItemImageUrl } = imageLoaderModule;
  console.log(`[DEBUG] getItemImageUrl function in reloadAllItemImages:`, typeof getItemImageUrl);
  const data = await readData();
  const itemsWithoutImages = Object.values(data.items).filter(item => !item.image_url);
  
  let success = 0;
  let failed = 0;
  const errors: string[] = [];
  
  // Start worker task
  const taskId = await startWorkerTask(
    "bulk_image_reload",
    "Reloading Item Images",
    `Loading images for ${itemsWithoutImages.length} items with ${imageLoadingDelayMs}ms delay`,
    { totalItems: itemsWithoutImages.length, delayMs: imageLoadingDelayMs }
  );
  
  console.log(`Reloading images for ${itemsWithoutImages.length} items...`);
  
  for (let i = 0; i < itemsWithoutImages.length; i++) {
    const item = itemsWithoutImages[i];
    try {
      // Update progress
      await updateWorkerTaskProgress(taskId, { current: i, total: itemsWithoutImages.length });
      
      console.log(`[DEBUG] Calling getItemImageUrl for: ${item.market_hash_name}`);
      const imageUrl = await getItemImageUrl(item.market_hash_name, item.appid);
      console.log(`[DEBUG] getItemImageUrl returned for ${item.market_hash_name}: ${imageUrl}`);
      if (imageUrl) {
        await updateData((data) => {
          // Find all items with this market hash name and update their images
          const itemsWithHashName = Object.values(data.items).filter(
            itemToUpdate => itemToUpdate.market_hash_name === item.market_hash_name
          );
          
          for (const itemToUpdate of itemsWithHashName) {
            itemToUpdate.image_url = imageUrl;
          }
        });
        success++;
        console.log(`✓ Loaded image for: ${item.market_hash_name}`);
      } else {
        failed++;
        errors.push(`No image found for: ${item.market_hash_name}`);
        console.log(`✗ No image found for: ${item.market_hash_name}`);
      }
      
      // Add a configurable delay to avoid overwhelming Steam's servers
      if (i < itemsWithoutImages.length - 1) {
        console.log(`Waiting ${imageLoadingDelayMs}ms before next image request...`);
        await new Promise(resolve => setTimeout(resolve, imageLoadingDelayMs));
      }
    } catch (error) {
      failed++;
      const errorMsg = `Error loading image for ${item.market_hash_name}: ${error}`;
      errors.push(errorMsg);
      console.error(errorMsg);
    }
  }
  
  // Complete worker task
  await completeWorkerTask(taskId, true);
  
  console.log(`Image reload complete: ${success} success, ${failed} failed`);
  return { success, failed, errors };
}
