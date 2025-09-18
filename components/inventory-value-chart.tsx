"use client";

import { useEffect, useState } from "react";
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
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface InventoryData {
  total_purchase_value: number;
  total_current_value: number;
  total_profit_loss: number;
  total_profit_loss_percentage: number;
  timeline: Array<{ date: string; total_value: number }>;
}

export function InventoryValueChart() {
  const [data, setData] = useState<InventoryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchInventoryData = async () => {
      try {
        const response = await fetch("/api/inventory-value");
        if (response.ok) {
          const inventoryData = await response.json();
          setData(inventoryData);
        }
      } catch (error) {
        console.error("Failed to fetch inventory data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInventoryData();
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Inventory Value Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading inventory data...</div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.timeline.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Inventory Value Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No price history data available yet
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventory Value Timeline</CardTitle>
        <CardDescription>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
            <div>
              <div className="text-sm text-muted-foreground">
                Purchase Value
              </div>
              <div className="font-medium">
                ${data.total_purchase_value.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Current Value</div>
              <div className="font-medium">
                ${data.total_current_value.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Total P&L</div>
              <div
                className={`font-medium ${
                  data.total_profit_loss >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {data.total_profit_loss >= 0 ? "+" : ""}$
                {data.total_profit_loss.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Total P&L %</div>
              <div
                className={`font-medium ${
                  data.total_profit_loss_percentage >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {data.total_profit_loss_percentage >= 0 ? "+" : ""}
                {data.total_profit_loss_percentage.toFixed(1)}%
              </div>
            </div>
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            total_value: {
              label: "Total Value",
              color: "hsl(217, 91%, 60%)",
            },
          }}
          className="h-[300px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data.timeline}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => new Date(value).toLocaleDateString()}
                stroke="hsl(var(--foreground))"
              />
              <YAxis
                tickFormatter={(value) => `$${value.toFixed(0)}`}
                stroke="hsl(var(--foreground))"
              />
              <ChartTooltip
                content={<ChartTooltipContent />}
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
                formatter={(value: number) => [
                  `$${value.toFixed(2)}`,
                  "Total Value",
                ]}
              />
              <Line
                type="monotone"
                dataKey="total_value"
                stroke="hsl(217, 91%, 60%)"
                strokeWidth={3}
                dot={{ fill: "hsl(217, 91%, 60%)", strokeWidth: 2, r: 5 }}
                activeDot={{ r: 7, fill: "hsl(217, 91%, 60%)" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
