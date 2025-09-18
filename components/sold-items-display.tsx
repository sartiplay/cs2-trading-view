"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExternalLink } from "lucide-react";

interface SoldItem {
  market_hash_name: string;
  label: string;
  description?: string;
  steam_url: string;
  purchase_price: number;
  purchase_currency: string;
  quantity: number;
  sold_price: number;
  sold_currency: string;
  sold_date: string;
  profit_loss: number;
  profit_loss_percentage: number;
}

interface SoldItemsSummary {
  total_sold_items: number;
  total_sold_value_usd: number;
  total_profit_loss: number;
  total_profit_loss_percentage: number;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  CAD: "C$",
  AUD: "A$",
  CHF: "CHF",
  CNY: "¥",
  SEK: "kr",
  NOK: "kr",
  DKK: "kr",
  PLN: "zł",
  CZK: "Kč",
  HUF: "Ft",
  RUB: "₽",
  BRL: "R$",
  MXN: "$",
  INR: "₹",
  KRW: "₩",
  SGD: "S$",
};

export function SoldItemsDisplay() {
  const [soldItems, setSoldItems] = useState<SoldItem[]>([]);
  const [summary, setSummary] = useState<SoldItemsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSoldItems = async () => {
    try {
      const response = await fetch("/api/sold-items");
      if (response.ok) {
        const data = await response.json();
        setSoldItems(data.items);
        setSummary(data.summary);
      }
    } catch (error) {
      console.error("Failed to fetch sold items:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSoldItems();

    const handleRefresh = () => {
      fetchSoldItems();
    };

    window.addEventListener("refreshItems", handleRefresh);
    return () => {
      window.removeEventListener("refreshItems", handleRefresh);
    };
  }, []);

  if (isLoading) {
    return <div className="text-center py-4">Loading sold items...</div>;
  }

  if (!summary || soldItems.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sold Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            No items sold yet
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Items Sold</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total_sold_items}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Sold Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${summary.total_sold_value_usd.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Profit/Loss
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                summary.total_profit_loss >= 0
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {summary.total_profit_loss >= 0 ? "+" : ""}$
              {summary.total_profit_loss.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Return %</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                summary.total_profit_loss_percentage >= 0
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {summary.total_profit_loss_percentage >= 0 ? "+" : ""}
              {summary.total_profit_loss_percentage.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sold Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>Sold Items History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Purchase Price</TableHead>
                <TableHead>Sold Price</TableHead>
                <TableHead>Profit/Loss</TableHead>
                <TableHead>Sold Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {soldItems.map((item) => {
                const purchaseCurrencySymbol =
                  CURRENCY_SYMBOLS[item.purchase_currency] ||
                  item.purchase_currency;
                const soldCurrencySymbol =
                  CURRENCY_SYMBOLS[item.sold_currency] || item.sold_currency;

                return (
                  <TableRow key={`${item.market_hash_name}-${item.sold_date}`}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.label}</div>
                        <div className="text-sm text-muted-foreground">
                          {item.market_hash_name}
                        </div>
                        {item.description && (
                          <div className="text-xs text-muted-foreground italic mt-1">
                            {item.description}
                          </div>
                        )}
                        {item.steam_url && (
                          <div className="mt-1">
                            <a
                              href={item.steam_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" />
                              View on Steam Market
                            </a>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{item.quantity}x</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {purchaseCurrencySymbol}
                        {item.purchase_price.toFixed(2)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Total: {purchaseCurrencySymbol}
                        {(item.purchase_price * item.quantity).toFixed(2)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {soldCurrencySymbol}
                        {item.sold_price.toFixed(2)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Total: {soldCurrencySymbol}
                        {(item.sold_price * item.quantity).toFixed(2)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div
                        className={`font-medium ${
                          item.profit_loss >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {item.profit_loss >= 0 ? "+" : ""}$
                        {item.profit_loss.toFixed(2)}
                      </div>
                      <div
                        className={`text-sm ${
                          item.profit_loss_percentage >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {item.profit_loss_percentage >= 0 ? "+" : ""}
                        {item.profit_loss_percentage.toFixed(1)}%
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {new Date(item.sold_date).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(item.sold_date).toLocaleTimeString()}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
