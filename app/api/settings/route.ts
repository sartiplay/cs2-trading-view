import { type NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

export interface Settings {
  timelineResolution: "1d" | "1w" | "1m"
  cronDelayMinutes: number
  fetchDelayMs: number
  discordWebhookEnabled: boolean
  discordWebhookUrl: string
  discordDevelopmentMode: boolean
  discordPriceSpikeEnabled: boolean
  schedulerEnabled: boolean
  schedulerRunning: boolean
}

const SETTINGS_FILE = path.join(process.cwd(), "settings.json")

const DEFAULT_SETTINGS: Settings = {
  timelineResolution: "1d",
  cronDelayMinutes: 1440,
  fetchDelayMs: 2000,
  discordWebhookEnabled: false,
  discordWebhookUrl: "",
  discordDevelopmentMode: false,
  discordPriceSpikeEnabled: false,
  schedulerEnabled: true,
  schedulerRunning: false,
}

async function readSettings(): Promise<Settings> {
  try {
    const data = await fs.readFile(SETTINGS_FILE, "utf-8")
    const parsed = JSON.parse(data)

    // Merge with defaults to ensure all properties exist
    return { ...DEFAULT_SETTINGS, ...parsed }
  } catch (error) {
    // If file doesn't exist, create it with defaults
    console.log("[Settings] Creating new settings file with defaults")
    await writeSettings(DEFAULT_SETTINGS)
    return DEFAULT_SETTINGS
  }
}

async function writeSettings(settings: Settings): Promise<void> {
  try {
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2))
    console.log("[Settings] Settings saved successfully")
  } catch (error) {
    console.error("[Settings] Failed to write settings:", error)
    throw error
  }
}

export async function GET() {
  try {
    const settings = await readSettings()
    console.log("[Settings] Returning current settings:", settings)
    return NextResponse.json(settings)
  } catch (error) {
    console.error("Failed to read settings:", error)
    return NextResponse.json({ error: "Failed to read settings" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const newSettings = await request.json()
    const currentSettings = await readSettings()

    // Validate required fields
    if (
      typeof newSettings.discordWebhookEnabled !== "boolean" ||
      typeof newSettings.discordDevelopmentMode !== "boolean" ||
      typeof newSettings.discordPriceSpikeEnabled !== "boolean" ||
      typeof newSettings.schedulerEnabled !== "boolean" ||
      typeof newSettings.schedulerRunning !== "boolean"
    ) {
      return NextResponse.json({ error: "Invalid settings" }, { status: 400 })
    }

    // Update settings
    const updatedSettings = { ...currentSettings, ...newSettings }
    await writeSettings(updatedSettings)

    console.log("[Settings] Updated:", updatedSettings)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to save settings:", error)
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 })
  }
}
