import { NextRequest, NextResponse } from "next/server";
import { reloadAllItemImages } from "@/lib/data-storage.server";

export async function POST(request: NextRequest) {
  try {
    console.log("Starting bulk image reload...");
    
    const body = await request.json().catch(() => ({}));
    const { imageLoadingDelayMs } = body;
    
    const result = await reloadAllItemImages(imageLoadingDelayMs);
    
    return NextResponse.json({
      success: true,
      ...result,
      message: `Image reload complete: ${result.success} successful, ${result.failed} failed`
    });
  } catch (error) {
    console.error("Failed to reload images:", error);
    return NextResponse.json({ 
      error: "Failed to reload images",
      success: false,
      success: 0,
      failed: 0,
      errors: [error instanceof Error ? error.message : "Unknown error"]
    }, { status: 500 });
  }
}
