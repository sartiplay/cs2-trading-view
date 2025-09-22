import { type NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import {
  DEFAULT_PINNED_PROVIDERS,
  TRADE_PROVIDERS,
} from "@/lib/trade-providers";

export interface Settings {
  timelineResolution: "1d" | "1w" | "1m";
  cronDelayMinutes: number;
  fetchDelayMs: number;
  discordWebhookEnabled: boolean;
  discordWebhookUrl: string;
  discordDevelopmentMode: boolean;
  discordPriceSpikeEnabled: boolean;
  discordPriceAlertMentions: string[];
  pinnedMarketSites: string[];
  marketListingsFetchLimit: number;
  schedulerEnabled: boolean;
  schedulerRunning: boolean;
}

const SETTINGS_FILE = path.join(process.cwd(), "settings.json");
const DEFAULT_FETCH_LIMIT = 5;
const VALID_PROVIDER_NAMES = new Set(
  TRADE_PROVIDERS.map((provider) => provider.name)
);

function normalizePinnedSites(input: unknown): string[] {
  const requested = Array.isArray(input)
    ? input.filter(
        (value): value is string =>
          typeof value === "string" && VALID_PROVIDER_NAMES.has(value)
      )
    : [];

  const fallback = DEFAULT_PINNED_PROVIDERS.filter(
    (name) => VALID_PROVIDER_NAMES.has(name) && !requested.includes(name)
  );

  return [...requested, ...fallback].slice(0, 3);
}

function normalizeFetchLimit(value: unknown): number {
  if (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0 &&
    value <= 25
  ) {
    return Math.floor(value);
  }
  return DEFAULT_FETCH_LIMIT;
}

function normalizeAlertMentions(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter((value) => value.length > 0);
  }
  if (typeof input === "string") {
    return input
      .split(/[\n,]/)
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
  }
  return [];
}

const DEFAULT_SETTINGS: Settings = {
  timelineResolution: "1d",
  cronDelayMinutes: 1440,
  fetchDelayMs: 2000,
  discordWebhookEnabled: false,
  discordWebhookUrl: "",
  discordDevelopmentMode: false,
  discordPriceSpikeEnabled: false,
  discordPriceAlertMentions: [],
  pinnedMarketSites: DEFAULT_PINNED_PROVIDERS.slice(0, 3),
  marketListingsFetchLimit: DEFAULT_FETCH_LIMIT,
  schedulerEnabled: true,
  schedulerRunning: false,
};

async function readSettings(): Promise<Settings> {
  try {
    const data = await fs.readFile(SETTINGS_FILE, "utf-8");
    const parsed = JSON.parse(data);

    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      discordPriceAlertMentions: normalizeAlertMentions(
        parsed.discordPriceAlertMentions
      ),
      pinnedMarketSites: normalizePinnedSites(parsed.pinnedMarketSites),
      marketListingsFetchLimit: normalizeFetchLimit(
        parsed.marketListingsFetchLimit
      ),
    };
  } catch (error) {
    console.log("[Settings] Creating new settings file with defaults");
    await writeSettings(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }
}

async function writeSettings(settings: Settings): Promise<void> {
  try {
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2));
    console.log("[Settings] Settings saved successfully");
  } catch (error) {
    console.error("[Settings] Failed to write settings:", error);
    throw error;
  }
}

export async function GET() {
  try {
    const settings = await readSettings();
    console.log("[Settings] Returning current settings:", settings);
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Failed to read settings:", error);
    return NextResponse.json(
      { error: "Failed to read settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const newSettings = await request.json();
    const currentSettings = await readSettings();

    const booleanFields: Array<keyof Settings> = [
      "discordWebhookEnabled",
      "discordDevelopmentMode",
      "discordPriceSpikeEnabled",
      "schedulerEnabled",
      "schedulerRunning",
    ];

    const invalidBoolean = booleanFields.some((field) => {
      if (Object.prototype.hasOwnProperty.call(newSettings, field)) {
        return typeof newSettings[field] !== "boolean";
      }
      return false;
    });

    if (invalidBoolean) {
      return NextResponse.json({ error: "Invalid settings" }, { status: 400 });
    }

    if (
      newSettings.pinnedMarketSites &&
      (!Array.isArray(newSettings.pinnedMarketSites) ||
        newSettings.pinnedMarketSites.some(
          (value: unknown) => typeof value !== "string"
        ) ||
        newSettings.pinnedMarketSites.length > 3)
    ) {
      return NextResponse.json(
        {
          error:
            "Pinned market sites must be an array of up to three provider names.",
        },
        { status: 400 }
      );
    }

    if (
      newSettings.marketListingsFetchLimit !== undefined &&
      (typeof newSettings.marketListingsFetchLimit !== "number" ||
        !Number.isFinite(newSettings.marketListingsFetchLimit) ||
        newSettings.marketListingsFetchLimit <= 0 ||
        newSettings.marketListingsFetchLimit > 25)
    ) {
      return NextResponse.json(
        {
          error:
            "Market listings fetch limit must be a positive number less than or equal to 25.",
        },
        { status: 400 }
      );
    }

    const updatedSettings: Settings = {
      ...currentSettings,
      ...newSettings,
      discordPriceAlertMentions: normalizeAlertMentions(
        newSettings.discordPriceAlertMentions ??
          currentSettings.discordPriceAlertMentions
      ),
      pinnedMarketSites: normalizePinnedSites(
        newSettings.pinnedMarketSites ?? currentSettings.pinnedMarketSites
      ),
      marketListingsFetchLimit: normalizeFetchLimit(
        newSettings.marketListingsFetchLimit ??
          currentSettings.marketListingsFetchLimit
      ),
    };

    await writeSettings(updatedSettings);

    console.log("[Settings] Updated:", updatedSettings);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save settings:", error);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }
}

