import { promises as fs } from "fs";
import path from "path";

export interface WorkerTask {
  id: string;
  type: "image_fetch" | "price_fetch" | "inventory_import" | "bulk_image_reload" | "data_migration" | "scheduled_capture";
  status: "pending" | "running" | "completed" | "failed";
  title: string;
  description: string;
  progress?: {
    current: number;
    total: number;
    percentage: number;
  };
  started_at: string;
  completed_at?: string;
  error?: string;
  metadata?: Record<string, any>;
}

export interface WorkerStatus {
  is_active: boolean;
  current_task?: WorkerTask;
  recent_tasks: WorkerTask[];
  last_updated: string;
}

const WORKER_FILE_PATH = path.join(process.cwd(), "worker.json");

// Default worker status
const DEFAULT_WORKER_STATUS: WorkerStatus = {
  is_active: false,
  recent_tasks: [],
  last_updated: new Date().toISOString(),
};

async function readWorkerStatus(): Promise<WorkerStatus> {
  try {
    const data = await fs.readFile(WORKER_FILE_PATH, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    // File doesn't exist or is corrupted, return default
    return DEFAULT_WORKER_STATUS;
  }
}

async function writeWorkerStatus(status: WorkerStatus): Promise<void> {
  try {
    await fs.writeFile(WORKER_FILE_PATH, JSON.stringify(status, null, 2));
  } catch (error) {
    console.error("Failed to write worker status:", error);
    throw error;
  }
}

export async function getWorkerStatus(): Promise<WorkerStatus> {
  return await readWorkerStatus();
}

export async function startWorkerTask(
  type: WorkerTask["type"],
  title: string,
  description: string,
  metadata?: Record<string, any>
): Promise<string> {
  const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const newTask: WorkerTask = {
    id: taskId,
    type,
    status: "running",
    title,
    description,
    started_at: new Date().toISOString(),
    metadata,
  };

  const status = await readWorkerStatus();
  
  // If there's already an active task, mark it as completed
  if (status.current_task && status.current_task.status === "running") {
    status.current_task.status = "completed";
    status.current_task.completed_at = new Date().toISOString();
    status.recent_tasks.unshift(status.current_task);
  }

  status.current_task = newTask;
  status.is_active = true;
  status.last_updated = new Date().toISOString();

  // Keep only the last 20 recent tasks
  if (status.recent_tasks.length > 20) {
    status.recent_tasks = status.recent_tasks.slice(0, 20);
  }

  await writeWorkerStatus(status);
  
  console.log(`[Worker] Started task: ${title} (${taskId})`);
  return taskId;
}

export async function updateWorkerTaskProgress(
  taskId: string,
  progress: { current: number; total: number }
): Promise<void> {
  const status = await readWorkerStatus();
  
  if (status.current_task && status.current_task.id === taskId) {
    status.current_task.progress = {
      current: progress.current,
      total: progress.total,
      percentage: Math.round((progress.current / progress.total) * 100),
    };
    status.last_updated = new Date().toISOString();
    await writeWorkerStatus(status);
  }
}

export async function completeWorkerTask(
  taskId: string,
  success: boolean = true,
  error?: string
): Promise<void> {
  const status = await readWorkerStatus();
  
  if (status.current_task && status.current_task.id === taskId) {
    status.current_task.status = success ? "completed" : "failed";
    status.current_task.completed_at = new Date().toISOString();
    if (error) {
      status.current_task.error = error;
    }

    // Move to recent tasks
    status.recent_tasks.unshift(status.current_task);
    status.current_task = undefined;
    status.is_active = false;
    status.last_updated = new Date().toISOString();

    // Keep only the last 20 recent tasks
    if (status.recent_tasks.length > 20) {
      status.recent_tasks = status.recent_tasks.slice(0, 20);
    }

    await writeWorkerStatus(status);
    
    console.log(`[Worker] Completed task: ${status.recent_tasks[0].title} (${taskId}) - ${success ? "SUCCESS" : "FAILED"}`);
  }
}

export async function clearWorkerHistory(): Promise<void> {
  const status = await readWorkerStatus();
  status.recent_tasks = [];
  status.last_updated = new Date().toISOString();
  await writeWorkerStatus(status);
}
