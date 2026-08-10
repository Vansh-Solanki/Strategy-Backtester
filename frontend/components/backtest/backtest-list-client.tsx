"use client";

import Link from "next/link";

import { Card } from "@/components/ui/card";
import { BacktestStatusBadge } from "@/components/backtest/status-badge";
import type { Backtest } from "@/lib/api-client";

function formatDate(iso: string) {
  const d = new Date(iso);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function BacktestListClient({ backtests }: { backtests: Backtest[] }) {
  if (backtests.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-md border border-dashed p-12 text-center">
        <p className="text-muted-foreground">
          No backtests yet — run one from a strategy&apos;s card
        </p>
        <Link href="/strategies" className="text-sm underline">
          Go to strategies
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {backtests.map((backtest) => (
        <Link key={backtest.id} href={`/backtests/${backtest.id}`}>
          <Card className="flex items-center justify-between p-4 transition-colors hover:bg-accent/50">
            <div>
              <p className="font-medium">{backtest.ticker}</p>
              <p className="text-sm text-muted-foreground">
                {backtest.start_date} to {backtest.end_date} · started {formatDate(backtest.created_at)}
              </p>
            </div>
            <BacktestStatusBadge status={backtest.status} />
          </Card>
        </Link>
      ))}
    </div>
  );
}
