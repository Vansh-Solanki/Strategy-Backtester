"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Loader2 } from "lucide-react";

import { apiClient, PriceBar } from "@/lib/api-client";
import { useMarketDataStore } from "@/lib/store";

const POLL_INTERVAL_MS = 2000;

function formatMonth(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function formatVolume(volume: number) {
  if (volume >= 1_000_000) return `${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `${(volume / 1_000).toFixed(1)}K`;
  return `${volume}`;
}

const MAX_TICKS = 10;

// Recharts' interval="preserveStartEnd" heuristic doesn't reliably anchor to
// the true first/last data point once minTickGap is also in play. Picking
// exact tick values by index guarantees the axis always reflects the actual
// selected range, regardless of how many bars are in it.
function computeTicks(bars: PriceBar[]): string[] {
  if (bars.length <= MAX_TICKS) return bars.map((b) => b.date);
  const step = (bars.length - 1) / (MAX_TICKS - 1);
  const ticks = new Set<string>();
  for (let i = 0; i < MAX_TICKS; i++) {
    ticks.add(bars[Math.round(i * step)].date);
  }
  return Array.from(ticks);
}

type Status = "idle" | "loading" | "fetching" | "loaded" | "error";

export function PriceChart() {
  const selectedTicker = useMarketDataStore((state) => state.selectedTicker);
  const dateRange = useMarketDataStore((state) => state.dateRange);
  const symbol = selectedTicker?.symbol ?? null;
  const { start, end } = dateRange;
  const requestKey = symbol ? `${symbol}:${start}:${end}` : null;

  const [state, setState] = useState<{ key: string | null; status: Status; bars: PriceBar[] }>({
    key: null,
    status: "idle",
    bars: [],
  });
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (requestKey !== state.key) {
    setState({ key: requestKey, status: requestKey ? "loading" : "idle", bars: [] });
  }

  useEffect(() => {
    if (pollTimer.current) clearTimeout(pollTimer.current);
    if (!symbol || !requestKey) return;

    async function load() {
      try {
        const data = await apiClient.getMarketData(symbol!, start, end);
        if (Array.isArray(data)) {
          setState((s) => (s.key === requestKey ? { ...s, status: "loaded", bars: data } : s));
        } else {
          setState((s) => (s.key === requestKey ? { ...s, status: "fetching" } : s));
          poll(data.job_id);
        }
      } catch {
        setState((s) => (s.key === requestKey ? { ...s, status: "error" } : s));
      }
    }

    function poll(jobId: string) {
      pollTimer.current = setTimeout(async () => {
        try {
          const jobStatus = await apiClient.getJobStatus(symbol!, jobId);
          if (jobStatus.status === "success") {
            load();
          } else if (jobStatus.status === "failure") {
            setState((s) => (s.key === requestKey ? { ...s, status: "error" } : s));
          } else {
            poll(jobId);
          }
        } catch {
          setState((s) => (s.key === requestKey ? { ...s, status: "error" } : s));
        }
      }, POLL_INTERVAL_MS);
    }

    load();

    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, [symbol, requestKey, start, end]);

  const { status, bars } = state;

  if (!selectedTicker) {
    return (
      <div className="flex h-96 items-center justify-center rounded-md border text-muted-foreground">
        Search for a ticker to see its price history.
      </div>
    );
  }

  if (status === "loading") {
    return <div className="h-96 animate-pulse rounded-md border bg-muted" />;
  }

  if (status === "fetching") {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-2 rounded-md border text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        Fetching prices for {selectedTicker.symbol}…
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex h-96 items-center justify-center rounded-md border text-destructive">
        Failed to load price data for {selectedTicker.symbol}.
      </div>
    );
  }

  const meanClose = bars.reduce((sum, b) => sum + b.adj_close, 0) / (bars.length || 1);

  return (
    <div className="h-96 rounded-md border p-4">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={bars}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="date" tickFormatter={formatMonth} ticks={computeTicks(bars)} />
          <YAxis
            yAxisId="price"
            orientation="left"
            tickFormatter={(v) => `$${v}`}
            domain={["auto", "auto"]}
          />
          <YAxis
            yAxisId="volume"
            orientation="right"
            tickFormatter={formatVolume}
            domain={["auto", "auto"]}
          />
          <Tooltip
            formatter={(value, name) =>
              name === "volume" ? formatVolume(Number(value)) : `$${Number(value).toFixed(2)}`
            }
            labelFormatter={(label) => (label ? new Date(String(label)).toLocaleDateString() : "")}
          />
          <Bar yAxisId="volume" dataKey="volume" fill="currentColor" className="text-muted-foreground/30" />
          <Line
            yAxisId="price"
            type="monotone"
            dataKey="adj_close"
            stroke="currentColor"
            className="text-primary"
            dot={false}
            strokeWidth={2}
          />
          <ReferenceLine yAxisId="price" y={meanClose} strokeDasharray="4 4" opacity={0.5} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
