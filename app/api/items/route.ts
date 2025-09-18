import { type NextRequest, NextResponse } from "next/server";
import { addOrUpdateItem, getAllItems } from "@/lib/data-storage.server";
import { convertCurrency } from "@/lib/currency-converter.server";

export async function GET() {
  try {
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

        const profitLoss = currentPrice
          ? (currentPrice - purchasePriceUSD) * item.quantity
          : null;
        const profitLossPercentage = currentPrice
          ? ((currentPrice - purchasePriceUSD) / purchasePriceUSD) * 100
          : null;

        return {
          market_hash_name: item.market_hash_name,
          label: item.label,
          appid: item.appid,
          steam_url: item.steam_url,
          purchase_price: item.purchase_price,
          purchase_price_usd: purchasePriceUSD,
          purchase_currency: item.purchase_currency || "USD",
          quantity: item.quantity,
          latest_price: currentPrice,
          last_updated: latestEntry?.date,
          profit_loss: profitLoss,
          profit_loss_percentage: profitLossPercentage,
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
      purchase_price,
      quantity,
      purchase_currency,
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

    await addOrUpdateItem({
      market_hash_name,
      label,
      appid,
      steam_url,
      purchase_price,
      quantity,
      purchase_currency: purchase_currency || "USD",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to add item:", error);
    return NextResponse.json({ error: "Failed to add item" }, { status: 500 });
  }
}
