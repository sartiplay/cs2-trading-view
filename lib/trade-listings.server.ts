interface TradeListing {
  site: string;
  price: number;
  currency: string;
  float?: number | null;
  condition: string;
  url?: string;
}

import {
  TRADE_PROVIDERS,
  type TradeProviderMeta,
} from "./trade-providers";

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
  provider: TradeProviderMeta,
  marketHashName: string,
  limit: number
): TradeListing[] {
  const seed = Array.from(marketHashName).reduce(
    (acc, char) => acc + char.charCodeAt(0),
    provider.name.length
  );

  return Array.from({ length: limit }).map((_, index) => {
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
  marketHashName: string,
  limit = 5
): Promise<TradeListing[]> {
  // Swap the mock aggregation below with real API calls.
  return TRADE_PROVIDERS.flatMap((provider) =>
    generateMockListings(provider, marketHashName, limit)
  );
}
