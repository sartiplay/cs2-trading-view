"use client";

import { useState, useEffect } from "react";
import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { RefreshCw } from "lucide-react";
import { useSettings } from "./settings-dialog";

interface PortfolioData {
  date: string;
  total_inventory_value: number;
  total_money_invested: number;
}

export function PortfolioChart() {
  const [data, setData] = useState<PortfolioData[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const settings = useSettings();

  const fetchData = async () => {
    try {
      console.log("[v0] Fetching portfolio history data...");
      const response = await fetch("/api/portfolio-history");
      if (response.ok) {
        const portfolioData = await response.json();
        console.log("[v0] Portfolio data received:", portfolioData);
        setData(portfolioData);
      } else {
        console.log("[v0] Failed to fetch portfolio data, response not ok");
      }
    } catch (error) {
      console.error("Failed to fetch portfolio history:", error);
    } finally {
      setLoading(false);
    }
  };

  const updatePortfolio = async () => {
    setUpdating(true);
    try {
      const response = await fetch("/api/portfolio-history", {
        method: "POST",
      });
      if (response.ok) {
        const result = await response.json();
        setData(result.data);
      }
    } catch (error) {
      console.error("Failed to update portfolio:", error);
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getFilteredData = (data: PortfolioData[], resolution: string) => {
    if (data.length === 0) return { data: [], timeSpanLabel: "No data" };

    console.log(
      "[v0] Filtering data with resolution:",
      resolution,
      "Data length:",
      data.length
    );

    const now = new Date();
    let cutoffDate: Date;
    let timeSpanLabel: string;

    // Match the time spans used in the price chart for consistency
    switch (resolution) {
      case "5s":
        cutoffDate = new Date(now.getTime() - 10 * 60 * 1000); // 10 minutes
        timeSpanLabel = "10 minutes";
        break;
      case "30s":
        cutoffDate = new Date(now.getTime() - 30 * 60 * 1000); // 30 minutes
        timeSpanLabel = "30 minutes";
        break;
      case "1m":
        cutoffDate = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours
        timeSpanLabel = "2 hours";
        break;
      case "5min":
      case "30min":
      case "1h":
        cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours
        timeSpanLabel = "24 hours";
        break;
      case "4h":
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 1 week
        timeSpanLabel = "1 week";
        break;
      case "1d":
      default:
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days
        timeSpanLabel = "30 days";
        break;
    }

    // For portfolio data with timestamps, use proper timestamp comparison
    const filtered = data.filter((item) => {
      // Handle both date-only strings and full timestamps
      const itemDate = item.date.includes("T")
        ? new Date(item.date)
        : new Date(item.date + "T00:00:00.000Z");
      const isIncluded = itemDate >= cutoffDate;
      console.log(
        "[v0] Item date:",
        item.date,
        "Cutoff:",
        cutoffDate.toISOString(),
        "Included:",
        isIncluded
      );
      return isIncluded;
    });

    console.log(
      "[v0] Filtered data length:",
      filtered.length,
      "Time span:",
      timeSpanLabel
    );
    return { data: filtered, timeSpanLabel };
  };

  const { data: filteredData, timeSpanLabel } = getFilteredData(
    data,
    settings.timelineResolution
  );

  // Calculate current values for display
  const currentData =
    filteredData.length > 0 ? filteredData[filteredData.length - 1] : null;
  const totalProfitLoss = currentData
    ? currentData.total_inventory_value - currentData.total_money_invested
    : 0;
  const totalProfitLossPercentage =
    currentData && currentData.total_money_invested > 0
      ? ((currentData.total_inventory_value -
          currentData.total_money_invested) /
          currentData.total_money_invested) *
        100
      : 0;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Value Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading portfolio data...</div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Portfolio Value Timeline</CardTitle>
              <CardDescription>
                No portfolio history data available yet
              </CardDescription>
            </div>
            <Button
              onClick={updatePortfolio}
              disabled={updating}
              size="sm"
              variant="outline"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${updating ? "animate-spin" : ""}`}
              />
              Update
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p className="mb-4">No portfolio history available</p>
            <Button onClick={updatePortfolio} disabled={updating}>
              <RefreshCw
                className={`h-4 w-4 mr-2 ${updating ? "animate-spin" : ""}`}
              />
              Create First Snapshot
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (filteredData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Portfolio Value Timeline</CardTitle>
              <CardDescription>
                No data available for the selected timeline resolution (
                {settings.timelineResolution})
              </CardDescription>
            </div>
            <Button
              onClick={updatePortfolio}
              disabled={updating}
              size="sm"
              variant="outline"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${updating ? "animate-spin" : ""}`}
              />
              Update
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p className="mb-4">
              No data available for the selected timeline resolution (
              {settings.timelineResolution})
            </p>
            <p className="text-sm mb-4">
              Try selecting a longer timeline resolution in settings or create a
              new snapshot.
            </p>
            <Button onClick={updatePortfolio} disabled={updating}>
              <RefreshCw
                className={`h-4 w-4 mr-2 ${updating ? "animate-spin" : ""}`}
              />
              Create New Snapshot
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Portfolio Value Timeline</CardTitle>
            <CardDescription>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                <div>
                  <div className="text-sm text-muted-foreground">
                    Money Invested
                  </div>
                  <div className="font-medium">
                    ${currentData?.total_money_invested.toFixed(2) || "0.00"}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">
                    Current Value
                  </div>
                  <div className="font-medium">
                    ${currentData?.total_inventory_value.toFixed(2) || "0.00"}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Total P&L</div>
                  <div
                    className={`font-medium ${
                      totalProfitLoss >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {totalProfitLoss >= 0 ? "+" : ""}$
                    {totalProfitLoss.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">
                    Total P&L %
                  </div>
                  <div
                    className={`font-medium ${
                      totalProfitLossPercentage >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {totalProfitLossPercentage >= 0 ? "+" : ""}
                    {totalProfitLossPercentage.toFixed(1)}%
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center text-sm text-muted-foreground mt-2">
                <span>
                  Showing: {timeSpanLabel} ({settings.timelineResolution}{" "}
                  resolution)
                </span>
                <span>{filteredData.length} data points</span>
              </div>
            </CardDescription>
          </div>
          <Button
            onClick={updatePortfolio}
            disabled={updating}
            size="sm"
            variant="outline"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${updating ? "animate-spin" : ""}`}
            />
            Update
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            total_inventory_value: {
              label: "Inventory Value",
              color: "#3b82f6", // Bright blue
            },
            total_money_invested: {
              label: "Money Invested",
              color: "#f59e0b", // Bright amber/orange
            },
          }}
          className="h-[400px] w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={filteredData}
              margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => {
                  const date = new Date(value);
                  if (
                    ["5s", "30s", "1m"].includes(settings.timelineResolution)
                  ) {
                    return date.toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                  } else if (
                    ["5min", "30min", "1h", "4h"].includes(
                      settings.timelineResolution
                    )
                  ) {
                    return date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                    });
                  } else {
                    return date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    });
                  }
                }}
                stroke="hsl(var(--foreground))"
              />
              <YAxis
                tickFormatter={(value) => `$${value.toFixed(0)}`}
                stroke="hsl(var(--foreground))"
              />
              <ChartTooltip
                content={<ChartTooltipContent />}
                labelFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                }}
                formatter={(value: number, name: string) => [
                  `$${value.toFixed(2)}`,
                  name === "total_inventory_value"
                    ? "Inventory Value"
                    : "Money Invested",
                ]}
              />
              <Line
                type="monotone"
                dataKey="total_inventory_value"
                stroke="#3b82f6"
                strokeWidth={4}
                dot={{ fill: "#3b82f6", strokeWidth: 2, r: 6 }}
                activeDot={{
                  r: 8,
                  fill: "#3b82f6",
                  stroke: "#ffffff",
                  strokeWidth: 2,
                }}
              />
              <Line
                type="monotone"
                dataKey="total_money_invested"
                stroke="#f59e0b"
                strokeWidth={4}
                dot={{ fill: "#f59e0b", strokeWidth: 2, r: 6 }}
                activeDot={{
                  r: 8,
                  fill: "#f59e0b",
                  stroke: "#ffffff",
                  strokeWidth: 2,
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
