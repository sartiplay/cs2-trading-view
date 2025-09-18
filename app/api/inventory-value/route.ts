import { NextResponse } from "next/server"
import { getInventoryValue } from "@/lib/data-storage.server"

export async function GET() {
  try {
    const inventoryData = await getInventoryValue()
    return NextResponse.json(inventoryData)
  } catch (error) {
    console.error("Failed to fetch inventory value:", error)
    return NextResponse.json({ error: "Failed to fetch inventory value" }, { status: 500 })
  }
}
