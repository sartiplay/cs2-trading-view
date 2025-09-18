import { ItemForm } from "@/components/item-form";
import { ItemsTable } from "@/components/items-table";
import { CaptureStats } from "@/components/capture-stats";
import { SettingsDialog } from "@/components/settings-dialog";
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

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-6xl space-y-8">
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

        <CaptureStats />

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
            <AccordionTrigger className="text-lg font-semibold">
              Price Capture Scheduler
            </AccordionTrigger>
            <AccordionContent>
              <Card className="border-0 shadow-none">
                <CardContent className="pt-4">
                  <SchedulerStatus />
                </CardContent>
              </Card>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <Card>
          <CardHeader>
            <CardTitle>Tracked Items</CardTitle>
            <CardDescription>
              View and manage your tracked items
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ItemsTable />
          </CardContent>
        </Card>

        <SoldItemsDisplay />
      </div>
    </div>
  );
}
