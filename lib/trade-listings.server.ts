interface TradeListing {
  site: string;
  price: number;
  currency: string;
  float?: number | null;
  condition: string;
  url?: string;
}

interface ProviderConfig {
  name: string;
  baseUrl: string;
  color: string;
}

const PROVIDERS: ProviderConfig[] = [
  { name: "CS.MONEY", baseUrl: "https://cs.money/csgo", color: "bg-blue-500" },
  { name: "SkinsMonkey", baseUrl: "https://skinsmonkey.com", color: "bg-purple-500" },
  { name: "CSFloat", baseUrl: "https://csfloat.com", color: "bg-green-500" },
  { name: "Skinport", baseUrl: "https://skinport.com", color: "bg-amber-500" },
  { name: "Skinbid", baseUrl: "https://skinbid.com", color: "bg-rose-500" },
  { name: "TradeIt", baseUrl: "https://tradeit.gg", color: "bg-sky-500" },
];

const WEAR_TIERS = [
  "Factory New",
  "Minimal Wear",
  "Field-Tested",
  "Well-Worn",
  "Battle-Scarred",
];

// NOTE: The providers above do not expose unauthenticated public APIs.
// These functions currently return mock data so the UI can be exercised
// without external dependencies. Replace the implementation with real
// provider integrations as credentials/endpoints become available.

function generateMockListings(
  provider: ProviderConfig,
  marketHashName: string
): TradeListing[] {
  const seed = Array.from(marketHashName).reduce(
    (acc, char) => acc + char.charCodeAt(0),
    provider.name.length
  );

  return Array.from({ length: 5 }).map((_, index) => {
    const wearIndex = (seed + index) % WEAR_TIERS.length;
    const basePrice = 50 + ((seed % 30) + index * 3);
    const variance = ((seed * (index + 1)) % 100) / 100;

    return {
      site: provider.name,
      price: Number((basePrice + variance).toFixed(2)),
      currency: "USD",
      float: Number(((seed % 1000) / 1000 + index * 0.01).toFixed(3)),
      condition: WEAR_TIERS[wearIndex],
      url: `${provider.baseUrl}/?search=${encodeURIComponent(marketHashName)}`,
    };
  });
}

export type { TradeListing };

export async function fetchTradeListings(
  marketHashName: string
): Promise<TradeListing[]> {
  // Swap the mock aggregation below with real API calls.
  return PROVIDERS.flatMap((provider) =>
    generateMockListings(provider, marketHashName)
  );
}
