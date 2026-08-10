import { Badge } from "@/components/ui/badge";
import type { BacktestStatus } from "@/lib/api-client";

const VARIANTS: Record<BacktestStatus, "outline" | "secondary" | "default" | "destructive"> = {
  pending: "outline",
  running: "secondary",
  done: "default",
  failed: "destructive",
};

const LABELS: Record<BacktestStatus, string> = {
  pending: "Pending",
  running: "Running",
  done: "Done",
  failed: "Failed",
};

export function BacktestStatusBadge({ status }: { status: BacktestStatus }) {
  return <Badge variant={VARIANTS[status]}>{LABELS[status]}</Badge>;
}
