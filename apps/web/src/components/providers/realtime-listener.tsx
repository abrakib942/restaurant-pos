"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

const SseConnectedContext = createContext(false);

export function useSseConnected() {
  return useContext(SseConnectedContext);
}

type RealtimeListenerProps = {
  url: string;
  queryKeys?: readonly (readonly string[])[];
  refresh?: boolean;
  children: ReactNode;
};

const SSE_RETRY_MS = 3000;

export function RealtimeListener({
  url,
  queryKeys = [],
  refresh = false,
  children,
}: RealtimeListenerProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [connected, setConnected] = useState(false);
  const queryKeysRef = useRef(queryKeys);
  queryKeysRef.current = queryKeys;

  useEffect(() => {
    let es: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    function invalidate() {
      if (refresh) {
        router.refresh();
        return;
      }
      for (const key of queryKeysRef.current) {
        void queryClient.invalidateQueries({ queryKey: [...key] });
      }
    }

    function connect() {
      if (cancelled) return;
      es = new EventSource(url);

      es.addEventListener("connected", () => {
        setConnected(true);
      });

      es.addEventListener("update", () => {
        invalidate();
      });

      es.addEventListener("heartbeat", () => {
        setConnected(true);
      });

      es.onerror = () => {
        setConnected(false);
        es?.close();
        es = null;
        if (!cancelled) {
          retryTimer = setTimeout(connect, SSE_RETRY_MS);
        }
      };
    }

    connect();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      es?.close();
      setConnected(false);
    };
  }, [url, refresh, queryClient, router]);

  return (
    <SseConnectedContext.Provider value={connected}>
      {children}
    </SseConnectedContext.Provider>
  );
}
