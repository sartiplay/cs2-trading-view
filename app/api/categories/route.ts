import { NextRequest, NextResponse } from "next/server";
import {
  getAllCategories,
  createCategory,
  type CategoryConfig,
} from "@/lib/data-storage.server";

export async function GET() {
  try {
    const categories = await getAllCategories();
    return NextResponse.json(categories);
  } catch (error) {
    console.error("[Categories API] Error fetching categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, color, includeInInventoryValue, includeInProfitLoss } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Category name is required" },
        { status: 400 }
      );
    }

    const categoryData = {
      name: name.trim(),
      color: color || "#6B7280",
      includeInInventoryValue: includeInInventoryValue !== false, // Default to true
      includeInProfitLoss: includeInProfitLoss !== false, // Default to true
    };

    const newCategory = await createCategory(categoryData);
    return NextResponse.json(newCategory, { status: 201 });
  } catch (error) {
    console.error("[Categories API] Error creating category:", error);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    );
  }
}
