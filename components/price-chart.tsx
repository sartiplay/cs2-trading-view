"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
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
import { Button } from "@/components/ui/button";
import { useSettings } from "./settings-dialog";

const registerChart = async () => {
  const { default: zoomPlugin } = await import("chartjs-plugin-zoom");
  if (!ChartJS.registry.plugins.get("zoom")) {
    ChartJS.register(zoomPlugin);
  }
};

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

interface PriceEntry {
  date: string;
  median_price: number;
}

interface PriceChartProps {
  data: PriceEntry[];
}

interface GeneratedChartData {
  labels: string[];
  dataset: (number | null)[];
  rawData: PriceEntry[];
  slotTimestamps: number[];
  timeSpanLabel: string;
  defaultViewStart: number;
  defaultViewEnd: number;
  fullTimeRange: {
    start: number;
    end: number;
  };
}

const MAX_POINTS = 1500;

const trimDataPoints = (entries: PriceEntry[]): PriceEntry[] => {
  if (entries.length <= MAX_POINTS) {
    return entries;
  }
  const step = Math.ceil(entries.length / MAX_POINTS);
  const trimmed: PriceEntry[] = [];
  for (let i = 0; i < entries.length; i += step) {
    trimmed.push(entries[i]);
  }
  if (trimmed[trimmed.length - 1]?.date !== entries[entries.length - 1]?.date) {
    trimmed.push(entries[entries.length - 1]);
  }
  return trimmed;
};

function generateChartData(
  data: PriceEntry[],
  resolution: string
): GeneratedChartData {
  const now = new Date();
  let defaultViewSpan: number;
  let timeUnit: string;
  let labelFormat: Intl.DateTimeFormatOptions;
  let tickInterval: number;

  switch (resolution) {
    case "5s":
      defaultViewSpan = 10 * 60 * 1000; // 10 minutes in view
      timeUnit = "5s";
      labelFormat = { hour: "2-digit", minute: "2-digit", second: "2-digit" };
      tickInterval = 5 * 1000; // 5 seconds
      break;
    case "30s":
      defaultViewSpan = 30 * 60 * 1000; // 30 minutes in view
      timeUnit = "30s";
      labelFormat = { hour: "2-digit", minute: "2-digit", second: "2-digit" };
      tickInterval = 30 * 1000; // 30 seconds
      break;
    case "1m":
      defaultViewSpan = 2 * 60 * 60 * 1000; // 2 hours in view
      timeUnit = "1m";
      labelFormat = { hour: "2-digit", minute: "2-digit" };
      tickInterval = 60 * 1000; // 1 minute
      break;
    case "5min":
      defaultViewSpan = 24 * 60 * 60 * 1000; // 24 hours in view
      timeUnit = "5min";
      labelFormat = { hour: "2-digit", minute: "2-digit" };
      tickInterval = 5 * 60 * 1000; // 5 minutes
      break;
    case "30min":
      defaultViewSpan = 24 * 60 * 60 * 1000; // 24 hours in view
      timeUnit = "30min";
      labelFormat = { hour: "2-digit", minute: "2-digit" };
      tickInterval = 30 * 60 * 1000; // 30 minutes
      break;
    case "1h":
      defaultViewSpan = 24 * 60 * 60 * 1000; // 24 hours in view
      timeUnit = "1h";
      labelFormat = { hour: "2-digit", minute: "2-digit" };
      tickInterval = 60 * 60 * 1000; // 1 hour
      break;
    case "4h":
      defaultViewSpan = 7 * 24 * 60 * 60 * 1000; // 1 week in view
      timeUnit = "4h";
      labelFormat = { month: "short", day: "numeric", hour: "2-digit" };
      tickInterval = 4 * 60 * 60 * 1000; // 4 hours
      break;
    case "1d":
    default:
      defaultViewSpan = 30 * 24 * 60 * 60 * 1000; // 30 days in view
      timeUnit = "1d";
      labelFormat = { month: "short", day: "numeric" };
      tickInterval = 24 * 60 * 60 * 1000; // 1 day
      break;
  }

  const earliestDataTime =
    data.length > 0 ? new Date(data[0].date).getTime() : now.getTime();
  const latestDataTime =
    data.length > 0
      ? new Date(data[data.length - 1].date).getTime()
      : now.getTime();

  const startTime = Math.min(earliestDataTime, now.getTime() - defaultViewSpan);
  const endTime = now.getTime();

  const defaultViewStart = now.getTime() - defaultViewSpan;

  // Generate time slots for the entire time span
  const timeSlots: Date[] = [];
  for (let time = startTime; time <= endTime; time += tickInterval) {
    timeSlots.push(new Date(time));
  }

  const relevantData = data.filter((entry) => {
    const entryTime = new Date(entry.date).getTime();
    return entryTime >= startTime && entryTime <= endTime;
  });

  console.log(
    `[v0] Chart data - Resolution: ${resolution}, Full range: ${timeUnit}, Data points: ${
      relevantData.length
    }, Default view: ${getTimeSpanLabel(resolution)}`
  );

  // Special handling for single data point
  if (relevantData.length === 1) {
    const singlePoint = relevantData[0];
    const singlePointTime = new Date(singlePoint.date).getTime();

    // Create labels with start point and end point
    const labels = [
      new Date(startTime).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      new Date(singlePointTime).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    ];

    // Data with null at start and actual value at the positioned point
    const chartData = [null, singlePoint.median_price];
    const slotTimestamps = [startTime, singlePointTime];

    return {
      labels,
      dataset: chartData,
      rawData: relevantData,
      slotTimestamps,
      timeSpanLabel: getTimeSpanLabel(resolution),
      defaultViewStart,
      defaultViewEnd: now.getTime(),
      fullTimeRange: { start: startTime, end: endTime },
    };
  }

  // For multiple data points, create high-resolution positioning
  const labels: string[] = [];
  const chartData: (number | null)[] = [];
  const slotTimestamps: number[] = [];
  const dataMap = new Map<number, PriceEntry>();

  // Map data points to their closest time slots
  relevantData.forEach((entry) => {
    const entryTime = new Date(entry.date).getTime();
    // Find the closest time slot
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

  // Generate labels and data arrays
  timeSlots.forEach((slot, index) => {
    const labelOptions: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      ...labelFormat,
    };
    labels.push(slot.toLocaleString("en-US", labelOptions));
    slotTimestamps.push(slot.getTime());
    chartData.push(
      dataMap.has(index) ? dataMap.get(index)!.median_price : null
    );
  });

  // Remove consecutive null values to clean up the chart
  const cleanedLabels: string[] = [];
  const cleanedData: (number | null)[] = [];
  const cleanedTimestamps: number[] = [];

  for (let i = 0; i < labels.length; i++) {
    if (
      chartData[i] !== null ||
      (i > 0 && chartData[i - 1] !== null) ||
      (i < chartData.length - 1 && chartData[i + 1] !== null)
    ) {
      cleanedLabels.push(labels[i]);
      cleanedData.push(chartData[i]);
      cleanedTimestamps.push(slotTimestamps[i]);
    }
  }

  console.log(
    `[v0] Generated ${cleanedLabels.length} time slots with ${
      cleanedData.filter((d) => d !== null).length
    } data points`
  );

  return {
    labels: cleanedLabels,
    dataset: cleanedData,
    rawData: relevantData,
    slotTimestamps: cleanedTimestamps,
    timeSpanLabel: getTimeSpanLabel(resolution),
    defaultViewStart,
    defaultViewEnd: now.getTime(),
    fullTimeRange: { start: startTime, end: endTime },
  };
}

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

export function PriceChart({ data }: PriceChartProps) {
  const settings = useSettings();
  const [chartState, setChartState] = useState<GeneratedChartData | null>(null);
  const [isPending, startTransition] = useTransition();
  const [visibleCount, setVisibleCount] = useState(15);
  const [zoomReady, setZoomReady] = useState(() =>
    typeof window === "undefined"
      ? false
      : !!ChartJS.registry.plugins.get("zoom")
  );
  const loadingMoreRef = useRef(false);

  const trimmedData = useMemo(() => trimDataPoints(data), [data]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!zoomReady) {
      registerChart()
        .then(() => {
          setZoomReady(true);
        })
        .catch((error) => {
          console.error("Failed to load chart zoom plugin", error);
        });
    }

    setVisibleCount((current) =>
      Math.min(Math.max(current, 15), Math.max(15, trimmedData.length))
    );
  }, [trimmedData]);

  const visibleData = useMemo(() => {
    const count = Math.min(visibleCount, trimmedData.length);
    const start = Math.max(trimmedData.length - count, 0);
    return trimmedData.slice(start);
  }, [trimmedData, visibleCount]);

  const requestMoreData = useCallback(() => {
    if (loadingMoreRef.current) {
      return;
    }
    if (visibleCount >= trimmedData.length) {
      return;
    }
    loadingMoreRef.current = true;
    setVisibleCount((count) => Math.min(count + 15, trimmedData.length));
  }, [trimmedData.length, visibleCount]);

  useEffect(() => {
    if (!isPending) {
      loadingMoreRef.current = false;
    }
  }, [isPending]);

  useEffect(() => {
    if (visibleData.length === 0) {
      setChartState(null);
      return;
    }

    let cancelled = false;
    startTransition(() => {
      (async () => {
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
        if (cancelled) {
          return;
        }
        const generated = generateChartData(
          visibleData,
          settings.timelineResolution
        );
        if (!cancelled) {
          setChartState(generated);
        }
      })();
    });

    return () => {
      cancelled = true;
    };
  }, [visibleData, settings.timelineResolution]);

  if (visibleData.length === 0 || chartState === null) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground border border-dashed border-border rounded-lg bg-background/50">
        {isPending ? "Preparing price chart…" : "No price data available"}
      </div>
    );
  }

  const {
    labels,
    dataset,
    rawData,
    slotTimestamps,
    timeSpanLabel,
    defaultViewStart,
    defaultViewEnd,
    fullTimeRange,
  } = chartState;

  const chartData = {
    labels,
    datasets: [
      {
        label: "Median Price ($)",
        data: dataset,
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
    ],
  };

  const totalDataPoints = labels.length;
  const defaultViewRatio =
    (defaultViewEnd - defaultViewStart) /
    Math.max(1, fullTimeRange.end - fullTimeRange.start);

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
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
            return date.toLocaleString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              timeZoneName: "short",
            });
          },
          label: (context) => {
            return `Price: $${Number(context.parsed.y).toFixed(2)}`;
          },
          footer: (context) => {
            const index = context[0]?.dataIndex ?? 0;
            const timestamp = slotTimestamps[index];
            if (!timestamp) {
              return "";
            }
            const iso = new Date(timestamp).toISOString();
            return `Exact timestamp: ${iso}`;
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
        min: Math.max(
          0,
          totalDataPoints - Math.floor(totalDataPoints * defaultViewRatio)
        ),
        max: totalDataPoints - 1,
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
          drawOnChartArea: true,
        },
        ticks: {
          color: "rgb(156, 163, 175)",
          maxTicksLimit: 12,
          callback: function (value, index) {
            const total = labels.length;
            const step = Math.max(1, Math.ceil(total / 8));
            if (index % step !== 0) {
              return "";
            }
            const timestamp = slotTimestamps[index];
            if (!timestamp) {
              return labels[index] ?? "";
            }
            return new Date(timestamp).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });
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
          callback: (value) => "$" + Number(value).toFixed(2),
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
    <div className="space-y-2">
      <div className="flex justify-between items-center text-sm text-muted-foreground">
        <span>
          Default view: {timeSpanLabel} ({settings.timelineResolution}{" "}
          resolution) • Scroll left for history
        </span>
        <span>
          Showing {visibleData.length} of {trimmedData.length} data points
        </span>
      </div>
      <div className="relative h-80">
        {isPending && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="h-10 w-10 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
          </div>
        )}
        <Line data={chartData} options={options} />
      </div>
      {!zoomReady && (
        <div className="text-xs text-muted-foreground text-center">
          Zoom plugin loading…
        </div>
      )}
      {visibleData.length < trimmedData.length && (
        <div className="flex justify-center">
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={requestMoreData}
          >
            {isPending ? "Loading…" : "Load older data"}
          </Button>
        </div>
      )}
      <div className="text-xs text-muted-foreground text-center">
        Use mouse wheel to zoom • Click and drag to pan • Double-click to reset
        view
      </div>
    </div>
  );
}
