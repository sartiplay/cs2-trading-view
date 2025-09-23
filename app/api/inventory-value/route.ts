import { NextResponse } from "next/server"
import { getInventoryValue } from "@/lib/data-storage.server"
import { getAllExternalPriceData } from "@/lib/external-data-storage.server"
import { convertCurrency } from "@/lib/currency-converter.server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const priceSource = searchParams.get("price_source") || "steam";
    const displayCurrency = searchParams.get("display_currency") || "USD";
    
    let inventoryData;
    
    if (priceSource === "csgoskins") {
      // Get external prices and calculate inventory value with external data
      const externalPrices = await getAllExternalPriceData();
      inventoryData = await getInventoryValue(externalPrices);
    } else {
      // Use default Steam Market prices
      inventoryData = await getInventoryValue();
    }
    
    // Convert all values to display currency if not USD
    if (displayCurrency !== "USD") {
      try {
        inventoryData.total_purchase_value = await convertCurrency(
          inventoryData.total_purchase_value,
          "USD",
          displayCurrency
        );
        inventoryData.total_current_value = await convertCurrency(
          inventoryData.total_current_value,
          "USD",
          displayCurrency
        );
        inventoryData.total_profit_loss = await convertCurrency(
          inventoryData.total_profit_loss,
          "USD",
          displayCurrency
        );
        
        // Convert timeline values
        inventoryData.timeline = await Promise.all(
          inventoryData.timeline.map(async (entry) => ({
            ...entry,
            total_value: await convertCurrency(entry.total_value, "USD", displayCurrency)
          }))
        );
      } catch (error) {
        console.error("Failed to convert currency:", error);
        // If conversion fails, return USD values
      }
    }
    
    return NextResponse.json({
      ...inventoryData,
      display_currency: displayCurrency
    })
  } catch (error) {
    console.error("Failed to fetch inventory value:", error)
    return NextResponse.json({ error: "Failed to fetch inventory value" }, { status: 500 })
  }
}
