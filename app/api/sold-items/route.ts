import { NextResponse } from "next/server";
import { getSoldItems, getSoldItemsSummary } from "@/lib/data-storage.server";

export async function GET() {
  try {
    const [soldItems, summary] = await Promise.all([
      getSoldItems(),
      getSoldItemsSummary(),
    ]);

    return NextResponse.json({
      items: soldItems,
      summary,
    });
  } catch (error) {
    console.error("Failed to fetch sold items:", error);
    return NextResponse.json(
      { error: "Failed to fetch sold items" },
      { status: 500 }
    );
  }
}
