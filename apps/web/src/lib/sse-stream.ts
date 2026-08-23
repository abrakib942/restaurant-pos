import "server-only";

import {
  subscribeRealtime,
  type RealtimeChannel,
  type RealtimeEvent,
} from "@/lib/realtime";

export const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
} as const;

const HEARTBEAT_MS = 15_000;

function encodeEvent(event: string, data: unknown): Uint8Array {
  return new TextEncoder().encode(
    `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
  );
}

export function createSseStream(
  channel: RealtimeChannel,
  signal?: AbortSignal,
): ReadableStream<Uint8Array> {
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let unsubscribe: (() => void) | undefined;
  let closed = false;

  function cleanup(controller?: ReadableStreamDefaultController<Uint8Array>) {
    if (closed) return;
    closed = true;
    if (heartbeat) clearInterval(heartbeat);
    unsubscribe?.();
    try {
      controller?.close();
    } catch {
      // already closed
    }
  }

  return new ReadableStream({
    start(controller) {
      const send = (
        event: string,
        data: RealtimeEvent | { channel: RealtimeChannel },
      ) => {
        if (closed) return;
        try {
          controller.enqueue(encodeEvent(event, data));
        } catch {
          cleanup(controller);
        }
      };

      send("connected", { ts: Date.now(), channel });

      heartbeat = setInterval(() => {
        send("heartbeat", { ts: Date.now() });
      }, HEARTBEAT_MS);

      unsubscribe = subscribeRealtime(channel, (payload) => {
        send("update", payload);
      });

      signal?.addEventListener("abort", () => cleanup(controller), {
        once: true,
      });
    },
    cancel() {
      cleanup();
    },
  });
}
