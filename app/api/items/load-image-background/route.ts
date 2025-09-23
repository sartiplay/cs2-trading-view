import { type NextRequest, NextResponse } from "next/server";
import { reloadItemImage } from "@/lib/data-storage.server";

export async function POST(request: NextRequest) {
  try {
    const { market_hash_name } = await request.json();

    if (!market_hash_name) {
      return NextResponse.json(
        { error: "market_hash_name is required" },
        { status: 400 }
      );
    }

    // Load image in background (don't await - let it run async)
    reloadItemImage(market_hash_name).catch((error) => {
      console.error(`Failed to load image for ${market_hash_name}:`, error);
    });

    // Return immediately to not block the UI
    return NextResponse.json({ 
      success: true, 
      message: "Image loading started in background" 
    });
  } catch (error) {
    console.error("Failed to start background image loading:", error);
    return NextResponse.json(
      { error: "Failed to start background image loading" },
      { status: 500 }
    );
  }
}
