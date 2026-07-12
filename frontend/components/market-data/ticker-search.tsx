"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { useTickerSearch } from "@/lib/hooks/use-ticker-search";
import { useMarketDataStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function TickerSearch() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const { results, isLoading } = useTickerSearch(query);
  const setSelectedTicker = useMarketDataStore((state) => state.setSelectedTicker);

  function selectResult(index: number) {
    const result = results[index];
    if (!result) return;
    setSelectedTicker(result);
    setQuery(`${result.symbol} — ${result.name}`);
    setIsOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      selectResult(activeIndex === -1 ? 0 : activeIndex);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  }

  return (
    <div className="relative w-full max-w-sm">
      <Input
        placeholder="Search ticker (e.g. AAPL)"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        onKeyDown={handleKeyDown}
      />

      {isOpen && query.trim().length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-md">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 p-3 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Searching…
            </div>
          ) : results.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">No tickers found for &apos;{query}&apos;</p>
          ) : (
            <ul className="max-h-64 overflow-y-auto py-1">
              {results.map((result, index) => (
                <li key={result.symbol}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground",
                      index === activeIndex && "bg-accent text-accent-foreground"
                    )}
                    onMouseDown={() => selectResult(index)}
                    onMouseEnter={() => setActiveIndex(index)}
                  >
                    <span className="font-medium">{result.symbol}</span>
                    <span className="truncate pl-2 text-muted-foreground">
                      {result.name}
                      {result.exchange ? ` (${result.exchange})` : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
