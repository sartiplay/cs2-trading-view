import { promises as fs } from "fs";
import path from "path";
import { convertCurrency } from "./currency-converter.server";

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
}

export interface DataStore {
  items: Record<string, ItemWithHistory>;
  sold_items: SoldItem[];
  metadata: {
    last_capture: string | null;
    total_captures: number;
    created_at: string;
  };
}

const DATA_FILE = path.join(process.cwd(), "data.json");

export async function readData(): Promise<DataStore> {
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

    return parsed;
  } catch (error) {
    // If file doesn't exist, return empty structure
    console.log("[Data Storage] Creating new data file");
    return {
      items: {},
      sold_items: [],
      metadata: {
        last_capture: null,
        total_captures: 0,
        created_at: new Date().toISOString(),
      },
    };
  }
}

export async function writeData(data: DataStore): Promise<void> {
  try {
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
    console.log("[Data Storage] Data saved successfully");
  } catch (error) {
    console.error("[Data Storage] Failed to write data:", error);
    throw error;
  }
}

export async function addOrUpdateItem(item: Item): Promise<void> {
  const data = await readData();

  if (!data.items[item.market_hash_name]) {
    // Initialize new item with price history for customizations
    const itemWithHistory: ItemWithHistory = {
      ...item,
      price_history: [],
      stickers: item.stickers?.map((sticker) => ({
        ...sticker,
        price_history: [],
      })),
      charms: item.charms?.map((charm) => ({ ...charm, price_history: [] })),
      patches: item.patches?.map((patch) => ({ ...patch, price_history: [] })),
    };
    data.items[item.market_hash_name] = itemWithHistory;
  } else {
    // Update existing item info but keep price history
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

    // Update customizations while preserving price history
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
  }

  await writeData(data);
}

export async function removeItem(marketHashName: string): Promise<void> {
  const data = await readData();
  delete data.items[marketHashName];
  await writeData(data);
}

export async function addPriceEntry(
  marketHashName: string,
  price: number
): Promise<void> {
  const data = await readData();

  if (data.items[marketHashName]) {
    const now = new Date().toISOString();

    data.items[marketHashName].price_history.push({
      date: now,
      median_price: price,
    });

    // Sort by date
    data.items[marketHashName].price_history.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    data.metadata.last_capture = new Date().toISOString();
    data.metadata.total_captures += 1;

    console.log(
      `[Data Storage] Added price entry for ${marketHashName}: $${price.toFixed(
        2
      )}`
    );
  }

  await writeData(data);
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

export async function getInventoryValue(): Promise<{
  total_purchase_value: number;
  total_current_value: number;
  total_profit_loss: number;
  total_profit_loss_percentage: number;
  timeline: Array<{ date: string; total_value: number }>;
}> {
  const data = await readData();
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
    totalPurchaseValue += purchasePriceUsd * item.quantity;

    const latestPrice =
      item.price_history.length > 0
        ? item.price_history[item.price_history.length - 1].median_price
        : purchasePriceUsd; // Use USD purchase price as fallback

    totalCurrentValue += latestPrice * item.quantity;

    for (const entry of item.price_history) {
      const dateOnly = entry.date.split("T")[0];
      if (!dateValueMap[dateOnly]) {
        dateValueMap[dateOnly] = 0;
      }
      dateValueMap[dateOnly] = Math.max(
        dateValueMap[dateOnly],
        entry.median_price * item.quantity
      );
    }
  }

  // Convert to timeline array and sort by date
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
  const data = await readData();
  const item = data.items[marketHashName];

  if (!item) {
    throw new Error("Item not found");
  }

  const purchasePriceUsd = await convertCurrency(
    item.purchase_price,
    item.purchase_currency,
    "USD"
  );

  // Calculate profit/loss in USD
  const totalPurchaseUsd = purchasePriceUsd * item.quantity;
  const totalSoldUsd = soldPriceUsd * item.quantity;
  const profitLoss = totalSoldUsd - totalPurchaseUsd;
  const profitLossPercentage =
    totalPurchaseUsd > 0 ? (profitLoss / totalPurchaseUsd) * 100 : 0;

  // Create sold item record
  const soldItem: SoldItem = {
    market_hash_name: item.market_hash_name,
    label: item.label,
    description: item.description,
    appid: item.appid,
    steam_url: item.steam_url,
    purchase_price: item.purchase_price,
    purchase_price_usd: purchasePriceUsd, // Store converted USD price
    purchase_currency: item.purchase_currency,
    quantity: item.quantity,
    sold_price: soldPrice,
    sold_price_usd: soldPriceUsd,
    sold_currency: soldCurrency,
    sold_date: new Date().toISOString(),
    profit_loss: profitLoss,
    profit_loss_percentage: profitLossPercentage,
  };

  // Add to sold items and remove from active items
  data.sold_items.push(soldItem);
  delete data.items[marketHashName];

  await writeData(data);
  console.log(
    `[Data Storage] Marked item as sold: ${marketHashName} for ${soldCurrency}${soldPrice}`
  );
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
  const totalPurchaseValueUsd = soldItems.reduce(
    (sum, item) => sum + item.purchase_price_usd * item.quantity,
    0
  );
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
  const data = await readData();

  if (data.items[marketHashName]) {
    const item = data.items[marketHashName];
    const customizations = item[customizationType] as
      | CustomizationWithHistory[]
      | undefined;

    if (customizations && customizations[customizationIndex]) {
      const now = new Date().toISOString();

      if (!customizations[customizationIndex].price_history) {
        customizations[customizationIndex].price_history = [];
      }

      customizations[customizationIndex].price_history.push({
        date: now,
        median_price: price,
      });

      // Sort by date
      customizations[customizationIndex].price_history.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      console.log(
        `[Data Storage] Added customization price entry for ${marketHashName} ${customizationType}[${customizationIndex}]: $${price.toFixed(
          2
        )}`
      );
    }
  }

  await writeData(data);
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
    // Process stickers
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

    // Process charms
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

    // Process patches
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
