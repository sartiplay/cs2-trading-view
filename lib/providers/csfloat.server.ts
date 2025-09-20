import type { TradeListing } from "../trade-listings.server";

interface CSFloatListingsResponse {
  listings: CSFloatListing[];
}

interface CSFloatListing {
  id: string;
  price: CSFloatPrice;
  inspect_link?: string;
  asset: {
    market_hash_name: string;
    paint_index?: number;
    phase?: string | null;
    paint_seed?: number | null;
    paint_wear?: number | null;
    exterior?: string | null;
  };
}

interface CSFloatPrice {
  amount: number;
  currency: string;
}

const API_BASE_URL = "https://api.csfloat.com";

const CONDITION_MAPPING: Record<string, string> = {
  FN: "Factory New",
  "Minimal Wear": "Minimal Wear",
  MW: "Minimal Wear",
  FT: "Field-Tested",
  "Field-Tested": "Field-Tested",
  WW: "Well-Worn",
  "Well-Worn": "Well-Worn",
  BS: "Battle-Scarred",
  "Battle-Scarred": "Battle-Scarred",
};

function normaliseExterior(exterior?: string | null): string {
  if (!exterior) {
    return "Unknown";
  }

  const trimmed = exterior.trim();
  return (
    CONDITION_MAPPING[trimmed] ||
    CONDITION_MAPPING[trimmed.toUpperCase()] ||
    trimmed
  );
}

export async function fetchCSFloatListings(
  marketHashName: string,
  limit = 5
): Promise<TradeListing[]> {
  if (!marketHashName) {
    throw new Error("marketHashName is required for CSFloat listings");
  }

  const apiKey = process.env.CSFLOAT_API_KEY;
  if (!apiKey) {
    throw new Error("CSFLOAT_API_KEY environment variable is not configured.");
  }

  const searchParams = new URLSearchParams({
    market_hash_name: marketHashName,
    limit: limit.toString(),
    sort: "lowest_price",
    order: "asc",
  });

  const response = await fetch(`${API_BASE_URL}/listings?${searchParams}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `CSFloat API request failed (${response.status}): ${errorBody}`
    );
  }

  const payload = (await response.json()) as CSFloatListingsResponse;

  if (!Array.isArray(payload.listings)) {
    return [];
  }

  return payload.listings.slice(0, limit).map((listing) => {
    const exterior = normaliseExterior(listing.asset.exterior);
    const floatValue = listing.asset.paint_wear ?? listing.asset.paint_seed;

    return {
      site: "CSFloat",
      price: listing.price.amount,
      currency: listing.price.currency || "USD",
      float: typeof floatValue === "number" ? floatValue : null,
      condition: exterior,
      url: listing.inspect_link,
    } satisfies TradeListing;
  });
}

export type { TradeListing } from "../trade-listings.server";
