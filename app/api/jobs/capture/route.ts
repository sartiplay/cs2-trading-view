import { type NextRequest, NextResponse } from "next/server";
import {
  getAllItems,
  addPriceEntry,
  getLatestPrices,
  getInventoryValue,
} from "@/lib/data-storage.server";
import { fetchSteamPrice, fetchMultiplePrices } from "@/lib/steam-api.server";
import {
  sendDiscordNotification,
  getDiscordSettings,
} from "@/lib/discord-webhook.server";

export async function POST(request: NextRequest) {
  let market_hash_name: string | undefined;
  try {
    const body = await request.json();
    market_hash_name = body?.market_hash_name;
  } catch {
    // No body or invalid JSON — treat as no specific item requested
    market_hash_name = undefined;
  }

  try {
    console.log("[Capture Job] Starting price capture...");

    if (market_hash_name) {
      // Capture price for specific item
      console.log(
        `[Capture Job] Capturing price for single item: ${market_hash_name}`
      );

      const price = await fetchSteamPrice(market_hash_name, 730);

      if (price !== null) {
        await addPriceEntry(market_hash_name, price);
        return NextResponse.json({
          success: true,
          message: `Price captured for ${market_hash_name}: $${price.toFixed(
            2
          )}`,
        });
      } else {
        return NextResponse.json(
          { error: "Failed to fetch price from Steam API" },
          { status: 400 }
        );
      }
    } else {
      // Capture prices for all items
      const items = await getAllItems();
      console.log(`[Capture Job] Capturing prices for ${items.length} items`);

      if (items.length === 0) {
        return NextResponse.json({
          success: true,
          message: "No items to capture prices for",
          results: [],
        });
      }

      const previousPrices = await getLatestPrices();
      const previousInventoryValue = await getInventoryValue();

      const results = await fetchMultiplePrices(
        items.map((item) => ({
          market_hash_name: item.market_hash_name,
          appid: item.appid,
        })),
        1000 // 1 second delay between requests
      );

      // Save successful price captures
      for (const result of results) {
        if (result.price !== null) {
          await addPriceEntry(result.market_hash_name, result.price);
        }
      }

      const successCount = results.filter((r) => r.price !== null).length;
      const totalCount = results.length;

      console.log(
        `[Capture Job] Completed: ${successCount}/${totalCount} items captured successfully`
      );

      try {
        console.log("[Capture Job] Sending Discord notification if enabled...");
        const discordSettings = await getDiscordSettings();
        console.log("[Capture Job] Discord Settings:", discordSettings);
        if (discordSettings?.enabled && discordSettings.webhookUrl) {
          console.log("[Capture Job] Discord notifications are enabled.");
          const currentInventoryValue = await getInventoryValue();
          const currentPrices = await getLatestPrices();

          const priceChanges = currentPrices.map((current) => {
            const previous = previousPrices.find(
              (p) => p.market_hash_name === current.market_hash_name
            );

            return {
              market_hash_name: current.market_hash_name,
              display_name: current.label,
              current_price: current.current_price ?? 0,
              previous_price: previous?.current_price ?? 0,
              change_amount: current.price_change ?? 0,
              change_percentage: current.price_change_percentage ?? 0,
              quantity: current.quantity,
              purchase_price: current.purchase_price,
            };
          });

          console.log(
            "[Capture Job] Price changes to report:",
            priceChanges.filter((p) => p.change_amount !== 0)
          );
          console.log("[Capture Job] Sending Discord notification...");
          await sendDiscordNotification(
            discordSettings.webhookUrl,
            {
              timestamp: new Date().toISOString(),
              totalValue: currentInventoryValue.total_current_value,
              previousTotalValue: previousInventoryValue.total_current_value,
              priceChanges,
            },
            discordSettings.developmentMode
          );
          console.log("[Capture Job] Discord notification sent.!");
        }
      } catch (discordError) {
        console.error(
          "[Capture Job] Discord notification failed:",
          discordError
        );
        // Don't fail the entire capture job if Discord fails
      }

      return NextResponse.json({
        success: true,
        message: `Captured prices for ${successCount}/${totalCount} items`,
        results: results.map((r) => ({
          item: r.market_hash_name,
          price: r.price,
          success: r.price !== null,
          error: r.error,
        })),
      });
    }
  } catch (error) {
    console.error("[Capture Job] Failed to capture prices:", error);
    return NextResponse.json(
      { error: "Failed to capture prices" },
      { status: 500 }
    );
  }
}
