import { NextRequest, NextResponse } from "next/server";
import { getItemImageUrl } from "@/lib/image-loader.server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { market_hash_name, appid } = body;

    if (!market_hash_name) {
      return NextResponse.json({ error: "Market hash name is required" }, { status: 400 });
    }

    console.log(`Loading image for item: ${market_hash_name}`);
    
    const imageUrl = await getItemImageUrl(market_hash_name, appid || 730);
    
    if (imageUrl) {
      return NextResponse.json({ 
        success: true, 
        image_url: imageUrl,
        message: "Image loaded successfully"
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        image_url: null,
        message: "No image found for this item"
      });
    }
  } catch (error) {
    console.error("Failed to load item image:", error);
    return NextResponse.json({ error: "Failed to load item image" }, { status: 500 });
  }
}
