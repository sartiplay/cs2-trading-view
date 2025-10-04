import { type NextRequest, NextResponse } from "next/server";
import { addOrUpdateItem, getAllItems } from "@/lib/data-storage.server";
import { convertCurrency } from "@/lib/currency-converter.server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const displayCurrency = searchParams.get("display_currency") || "USD";
    
    const items = await getAllItems();

    const itemsWithProfitLoss = await Promise.all(
      items.map(async (item) => {
        const latestEntry = item.price_history[item.price_history.length - 1];
        const currentPrice = latestEntry?.median_price;

        const purchasePriceUSD = await convertCurrency(
          item.purchase_price,
          item.purchase_currency || "USD",
          "USD"
        );

        let customizationCostUSD = 0;
        let customizationCurrentValueUSD = 0;

        if (item.stickers) {
          for (const sticker of item.stickers) {
            const stickerPurchaseCostUSD = await convertCurrency(
              sticker.price,
              sticker.currency,
              "USD"
            );
            customizationCostUSD += stickerPurchaseCostUSD;

            // Use current market value if available, otherwise fall back to purchase price
            const latestStickerPrice =
              sticker.price_history && sticker.price_history.length > 0
                ? sticker.price_history[sticker.price_history.length - 1]
                    .median_price
                : stickerPurchaseCostUSD;
            customizationCurrentValueUSD += latestStickerPrice;
          }
        }
        if (item.charms) {
          for (const charm of item.charms) {
            const charmPurchaseCostUSD = await convertCurrency(
              charm.price,
              charm.currency,
              "USD"
            );
            customizationCostUSD += charmPurchaseCostUSD;

            // Use current market value if available, otherwise fall back to purchase price
            const latestCharmPrice =
              charm.price_history && charm.price_history.length > 0
                ? charm.price_history[charm.price_history.length - 1]
                    .median_price
                : charmPurchaseCostUSD;
            customizationCurrentValueUSD += latestCharmPrice;
          }
        }
        if (item.patches) {
          for (const patch of item.patches) {
            const patchPurchaseCostUSD = await convertCurrency(
              patch.price,
              patch.currency,
              "USD"
            );
            customizationCostUSD += patchPurchaseCostUSD;

            // Use current market value if available, otherwise fall back to purchase price
            const latestPatchPrice =
              patch.price_history && patch.price_history.length > 0
                ? patch.price_history[patch.price_history.length - 1]
                    .median_price
                : patchPurchaseCostUSD;
            customizationCurrentValueUSD += latestPatchPrice;
          }
        }

        const totalPurchaseCostUSD = item.include_customizations_in_price
          ? purchasePriceUSD + customizationCostUSD
          : purchasePriceUSD;

        const totalCurrentValueUSD =
          item.include_customizations_in_price && currentPrice
            ? currentPrice + customizationCurrentValueUSD
            : currentPrice;

        const profitLoss = totalCurrentValueUSD
          ? (totalCurrentValueUSD - totalPurchaseCostUSD) * item.quantity
          : null;
        const profitLossPercentage = totalCurrentValueUSD
          ? ((totalCurrentValueUSD - totalPurchaseCostUSD) /
              totalPurchaseCostUSD) *
            100
          : null;

        // Debug logging for profit calculation
        if (item.market_hash_name === "Austin 2025 Challengers Sticker Capsule") {
          console.log(`[DEBUG] ${item.market_hash_name}:`, {
            purchasePrice: item.purchase_price,
            purchaseCurrency: item.purchase_currency,
            purchasePriceUSD,
            currentPrice,
            totalPurchaseCostUSD,
            totalCurrentValueUSD,
            profitLoss,
            profitLossPercentage,
            quantity: item.quantity
          });
        }

        // Convert all USD values to display currency if needed
        let convertedPurchasePriceUSD = totalPurchaseCostUSD;
        let convertedLatestPrice = totalCurrentValueUSD;
        let convertedProfitLoss = profitLoss;
        let convertedCustomizationCostUSD = customizationCostUSD;
        let convertedCustomizationCurrentValueUSD = customizationCurrentValueUSD;

        if (displayCurrency !== "USD") {
          try {
            convertedPurchasePriceUSD = await convertCurrency(
              totalPurchaseCostUSD,
              "USD",
              displayCurrency
            );
            convertedLatestPrice = await convertCurrency(
              totalCurrentValueUSD,
              "USD",
              displayCurrency
            );
            convertedProfitLoss = await convertCurrency(
              profitLoss,
              "USD",
              displayCurrency
            );
            convertedCustomizationCostUSD = await convertCurrency(
              customizationCostUSD,
              "USD",
              displayCurrency
            );
            convertedCustomizationCurrentValueUSD = await convertCurrency(
              customizationCurrentValueUSD,
              "USD",
              displayCurrency
            );
          } catch (error) {
            console.error("Failed to convert currency:", error);
            // If conversion fails, use USD values
          }
        }

        return {
          id: item.id,
          market_hash_name: item.market_hash_name,
          label: item.label,
          description: item.description,
          category_id: item.category_id,
          appid: item.appid,
          steam_url: item.steam_url,
          image_url: item.image_url,
          purchase_price: item.purchase_price,
          purchase_price_usd: convertedPurchasePriceUSD, // Include customization costs in displayed purchase price
          purchase_currency: item.purchase_currency || "USD",
          quantity: item.quantity,
          latest_price: convertedLatestPrice, // Include customization values in displayed current price
          last_updated: latestEntry?.date,
          profit_loss: convertedProfitLoss,
          profit_loss_percentage: profitLossPercentage,
          stickers: item.stickers || [],
          charms: item.charms || [],
          patches: item.patches || [],
          customization_cost_usd: convertedCustomizationCostUSD,
          customization_current_value_usd: convertedCustomizationCurrentValueUSD, // Add current customization value
          include_customizations_in_price:
            item.include_customizations_in_price || false,
          price_alert_config: item.price_alert_config ?? null,
          created_at: item.created_at,
          display_currency: displayCurrency,
        };
      })
    );

    return NextResponse.json(itemsWithProfitLoss);
  } catch (error) {
    console.error("Failed to fetch items:", error);
    return NextResponse.json(
      { error: "Failed to fetch items" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      market_hash_name,
      label,
      appid = 730,
      steam_url,
      image_url,
      purchase_price,
      quantity,
      purchase_currency,
      category_id,
      stickers,
      charms,
      patches,
      include_customizations_in_price,
    } = body;

    if (
      !market_hash_name ||
      !label ||
      !steam_url ||
      purchase_price === undefined ||
      quantity === undefined
    ) {
      return NextResponse.json(
        {
          error:
            "market_hash_name, label, steam_url, purchase_price, and quantity are required",
        },
        { status: 400 }
      );
    }

    if (typeof purchase_price !== "number" || purchase_price <= 0) {
      return NextResponse.json(
        {
          error: "purchase_price must be a positive number",
        },
        { status: 400 }
      );
    }

    if (
      typeof quantity !== "number" ||
      quantity <= 0 ||
      !Number.isInteger(quantity)
    ) {
      return NextResponse.json(
        {
          error: "quantity must be a positive integer",
        },
        { status: 400 }
      );
    }

    if (stickers && stickers.length > 6) {
      return NextResponse.json(
        { error: "Maximum 6 stickers allowed per weapon" },
        { status: 400 }
      );
    }

    if (charms && charms.length > 1) {
      return NextResponse.json(
        { error: "Maximum 1 charm allowed per weapon" },
        { status: 400 }
      );
    }

    const itemId = await addOrUpdateItem({
      id: "", // Will be generated by addOrUpdateItem
      market_hash_name,
      label,
      appid,
      steam_url,
      image_url,
      purchase_price,
      quantity,
      purchase_currency: purchase_currency || "USD",
      category_id,
      stickers: stickers || [],
      charms: charms || [],
      patches: patches || [],
      include_customizations_in_price: include_customizations_in_price || false,
    });

    return NextResponse.json({ success: true, itemId });
  } catch (error) {
    console.error("Failed to add item:", error);
    return NextResponse.json({ error: "Failed to add item" }, { status: 500 });
  }
}

