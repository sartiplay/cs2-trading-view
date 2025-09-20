import { type NextRequest, NextResponse } from "next/server";
import {
  getAllItems,
  addPriceEntry,
  getLatestPrices,
  getInventoryValue,
  getAllCustomizations,
  addCustomizationPriceEntry,
  addPortfolioSnapshot,
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

        // Also capture prices for this item's customizations
        const customizations = await getAllCustomizations();
        const itemCustomizations = customizations.filter(
          (c) => c.market_hash_name === market_hash_name
        );

        console.log(
          `[Capture Job] Found ${itemCustomizations.length} customizations for ${market_hash_name}`
        );

        if (itemCustomizations.length > 0) {
          const customizationResults = await fetchMultiplePrices(
            itemCustomizations.map((customization) => ({
              market_hash_name: customization.customization_hash,
              appid: 730, // CS2 app ID
            })),
            1000 // 1 second delay between requests
          );

          // Save successful customization price captures
          for (let i = 0; i < customizationResults.length; i++) {
            const result = customizationResults[i];
            const customization = itemCustomizations[i];

            if (result.price !== null) {
              await addCustomizationPriceEntry(
                customization.market_hash_name,
                customization.customization_type,
                customization.customization_index,
                result.price
              );
            }
          }

          const customizationSuccessCount = customizationResults.filter(
            (r) => r.price !== null
          ).length;
          console.log(
            `[Capture Job] Captured ${customizationSuccessCount}/${itemCustomizations.length} customizations for ${market_hash_name}`
          );
        }

        return NextResponse.json({
          success: true,
          message: `Price captured for ${market_hash_name}: $${price.toFixed(
            2
          )}${
            itemCustomizations.length > 0
              ? ` and ${itemCustomizations.length} customizations`
              : ""
          }`,
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

      const customizations = await getAllCustomizations();
      console.log(
        `[Capture Job] Found ${customizations.length} customizations to capture`
      );

      if (items.length === 0 && customizations.length === 0) {
        return NextResponse.json({
          success: true,
          message: "No items or customizations to capture prices for",
          results: [],
        });
      }

      const previousPrices = await getLatestPrices();
      const previousInventoryValue = await getInventoryValue();

      // Capture main item prices
      const results = await fetchMultiplePrices(
        items.map((item) => ({
          market_hash_name: item.market_hash_name,
          appid: item.appid,
        })),
        1000 // 1 second delay between requests
      );

      // Save successful price captures for main items
      for (const result of results) {
        if (result.price !== null) {
          await addPriceEntry(result.market_hash_name, result.price);
        }
      }

      const customizationResults = await fetchMultiplePrices(
        customizations.map((customization) => ({
          market_hash_name: customization.customization_hash,
          appid: 730, // CS2 app ID
        })),
        1000 // 1 second delay between requests
      );

      // Save successful customization price captures
      for (let i = 0; i < customizationResults.length; i++) {
        const result = customizationResults[i];
        const customization = customizations[i];

        if (result.price !== null) {
          await addCustomizationPriceEntry(
            customization.market_hash_name,
            customization.customization_type,
            customization.customization_index,
            result.price
          );
        }
      }

      const successCount = results.filter((r) => r.price !== null).length;
      const totalCount = results.length;
      const customizationSuccessCount = customizationResults.filter(
        (r) => r.price !== null
      ).length;
      const customizationTotalCount = customizationResults.length;

      console.log(
        `[Capture Job] Completed: ${successCount}/${totalCount} items captured successfully`
      );
      console.log(
        `[Capture Job] Completed: ${customizationSuccessCount}/${customizationTotalCount} customizations captured successfully`
      );

      try {
        await addPortfolioSnapshot();
        console.log("[Capture Job] Portfolio snapshot recorded");
      } catch (snapshotError) {
        console.error(
          "[Capture Job] Failed to record portfolio snapshot:",
          snapshotError
        );
        // Don't fail the entire capture job if snapshot fails
      }

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
        message: `Captured prices for ${successCount}/${totalCount} items and ${customizationSuccessCount}/${customizationTotalCount} customizations`,
        results: [
          ...results.map((r) => ({
            item: r.market_hash_name,
            price: r.price,
            success: r.price !== null,
            error: r.error,
            type: "item",
          })),
          ...customizationResults.map((r, i) => ({
            item: customizations[i].customization_hash,
            price: r.price,
            success: r.price !== null,
            error: r.error,
            type: "customization",
          })),
        ],
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
