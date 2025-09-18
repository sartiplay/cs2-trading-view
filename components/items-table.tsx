"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2, Eye, ExternalLink, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

import { EditItemDialog } from "@/components/edit-item-dialog";
import { DeleteItemDialog } from "@/components/delete-file-dialog";

interface Item {
  market_hash_name: string;
  label: string;
  description?: string;
  appid: number;
  steam_url?: string;
  purchase_price: number;
  purchase_price_usd: number;
  purchase_currency: string;
  quantity: number;
  latest_price?: number;
  last_updated?: string;
  profit_loss?: number | null;
  profit_loss_percentage?: number | null;
  stickers?: Array<{
    name: string;
    steam_url: string;
    price: number;
    currency: string;
  }>;
  charms?: Array<{
    name: string;
    steam_url: string;
    price: number;
    currency: string;
  }>;
  patches?: Array<{
    name: string;
    steam_url: string;
    price: number;
    currency: string;
  }>;
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

export function ItemsTable() {
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<Item | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { toast } = useToast();

  const fetchItems = async () => {
    try {
      const response = await fetch("/api/items");
      if (response.ok) {
        const data = await response.json();
        setItems(data);
      }
    } catch (error) {
      console.error("Failed to fetch items:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteItem = (item: Item) => {
    setDeletingItem(item);
    setDeleteDialogOpen(true);
  };

  const handleItemDeleted = () => {
    fetchItems(); // Refresh the items list
    window.dispatchEvent(new Event("refreshItems"));
  };

  const handleEditItem = (item: Item) => {
    if (!item) return;
    setEditingItem({
      market_hash_name: item.market_hash_name,
      label: item.label,
      description: item.description,
      appid: item.appid,
      steam_url: item.steam_url,
      purchase_price: item.purchase_price,
      purchase_price_usd: item.purchase_price_usd,
      purchase_currency: item.purchase_currency,
      quantity: item.quantity,
      stickers: item.stickers,
      charms: item.charms,
      patches: item.patches,
    });
    setEditDialogOpen(true);
  };

  useEffect(() => {
    fetchItems();

    const handleRefresh = () => {
      fetchItems();
    };

    window.addEventListener("refreshItems", handleRefresh);

    return () => {
      window.removeEventListener("refreshItems", handleRefresh);
    };
  }, []);

  if (isLoading) {
    return <div className="text-center py-4">Loading items...</div>;
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        No items tracked yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border rounded-md">
        <div className="max-h-[600px] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Purchase Price</TableHead>
                <TableHead>Current Price</TableHead>
                <TableHead>Total Value</TableHead>
                <TableHead>Profit/Loss</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const currencySymbol =
                  CURRENCY_SYMBOLS[item.purchase_currency] ||
                  item.purchase_currency;
                return (
                  <TableRow key={item.market_hash_name}>
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
                        {(item.stickers?.length !== 0 ||
                          item.charms?.length !== 0 ||
                          item.patches?.length !== 0) && (
                          <div className="mt-2 space-y-1">
                            {item.stickers && item.stickers.length > 0 && (
                              <div className="text-xs">
                                <span className="font-medium text-blue-400">
                                  Stickers:
                                </span>{" "}
                                {item.stickers.map((sticker, idx) => (
                                  <span
                                    key={idx}
                                    className="text-muted-foreground"
                                  >
                                    {sticker.name}
                                    {idx < item.stickers!.length - 1
                                      ? ", "
                                      : ""}
                                  </span>
                                ))}
                              </div>
                            )}
                            {item.charms && item.charms.length > 0 && (
                              <div className="text-xs">
                                <span className="font-medium text-green-400">
                                  Charms:
                                </span>{" "}
                                {item.charms.map((charm, idx) => (
                                  <span
                                    key={idx}
                                    className="text-muted-foreground"
                                  >
                                    {charm.name}
                                    {idx < item.charms!.length - 1 ? ", " : ""}
                                  </span>
                                ))}
                              </div>
                            )}
                            {item.patches && item.patches.length > 0 && (
                              <div className="text-xs">
                                <span className="font-medium text-purple-400">
                                  Patches:
                                </span>{" "}
                                {item.patches.map((patch, idx) => (
                                  <span
                                    key={idx}
                                    className="text-muted-foreground"
                                  >
                                    {patch.name}
                                    {idx < item.patches!.length - 1 ? ", " : ""}
                                  </span>
                                ))}
                              </div>
                            )}
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
                        {currencySymbol}
                        {item.purchase_price.toFixed(2)}
                      </div>
                      {item.purchase_currency !== "USD" && (
                        <div className="text-sm text-muted-foreground">
                          ≈ ${item.purchase_price_usd.toFixed(2)} USD
                        </div>
                      )}
                      <div className="text-sm text-muted-foreground">
                        Total: $
                        {(item.purchase_price_usd * item.quantity).toFixed(2)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.latest_price ? (
                        <div>
                          <div className="font-medium">
                            ${item.latest_price.toFixed(2)}
                          </div>
                          {item.last_updated && (
                            <div className="text-sm text-muted-foreground">
                              {new Date(item.last_updated).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No data</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.latest_price ? (
                        <div className="font-medium">
                          ${(item.latest_price * item.quantity).toFixed(2)}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No data</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.profit_loss !== null &&
                      item.profit_loss !== undefined ? (
                        <div>
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
                          {item.profit_loss_percentage !== null && (
                            <div
                              className={`text-sm ${
                                (item.profit_loss_percentage ?? 0) >= 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {(item.profit_loss_percentage ?? 0) >= 0
                                ? "+"
                                : ""}
                              {(item.profit_loss_percentage ?? 0).toFixed(1)}%
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No data</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link
                            href={`/item/${encodeURIComponent(
                              item.market_hash_name
                            )}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditItem(item)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteItem(item)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
      <EditItemDialog
        item={editingItem}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onItemUpdated={handleItemDeleted}
      />
      <DeleteItemDialog
        item={deletingItem}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onItemDeleted={handleItemDeleted}
      />
    </div>
  );
}
