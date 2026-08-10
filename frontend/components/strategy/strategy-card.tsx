"use client";

import Link from "next/link";
import { Play, Trash2 } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Strategy } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface StrategyCardProps {
  strategy: Strategy;
  onDelete: (id: string) => void;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function StrategyCard({ strategy, onDelete }: StrategyCardProps) {
  const preview = strategy.config.code.split("\n").slice(0, 2).join("\n");

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <Link href={`/strategies/${strategy.id}`} className="font-medium hover:underline">
            {strategy.name}
          </Link>
          {strategy.description && (
            <p className="text-sm text-muted-foreground">{strategy.description}</p>
          )}
        </div>
        <p className="shrink-0 text-xs text-muted-foreground">{formatDate(strategy.created_at)}</p>
      </div>

      <div className="relative overflow-hidden rounded-md bg-muted">
        <pre className="p-2 font-mono text-xs leading-relaxed">{preview}</pre>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-muted to-transparent" />
      </div>

      <div className="flex items-center gap-2">
        <Link
          href={`/strategies/${strategy.id}`}
          className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
        >
          Edit
        </Link>
        <Link
          href={`/backtests/new?strategyId=${strategy.id}`}
          className={cn(buttonVariants({ size: "sm", variant: "outline" }), "gap-1")}
        >
          <Play className="size-3" />
          Run
        </Link>
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto gap-1 text-destructive hover:text-destructive"
          onClick={() => onDelete(strategy.id)}
        >
          <Trash2 className="size-3" />
          Delete
        </Button>
      </div>
    </Card>
  );
}
