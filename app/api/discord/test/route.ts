import { NextRequest, NextResponse } from "next/server";
import { getItem } from "@/lib/data-storage.server";
import {
  getDiscordSettings,
  sendDevelopmentTestNotification,
} from "@/lib/discord-webhook.server";

export async function POST(request: NextRequest) {
  try {
    const settings = await getDiscordSettings();
    if (
      !settings ||
      !settings.enabled ||
      !settings.developmentMode ||
      !settings.webhookUrl
    ) {
      return NextResponse.json(
        { error: "Discord development mode is not enabled." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      market_hash_name: marketHashName,
      current_price: currentPriceRaw,
      previous_price: previousPriceRaw,
      change_amount: changeAmountRaw,
      change_percentage: changePercentageRaw,
      direction,
      note,
      time_window_minutes: timeWindowRaw,
    } = body ?? {};

    if (!marketHashName || currentPriceRaw === undefined) {
      return NextResponse.json(
        { error: "market_hash_name and current_price are required." },
        { status: 400 }
      );
    }

    const currentPrice = Number.parseFloat(String(currentPriceRaw));
    const previousPrice =
      previousPriceRaw !== undefined && previousPriceRaw !== null
        ? Number.parseFloat(String(previousPriceRaw))
        : undefined;
    const changeAmount =
      changeAmountRaw !== undefined && changeAmountRaw !== null
        ? Number.parseFloat(String(changeAmountRaw))
        : previousPrice !== undefined
          ? currentPrice - previousPrice
          : undefined;
    const changePercentage =
      changePercentageRaw !== undefined && changePercentageRaw !== null
        ? Number.parseFloat(String(changePercentageRaw))
        : previousPrice && previousPrice !== 0
          ? ((currentPrice - previousPrice) / previousPrice) * 100
          : undefined;
    const timeWindowMinutes =
      timeWindowRaw !== undefined && timeWindowRaw !== null
        ? Number.parseFloat(String(timeWindowRaw))
        : undefined;

    if (Number.isNaN(currentPrice)) {
      return NextResponse.json(
        { error: "current_price must be a number." },
        { status: 400 }
      );
    }

    if (previousPrice !== undefined && Number.isNaN(previousPrice)) {
      return NextResponse.json(
        { error: "previous_price must be a number." },
        { status: 400 }
      );
    }

    const item = await getItem(marketHashName);
    if (!item) {
      return NextResponse.json(
        { error: "Item not found." },
        { status: 404 }
      );
    }

    await sendDevelopmentTestNotification({
      item: {
        marketHashName,
        label: item.label,
        steamUrl: item.steam_url,
      },
      currentPrice,
      previousPrice,
      changeAmount,
      changePercentage,
      direction,
      note,
      timeWindowMinutes,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] Failed to send development Discord notification:", error);
    return NextResponse.json(
      { error: "Failed to send Discord notification." },
      { status: 500 }
    );
  }
}
