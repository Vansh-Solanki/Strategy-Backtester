"use client";

import { useEffect, useState } from "react";

import { apiClient, TickerSearchResult } from "@/lib/api-client";

const DEBOUNCE_MS = 300;

export function useTickerSearch(query: string) {
  const [state, setState] = useState<{
    query: string;
    results: TickerSearchResult[];
    isLoading: boolean;
  }>({ query: "", results: [], isLoading: false });

  const trimmed = query.trim();

  if (query !== state.query) {
    setState({ query, results: trimmed ? state.results : [], isLoading: trimmed.length > 0 });
  }

  useEffect(() => {
    if (trimmed.length === 0) return;

    const timer = setTimeout(async () => {
      try {
        const data = await apiClient.searchTickers(query);
        setState((s) => (s.query === query ? { ...s, results: data, isLoading: false } : s));
      } catch {
        setState((s) => (s.query === query ? { ...s, results: [], isLoading: false } : s));
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, trimmed]);

  return { results: state.results, isLoading: state.isLoading };
}
