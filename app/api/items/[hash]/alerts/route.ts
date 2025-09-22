import { type NextRequest, NextResponse } from "next/server";
import {
  updatePriceAlertConfig,
  type PriceAlertConfig,
} from "@/lib/data-storage.server";

interface RouteParams {
  params: Promise<{ hash: string }>;
}

const hasOwnProperty = Object.prototype.hasOwnProperty;

function parseThreshold(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error("Threshold must be a positive number");
    }
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return null;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new Error("Threshold must be a positive number");
    }
    return parsed;
  }

  throw new Error("Threshold must be a number or empty");
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { hash } = await params;
    const marketHashName = decodeURIComponent(hash);
    const body = await request.json();

    const config: PriceAlertConfig = {};
    let hasUpdates = false;

    if (hasOwnProperty.call(body, "lowerThreshold")) {
      config.lowerThreshold = parseThreshold(body.lowerThreshold);
      hasUpdates = true;
    }

    if (hasOwnProperty.call(body, "upperThreshold")) {
      config.upperThreshold = parseThreshold(body.upperThreshold);
      hasUpdates = true;
    }

    if (!hasUpdates) {
      return NextResponse.json(
        { error: "No thresholds provided" },
        { status: 400 }
      );
    }

    const updatedConfig = await updatePriceAlertConfig(marketHashName, config);

    return NextResponse.json({ config: updatedConfig });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Item not found") {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message.includes("Threshold")) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      console.error("[Price Alerts] Failed to update:", error.message);
    } else {
      console.error("[Price Alerts] Failed to update:", error);
    }
    return NextResponse.json(
      { error: "Failed to update price alert configuration" },
      { status: 500 }
    );
  }
}
