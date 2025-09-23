import { NextRequest, NextResponse } from "next/server";

async function resolveSteamId(steamId: string): Promise<string | null> {
  try {
    console.log('Resolving Steam ID:', steamId);
    
    // If it's already a numeric Steam ID, return it
    if (/^\d{17}$/.test(steamId)) {
      console.log('Numeric Steam ID found:', steamId);
      return steamId;
    }

    // If it's a custom URL, resolve it
    if (steamId.startsWith('custom_')) {
      const customId = steamId.replace('custom_', '');
      const profileUrl = `https://steamcommunity.com/id/${customId}/`;
      
      console.log('Fetching profile URL:', profileUrl);
      
      const response = await fetch(profileUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      });

      console.log('Profile fetch response status:', response.status);

      if (response.ok) {
        const html = await response.text();
        // Look for the Steam ID in the page
        const steamIdMatch = html.match(/g_steamID\s*=\s*"(\d{17})"/);
        if (steamIdMatch) {
          console.log('Resolved Steam ID:', steamIdMatch[1]);
          return steamIdMatch[1];
        } else {
          console.log('No Steam ID found in profile page');
          // Try alternative patterns
          const altMatch = html.match(/steamid['"]\s*:\s*['"](\d{17})['"]/);
          if (altMatch) {
            console.log('Resolved Steam ID (alternative):', altMatch[1]);
            return altMatch[1];
          }
        }
      } else {
        console.log('Failed to fetch profile:', response.status, response.statusText);
      }
    }

    console.log('Could not resolve Steam ID');
    return null;
  } catch (error) {
    console.error('Error resolving Steam ID:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const steamIdParam = searchParams.get("steamid");

    if (!steamIdParam) {
      return NextResponse.json({ error: "Steam ID is required" }, { status: 400 });
    }

    // Handle special cases
    if (steamIdParam === 'current_user') {
      return NextResponse.json({ error: "Current user inventory not supported in this context" }, { status: 400 });
    }

    // Resolve Steam ID (handles custom URLs)
    const steamId = await resolveSteamId(steamIdParam);
    if (!steamId) {
      return NextResponse.json({ error: "Could not resolve Steam ID from URL" }, { status: 400 });
    }

    // Try multiple Steam API endpoints
    const endpoints = [
      `https://steamcommunity.com/inventory/${steamId}/730/2?l=english&count=5000`,
      `https://steamcommunity.com/inventory/${steamId}/730/2`,
      `https://steamcommunity.com/profiles/${steamId}/inventory/json/730/2/`,
      `https://steamcommunity.com/profiles/${steamId}/inventory/#730`
    ];
    
    let response: Response | null = null;
    let lastError: string = '';
    
    for (const inventoryUrl of endpoints) {
      console.log('Trying Steam inventory endpoint:', inventoryUrl);
      
      try {
        const headers: Record<string, string> = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          'Connection': 'keep-alive',
        };

        // Different headers for different endpoint types
        if (inventoryUrl.includes('/inventory/')) {
          headers['Accept'] = 'application/json, text/plain, */*';
          headers['Sec-Fetch-Dest'] = 'empty';
          headers['Sec-Fetch-Mode'] = 'cors';
          headers['Sec-Fetch-Site'] = 'same-origin';
        } else {
          headers['Accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8';
        }

        response = await fetch(inventoryUrl, { headers });
        
        console.log('Steam API response status:', response.status);
        
        if (response.ok) {
          console.log('Successfully fetched inventory from:', inventoryUrl);
          break;
        } else {
          lastError = `Status ${response.status}`;
          // Log the response body for debugging
          try {
            const responseText = await response.text();
            console.log('Error response body:', responseText.substring(0, 500));
          } catch (e) {
            console.log('Could not read error response body');
          }
        }
      } catch (error) {
        lastError = `Error: ${error}`;
        console.log('Failed to fetch from:', inventoryUrl, error);
      }
    }
    
    if (!response) {
      return NextResponse.json(
        { error: "Failed to fetch Steam inventory from any endpoint" },
        { status: 500 }
      );
    }

    if (!response.ok) {
      let errorMessage = "Failed to fetch Steam inventory. Make sure the inventory is public.";
      
      // Log the response body for debugging
      try {
        const responseText = await response.text();
        console.log('Steam API error response:', responseText);
      } catch (e) {
        console.log('Could not read error response body');
      }
      
      if (response.status === 403) {
        errorMessage = "Steam inventory is private or restricted. Please make sure your inventory is set to public.";
      } else if (response.status === 404) {
        errorMessage = "Steam inventory not found. Please check the URL and make sure the user exists.";
      } else if (response.status === 400) {
        errorMessage = "Invalid request to Steam API. The inventory might not be accessible or the API format has changed.";
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (!data.success || !data.assets || !data.descriptions) {
      return NextResponse.json(
        { error: "Invalid Steam inventory data" },
        { status: 400 }
      );
    }

    // Combine assets with descriptions
    const items = data.assets.map((asset: any) => {
      const description = data.descriptions.find((desc: any) => 
        desc.classid === asset.classid && desc.instanceid === asset.instanceid
      );

      if (!description) return null;

      return {
        assetid: asset.assetid,
        classid: asset.classid,
        instanceid: asset.instanceid,
        amount: asset.amount,
        market_hash_name: description.market_hash_name,
        market_name: description.market_name,
        name: description.name,
        icon_url: description.icon_url,
        icon_url_large: description.icon_url_large,
        type: description.type,
        tradable: description.tradable,
        marketable: description.marketable,
        commodity: description.commodity,
        market_tradable_restriction: description.market_tradable_restriction,
        market_marketable_restriction: description.market_marketable_restriction,
        fraudwarnings: description.fraudwarnings,
        descriptions: description.descriptions,
        actions: description.actions,
        market_actions: description.market_actions,
        tags: description.tags,
      };
    }).filter(Boolean);

    return NextResponse.json({
      success: true,
      items,
      totalItems: items.length,
    });

  } catch (error) {
    console.error("Steam inventory fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch Steam inventory" },
      { status: 500 }
    );
  }
}
