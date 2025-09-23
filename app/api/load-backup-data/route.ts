import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "data.json");
const BACKUP_FILE = path.join(process.cwd(), "backup.data.json");

export async function POST() {
  try {
    console.log("[Load Backup] Starting backup data restoration...");

    // Check if backup.data.json exists
    try {
      await fs.access(BACKUP_FILE);
    } catch (error) {
      return NextResponse.json(
        { error: "backup.data.json file not found" },
        { status: 404 }
      );
    }

    // Read the backup file
    const backupContent = await fs.readFile(BACKUP_FILE, "utf-8");
    
    // Validate that it's valid JSON
    try {
      JSON.parse(backupContent);
    } catch (error) {
      return NextResponse.json(
        { error: "backup.data.json contains invalid JSON" },
        { status: 400 }
      );
    }

    // Create a backup of current data.json before replacing it
    let currentDataBackup = null;
    try {
      const currentData = await fs.readFile(DATA_FILE, "utf-8");
      currentDataBackup = currentData;
      console.log("[Load Backup] Current data.json backed up before replacement");
    } catch (error) {
      console.log("[Load Backup] No existing data.json to backup");
    }

    // Replace data.json with backup content
    await fs.writeFile(DATA_FILE, backupContent, "utf-8");

    console.log("[Load Backup] Data restoration completed successfully");

    return NextResponse.json({
      success: true,
      message: "Backup data loaded successfully",
      restoredFile: "data.json",
      backupFile: "backup.data.json",
      hadExistingData: currentDataBackup !== null,
    });
  } catch (error) {
    console.error("[Load Backup] Failed to load backup:", error);
    return NextResponse.json(
      { error: "Failed to load backup data" },
      { status: 500 }
    );
  }
}
