import { NextResponse } from "next/server";
import {
  getPortfolioHistory,
  addPortfolioSnapshot,
} from "@/lib/data-storage.server";

export async function GET() {
  try {
    const portfolioHistory = await getPortfolioHistory();
    return NextResponse.json(portfolioHistory);
  } catch (error) {
    console.error("Failed to fetch portfolio history:", error);
    return NextResponse.json(
      { error: "Failed to fetch portfolio history" },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    await addPortfolioSnapshot();
    const portfolioHistory = await getPortfolioHistory();
    return NextResponse.json({
      success: true,
      message: "Portfolio snapshot added",
      data: portfolioHistory,
    });
  } catch (error) {
    console.error("Failed to add portfolio snapshot:", error);
    return NextResponse.json(
      { error: "Failed to add portfolio snapshot" },
      { status: 500 }
    );
  }
}
