"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient, type Strategy } from "@/lib/api-client";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function yearAgoStr() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().slice(0, 10);
}

export function BacktestForm({ strategy }: { strategy: Strategy }) {
  const router = useRouter();
  const { data: session } = useSession();

  const [ticker, setTicker] = useState("");
  const [startDate, setStartDate] = useState(yearAgoStr());
  const [endDate, setEndDate] = useState(todayStr());
  const [initialCapital, setInitialCapital] = useState(10000);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!session?.accessToken) {
      toast.error("You must be signed in");
      return;
    }
    if (!ticker.trim()) {
      toast.error("Enter a ticker symbol");
      return;
    }
    if (endDate <= startDate) {
      toast.error("End date must be after start date");
      return;
    }

    setIsSubmitting(true);
    try {
      const backtest = await apiClient.createBacktest(session.accessToken, {
        strategy_id: strategy.id,
        ticker: ticker.trim().toUpperCase(),
        start_date: startDate,
        end_date: endDate,
        initial_capital: initialCapital,
      });
      toast.success("Backtest queued");
      router.push(`/backtests/${backtest.id}`);
    } catch {
      toast.error("Failed to start backtest");
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="max-w-md space-y-4 p-4">
      <div className="space-y-1.5">
        <Label>Strategy</Label>
        <p className="text-sm font-medium">{strategy.name}</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ticker">Ticker</Label>
        <Input
          id="ticker"
          placeholder="e.g. AAPL"
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="start-date">Start date</Label>
          <Input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="end-date">End date</Label>
          <Input
            id="end-date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="initial-capital">Initial capital</Label>
        <Input
          id="initial-capital"
          type="number"
          min={1}
          step={100}
          value={initialCapital}
          onChange={(e) => setInitialCapital(Number(e.target.value))}
        />
      </div>

      <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Starting…" : "Run backtest"}
      </Button>
    </Card>
  );
}
