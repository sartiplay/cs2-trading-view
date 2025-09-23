import { NextRequest, NextResponse } from "next/server";
import {
  getCategory,
  updateCategory,
  deleteCategory,
} from "@/lib/data-storage.server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const category = await getCategory(id);

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error("[Categories API] Error fetching category:", error);
    return NextResponse.json(
      { error: "Failed to fetch category" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, color, includeInInventoryValue, includeInProfitLoss } = body;

    const updates: Partial<{
      name: string;
      color: string;
      includeInInventoryValue: boolean;
      includeInProfitLoss: boolean;
    }> = {};

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json(
          { error: "Category name must be a non-empty string" },
          { status: 400 }
        );
      }
      updates.name = name.trim();
    }

    if (color !== undefined) {
      if (typeof color !== "string") {
        return NextResponse.json(
          { error: "Category color must be a string" },
          { status: 400 }
        );
      }
      updates.color = color;
    }

    if (includeInInventoryValue !== undefined) {
      if (typeof includeInInventoryValue !== "boolean") {
        return NextResponse.json(
          { error: "includeInInventoryValue must be a boolean" },
          { status: 400 }
        );
      }
      updates.includeInInventoryValue = includeInInventoryValue;
    }

    if (includeInProfitLoss !== undefined) {
      if (typeof includeInProfitLoss !== "boolean") {
        return NextResponse.json(
          { error: "includeInProfitLoss must be a boolean" },
          { status: 400 }
        );
      }
      updates.includeInProfitLoss = includeInProfitLoss;
    }

    const updatedCategory = await updateCategory(id, updates);
    return NextResponse.json(updatedCategory);
  } catch (error) {
    console.error("[Categories API] Error updating category:", error);
    if (error instanceof Error && error.message === "Category not found") {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update category" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await deleteCategory(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Categories API] Error deleting category:", error);
    if (error instanceof Error && error.message === "Category not found") {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }
    if (error instanceof Error && error.message.includes("Cannot delete category")) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 }
    );
  }
}
