import { promises as fs } from "fs";
import path from "path";

// Generate a unique ID for external price entries
function generateExternalPriceId(): string {
  return `ext_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

const EXTERNAL_DATA_FILE = path.join(process.cwd(), "external.data.json");

export interface ExternalPriceData {
  id: string; // Unique identifier for this external price entry
  market_hash_name: string;
  current_price?: number; // Optional for SkinsMonkey (trade value)
  currency: string;
  source: "csgoskins.gg" | "skinsmonkey";
  last_updated: string;
  url: string;
  
  // CSGOSKINS.GG specific data
  price_change_24h?: number;
  price_change_24h_percent?: number;
  trading_volume_24h?: number;
  market_cap?: number;
  week_low?: number;
  week_high?: number;
  month_low?: number;
  month_high?: number;
  year_low?: number;
  year_high?: number;
  all_time_low?: number;
  all_time_high?: number;
  popularity?: number;
  community_rating?: number;
  votes?: number;
  
  // SkinsMonkey specific data
  trade_value?: number;
  offers_count?: number;
}

export interface ExternalDataStore {
  price_data: Record<string, ExternalPriceData>; // Keyed by unique ID
  metadata: {
    last_updated: string | null;
    total_items: number;
    created_at: string;
  };
}

const defaultExternalData: ExternalDataStore = {
  price_data: {},
  metadata: {
    last_updated: null,
    total_items: 0,
    created_at: new Date().toISOString(),
  },
};

async function readExternalData(): Promise<ExternalDataStore> {
  try {
    const fileContent = await fs.readFile(EXTERNAL_DATA_FILE, "utf-8");
    return JSON.parse(fileContent);
  } catch (error: any) {
    if (error.code === "ENOENT") {
      // File doesn't exist, create it with default data
      await writeExternalData(defaultExternalData);
      return defaultExternalData;
    }
    console.error("[External Data Storage] Failed to read external data:", error);
    return defaultExternalData;
  }
}

async function writeExternalData(data: ExternalDataStore): Promise<void> {
  try {
    await fs.writeFile(EXTERNAL_DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("[External Data Storage] Failed to write external data:", error);
  }
}

async function updateExternalData(
  callback: (data: ExternalDataStore) => void
): Promise<void> {
  const data = await readExternalData();
  callback(data);
  await writeExternalData(data);
}

export async function addExternalPriceData(priceData: ExternalPriceData): Promise<string> {
  // Generate unique ID if not provided
  const priceId = priceData.id || generateExternalPriceId();
  
  await updateExternalData((data) => {
    // Create the price data with the unique ID
    const priceDataWithId = {
      ...priceData,
      id: priceId,
    };
    
    data.price_data[priceId] = priceDataWithId;
    data.metadata.last_updated = new Date().toISOString();
    data.metadata.total_items = Object.keys(data.price_data).length;
  });
  
  console.log(`[External Data Storage] Added price data for ${priceData.market_hash_name}: $${priceData.current_price} (ID: ${priceId})`);
  return priceId;
}

export async function getExternalPriceData(marketHashName: string, source?: "csgoskins.gg" | "skinsmonkey"): Promise<ExternalPriceData | null> {
  const data = await readExternalData();
  // Find entries with this market_hash_name, optionally filtered by source
  let entries = Object.values(data.price_data).filter(price => price.market_hash_name === marketHashName);
  
  if (source) {
    entries = entries.filter(price => price.source === source);
  }
  
  if (entries.length === 0) return null;
  
  // Return the most recent entry (latest last_updated timestamp)
  return entries.reduce((latest, current) => {
    return new Date(current.last_updated) > new Date(latest.last_updated) ? current : latest;
  });
}

export async function getAllExternalPriceData(): Promise<ExternalPriceData[]> {
  const data = await readExternalData();
  return Object.values(data.price_data);
}

export async function removeExternalPriceData(marketHashName: string): Promise<void> {
  await updateExternalData((data) => {
    // Find and remove the first entry with this market_hash_name
    const entryToRemove = Object.entries(data.price_data).find(([_, price]) => price.market_hash_name === marketHashName);
    if (entryToRemove) {
      const [priceId] = entryToRemove;
      delete data.price_data[priceId];
      data.metadata.total_items = Object.keys(data.price_data).length;
      console.log(`[External Data Storage] Removed price data for ${marketHashName} (ID: ${priceId})`);
    }
  });
}

export async function getExternalDataMetadata(): Promise<ExternalDataStore["metadata"]> {
  const data = await readExternalData();
  return data.metadata;
}

// Migration function to convert existing external.data.json to use unique IDs
export async function migrateExternalDataToUseIds(): Promise<void> {
  console.log("[External Data Migration] Starting migration to use unique IDs...");
  
  const data = await readExternalData();
  let migrationNeeded = false;
  
  // Check if any entries are missing IDs
  const entries = Object.entries(data.price_data);
  
  for (const [key, priceData] of entries) {
    if (!priceData.id) {
      migrationNeeded = true;
      break;
    }
  }
  
  if (!migrationNeeded) {
    console.log("[External Data Migration] No migration needed - all entries already have IDs");
    return;
  }
  
  console.log("[External Data Migration] Migration needed - adding IDs to existing entries...");
  
  // Create new price_data object with IDs as keys
  const newPriceData: Record<string, ExternalPriceData> = {};
  
  for (const [oldKey, priceData] of entries) {
    // Generate new ID if entry doesn't have one
    const priceId = priceData.id || generateExternalPriceId();
    
    // Add ID to price data if it's missing
    const updatedPriceData = {
      ...priceData,
      id: priceId,
    };
    
    // Use the price ID as the new key
    newPriceData[priceId] = updatedPriceData;
    
    console.log(`[External Data Migration] Migrated entry: ${priceData.market_hash_name} -> ${priceId}`);
  }
  
  // Update the data structure
  const updatedData = {
    ...data,
    price_data: newPriceData,
  };
  
  await writeExternalData(updatedData);
  
  console.log(`[External Data Migration] Successfully migrated ${entries.length} entries to use IDs`);
}
