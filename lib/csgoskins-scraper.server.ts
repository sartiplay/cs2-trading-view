import { ExternalPriceData } from "./external-data-storage.server";

export interface CSGOSkinsItemData {
  currentPrice: number;
  currency: string;
  priceChange24h: number;
  priceChange24hPercent: number;
  tradingVolume24h: number;
  marketCap: number;
  weekLow: number;
  weekHigh: number;
  monthLow: number;
  monthHigh: number;
  yearLow: number;
  yearHigh: number;
  allTimeLow: number;
  allTimeHigh: number;
  popularity: number;
  communityRating: number;
  votes: number;
}

export async function scrapeCSGOSkinsPrice(marketHashName: string): Promise<CSGOSkinsItemData | null> {
  try {
    console.log(`[CSGOSKINS Scraper] Scraping price for: ${marketHashName}`);
    
    // Convert market hash name to CSGOSKINS.GG URL format
    const url = convertMarketHashNameToURL(marketHashName);
    console.log(`[CSGOSKINS Scraper] URL: ${url}`);
    
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
      console.error(`[CSGOSKINS Scraper] HTTP error: ${response.status}`);
      return null;
    }

    const html = await response.text();
    return parseCSGOSkinsHTML(html, url);
  } catch (error) {
    console.error(`[CSGOSKINS Scraper] Error scraping ${marketHashName}:`, error);
    return null;
  }
}

function convertMarketHashNameToURL(marketHashName: string): string {
  // Convert Steam market hash name to CSGOSKINS.GG URL format
  // Examples:
  // "★ Survival Knife" -> "survival-knife-vanilla"
  // "USP-S | Black Lotus" -> "usp-s-black-lotus"
  // "M4A1-S | Black Lotus (Field-Tested)" -> "m4a1-s-black-lotus"
  // "StatTrak™ AK-47 | Redline (Minimal Wear)" -> "ak-47-redline"
  
  // Remove rarity indicators (★, StatTrak™, Souvenir, etc.)
  let cleanName = marketHashName
    .replace(/★\s*/g, '') // Remove star symbol
    .replace(/StatTrak™\s*/g, '') // Remove StatTrak™
    .replace(/Souvenir\s*/g, '') // Remove Souvenir
    .replace(/★\s*/g, '') // Remove any remaining stars
    .trim();

  // Remove wear condition from parentheses (we don't need it in the URL)
  cleanName = cleanName.replace(/\s*\([^)]+\)\s*/, '').trim();

  // Convert to URL format
  let url = cleanName
    .toLowerCase()
    .replace(/\s*\|\s*/g, '-') // Replace pipe with dash
    .replace(/\s+/g, '-') // Replace spaces with dashes
    .replace(/[^\w\-]/g, '') // Remove special characters except dashes
    .replace(/-+/g, '-') // Replace multiple dashes with single dash
    .replace(/^-|-$/g, ''); // Remove leading/trailing dashes

  // For items without wear conditions, add "vanilla" for knives and some other items
  if (url.includes('knife') || url.includes('glove')) {
    url += '-vanilla';
  }

  return `https://csgoskins.gg/items/${url}`;
}

function parseCSGOSkinsHTML(html: string, url: string): CSGOSkinsItemData | null {
  try {
    // Extract current price
    const currentPriceMatch = html.match(/Current Price[\s\S]*?\$([\d,]+\.?\d*)/);
    const currentPrice = currentPriceMatch ? parseFloat(currentPriceMatch[1].replace(/,/g, '')) : 0;

    // Extract 24h price change
    const priceChangeMatch = html.match(/24h Price Change[\s\S]*?\$([+-]?[\d,]+\.?\d*)\s*\(([+-]?\d+\.?\d*)%\)/);
    const priceChange24h = priceChangeMatch ? parseFloat(priceChangeMatch[1].replace(/,/g, '')) : 0;
    const priceChange24hPercent = priceChangeMatch ? parseFloat(priceChangeMatch[2]) : 0;

    // Extract trading volume
    const volumeMatch = html.match(/24h Trading Volume[\s\S]*?\$([\d,]+\.?\d*)/);
    const tradingVolume24h = volumeMatch ? parseFloat(volumeMatch[1].replace(/,/g, '')) : 0;

    // Extract market cap
    const marketCapMatch = html.match(/Market Cap[\s\S]*?\$([\d,]+\.?\d*)/);
    const marketCap = marketCapMatch ? parseFloat(marketCapMatch[1].replace(/,/g, '')) : 0;

    // Extract price ranges
    const weekLowMatch = html.match(/7 Day Low[\s\S]*?\$([\d,]+\.?\d*)/);
    const weekLow = weekLowMatch ? parseFloat(weekLowMatch[1].replace(/,/g, '')) : 0;

    const weekHighMatch = html.match(/7 Day High[\s\S]*?\$([\d,]+\.?\d*)/);
    const weekHigh = weekHighMatch ? parseFloat(weekHighMatch[1].replace(/,/g, '')) : 0;

    const monthLowMatch = html.match(/30 Day Low[\s\S]*?\$([\d,]+\.?\d*)/);
    const monthLow = monthLowMatch ? parseFloat(monthLowMatch[1].replace(/,/g, '')) : 0;

    const monthHighMatch = html.match(/30 Day High[\s\S]*?\$([\d,]+\.?\d*)/);
    const monthHigh = monthHighMatch ? parseFloat(monthHighMatch[1].replace(/,/g, '')) : 0;

    const yearLowMatch = html.match(/52 Week Low[\s\S]*?\$([\d,]+\.?\d*)/);
    const yearLow = yearLowMatch ? parseFloat(yearLowMatch[1].replace(/,/g, '')) : 0;

    const yearHighMatch = html.match(/52 Week High[\s\S]*?\$([\d,]+\.?\d*)/);
    const yearHigh = yearHighMatch ? parseFloat(yearHighMatch[1].replace(/,/g, '')) : 0;

    const allTimeLowMatch = html.match(/All Time Low[\s\S]*?\$([\d,]+\.?\d*)/);
    const allTimeLow = allTimeLowMatch ? parseFloat(allTimeLowMatch[1].replace(/,/g, '')) : 0;

    const allTimeHighMatch = html.match(/All Time High[\s\S]*?\$([\d,]+\.?\d*)/);
    const allTimeHigh = allTimeHighMatch ? parseFloat(allTimeHighMatch[1].replace(/,/g, '')) : 0;

    // Extract popularity
    const popularityMatch = html.match(/Popularity[\s\S]*?(\d+)%/);
    const popularity = popularityMatch ? parseInt(popularityMatch[1]) : 0;

    // Extract community rating
    const ratingMatch = html.match(/(\d+\.?\d*)\s*Rating[\s\S]*?(\d+[K]?)\s*Votes/);
    const communityRating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;
    const votes = ratingMatch ? parseVoteCount(ratingMatch[2]) : 0;

    if (currentPrice === 0) {
      console.error(`[CSGOSKINS Scraper] Could not extract current price from HTML`);
      return null;
    }

    const result: CSGOSkinsItemData = {
      currentPrice,
      currency: "USD",
      priceChange24h,
      priceChange24hPercent,
      tradingVolume24h,
      marketCap,
      weekLow,
      weekHigh,
      monthLow,
      monthHigh,
      yearLow,
      yearHigh,
      allTimeLow,
      allTimeHigh,
      popularity,
      communityRating,
      votes,
    };

    console.log(`[CSGOSKINS Scraper] Successfully scraped data:`, result);
    return result;
  } catch (error) {
    console.error(`[CSGOSKINS Scraper] Error parsing HTML:`, error);
    return null;
  }
}

function parseVoteCount(voteStr: string): number {
  if (voteStr.includes('K')) {
    return Math.floor(parseFloat(voteStr.replace('K', '')) * 1000);
  }
  return parseInt(voteStr) || 0;
}

export async function scrapeMultipleCSGOSkinsPrices(marketHashNames: string[]): Promise<Map<string, CSGOSkinsItemData>> {
  const results = new Map<string, CSGOSkinsItemData>();
  
  for (const marketHashName of marketHashNames) {
    try {
      const data = await scrapeCSGOSkinsPrice(marketHashName);
      if (data) {
        results.set(marketHashName, data);
      }
      
      // Add delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`[CSGOSKINS Scraper] Error scraping ${marketHashName}:`, error);
    }
  }
  
  return results;
}
