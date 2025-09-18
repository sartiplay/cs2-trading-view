"use client";

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

interface PriceEntry {
  date: string;
  median_price: number;
}

interface PriceChartProps {
  data: PriceEntry[];
}

export function PriceChart({ data }: PriceChartProps) {
  const settings = useSettings();

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground border border-dashed border-border rounded-lg bg-background/50">
        No price data available
      </div>
    );
  }

  const generateChartData = (data: PriceEntry[], resolution: string) => {
    const now = new Date();
    let timeSpan: number;
    let timeUnit: string;
    let labelFormat: Intl.DateTimeFormatOptions;
    let tickInterval: number;

    // Determine time span and formatting based on resolution
    switch (resolution) {
      case "5min":
        timeSpan = 24 * 60 * 60 * 1000; // Full day
        timeUnit = "5min";
        labelFormat = { hour: "2-digit", minute: "2-digit" };
        tickInterval = 5 * 60 * 1000; // 5 minutes
        break;
      case "30min":
        timeSpan = 24 * 60 * 60 * 1000; // Full day
        timeUnit = "30min";
        labelFormat = { hour: "2-digit", minute: "2-digit" };
        tickInterval = 30 * 60 * 1000; // 30 minutes
        break;
      case "1h":
        timeSpan = 24 * 60 * 60 * 1000; // Full day
        timeUnit = "1h";
        labelFormat = { hour: "2-digit", minute: "2-digit" };
        tickInterval = 60 * 60 * 1000; // 1 hour
        break;
      case "4h":
        timeSpan = 7 * 24 * 60 * 60 * 1000; // Full week
        timeUnit = "4h";
        labelFormat = { month: "short", day: "numeric", hour: "2-digit" };
        tickInterval = 4 * 60 * 60 * 1000; // 4 hours
        break;
      case "1d":
      default:
        timeSpan = 30 * 24 * 60 * 60 * 1000; // Full month
        timeUnit = "1d";
        labelFormat = { month: "short", day: "numeric" };
        tickInterval = 24 * 60 * 60 * 1000; // 1 day
        break;
    }

    const startTime = now.getTime() - timeSpan;
    const endTime = now.getTime();

    // Generate time slots for the entire time span
    const timeSlots: Date[] = [];
    for (let time = startTime; time <= endTime; time += tickInterval) {
      timeSlots.push(new Date(time));
    }

    // Filter data within the time span
    const relevantData = data.filter((entry) => {
      const entryTime = new Date(entry.date).getTime();
      return entryTime >= startTime && entryTime <= endTime;
    });

    console.log(
      `[v0] Chart data - Resolution: ${resolution}, Time span: ${timeUnit}, Data points: ${relevantData.length}`
    );

    // Special handling for single data point
    if (relevantData.length === 1) {
      const singlePoint = relevantData[0];
      const singlePointTime = new Date(singlePoint.date).getTime();

      // Create labels with start point and end point
      const labels = [
        new Date(startTime).toLocaleTimeString("en-US", labelFormat),
        new Date(singlePointTime).toLocaleTimeString("en-US", labelFormat),
      ];

      // Data with null at start and actual value at the positioned point
      const chartData = [null, singlePoint.median_price];

      console.log(
        `[v0] Single data point positioned at: ${new Date(
          singlePointTime
        ).toLocaleString()}`
      );

      return {
        labels,
        data: chartData,
        rawData: relevantData,
        timeSpanLabel: getTimeSpanLabel(resolution),
      };
    }

    // For multiple data points, create high-resolution positioning
    const labels: string[] = [];
    const chartData: (number | null)[] = [];
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
      labels.push(slot.toLocaleTimeString("en-US", labelFormat));
      chartData.push(
        dataMap.has(index) ? dataMap.get(index)!.median_price : null
      );
    });

    // Remove consecutive null values to clean up the chart
    const cleanedLabels: string[] = [];
    const cleanedData: (number | null)[] = [];

    for (let i = 0; i < labels.length; i++) {
      if (
        chartData[i] !== null ||
        (i > 0 && chartData[i - 1] !== null) ||
        (i < chartData.length - 1 && chartData[i + 1] !== null)
      ) {
        cleanedLabels.push(labels[i]);
        cleanedData.push(chartData[i]);
      }
    }

    console.log(
      `[v0] Generated ${cleanedLabels.length} time slots with ${
        cleanedData.filter((d) => d !== null).length
      } data points`
    );

    return {
      labels: cleanedLabels,
      data: cleanedData,
      rawData: relevantData,
      timeSpanLabel: getTimeSpanLabel(resolution),
    };
  };

  const getTimeSpanLabel = (resolution: string): string => {
    switch (resolution) {
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

  const {
    labels,
    data: chartDataPoints,
    rawData,
    timeSpanLabel,
  } = generateChartData(data, settings.timelineResolution);

  const chartData = {
    labels,
    datasets: [
      {
        label: "Median Price ($)",
        data: chartDataPoints,
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
        spanGaps: true, // Allow connecting points across null values
      },
    ],
  };

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
        filter: (tooltipItem) => tooltipItem.parsed.y !== null, // Only show tooltips for actual data points
        callbacks: {
          title: (context) => {
            const index = context[0].dataIndex;
            if (rawData[0]) {
              const date = new Date(rawData[0].date);
              return date.toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });
            }
            return "";
          },
          label: (context) => {
            return `Price: $${Number(context.parsed.y).toFixed(2)}`;
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
          drawOnChartArea: true,
        },
        ticks: {
          color: "rgb(156, 163, 175)",
          maxTicksLimit: 12, // Increased for better resolution display
          callback: function (value, index) {
            const totalTicks = this.getLabelForValue(Number(value))
              ? labels.length
              : 0;
            const step = Math.ceil(totalTicks / 8);
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
          Showing last {timeSpanLabel} ({settings.timelineResolution}{" "}
          resolution)
        </span>
        <span>{rawData.length} data points</span>
      </div>
      <div className="h-80">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}
