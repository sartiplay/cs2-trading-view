"use client";

import { useState, useEffect } from "react";
import { ItemForm } from "@/components/item-form";
import { ItemsTable } from "@/components/items-table";
import { CaptureStats } from "@/components/capture-stats";
import { SettingsDialog } from "@/components/settings-dialog";
import { PortfolioChart } from "@/components/portfolio-chart";
import { WorkerStatus } from "@/components/worker-status";
import { CurrencyProvider } from "@/contexts/currency-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SchedulerStatus } from "@/components/scheduler-status";
import { SoldItemsDisplay } from "@/components/sold-items-display";
import { SchedulerAccordionTrigger } from "@/components/scheduer-accordion-trigger";

interface AppSettings {
  workerStatusVisible: boolean;
  priceSource?: "steam" | "csgoskins";
}

export default function Dashboard() {
  const [settings, setSettings] = useState<AppSettings>({ workerStatusVisible: false });
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch("/api/settings");
        if (response.ok) {
          const data = await response.json();
          setSettings(data);
        }
      } catch (error) {
        console.error("Failed to fetch settings:", error);
      } finally {
        setSettingsLoaded(true);
      }
    };

    fetchSettings();
  }, []);

  // Listen for price source changes from the items table
  useEffect(() => {
    const handlePriceSourceChange = (event: CustomEvent) => {
      setSettings(prev => ({ ...prev, priceSource: event.detail.priceSource }));
    };

    window.addEventListener('priceSourceChanged', handlePriceSourceChange as EventListener);
    return () => {
      window.removeEventListener('priceSourceChanged', handlePriceSourceChange as EventListener);
    };
  }, []);
  return (
    <CurrencyProvider>
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex items-center justify-between">
          <div className="text-center flex-1">
            <h1 className="text-4xl font-bold tracking-tight text-balance">
              CS2 Price Tracker
            </h1>
            <p className="text-muted-foreground mt-2 text-pretty">
              Track Steam Market prices for your favorite CS2 items
            </p>
          </div>
          <div className="flex-shrink-0">
            <SettingsDialog />
          </div>
        </div>

        <div className="space-y-8">
          <CaptureStats priceSource={settings.priceSource || "steam"} />

          {/* Worker Status - Mobile/Tablet: In accordion */}
          {settingsLoaded && settings.workerStatusVisible && (
            <div className="xl:hidden">
              <Accordion type="multiple" className="w-full">
                <AccordionItem value="worker-status">
                  <AccordionTrigger className="text-lg font-semibold">
                    Worker Status
                  </AccordionTrigger>
                  <AccordionContent>
                    <WorkerStatus />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          )}

          <Accordion type="multiple" className="w-full">
            <AccordionItem value="add-item">
              <AccordionTrigger className="text-lg font-semibold">
                Add New Item
              </AccordionTrigger>
              <AccordionContent>
                <Card className="border-0 shadow-none">
                  <CardContent className="pt-4">
                    <p className="text-muted-foreground mb-4 text-pretty">
                      Add CS2 items to track their Steam Market prices
                    </p>
                    <ItemForm />
                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="scheduler">
              <SchedulerAccordionTrigger />
              <AccordionContent>
                <Card className="border-0 shadow-none">
                  <CardContent className="pt-4">
                    <SchedulerStatus />
                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Worker Status - Desktop: Floating sidebar */}
        {settingsLoaded && settings.workerStatusVisible && (
          <div className="hidden xl:block fixed top-24 right-6 w-80 z-10">
            <WorkerStatus />
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Tracked Items</CardTitle>
            <CardDescription>
              View and manage your tracked items
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ItemsTable />
          </CardContent>
        </Card>

        <PortfolioChart />

        <SoldItemsDisplay />
      </div>
    </div>
    </CurrencyProvider>
  );
}
