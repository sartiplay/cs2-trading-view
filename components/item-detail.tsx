"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowLeft,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { PriceChart } from "@/components/price-chart";
import { SettingsDialog } from "@/components/settings-dialog";
import { useToast } from "@/hooks/use-toast";

interface PriceEntry {
  date: string;
  median_price: number;
}

interface ItemData {
  market_hash_name: string;
  label: string;
  appid: number;
  description?: string;
  steam_url?: string;
  price_history: PriceEntry[];
}

interface ItemDetailProps {
  hash: string;
}

export function ItemDetail({ hash }: ItemDetailProps) {
  const [item, setItem] = useState<ItemData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);
  const { toast } = useToast();

  const fetchItem = async () => {
    try {
      const response = await fetch(`/api/items/${encodeURIComponent(hash)}`);
      if (response.ok) {
        const data = await response.json();
        setItem(data);
      }
    } catch (error) {
      console.error("Failed to fetch item:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const capturePrice = async () => {
    setIsCapturing(true);
    try {
      const response = await fetch("/api/jobs/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ market_hash_name: hash }),
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Success",
          description: result.message,
        });
        // Refresh the item data
        await fetchItem();
      } else {
        throw new Error("Failed to capture price");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to capture price",
        variant: "destructive",
      });
    } finally {
      setIsCapturing(false);
    }
  };

  useEffect(() => {
    fetchItem();
  }, [hash]);

  if (isLoading) {
    return <div className="text-center py-8">Loading item details...</div>;
  }

  if (!item) {
    return <div className="text-center py-8">Item not found</div>;
  }

  const latestPrice = item.price_history[item.price_history.length - 1];
  const previousPrice = item.price_history[item.price_history.length - 2];

  // Calculate price change
  let priceChange = 0;
  let priceChangePercent = 0;
  if (latestPrice && previousPrice) {
    priceChange = latestPrice.median_price - previousPrice.median_price;
    priceChangePercent = (priceChange / previousPrice.median_price) * 100;
  }

  // Calculate statistics
  const prices = item.price_history.map((entry) => entry.median_price);
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
  const avgPrice =
    prices.length > 0
      ? prices.reduce((sum, price) => sum + price, 0) / prices.length
      : 0;

  const uniqueDays = new Set(
    item.price_history.map((entry) => entry.date.split("T")[0])
  ).size;
  const totalDataPoints = item.price_history.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-balance text-foreground">
            {item.label}
          </h1>
          <p className="text-muted-foreground text-pretty">
            {item.market_hash_name}
          </p>
          {item.description && (
            <p className="text-sm text-muted-foreground mt-2 italic">
              {item.description}
            </p>
          )}
          {item.steam_url && (
            <div className="mt-2">
              <a
                href={item.steam_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                View on Steam Market
              </a>
            </div>
          )}
        </div>
        <div className="flex-shrink-0">
          <SettingsDialog />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-card-foreground">
              Latest Price
            </CardTitle>
            {previousPrice && latestPrice && (
              <div className="flex items-center">
                {priceChange > 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-400" />
                ) : priceChange < 0 ? (
                  <TrendingDown className="h-4 w-4 text-red-400" />
                ) : (
                  <Minus className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            )}
          </CardHeader>
          <CardContent>
            {latestPrice ? (
              <div>
                <div className="text-2xl font-bold text-card-foreground">
                  ${latestPrice.median_price.toFixed(2)}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">
                    {new Date(latestPrice.date).toLocaleDateString()}
                  </span>
                  {previousPrice && (
                    <span
                      className={`font-medium ${
                        priceChange > 0
                          ? "text-green-400"
                          : priceChange < 0
                          ? "text-red-400"
                          : "text-muted-foreground"
                      }`}
                    >
                      {priceChange > 0 ? "+" : ""}
                      {priceChangePercent.toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground">
                No price data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-card-foreground">
              Average Price
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">
              ${avgPrice.toFixed(2)}
            </div>
            <div className="text-sm text-muted-foreground">
              All-time average
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-card-foreground">
              Price Range
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="text-sm">
                <span className="text-muted-foreground">High:</span>{" "}
                <span className="font-medium text-green-400">
                  ${maxPrice.toFixed(2)}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Low:</span>{" "}
                <span className="font-medium text-red-400">
                  ${minPrice.toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-card-foreground">
              Data Points
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">
              {totalDataPoints}
            </div>
            <div className="text-xs text-muted-foreground mb-2">
              {uniqueDays} unique days
            </div>
            <Button
              onClick={capturePrice}
              disabled={isCapturing}
              size="sm"
              className="w-full"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isCapturing ? "animate-spin" : ""}`}
              />
              {isCapturing ? "Capturing..." : "Capture Now"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="text-card-foreground">Price History</CardTitle>
          <CardDescription>
            Price trend with {totalDataPoints} data points across {uniqueDays}{" "}
            days
          </CardDescription>
        </CardHeader>
        <CardContent className="bg-background/20 rounded-lg p-4">
          <PriceChart data={item.price_history.slice(-200)} />
        </CardContent>
      </Card>
    </div>
  );
}
