export interface SteamPriceResponse {
  success: boolean
  lowest_price?: string
  volume?: string
  median_price?: string
}

export async function fetchSteamPrice(marketHashName: string, appid = 730): Promise<number | null> {
  try {
    const url = `https://steamcommunity.com/market/priceoverview/?appid=${appid}&currency=1&market_hash_name=${encodeURIComponent(marketHashName)}`

    console.log(`[Steam API] Fetching price for: ${marketHashName}`)

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    })

    if (!response.ok) {
      console.error(`[Steam API] HTTP ${response.status} for ${marketHashName}`)
      throw new Error(`Steam API responded with ${response.status}`)
    }

    const data: SteamPriceResponse = await response.json()

    if (data.success && data.median_price) {
      // Remove currency symbol and convert to number
      const priceStr = data.median_price.replace(/[^0-9.]/g, "")
      const price = Number.parseFloat(priceStr)

      console.log(`[Steam API] Successfully fetched price for ${marketHashName}: $${price.toFixed(2)}`)
      return price
    }

    console.warn(`[Steam API] No price data available for ${marketHashName}`)
    return null
  } catch (error) {
    if (error instanceof Error) {
      console.error(`[Steam API] Failed to fetch price for ${marketHashName}: ${error.message}`)
    } else {
      console.error(`[Steam API] Unknown error for ${marketHashName}:`, error)
    }
    return null
  }
}

export async function fetchMultiplePrices(
  items: Array<{ market_hash_name: string; appid: number }>,
  delayMs = 1000,
): Promise<Array<{ market_hash_name: string; price: number | null; error?: string }>> {
  const results = []

  for (let i = 0; i < items.length; i++) {
    const item = items[i]

    try {
      const price = await fetchSteamPrice(item.market_hash_name, item.appid)
      results.push({
        market_hash_name: item.market_hash_name,
        price,
      })
    } catch (error) {
      results.push({
        market_hash_name: item.market_hash_name,
        price: null,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }

    // Add delay between requests except for the last one
    if (i < items.length - 1) {
      console.log(`[Steam API] Waiting ${delayMs}ms before next request...`)
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }

  return results
}
