import { NextRequest } from "next/server";
import { getWorkerStatus } from "@/lib/worker-storage.server";

export async function GET(request: NextRequest) {
  // Set up Server-Sent Events
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      
      // Send initial data
      const sendData = async () => {
        try {
          const status = await getWorkerStatus();
          const data = `data: ${JSON.stringify(status)}\n\n`;
          controller.enqueue(encoder.encode(data));
        } catch (error) {
          console.error("Error sending worker status:", error);
        }
      };

      // Send initial status
      sendData();

      // Set up interval to check for updates
      const interval = setInterval(async () => {
        try {
          const status = await getWorkerStatus();
          const data = `data: ${JSON.stringify(status)}\n\n`;
          controller.enqueue(encoder.encode(data));
        } catch (error) {
          console.error("Error sending worker status:", error);
        }
      }, 1000); // Check every second

      // Clean up on close
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}
