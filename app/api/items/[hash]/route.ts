import { type NextRequest, NextResponse } from "next/server";
import {
  getItem,
  getItemByMarketHashName,
  removeItem,
  addOrUpdateItem,
} from "@/lib/data-storage.server";

interface RouteParams {
  params: Promise<{ hash: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { hash } = await params;
    const marketHashName = decodeURIComponent(hash);

    const item = await getItemByMarketHashName(marketHashName);

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error("Failed to fetch item:", error);
    return NextResponse.json(
      { error: "Failed to fetch item" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { hash } = await params;
    const marketHashName = decodeURIComponent(hash);

    // Find the item by market hash name first
    const item = await getItemByMarketHashName(marketHashName);
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    await removeItem(item.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete item:", error);
    return NextResponse.json(
      { error: "Failed to delete item" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { hash } = await params;
    const marketHashName = decodeURIComponent(hash);
    const body = await request.json();

    // Get the existing item to preserve fields not being updated
    const existingItem = await getItemByMarketHashName(marketHashName);
    if (!existingItem) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const {
      label,
      description,
      purchase_price,
      quantity,
      purchase_currency,
      category_id,
      stickers,
      charms,
      patches,
      include_customization_costs,
      image_url,
    } = body;

    // Validate required fields
    if (label !== undefined && (!label || typeof label !== "string")) {
      return NextResponse.json(
        { error: "label must be a non-empty string" },
        { status: 400 }
      );
    }

    if (
      purchase_price !== undefined &&
      (typeof purchase_price !== "number" || purchase_price <= 0)
    ) {
      return NextResponse.json(
        { error: "purchase_price must be a positive number" },
        { status: 400 }
      );
    }

    if (
      quantity !== undefined &&
      (typeof quantity !== "number" ||
        quantity <= 0 ||
        !Number.isInteger(quantity))
    ) {
      return NextResponse.json(
        { error: "quantity must be a positive integer" },
        { status: 400 }
      );
    }

    if (stickers && stickers.length > 6) {
      return NextResponse.json(
        { error: "Maximum 6 stickers allowed per weapon" },
        { status: 400 }
      );
    }

    if (charms && charms.length > 1) {
      return NextResponse.json(
        { error: "Maximum 1 charm allowed per weapon" },
        { status: 400 }
      );
    }

    console.log("[v0] Updating item with customizations:", {
      marketHashName,
      stickers: stickers?.length || 0,
      charms: charms?.length || 0,
      patches: patches?.length || 0,
      include_customization_costs,
      image_url,
    });

    // Update the item with new values, preserving existing ones for undefined fields
    await addOrUpdateItem({
      id: existingItem.id, // This is crucial - include the existing item's ID
      market_hash_name: marketHashName,
      label: label !== undefined ? label : existingItem.label,
      description:
        description !== undefined ? description : existingItem.description,
      appid: existingItem.appid,
      steam_url: existingItem.steam_url,
      image_url: image_url !== undefined ? image_url : existingItem.image_url,
      purchase_price:
        purchase_price !== undefined
          ? purchase_price
          : existingItem.purchase_price,
      quantity: quantity !== undefined ? quantity : existingItem.quantity,
      purchase_currency:
        purchase_currency !== undefined
          ? purchase_currency
          : existingItem.purchase_currency,
      category_id: category_id !== undefined ? category_id : existingItem.category_id,
      stickers: stickers !== undefined ? stickers : existingItem.stickers,
      charms: charms !== undefined ? charms : existingItem.charms,
      patches: patches !== undefined ? patches : existingItem.patches,
      include_customizations_in_price:
        include_customization_costs !== undefined
          ? include_customization_costs
          : existingItem.include_customizations_in_price,
      price_alert_config: existingItem.price_alert_config,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update item:", error);
    return NextResponse.json(
      { error: "Failed to update item" },
      { status: 500 }
    );
  }
}
