import { promises as fs } from "fs";
import path from "path";
import { convertCurrency } from "./currency-converter.server";
import {
  sendPriceSpikeNotification,
  type PriceSpikeNotificationPayload,
} from "./discord-webhook.server";

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

export interface Item {
  market_hash_name: string;
  label: string;
  description?: string;
  appid: number;
  steam_url: string;
  purchase_price: number;
  quantity: number;
  purchase_currency: string;
  stickers?: CustomizationWithHistory[]; // Max 6 for weapons
  charms?: CustomizationWithHistory[]; // Max 1 for weapons
  patches?: CustomizationWithHistory[]; // For character skins
  include_customizations_in_price?: boolean; // Whether to include customization costs in selling price
}

export interface ItemWithHistory extends Item {
  price_history: PriceEntry[];
}

export interface SoldItem {
  market_hash_name: string;
  label: string;
  description?: string;
  appid: number;
  steam_url: string;
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
  items: Record<string, ItemWithHistory>;
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
const PRICE_SPIKE_TIME_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

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

export async function addOrUpdateItem(item: Item): Promise<void> {
  await updateData((data) => {
    if (!data.items[item.market_hash_name]) {
      const itemWithHistory: ItemWithHistory = {
        ...item,
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
      data.items[item.market_hash_name] = itemWithHistory;
      return;
    }

    const existingItem = data.items[item.market_hash_name];
    existingItem.label = item.label;
    existingItem.description = item.description;
    existingItem.appid = item.appid;
    existingItem.steam_url = item.steam_url;
    existingItem.purchase_price = item.purchase_price;
    existingItem.quantity = item.quantity;
    existingItem.purchase_currency = item.purchase_currency;
    existingItem.include_customizations_in_price =
      item.include_customizations_in_price;

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
  });
}

export async function removeItem(marketHashName: string): Promise<void> {
  await updateData((data) => {
    delete data.items[marketHashName];
  });
}

export async function addPriceEntry(
  marketHashName: string,
  price: number
): Promise<void> {
  let spikeNotification: PriceSpikeNotificationPayload | null = null;

  await updateData((data) => {
    const item = data.items[marketHashName];
    if (!item) {
      return;
    }

    const now = new Date();
    const nowIso = now.toISOString();
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
}

export async function getAllItems(): Promise<ItemWithHistory[]> {
  const data = await readData();
  return Object.values(data.items);
}

export async function getItem(
  marketHashName: string
): Promise<ItemWithHistory | null> {
  const data = await readData();
  return data.items[marketHashName] || null;
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

async function calculateInventoryValue(data: DataStore): Promise<{
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

    const latestItemPrice =
      item.price_history.length > 0
        ? item.price_history[item.price_history.length - 1].median_price
        : purchasePriceUsd;

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

export async function getInventoryValue(): Promise<{
  total_purchase_value: number;
  total_current_value: number;
  total_profit_loss: number;
  total_profit_loss_percentage: number;
  timeline: Array<{ date: string; total_value: number }>;
}> {
  const data = await readData();
  return calculateInventoryValue(data);
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
  marketHashName: string,
  soldPrice: number,
  soldCurrency: string,
  soldPriceUsd: number
): Promise<void> {
  await updateData(async (data) => {
    const item = data.items[marketHashName];

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
      market_hash_name: item.market_hash_name,
      label: item.label,
      description: item.description,
      appid: item.appid,
      steam_url: item.steam_url,
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
    delete data.items[marketHashName];

    console.log(
      `[Data Storage] Marked item as sold: ${marketHashName} for ${soldCurrency}${soldPrice}`
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
    if (!data.items[marketHashName]) {
      return;
    }

    const item = data.items[marketHashName];
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
