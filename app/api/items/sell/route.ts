import { type NextRequest, NextResponse } from "next/server";
import { markItemAsSold } from "@/lib/data-storage.server";
import { convertCurrency } from "@/lib/currency-converter.server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { market_hash_name, sold_price, sold_currency } = body;

    if (!market_hash_name || !sold_price || !sold_currency) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (typeof sold_price !== "number" || sold_price <= 0) {
      return NextResponse.json(
        { error: "sold_price must be a positive number" },
        { status: 400 }
      );
    }

    const soldPriceUsd = await convertCurrency(
      sold_price,
      sold_currency,
      "USD"
    );

    await markItemAsSold(
      market_hash_name,
      sold_price,
      sold_currency,
      soldPriceUsd
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to mark item as sold:", error);
    return NextResponse.json(
      { error: "Failed to mark item as sold" },
      { status: 500 }
    );
  }
}
