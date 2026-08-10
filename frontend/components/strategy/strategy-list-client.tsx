"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { apiClient, type Strategy } from "@/lib/api-client";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { StrategyCard } from "@/components/strategy/strategy-card";

export function StrategyListClient({ initialStrategies }: { initialStrategies: Strategy[] }) {
  const { data: session } = useSession();
  const [strategies, setStrategies] = useState(initialStrategies);

  async function handleDelete(id: string) {
    if (!session?.accessToken) return;
    const previous = strategies;
    setStrategies((s) => s.filter((strategy) => strategy.id !== id));
    try {
      await apiClient.deleteStrategy(session.accessToken, id);
      toast.success("Strategy deleted");
    } catch {
      setStrategies(previous);
      toast.error("Failed to delete strategy");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {strategies.length} strateg{strategies.length === 1 ? "y" : "ies"}
        </p>
        <Link href="/strategies/new" className={cn(buttonVariants())}>
          New strategy
        </Link>
      </div>

      {strategies.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-md border border-dashed p-12 text-center">
          <p className="text-muted-foreground">No strategies yet — create your first one</p>
          <Link href="/strategies/new" className={cn(buttonVariants())}>
            New strategy
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {strategies.map((strategy) => (
            <StrategyCard key={strategy.id} strategy={strategy} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
