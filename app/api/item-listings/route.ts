import { NextRequest, NextResponse } from "next/server"
import { fetchTradeListings } from "@/lib/trade-listings.server"
import { getSettings } from "@/lib/settings.server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const marketHashName = searchParams.get("market_hash_name")

  if (!marketHashName) {
    return NextResponse.json(
      { error: "Missing market_hash_name query parameter" },
      { status: 400 }
    )
  }

  try {
    const settings = await getSettings()
    const limit = Math.max(1, Math.floor(settings.marketListingsFetchLimit ?? 5))
    const listings = await fetchTradeListings(marketHashName, limit)
    return NextResponse.json({ listings })
  } catch (error) {
    console.error("[Listings] Failed to fetch trade listings:", error)
    return NextResponse.json(
      { error: "Failed to fetch trade listings" },
      { status: 500 }
    )
  }
}
