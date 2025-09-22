import { type NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { TRADE_PROVIDERS } from "@/lib/trade-providers";

const ENV_FILE = path.join(process.cwd(), ".env.local");

function buildEnvContent(existing: string, key: string, value: string): string {
  const lines = existing
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  const keyPrefix = `${key}=`;
  const withoutKey = lines.filter((line) => !line.startsWith(keyPrefix));

  if (!value) {
    return withoutKey.length > 0 ? `${withoutKey.join("\r\n")}\r\n` : "";
  }

  const newLines = [...withoutKey, `${keyPrefix}${value}`];
  return `${newLines.join("\r\n")}\r\n`;
}

async function writeEnvValue(key: string, value: string) {
  let current = "";
  try {
    current = await fs.readFile(ENV_FILE, "utf8");
  } catch (error: unknown) {
    const nodeError = error as NodeJS.ErrnoException;
    if (!nodeError || nodeError.code !== "ENOENT") {
      throw error;
    }
  }

  const content = buildEnvContent(current, key, value);
  await fs.writeFile(ENV_FILE, content);
}

export async function GET() {
  const providers = TRADE_PROVIDERS.map((provider) => ({
    providerId: provider.id,
    providerName: provider.name,
    hasKey: Boolean(process.env[provider.envKey]),
  }));

  return NextResponse.json({ providers });
}

export async function POST(request: NextRequest) {
  try {
    const { providerId, apiKey } = await request.json();
    const provider = TRADE_PROVIDERS.find((entry) => entry.id === providerId);

    if (!provider) {
      return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
    }

    const value = typeof apiKey === "string" ? apiKey.trim() : "";
    await writeEnvValue(provider.envKey, value);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Provider Keys] Failed to update API key:", error);
    return NextResponse.json({ error: "Failed to update API key" }, { status: 500 });
  }
}
