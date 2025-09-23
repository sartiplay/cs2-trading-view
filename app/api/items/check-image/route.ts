import { type NextRequest, NextResponse } from "next/server";
import { getItemByMarketHashName } from "@/lib/data-storage.server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const marketHashName = searchParams.get("market_hash_name");

    if (!marketHashName) {
      return NextResponse.json(
        { error: "market_hash_name is required" },
        { status: 400 }
      );
    }

    const existingItem = await getItemByMarketHashName(marketHashName);
    
    return NextResponse.json({
      exists: !!existingItem,
      image_url: existingItem?.image_url || null,
    });
  } catch (error) {
    console.error("Failed to check item image:", error);
    return NextResponse.json(
      { error: "Failed to check item image" },
      { status: 500 }
    );
  }
}
