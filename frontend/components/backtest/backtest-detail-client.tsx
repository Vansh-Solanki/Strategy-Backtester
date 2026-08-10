"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BacktestStatusBadge } from "@/components/backtest/status-badge";
import { apiClient, type Backtest, type Trade } from "@/lib/api-client";

const POLL_INTERVAL_MS = 2000;

function formatPct(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

const METRIC_LABELS: { key: keyof NonNullable<Backtest["results"]>["metrics"]; label: string; format: (v: number) => string }[] = [
  { key: "total_return", label: "Total return", format: formatPct },
  { key: "cagr", label: "CAGR", format: formatPct },
  { key: "sharpe_ratio", label: "Sharpe ratio", format: (v) => v.toFixed(2) },
  { key: "max_drawdown", label: "Max drawdown", format: formatPct },
  { key: "win_rate", label: "Win rate", format: formatPct },
  { key: "num_trades", label: "Total trades", format: (v) => String(v) },
];

export function BacktestDetailClient({ initialBacktest }: { initialBacktest: Backtest }) {
  const { data: session } = useSession();
  const [backtest, setBacktest] = useState(initialBacktest);
  const [trades, setTrades] = useState<Trade[]>([]);

  useEffect(() => {
    if (backtest.status !== "pending" && backtest.status !== "running") return;
    if (!session?.accessToken) return;

    const accessToken = session.accessToken;
    const interval = setInterval(async () => {
      try {
        const updated = await apiClient.getBacktest(accessToken, backtest.id);
        setBacktest(updated);
      } catch {
        // transient poll failure — retry on the next tick
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [backtest.status, backtest.id, session?.accessToken]);

  useEffect(() => {
    if (backtest.status !== "done" || !session?.accessToken) return;
    apiClient
      .listTrades(session.accessToken, backtest.id)
      .then(setTrades)
      .catch(() => {});
  }, [backtest.status, backtest.id, session?.accessToken]);

  return (
    <div className="space-y-4">
      <Card className="flex items-center justify-between p-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {backtest.ticker} · {backtest.start_date} to {backtest.end_date} · $
            {backtest.initial_capital.toLocaleString()} initial capital
          </p>
        </div>
        <BacktestStatusBadge status={backtest.status} />
      </Card>

      {(backtest.status === "pending" || backtest.status === "running") && (
        <Card className="space-y-3 p-4">
          <p className="text-sm text-muted-foreground">
            {backtest.status === "pending" ? "Queued…" : "Running strategy against price history…"}
          </p>
          <Skeleton className="h-24 w-full" />
        </Card>
      )}

      {backtest.status === "failed" && (
        <Card className="space-y-2 border-destructive/50 p-4">
          <p className="text-sm font-medium text-destructive">Backtest failed</p>
          <pre className="whitespace-pre-wrap text-xs text-muted-foreground">
            {backtest.error_message ?? "Unknown error"}
          </pre>
        </Card>
      )}

      {backtest.status === "done" && backtest.results && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {METRIC_LABELS.map(({ key, label, format }) => (
              <Card key={key} className="p-3">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-lg font-semibold">{format(backtest.results!.metrics[key])}</p>
              </Card>
            ))}
          </div>

          <Card className="p-4">
            <p className="mb-3 text-sm font-medium">Trades</p>
            {trades.length === 0 ? (
              <p className="text-sm text-muted-foreground">No trades were opened by this strategy.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr className="border-b">
                      <th className="py-2 pr-4">Entry date</th>
                      <th className="py-2 pr-4">Exit date</th>
                      <th className="py-2 pr-4">Entry price</th>
                      <th className="py-2 pr-4">Exit price</th>
                      <th className="py-2 pr-4">Qty</th>
                      <th className="py-2 pr-4">PnL</th>
                      <th className="py-2">PnL %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map((trade) => (
                      <tr key={trade.id} className="border-b last:border-0">
                        <td className="py-2 pr-4">{trade.entry_date.slice(0, 10)}</td>
                        <td className="py-2 pr-4">{trade.exit_date?.slice(0, 10) ?? "open"}</td>
                        <td className="py-2 pr-4">${trade.entry_price.toFixed(2)}</td>
                        <td className="py-2 pr-4">
                          {trade.exit_price != null ? `$${trade.exit_price.toFixed(2)}` : "—"}
                        </td>
                        <td className="py-2 pr-4">{trade.quantity}</td>
                        <td
                          className={`py-2 pr-4 ${
                            trade.pnl != null ? (trade.pnl >= 0 ? "text-green-600" : "text-red-600") : ""
                          }`}
                        >
                          {trade.pnl != null ? `$${trade.pnl.toFixed(2)}` : "—"}
                        </td>
                        <td className={trade.pnl_pct != null ? (trade.pnl_pct >= 0 ? "text-green-600" : "text-red-600") : ""}>
                          {trade.pnl_pct != null ? formatPct(trade.pnl_pct) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {backtest.results.console_output && (
            <Card className="p-4">
              <p className="mb-2 text-sm font-medium">Console output</p>
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-2 font-mono text-xs">
                {backtest.results.console_output}
              </pre>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
