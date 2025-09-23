"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Activity, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Loader2, 
  Trash2,
  Image,
  DollarSign,
  Download,
  RefreshCw,
  Database,
  Timer
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface WorkerTask {
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

interface WorkerStatus {
  is_active: boolean;
  current_task?: WorkerTask;
  recent_tasks: WorkerTask[];
  last_updated: string;
}

const getTaskIcon = (type: WorkerTask["type"]) => {
  switch (type) {
    case "image_fetch":
      return <Image className="h-4 w-4" />;
    case "price_fetch":
      return <DollarSign className="h-4 w-4" />;
    case "inventory_import":
      return <Download className="h-4 w-4" />;
    case "bulk_image_reload":
      return <RefreshCw className="h-4 w-4" />;
    case "data_migration":
      return <Database className="h-4 w-4" />;
    case "scheduled_capture":
      return <Timer className="h-4 w-4" />;
    default:
      return <Activity className="h-4 w-4" />;
  }
};

const getStatusIcon = (status: WorkerTask["status"]) => {
  switch (status) {
    case "running":
      return <Loader2 className="h-4 w-4 animate-spin" />;
    case "completed":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-red-500" />;
    case "pending":
      return <Clock className="h-4 w-4 text-yellow-500" />;
    default:
      return <Activity className="h-4 w-4" />;
  }
};

const getStatusColor = (status: WorkerTask["status"]) => {
  switch (status) {
    case "running":
      return "bg-blue-500";
    case "completed":
      return "bg-green-500";
    case "failed":
      return "bg-red-500";
    case "pending":
      return "bg-yellow-500";
    default:
      return "bg-gray-500";
  }
};

const formatDuration = (started: string, completed?: string) => {
  const start = new Date(started);
  const end = completed ? new Date(completed) : new Date();
  const diffMs = end.getTime() - start.getTime();
  
  if (diffMs < 1000) return "< 1s";
  if (diffMs < 60000) return `${Math.round(diffMs / 1000)}s`;
  if (diffMs < 3600000) return `${Math.round(diffMs / 60000)}m`;
  return `${Math.round(diffMs / 3600000)}h`;
};

export function WorkerStatus() {
  const [workerStatus, setWorkerStatus] = useState<WorkerStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchWorkerStatus = async () => {
    try {
      const response = await fetch("/api/worker");
      if (response.ok) {
        const data = await response.json();
        setWorkerStatus(data);
      }
    } catch (error) {
      console.error("Failed to fetch worker status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const setupEventSource = () => {
    const eventSource = new EventSource("/api/worker/stream");
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setWorkerStatus(data);
        setIsLoading(false);
      } catch (error) {
        console.error("Failed to parse worker status:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("EventSource failed:", error);
      // Fallback to polling if SSE fails
      setTimeout(() => {
        fetchWorkerStatus();
      }, 5000);
    };

    return eventSource;
  };

  const clearHistory = async () => {
    try {
      const response = await fetch("/api/worker", { method: "DELETE" });
      if (response.ok) {
        await fetchWorkerStatus();
        toast({
          title: "Success",
          description: "Worker history cleared successfully",
        });
      } else {
        throw new Error("Failed to clear history");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clear worker history",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchWorkerStatus();
    
    // Set up real-time updates via Server-Sent Events
    const eventSource = setupEventSource();

    return () => {
      eventSource.close();
    };
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Worker Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!workerStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Worker Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            Failed to load worker status
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Worker Status
          </div>
          {workerStatus.recent_tasks.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearHistory}
              className="h-8 w-8 p-0"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Task */}
        {workerStatus.current_task && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {getTaskIcon(workerStatus.current_task.type)}
              <span className="font-medium">{workerStatus.current_task.title}</span>
              <Badge className={`${getStatusColor(workerStatus.current_task.status)} text-white`}>
                {workerStatus.current_task.status}
              </Badge>
            </div>
            
            <p className="text-sm text-muted-foreground">
              {workerStatus.current_task.description}
            </p>
            
            {workerStatus.current_task.progress && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{workerStatus.current_task.progress.percentage}%</span>
                </div>
                <Progress 
                  value={workerStatus.current_task.progress.percentage} 
                  className="h-2"
                />
                <div className="text-xs text-muted-foreground text-center">
                  {workerStatus.current_task.progress.current} / {workerStatus.current_task.progress.total}
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {getStatusIcon(workerStatus.current_task.status)}
              <span>
                Running for {formatDuration(workerStatus.current_task.started_at)}
              </span>
            </div>
          </div>
        )}

        {/* No Active Task */}
        {!workerStatus.current_task && (
          <div className="text-center py-4">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <CheckCircle className="h-5 w-5" />
              <span>No active tasks</span>
            </div>
          </div>
        )}

        {/* Recent Tasks */}
        {workerStatus.recent_tasks.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Recent Tasks</h4>
              <ScrollArea className="h-32">
                <div className="space-y-2">
                  {workerStatus.recent_tasks.slice(0, 5).map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {getTaskIcon(task.type)}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">
                            {task.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDuration(task.started_at, task.completed_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(task.status)}
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getStatusColor(task.status)} text-white border-0`}
                        >
                          {task.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
