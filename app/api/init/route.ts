import { NextResponse } from "next/server";

export async function GET() {
  try {
    console.log("[v0] DEBUG: Init API called");
    console.log("[v0] DEBUG: Starting app initialization...");

    // Try to import the function dynamically to catch import errors
    console.log("[v0] DEBUG: About to import app-startup.server");
    let initializeApp;
    try {
      const module = await import("@/lib/app-startup.server");
      initializeApp = module.initializeApp;
      console.log("[v0] DEBUG: Successfully imported initializeApp");
    } catch (importError) {
      console.error(
        "[v0] DEBUG: Failed to import app-startup.server:",
        importError
      );
      if (importError instanceof Error) {
        console.error("[v0] DEBUG: Import error details:", importError.message);
        console.error("[v0] DEBUG: Import error stack:", importError.stack);
      }
      throw importError;
    }

    console.log("[v0] DEBUG: About to call initializeApp()");
    await initializeApp();
    console.log("[v0] DEBUG: initializeApp() completed successfully");

    console.log("[v0] DEBUG: App initialization completed successfully");
    return NextResponse.json({ success: true, message: "App initialized" });
  } catch (error) {
    console.error("[v0] DEBUG: Failed to initialize app:", error);

    // More detailed error logging
    if (error instanceof Error) {
      console.error("[v0] DEBUG: Error name:", error.name);
      console.error("[v0] DEBUG: Error message:", error.message);
      console.error("[v0] DEBUG: Error stack:", error.stack);
    } else {
      console.error(
        "[v0] DEBUG: Non-Error object thrown:",
        typeof error,
        error
      );
    }

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[v0] DEBUG: Error details:", errorMessage);

    return NextResponse.json(
      {
        error: "Failed to initialize app",
        details: errorMessage,
        type: error instanceof Error ? error.name : typeof error,
      },
      { status: 500 }
    );
  }
}
