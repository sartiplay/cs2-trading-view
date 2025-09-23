import { NextResponse } from "next/server"
import { getInventoryValue } from "@/lib/data-storage.server"
import { getAllExternalPriceData } from "@/lib/external-data-storage.server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const priceSource = searchParams.get("price_source") || "steam";
    
    let inventoryData;
    
    if (priceSource === "csgoskins") {
      // Get external prices and calculate inventory value with external data
      const externalPrices = await getAllExternalPriceData();
      inventoryData = await getInventoryValue(externalPrices);
    } else {
      // Use default Steam Market prices
      inventoryData = await getInventoryValue();
    }
    
    return NextResponse.json(inventoryData)
  } catch (error) {
    console.error("Failed to fetch inventory value:", error)
    return NextResponse.json({ error: "Failed to fetch inventory value" }, { status: 500 })
  }
}
