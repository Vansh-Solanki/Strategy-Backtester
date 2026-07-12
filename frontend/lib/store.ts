import { create } from "zustand";

export interface SelectedTicker {
  symbol: string;
  name: string;
  exchange: string | null;
}

export interface DateRange {
  start: string;
  end: string;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

interface MarketDataState {
  selectedTicker: SelectedTicker | null;
  setSelectedTicker: (ticker: SelectedTicker | null) => void;
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
}

export const useMarketDataStore = create<MarketDataState>((set) => ({
  selectedTicker: null,
  setSelectedTicker: (ticker) => set({ selectedTicker: ticker }),
  dateRange: { start: "2022-01-01", end: todayStr() },
  setDateRange: (range) => set({ dateRange: range }),
}));
