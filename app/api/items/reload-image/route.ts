import { NextRequest, NextResponse } from "next/server";
import { getItemImageUrl } from "@/lib/image-loader.server";
import { reloadItemImage } from "@/lib/data-storage.server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { market_hash_name, appid } = body;

    if (!market_hash_name) {
      return NextResponse.json({ error: "Market hash name is required" }, { status: 400 });
    }

    console.log(`Reloading and saving image for item: ${market_hash_name}`);
    
    // Fetch the image URL
    const imageUrl = await getItemImageUrl(market_hash_name, appid || 730);
    
    if (imageUrl) {
      // Save the image URL to the data.json file
      await reloadItemImage(market_hash_name, imageUrl);
      
      return NextResponse.json({ 
        success: true, 
        image_url: imageUrl,
        message: "Image reloaded and saved successfully"
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        image_url: null,
        message: "No image found for this item"
      });
    }
  } catch (error) {
    console.error("Failed to reload and save item image:", error);
    return NextResponse.json({ error: "Failed to reload and save item image" }, { status: 500 });
  }
}
