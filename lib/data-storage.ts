import { promises as fs } from "node:fs"
import path from "node:path"

export interface Item {
  market_hash_name: string
  label: string
  appid: number
}

export interface PriceEntry {
  date: string
  median_price: number
}

export interface ItemWithHistory extends Item {
  price_history: PriceEntry[]
}

export interface DataStore {
  items: Record<string, ItemWithHistory>
  metadata: {
    last_capture: string | null
    total_captures: number
    created_at: string
  }
}

const DATA_FILE = path.join(process.cwd(), "data.json")

export async function readData(): Promise<DataStore> {
  try {
    const data = await fs.readFile(DATA_FILE, "utf-8")
    const parsed = JSON.parse(data)

    if (!parsed.metadata) {
      parsed.metadata = {
        last_capture: null,
        total_captures: 0,
        created_at: new Date().toISOString(),
      }
    }

    return parsed
  } catch (error) {
    // If file doesn't exist, return empty structure
    console.log("[Data Storage] Creating new data file")
    return {
      items: {},
      metadata: {
        last_capture: null,
        total_captures: 0,
        created_at: new Date().toISOString(),
      },
    }
  }
}

export async function writeData(data: DataStore): Promise<void> {
  try {
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2))
    console.log("[Data Storage] Data saved successfully")
  } catch (error) {
    console.error("[Data Storage] Failed to write data:", error)
    throw error
  }
}

export async function addOrUpdateItem(item: Item): Promise<void> {
  const data = await readData()

  if (!data.items[item.market_hash_name]) {
    data.items[item.market_hash_name] = {
      ...item,
      price_history: [],
    }
  } else {
    // Update existing item info but keep price history
    data.items[item.market_hash_name].label = item.label
    data.items[item.market_hash_name].appid = item.appid
  }

  await writeData(data)
}

export async function removeItem(marketHashName: string): Promise<void> {
  const data = await readData()
  delete data.items[marketHashName]
  await writeData(data)
}

export async function addPriceEntry(marketHashName: string, price: number): Promise<void> {
  const data = await readData()

  if (data.items[marketHashName]) {
    const today = new Date().toISOString().split("T")[0]

    // Remove any existing entry for today
    data.items[marketHashName].price_history = data.items[marketHashName].price_history.filter(
      (entry) => entry.date !== today,
    )

    // Add new entry
    data.items[marketHashName].price_history.push({
      date: today,
      median_price: price,
    })

    // Sort by date
    data.items[marketHashName].price_history.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    data.metadata.last_capture = new Date().toISOString()
    data.metadata.total_captures += 1

    console.log(`[Data Storage] Added price entry for ${marketHashName}: $${price.toFixed(2)}`)
  }

  await writeData(data)
}

export async function getAllItems(): Promise<ItemWithHistory[]> {
  const data = await readData()
  return Object.values(data.items)
}

export async function getItem(marketHashName: string): Promise<ItemWithHistory | null> {
  const data = await readData()
  return data.items[marketHashName] || null
}

export async function getCaptureStats(): Promise<{
  last_capture: string | null
  total_captures: number
  total_items: number
}> {
  const data = await readData()
  return {
    last_capture: data.metadata.last_capture,
    total_captures: data.metadata.total_captures,
    total_items: Object.keys(data.items).length,
  }
}
