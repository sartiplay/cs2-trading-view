import { NextResponse } from "next/server";
import {
  getExchangeRates,
  convertCurrency,
  SUPPORTED_CURRENCIES,
} from "@/lib/currency-converter.server";

export async function GET() {
  try {
    const rates = await getExchangeRates();
    return NextResponse.json({
      rates: rates.rates,
      base: rates.base,
      supported_currencies: SUPPORTED_CURRENCIES,
      last_updated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to fetch exchange rates:", error);
    return NextResponse.json(
      { error: "Failed to fetch exchange rates" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { amount, from, to } = await request.json();

    if (!amount || !from || !to) {
      return NextResponse.json(
        { error: "amount, from, and to currencies are required" },
        { status: 400 }
      );
    }

    const convertedAmount = await convertCurrency(amount, from, to);

    return NextResponse.json({
      original_amount: amount,
      original_currency: from,
      converted_amount: convertedAmount,
      target_currency: to,
      conversion_rate: convertedAmount / amount,
    });
  } catch (error) {
    console.error("Failed to convert currency:", error);
    return NextResponse.json(
      { error: "Failed to convert currency" },
      { status: 500 }
    );
  }
}
