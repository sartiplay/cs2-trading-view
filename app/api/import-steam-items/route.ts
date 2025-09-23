import { NextRequest, NextResponse } from "next/server";
import { addOrUpdateItem } from "@/lib/data-storage.server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items, defaultCategory } = body;

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: "Items array is required" },
        { status: 400 }
      );
    }

    let importedCount = 0;
    const errors: string[] = [];

    for (const steamItem of items) {
      try {
        // Convert Steam item to our item format
        const itemData = {
          market_hash_name: steamItem.market_hash_name,
          label: steamItem.name || steamItem.market_hash_name,
          description: `Imported from Steam inventory (Asset ID: ${steamItem.assetid})`,
          category_id: defaultCategory || undefined,
          appid: 730, // CS2 app ID
          steam_url: `https://steamcommunity.com/market/listings/730/${encodeURIComponent(steamItem.market_hash_name)}`,
          purchase_price: 0, // We don't know the purchase price from Steam
          quantity: parseInt(steamItem.amount) || 1,
          purchase_currency: "USD",
          stickers: [],
          charms: [],
          patches: [],
          include_customizations_in_price: false,
        };

        await addOrUpdateItem(itemData);
        importedCount++;

      } catch (error) {
        console.error(`Failed to import item ${steamItem.market_hash_name}:`, error);
        errors.push(`Failed to import ${steamItem.market_hash_name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      importedCount,
      totalItems: items.length,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    console.error("Import Steam items error:", error);
    return NextResponse.json(
      { error: "Failed to import Steam items" },
      { status: 500 }
    );
  }
}
