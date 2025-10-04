// Using built-in fetch API (available in Node.js 18+ and Next.js)

export interface SkinsMonkeyPriceData {
  market_hash_name: string;
  trade_value?: number;
  offers_count?: number;
  last_updated: string;
  url: string;
  platform: "skinsmonkey";
}

/**
 * Converts a market hash name to a SkinsMonkey search URL
 * SkinsMonkey uses URL encoding for special characters like ★
 */
export function convertMarketHashNameToSkinsMonkeyURL(marketHashName: string): string {
  // URL encode the entire market hash name
  const encodedName = encodeURIComponent(marketHashName);
  return `https://skinsmonkey.com/de/trade?q=${encodedName}`;
}

/**
 * Scrapes price data from SkinsMonkey trading platform
 * @param marketHashName - The item's market hash name
 * @returns Promise<SkinsMonkeyPriceData | null>
 */
export async function scrapeSkinsMonkeyPrice(marketHashName: string): Promise<SkinsMonkeyPriceData | null> {
  try {
    const url = convertMarketHashNameToSkinsMonkeyURL(marketHashName);
    console.log(`Scraping SkinsMonkey for: ${marketHashName}`);
    console.log(`URL: ${url}`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
    });

    if (!response.ok) {
      console.error(`SkinsMonkey request failed: ${response.status} ${response.statusText}`);
      return null;
    }

    const html = await response.text();
    
    // Extract trade value and offers count from the HTML
    const tradeValue = extractTradeValue(html);
    const offersCount = extractOffersCount(html);

    if (tradeValue === null && offersCount === null) {
      console.log(`No trade data found for ${marketHashName} on SkinsMonkey`);
      return null;
    }

    const priceData: SkinsMonkeyPriceData = {
      market_hash_name: marketHashName,
      trade_value: tradeValue || undefined,
      offers_count: offersCount || undefined,
      last_updated: new Date().toISOString(),
      url,
      platform: "skinsmonkey",
    };

    console.log(`SkinsMonkey data extracted for ${marketHashName}:`, priceData);
    return priceData;

  } catch (error) {
    console.error(`Error scraping SkinsMonkey for ${marketHashName}:`, error);
    return null;
  }
}

/**
 * Extracts trade value from SkinsMonkey HTML
 * Looks for price patterns in the HTML content
 */
function extractTradeValue(html: string): number | null {
  try {
    // Look for various price patterns in the HTML
    const pricePatterns = [
      // Look for USD prices like $136.99
      /\$\s*(\d+(?:\.\d{2})?)/g,
      // Look for numeric values that could be prices
      /(?:price|value|cost)[:\s]*\$?\s*(\d+(?:\.\d{2})?)/gi,
      // Look for specific price containers
      /<[^>]*class="[^"]*price[^"]*"[^>]*>\s*\$?\s*(\d+(?:\.\d{2})?)/gi,
    ];

    for (const pattern of pricePatterns) {
      const matches = [...html.matchAll(pattern)];
      if (matches.length > 0) {
        // Get the first reasonable price (filter out obviously wrong values)
        for (const match of matches) {
          const price = parseFloat(match[1]);
          if (price > 0 && price < 100000) { // Reasonable price range
            return price;
          }
        }
      }
    }

    return null;
  } catch (error) {
    console.error("Error extracting trade value:", error);
    return null;
  }
}

/**
 * Extracts offers count from SkinsMonkey HTML
 * Looks for offer/listing count patterns
 */
function extractOffersCount(html: string): number | null {
  try {
    // Look for offer count patterns
    const offerPatterns = [
      // Look for "X offers" or "X Angebote" (German)
      /(\d+)\s*(?:offers|angebote)/gi,
      // Look for "X items" or "X Gegenstände"
      /(\d+)\s*(?:items|gegenstände)/gi,
      // Look for specific offer containers
      /<[^>]*class="[^"]*offer[^"]*"[^>]*>\s*(\d+)/gi,
    ];

    for (const pattern of offerPatterns) {
      const matches = [...html.matchAll(pattern)];
      if (matches.length > 0) {
        const count = parseInt(matches[0][1], 10);
        if (count >= 0) {
          return count;
        }
      }
    }

    return null;
  } catch (error) {
    console.error("Error extracting offers count:", error);
    return null;
  }
}

/**
 * Scrapes multiple items from SkinsMonkey
 * @param marketHashNames - Array of market hash names
 * @returns Promise<Array<SkinsMonkeyPriceData>>
 */
export async function scrapeMultipleSkinsMonkeyPrices(
  marketHashNames: string[]
): Promise<Array<SkinsMonkeyPriceData>> {
  const results: Array<SkinsMonkeyPriceData> = [];
  
  for (const marketHashName of marketHashNames) {
    try {
      const priceData = await scrapeSkinsMonkeyPrice(marketHashName);
      if (priceData) {
        results.push(priceData);
      }
      
      // Add delay between requests to be respectful
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Failed to scrape SkinsMonkey for ${marketHashName}:`, error);
    }
  }
  
  return results;
}

