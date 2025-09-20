"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions,
} from "chart.js";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useSettings } from "./settings-dialog";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface PortfolioData {
  timestamp?: string;
  date: string;
  total_inventory_value: number;
  total_money_invested: number;
}

interface GeneratedChartData {
  labels: string[];
  inventoryValues: (number | null)[];
  investedValues: (number | null)[];
  rawData: PortfolioData[];
  slotTimestamps: number[];
  timeSpanLabel: string;
  defaultViewStart: number;
  defaultViewEnd: number;
  fullTimeRange: {
    start: number;
    end: number;
  };
}

interface ResolutionConfig {
  defaultViewSpan: number;
  labelFormat: Intl.DateTimeFormatOptions;
  tickInterval: number;
}

const getResolutionConfig = (resolution: string): ResolutionConfig => {
  switch (resolution) {
    case "5s":
      return {
        defaultViewSpan: 10 * 60 * 1000,
        labelFormat: {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        },
        tickInterval: 5 * 1000,
      };
    case "30s":
      return {
        defaultViewSpan: 30 * 60 * 1000,
        labelFormat: {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        },
        tickInterval: 30 * 1000,
      };
    case "1m":
      return {
        defaultViewSpan: 2 * 60 * 60 * 1000,
        labelFormat: { hour: "2-digit", minute: "2-digit" },
        tickInterval: 60 * 1000,
      };
    case "5min":
      return {
        defaultViewSpan: 24 * 60 * 60 * 1000,
        labelFormat: { hour: "2-digit", minute: "2-digit" },
        tickInterval: 5 * 60 * 1000,
      };
    case "30min":
      return {
        defaultViewSpan: 24 * 60 * 60 * 1000,
        labelFormat: { hour: "2-digit", minute: "2-digit" },
        tickInterval: 30 * 60 * 1000,
      };
    case "1h":
      return {
        defaultViewSpan: 24 * 60 * 60 * 1000,
        labelFormat: { hour: "2-digit", minute: "2-digit" },
        tickInterval: 60 * 60 * 1000,
      };
    case "4h":
      return {
        defaultViewSpan: 7 * 24 * 60 * 60 * 1000,
        labelFormat: {
          month: "short",
          day: "numeric",
          hour: "2-digit",
        },
        tickInterval: 4 * 60 * 60 * 1000,
      };
    case "1d":
    default:
      return {
        defaultViewSpan: 30 * 24 * 60 * 60 * 1000,
        labelFormat: { month: "short", day: "numeric" },
        tickInterval: 24 * 60 * 60 * 1000,
      };
  }
};

const getTimeSpanLabel = (resolution: string): string => {
  switch (resolution) {
    case "5s":
      return "10 minutes";
    case "30s":
      return "30 minutes";
    case "1m":
      return "2 hours";
    case "5min":
    case "30min":
    case "1h":
      return "24 hours";
    case "4h":
      return "1 week";
    case "1d":
    default:
      return "30 days";
  }
};

const parsePortfolioDate = (value: string): Date => {
  if (value.includes("T")) {
    return new Date(value);
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return new Date(value);
  }
  return parsed;
};

const getEntryTime = (entry: PortfolioData): number => {
  const value = entry.timestamp ?? entry.date;
  return parsePortfolioDate(value).getTime();
};

const generateChartData = (
  data: PortfolioData[],
  resolution: string
): GeneratedChartData => {
  const { defaultViewSpan, labelFormat, tickInterval } =
    getResolutionConfig(resolution);

  const now = new Date();
  const sortedData = [...data].sort((a, b) => getEntryTime(a) - getEntryTime(b));

  const earliestDataTime =
    sortedData.length > 0
      ? getEntryTime(sortedData[0])
      : now.getTime();
  const latestDataTime =
    sortedData.length > 0
      ? getEntryTime(sortedData[sortedData.length - 1])
      : now.getTime();

  const startTime = Math.min(earliestDataTime, now.getTime() - defaultViewSpan);
  const endTime = now.getTime();
  const defaultViewStart = now.getTime() - defaultViewSpan;

  const timeSlots: Date[] = [];
  for (let time = startTime; time <= endTime; time += tickInterval) {
    timeSlots.push(new Date(time));
  }

  if (timeSlots.length === 0) {
    timeSlots.push(new Date(startTime));
  }

  const relevantData = sortedData.filter((entry) => {
    const entryTime = getEntryTime(entry);
    return entryTime >= startTime && entryTime <= endTime;
  });

  console.log(
    `[v0] Portfolio chart - Resolution: ${resolution}, Data points: ${relevantData.length}`
  );

  const dataMap = new Map<number, PortfolioData>();

  relevantData.forEach((entry) => {
    const entryTime = getEntryTime(entry);
    let closestSlot = 0;
    let minDiff = Math.abs(timeSlots[0].getTime() - entryTime);

    for (let i = 1; i < timeSlots.length; i++) {
      const diff = Math.abs(timeSlots[i].getTime() - entryTime);
      if (diff < minDiff) {
        minDiff = diff;
        closestSlot = i;
      }
    }

    dataMap.set(closestSlot, entry);
  });

  const labels: string[] = [];
  const inventoryValues: (number | null)[] = [];
  const investedValues: (number | null)[] = [];
  const slotTimestamps: number[] = [];

  timeSlots.forEach((slot, index) => {
    labels.push(slot.toLocaleString("en-US", labelFormat));
    slotTimestamps.push(slot.getTime());

    if (dataMap.has(index)) {
      const entry = dataMap.get(index)!;
      inventoryValues.push(entry.total_inventory_value);
      investedValues.push(entry.total_money_invested);
    } else {
      inventoryValues.push(null);
      investedValues.push(null);
    }
  });

  const cleanedLabels: string[] = [];
  const cleanedInventory: (number | null)[] = [];
  const cleanedInvested: (number | null)[] = [];
  const cleanedTimestamps: number[] = [];

  for (let i = 0; i < labels.length; i++) {
    const hasData = inventoryValues[i] !== null || investedValues[i] !== null;
    const prevHasData =
      i > 0 &&
      (inventoryValues[i - 1] !== null || investedValues[i - 1] !== null);
    const nextHasData =
      i < labels.length - 1 &&
      (inventoryValues[i + 1] !== null || investedValues[i + 1] !== null);

    if (hasData || prevHasData || nextHasData) {
      cleanedLabels.push(labels[i]);
      cleanedInventory.push(inventoryValues[i]);
      cleanedInvested.push(investedValues[i]);
      cleanedTimestamps.push(slotTimestamps[i]);
    }
  }

  if (cleanedLabels.length === 0) {
    cleanedLabels.push(...labels);
    cleanedInventory.push(...inventoryValues);
    cleanedInvested.push(...investedValues);
    cleanedTimestamps.push(...slotTimestamps);
  }

  console.log(
    `[v0] Portfolio chart - Generated ${cleanedLabels.length} slots with ${
      cleanedInventory.filter((value) => value !== null).length
    } inventory points and ${
      cleanedInvested.filter((value) => value !== null).length
    } invested points`
  );

  return {
    labels: cleanedLabels,
    inventoryValues: cleanedInventory,
    investedValues: cleanedInvested,
    rawData: relevantData,
    slotTimestamps: cleanedTimestamps,
    timeSpanLabel: getTimeSpanLabel(resolution),
    defaultViewStart,
    defaultViewEnd: now.getTime(),
    fullTimeRange: { start: startTime, end: Math.max(endTime, latestDataTime) },
  };
};

export function PortfolioChart() {
  const [data, setData] = useState<PortfolioData[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const settings = useSettings();
  const chartRef = useRef<ChartJS<"line"> | null>(null);
  const [zoomPluginReady, setZoomPluginReady] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return !!ChartJS.registry.plugins.get("zoom");
  });

  useEffect(() => {
    if (typeof window === "undefined" || ChartJS.registry.plugins.get("zoom")) {
      setZoomPluginReady(true);
      return;
    }

    let isActive = true;

    import("chartjs-plugin-zoom")
      .then((module) => {
        if (!isActive) {
          return;
        }

        const zoomPlugin = module.default;
        if (!ChartJS.registry.plugins.get("zoom")) {
          ChartJS.register(zoomPlugin);
        }

        setZoomPluginReady(true);

        requestAnimationFrame(() => {
          chartRef.current?.update();
        });
      })
      .catch((error) => {
        console.error("[v0] Failed to load chart zoom plugin", error);
      });

    return () => {
      isActive = false;
    };
  }, []);

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
  const chartData = useMemo(() => {
    if (data.length === 0) {
      return null;
    }

    return generateChartData(data, settings.timelineResolution);
  }, [data, settings.timelineResolution]);

  // Calculate current values for display
  const currentData =
    chartData && chartData.rawData.length > 0
      ? chartData.rawData[chartData.rawData.length - 1]
      : null;
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

  if (!chartData || chartData.rawData.length === 0) {
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

  const {
    labels,
    inventoryValues,
    investedValues,
    rawData,
    slotTimestamps,
    timeSpanLabel,
    defaultViewStart,
    defaultViewEnd,
    fullTimeRange,
  } = chartData;

  const lineChartData = {
    labels,
    datasets: [
      {
        label: "Inventory Value ($)",
        data: inventoryValues,
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        borderWidth: 3,
        fill: true,
        tension: 0.2,
        pointBackgroundColor: "rgb(59, 130, 246)",
        pointBorderColor: "rgb(255, 255, 255)",
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 8,
        pointHoverBackgroundColor: "rgb(37, 99, 235)",
        pointHoverBorderColor: "rgb(255, 255, 255)",
        spanGaps: true,
      },
      {
        label: "Money Invested ($)",
        data: investedValues,
        borderColor: "rgb(245, 158, 11)",
        backgroundColor: "rgba(245, 158, 11, 0.1)",
        borderWidth: 3,
        fill: true,
        tension: 0.2,
        pointBackgroundColor: "rgb(245, 158, 11)",
        pointBorderColor: "rgb(255, 255, 255)",
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 8,
        pointHoverBackgroundColor: "rgb(217, 119, 6)",
        pointHoverBorderColor: "rgb(255, 255, 255)",
        spanGaps: true,
      },
    ],
  };

  const totalDataPoints = labels.length;
  const fullRangeDuration = Math.max(
    1,
    fullTimeRange.end - fullTimeRange.start
  );
  const defaultViewDuration = Math.min(
    fullRangeDuration,
    defaultViewEnd - defaultViewStart
  );
  const defaultViewRatio = Math.min(1, defaultViewDuration / fullRangeDuration);
  const defaultViewCount = Math.floor(totalDataPoints * defaultViewRatio);
  const defaultViewStartIndex = Math.max(0, totalDataPoints - defaultViewCount);

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        labels: {
          usePointStyle: true,
        },
      },
      tooltip: {
        mode: "index",
        intersect: false,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleColor: "rgb(255, 255, 255)",
        bodyColor: "rgb(255, 255, 255)",
        borderColor: "rgb(59, 130, 246)",
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        filter: (tooltipItem) => tooltipItem.parsed.y !== null,
        callbacks: {
          title: (context) => {
            const index = context[0]?.dataIndex ?? 0;
            const timestamp = slotTimestamps[index];
            if (!timestamp) {
              return "";
            }
            const date = new Date(timestamp);
            return date.toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });
          },
          label: (context) => {
            const label = context.dataset.label ?? "";
            const value = context.parsed.y;
            if (value === null) {
              return label;
            }
            return `${label}: $${Number(value).toFixed(2)}`;
          },
        },
      },
      zoom: {
        zoom: {
          wheel: {
            enabled: true,
          },
          pinch: {
            enabled: true,
          },
          mode: "x",
        },
        pan: {
          enabled: true,
          mode: "x",
        },
        limits: {
          x: {
            min: 0,
            max: totalDataPoints - 1,
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        min: defaultViewStartIndex,
        max: totalDataPoints - 1,
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
          drawOnChartArea: true,
        },
        ticks: {
          color: "rgb(156, 163, 175)",
          maxTicksLimit: 12,
          callback: (_value, index) => {
            const totalTicks = labels.length;
            const step = Math.max(1, Math.ceil(totalTicks / 8));
            return index % step === 0 ? labels[index] : "";
          },
        },
        border: {
          color: "rgba(255, 255, 255, 0.2)",
        },
      },
      y: {
        display: true,
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
          drawOnChartArea: true,
        },
        ticks: {
          color: "rgb(156, 163, 175)",
          callback: (value) => `$${Number(value).toFixed(2)}`,
        },
        border: {
          color: "rgba(255, 255, 255, 0.2)",
        },
      },
    },
    interaction: {
      mode: "nearest",
      axis: "x",
      intersect: false,
    },
    elements: {
      point: {
        hoverBackgroundColor: "rgb(37, 99, 235)",
      },
    },
  };

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
                  Default view: {timeSpanLabel} ({settings.timelineResolution}{" "}
                  resolution) • Scroll left for history
                </span>
                <span>{rawData.length} data points</span>
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
        <div className="space-y-3">
          <div
            className="h-80"
            onDoubleClick={() => {
              chartRef.current?.resetZoom();
            }}
          >
            <Line
              key={zoomPluginReady ? "chartjs-with-zoom" : "chartjs-no-zoom"}
              data={lineChartData}
              options={options}
              ref={(chart) => {
                chartRef.current = chart ?? null;
              }}
            />
          </div>
          <div className="text-xs text-muted-foreground text-center">
            Use mouse wheel to zoom • Click and drag to pan • Double-click to
            reset view
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
