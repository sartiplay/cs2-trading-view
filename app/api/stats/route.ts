import { NextResponse } from "next/server"
import { getCaptureStats } from "@/lib/data-storage.server"

export async function GET() {
  try {
    const stats = await getCaptureStats()
    return NextResponse.json(stats)
  } catch (error) {
    console.error("Failed to fetch stats:", error)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
