import { type NextRequest, NextResponse } from "next/server";
import {
  getItem,
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

    const item = await getItem(marketHashName);

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

    await removeItem(marketHashName);

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
    const existingItem = await getItem(marketHashName);
    if (!existingItem) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const { label, description, purchase_price, quantity, purchase_currency } =
      body;

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

    // Update the item with new values, preserving existing ones for undefined fields
    await addOrUpdateItem({
      market_hash_name: marketHashName,
      label: label !== undefined ? label : existingItem.label,
      description:
        description !== undefined ? description : existingItem.description,
      appid: existingItem.appid,
      steam_url: existingItem.steam_url,
      purchase_price:
        purchase_price !== undefined
          ? purchase_price
          : existingItem.purchase_price,
      quantity: quantity !== undefined ? quantity : existingItem.quantity,
      purchase_currency:
        purchase_currency !== undefined
          ? purchase_currency
          : existingItem.purchase_currency,
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
