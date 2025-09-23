import { promises as fs } from "fs";
import path from "path";

/**
 * Fetches item image URL using Steam Market search API
 */
export async function fetchItemImageUrlFromDatabase(marketHashName: string, appid: number = 730): Promise<string | null> {
  try {
    // Use Steam Market search API - this is more reliable than the schema API
    const apiUrl = `https://steamcommunity.com/market/search/render/?query=${encodeURIComponent(marketHashName)}&start=0&count=1&search_descriptions=0&sort_column=popular&sort_dir=desc&appid=${appid}`;
    
    console.log(`Trying Steam Market search API for: ${marketHashName}`);
    
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Referer': `https://steamcommunity.com/market/search?appid=${appid}`,
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
    });

    if (!response.ok) {
      console.log(`Steam Market search API failed: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    console.log(`Steam Market search API response for ${marketHashName}:`, JSON.stringify(data, null, 2));
    
    if (data.results && data.results.length > 0) {
      const item = data.results[0];
      if (item.asset_description && item.asset_description.icon_url) {
        const imageUrl = `https://steamcommunity-a.akamaihd.net/economy/image/${item.asset_description.icon_url}`;
        console.log(`Found image URL (Market search API): ${imageUrl}`);
        return imageUrl;
      }
    }
    
    return null;
  } catch (error) {
    console.log(`Steam Market search API error for ${marketHashName}:`, error);
    return null;
  }
}

/**
 * Fetches item image URL from Steam API based on market hash name
 */
export async function fetchItemImageUrl(marketHashName: string, appid: number = 730): Promise<string | null> {
  try {
    // Steam API endpoint for item details
    const apiUrl = `https://steamcommunity.com/market/listings/${appid}/${encodeURIComponent(marketHashName)}`;
    
    console.log(`Fetching item image for: ${marketHashName}`);
    
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Referer': `https://steamcommunity.com/market/search?appid=${appid}`,
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch item page: ${response.status} ${response.statusText}`);
      return null;
    }

    const html = await response.text();
    
    // Debug: Log a snippet of the HTML to see what we're working with
    console.log(`HTML snippet for ${marketHashName}:`, html.substring(0, 500));
    
    // Try multiple patterns to find the image URL
    const patterns = [
      // Pattern 1: Look for large_item_img class
      /class="large_item_img"[^>]*src="([^"]+)"/,
      // Pattern 2: Look for market_listing_largeimage class
      /class="market_listing_largeimage"[^>]*src="([^"]+)"/,
      // Pattern 3: Look for item image in data attributes
      /data-src="([^"]*steamcommunity-a\.akamaihd\.net\/economy\/image[^"]+)"/,
      // Pattern 4: Look for src with Steam CDN URLs
      /src="([^"]*steamcommunity-a\.akamaihd\.net\/economy\/image[^"]+)"/,
      // Pattern 5: Look for any Steam CDN image URL in the HTML
      /https:\/\/steamcommunity-a\.akamaihd\.net\/economy\/image\/[^"'\s>]+/g,
      // Pattern 6: Look for item images in meta tags
      /<meta[^>]*property="og:image"[^>]*content="([^"]+)"/,
      // Pattern 7: Look for item images in link tags
      /<link[^>]*rel="image_src"[^>]*href="([^"]+)"/,
    ];

    for (let i = 0; i < patterns.length; i++) {
      const pattern = patterns[i];
      const matches = html.match(pattern);
      
      if (matches) {
        let imageUrl = matches[1] || matches[0];
        
        // Clean up the URL
        if (imageUrl.startsWith('//')) {
          imageUrl = 'https:' + imageUrl;
        } else if (imageUrl.startsWith('/')) {
          imageUrl = 'https://steamcommunity-a.akamaihd.net' + imageUrl;
        }
        
        // Validate it's a Steam CDN URL
        if (imageUrl.includes('steamcommunity-a.akamaihd.net/economy/image')) {
          console.log(`Found image URL (pattern ${i + 1}): ${imageUrl}`);
          return imageUrl;
        }
      }
    }

    // Pattern 8: Look for item image in JSON-LD structured data
    const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/s);
    if (jsonLdMatch) {
      try {
        const jsonData = JSON.parse(jsonLdMatch[1]);
        if (jsonData.image && typeof jsonData.image === 'string') {
          console.log(`Found image URL (JSON-LD): ${jsonData.image}`);
          return jsonData.image;
        }
      } catch (e) {
        console.log('Failed to parse JSON-LD data');
      }
    }

    // Pattern 9: Look for images in the page content more broadly
    const broadMatch = html.match(/https:\/\/steamcommunity-a\.akamaihd\.net\/economy\/image\/[a-f0-9]+\/[a-f0-9]+/);
    if (broadMatch) {
      const imageUrl = broadMatch[0];
      console.log(`Found image URL (broad pattern): ${imageUrl}`);
      return imageUrl;
    }

    // Pattern 10: Look for item data in JavaScript variables
    const itemDataMatch = html.match(/var g_rgAssets = ({.*?});/);
    if (itemDataMatch) {
      try {
        const assetsData = JSON.parse(itemDataMatch[1]);
        // Look for the item in the assets data
        for (const appId in assetsData) {
          for (const contextId in assetsData[appId]) {
            for (const assetId in assetsData[appId][contextId]) {
              const asset = assetsData[appId][contextId][assetId];
              if (asset.market_hash_name === marketHashName && asset.icon_url) {
                const imageUrl = `https://steamcommunity-a.akamaihd.net/economy/image/${asset.icon_url}`;
                console.log(`Found image URL (assets data): ${imageUrl}`);
                return imageUrl;
              }
            }
          }
        }
      } catch (e) {
        console.log('Failed to parse assets data');
      }
    }

    // Pattern 11: Look for item data in other JavaScript variables
    const itemInfoMatch = html.match(/var g_rgListingInfo = ({.*?});/);
    if (itemInfoMatch) {
      try {
        const listingData = JSON.parse(itemInfoMatch[1]);
        // Look for the item in the listing data
        for (const listingId in listingData) {
          const listing = listingData[listingId];
          if (listing.market_hash_name === marketHashName && listing.icon_url) {
            const imageUrl = `https://steamcommunity-a.akamaihd.net/economy/image/${listing.icon_url}`;
            console.log(`Found image URL (listing data): ${imageUrl}`);
            return imageUrl;
          }
        }
      } catch (e) {
        console.log('Failed to parse listing data');
      }
    }

    console.log(`No image URL found for: ${marketHashName}`);
    return null;
  } catch (error) {
    console.error(`Error fetching item image for ${marketHashName}:`, error);
    return null;
  }
}

/**
 * Alternative method using Steam inventory API
 */
export async function fetchItemImageUrlFromInventory(marketHashName: string, appid: number = 730): Promise<string | null> {
  try {
    // Try to get item image from Steam inventory API
    // Use a known public profile with CS2 items (this is a public profile ID)
    const publicProfileIds = [
      '76561198000000000', // Placeholder - we'll use a different approach
      '76561198123456789', // Another placeholder
    ];
    
    console.log(`Trying inventory API for: ${marketHashName}`);
    
    // Instead of using a specific profile, let's try to get the item image from the market page differently
    // We'll look for the item in the page's JavaScript data
    const marketUrl = `https://steamcommunity.com/market/listings/${appid}/${encodeURIComponent(marketHashName)}`;
    
    const response = await fetch(marketUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!response.ok) {
      console.log(`Market page not accessible: ${response.status}`);
      return null;
    }

    const html = await response.text();
    
    // Look for item data in JavaScript variables
    const itemDataMatch = html.match(/var g_rgAssets = ({.*?});/);
    if (itemDataMatch) {
      try {
        const assetsData = JSON.parse(itemDataMatch[1]);
        // Look for the item in the assets data
        for (const appId in assetsData) {
          for (const contextId in assetsData[appId]) {
            for (const assetId in assetsData[appId][contextId]) {
              const asset = assetsData[appId][contextId][assetId];
              if (asset.market_hash_name === marketHashName && asset.icon_url) {
                const imageUrl = `https://steamcommunity-a.akamaihd.net/economy/image/${asset.icon_url}`;
                console.log(`Found image URL (assets data): ${imageUrl}`);
                return imageUrl;
              }
            }
          }
        }
      } catch (e) {
        console.log('Failed to parse assets data');
      }
    }
    
    return null;
  } catch (error) {
    console.log(`Inventory API error for ${marketHashName}:`, error);
    return null;
  }
}

/**
 * Alternative method using Steam API JSON endpoint
 */
export async function fetchItemImageUrlFromAPI(marketHashName: string, appid: number = 730): Promise<string | null> {
  try {
    // Steam Market API endpoint
    const apiUrl = `https://steamcommunity.com/market/priceoverview/?appid=${appid}&currency=1&market_hash_name=${encodeURIComponent(marketHashName)}`;
    
    console.log(`Fetching item image via API for: ${marketHashName}`);
    
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!response.ok) {
      console.error(`Steam API request failed: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    
    // The priceoverview API doesn't include image URLs, so we'll need to use the HTML method
    // This is a placeholder for future Steam API endpoints that might include images
    console.log(`Steam API response for ${marketHashName}:`, data);
    return null;
  } catch (error) {
    console.error(`Error fetching item image via API for ${marketHashName}:`, error);
    return null;
  }
}

/**
 * Alternative method using Steam's economy API
 */
export async function fetchItemImageUrlFromEconomyAPI(marketHashName: string, appid: number = 730): Promise<string | null> {
  try {
    // Try Steam's economy API endpoint
    const apiUrl = `https://steamcommunity.com/economy/image/${appid}/${encodeURIComponent(marketHashName)}`;
    
    console.log(`Trying Steam economy API for: ${marketHashName}`);
    
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (response.ok) {
      // If this endpoint returns a valid image, we can use it
      const imageUrl = response.url;
      console.log(`Found image URL (economy API): ${imageUrl}`);
      return imageUrl;
    }
    
    return null;
  } catch (error) {
    console.log(`Steam economy API error for ${marketHashName}:`, error);
    return null;
  }
}

/**
 * Tries to construct a generic image URL for common items
 */
async function tryGenericImageUrl(marketHashName: string): Promise<string | null> {
  // Try to get image from Steam's CDN using known patterns
  // This is a fallback method that tries common Steam CDN URLs
  
  const commonImageHashes = [
    // These are some common CS2 item image hashes that we can try
    'fWFc82js0fmoRAP-qOIPu5THSWqfSm_LLQNmcEa8',
    'fWFc82js0fmoRAP-qOIPu5THSWqfSm_LLQNmcEa8',
    // Add more common hashes here as we discover them
  ];
  
  for (const hash of commonImageHashes) {
    const imageUrl = `https://steamcommunity-a.akamaihd.net/economy/image/${hash}`;
    const isValid = await validateImageUrl(imageUrl);
    if (isValid) {
      console.log(`Found generic image URL: ${imageUrl}`);
      return imageUrl;
    }
  }
  
  // Try to extract a potential image hash from the market hash name
  // This is a very rough approach and likely won't work
  const nameHash = marketHashName.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 16);
  
  if (nameHash.length >= 8) {
    const potentialUrl = `https://steamcommunity-a.akamaihd.net/economy/image/${nameHash}`;
    const isValid = await validateImageUrl(potentialUrl);
    if (isValid) {
      console.log(`Found constructed image URL: ${potentialUrl}`);
      return potentialUrl;
    }
  }
  
  return null;
}

/**
 * Gets a fallback image URL for items that don't have images
 */
function getFallbackImageUrl(marketHashName: string): string | null {
  // For now, we'll return null to indicate no fallback is available
  // In the future, this could return placeholder images or generic item images
  // based on the item type (weapon, sticker, case, etc.)
  
  // You could implement logic here to return different placeholder images
  // based on the item type or category
  return null;
}

/**
 * Validates if an image URL is accessible
 */
export async function validateImageUrl(imageUrl: string): Promise<boolean> {
  try {
    const response = await fetch(imageUrl, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    return response.ok;
  } catch (error) {
    console.error(`Error validating image URL ${imageUrl}:`, error);
    return false;
  }
}

/**
 * Gets the best available image URL for an item
 * Tries multiple methods and validates the result
 */
export async function getItemImageUrl(marketHashName: string, appid: number = 730): Promise<string | null> {
  console.log(`=== Starting image search for: ${marketHashName} ===`);
  
  // Try the Steam database API first (most reliable)
  console.log(`Step 1: Trying Steam Market search API...`);
  let imageUrl = await fetchItemImageUrlFromDatabase(marketHashName, appid);
  
  if (imageUrl) {
    // Validate that the image URL is accessible
    const isValid = await validateImageUrl(imageUrl);
    if (isValid) {
      return imageUrl;
    } else {
      console.log(`Database image URL is not accessible: ${imageUrl}`);
    }
  }

  // If database method failed, try the HTML scraping method
  console.log(`Step 2: Trying HTML scraping method...`);
  imageUrl = await fetchItemImageUrl(marketHashName, appid);
  
  if (imageUrl) {
    // Validate that the image URL is accessible
    const isValid = await validateImageUrl(imageUrl);
    if (isValid) {
      return imageUrl;
    } else {
      console.log(`HTML image URL is not accessible: ${imageUrl}`);
    }
  }

  // If HTML method failed, try inventory API method
  console.log(`Step 3: Trying inventory API method...`);
  imageUrl = await fetchItemImageUrlFromInventory(marketHashName, appid);
  
  if (imageUrl) {
    const isValid = await validateImageUrl(imageUrl);
    if (isValid) {
      return imageUrl;
    } else {
      console.log(`Inventory image URL is not accessible: ${imageUrl}`);
    }
  }

  // If inventory method failed, try economy API method
  console.log(`Step 4: Trying economy API method...`);
  imageUrl = await fetchItemImageUrlFromEconomyAPI(marketHashName, appid);
  
  if (imageUrl) {
    const isValid = await validateImageUrl(imageUrl);
    if (isValid) {
      return imageUrl;
    }
  }

  // If economy API failed, try API method (though it currently returns null)
  console.log(`Step 5: Trying price API method...`);
  imageUrl = await fetchItemImageUrlFromAPI(marketHashName, appid);
  
  if (imageUrl) {
    const isValid = await validateImageUrl(imageUrl);
    if (isValid) {
      return imageUrl;
    }
  }

  // As a last resort, try to construct a generic image URL
  // This won't work for all items, but might work for some common ones
  console.log(`Step 6: Trying generic image construction...`);
  const genericImageUrl = await tryGenericImageUrl(marketHashName);
  if (genericImageUrl) {
    const isValid = await validateImageUrl(genericImageUrl);
    if (isValid) {
      return genericImageUrl;
    }
  }

  // Final fallback: return a placeholder or generic image URL
  // This ensures we always return something, even if it's not the actual item image
  const fallbackUrl = getFallbackImageUrl(marketHashName);
  if (fallbackUrl) {
    console.log(`Using fallback image URL for: ${marketHashName}`);
    return fallbackUrl;
  }

  console.log(`=== No valid image URL found for: ${marketHashName} ===`);
  return null;
}
