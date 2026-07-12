"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMarketDataStore } from "@/lib/store";

// yfinance simply returns whatever history exists for the symbol, so a date
// far before any real listing acts as a "since IPO" floor for the Max preset.
const MAX_START_DATE = "1970-01-01";
const MIN_VALID_YEAR = 1900;

type Preset = "1M" | "6M" | "YTD" | "1Y" | "5Y" | "MAX";
const PRESETS: Preset[] = ["1M", "6M", "YTD", "1Y", "5Y", "MAX"];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function presetStart(preset: Preset): string {
  const now = new Date();
  switch (preset) {
    case "1M":
      now.setMonth(now.getMonth() - 1);
      return now.toISOString().slice(0, 10);
    case "6M":
      now.setMonth(now.getMonth() - 6);
      return now.toISOString().slice(0, 10);
    case "YTD":
      return `${now.getFullYear()}-01-01`;
    case "1Y":
      now.setFullYear(now.getFullYear() - 1);
      return now.toISOString().slice(0, 10);
    case "5Y":
      now.setFullYear(now.getFullYear() - 5);
      return now.toISOString().slice(0, 10);
    case "MAX":
      return MAX_START_DATE;
  }
}

// A native date input fires onChange on every keystroke while typing a
// segment (e.g. typing "2020" into the year walks through "0002", "0020",
// "0200" before landing on "2020"). Only treat a fully-typed, plausible date
// as something worth committing.
function isCommittable(value: string): boolean {
  const match = /^(\d{4})-\d{2}-\d{2}$/.exec(value);
  return match !== null && Number(match[1]) >= MIN_VALID_YEAR;
}

export function DateRangePicker() {
  const dateRange = useMarketDataStore((state) => state.dateRange);
  const setDateRange = useMarketDataStore((state) => state.setDateRange);

  // Local draft holds every keystroke for responsive typing. The shared store
  // (which PriceChart fetches against) only updates once a field is committed
  // on blur, so partial/garbage in-progress values never trigger a fetch.
  const [draft, setDraft] = useState(dateRange);

  function commitStart(value: string) {
    if (isCommittable(value) && value <= draft.end) {
      const next = { ...draft, start: value };
      setDraft(next);
      setDateRange(next);
    } else {
      setDraft(dateRange);
    }
  }

  function commitEnd(value: string) {
    if (isCommittable(value) && value >= draft.start && value <= todayStr()) {
      const next = { ...draft, end: value };
      setDraft(next);
      setDateRange(next);
    } else {
      setDraft(dateRange);
    }
  }

  function applyPreset(preset: Preset) {
    const next = { start: presetStart(preset), end: todayStr() };
    setDraft(next);
    setDateRange(next);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        type="date"
        value={draft.start}
        max={draft.end}
        onChange={(e) => setDraft({ ...draft, start: e.target.value })}
        onBlur={(e) => commitStart(e.target.value)}
        className="w-auto"
      />
      <span className="text-sm text-muted-foreground">to</span>
      <Input
        type="date"
        value={draft.end}
        min={draft.start}
        max={todayStr()}
        onChange={(e) => setDraft({ ...draft, end: e.target.value })}
        onBlur={(e) => commitEnd(e.target.value)}
        className="w-auto"
      />
      <div className="flex gap-1">
        {PRESETS.map((preset) => (
          <Button key={preset} type="button" variant="outline" size="sm" onClick={() => applyPreset(preset)}>
            {preset}
          </Button>
        ))}
      </div>
    </div>
  );
}
