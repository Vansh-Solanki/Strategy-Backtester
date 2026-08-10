"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Terminal } from "lucide-react";

import { cn } from "@/lib/utils";

export function ConsolePanel({ output }: { output?: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-md border">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium"
        onClick={() => setIsOpen((v) => !v)}
      >
        {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        <Terminal className="size-4" />
        Console
      </button>
      {isOpen && (
        <pre
          className={cn(
            "max-h-48 overflow-auto border-t bg-muted/50 p-3 text-xs text-muted-foreground",
            !output && "italic"
          )}
        >
          {output ?? "Console output will appear here when you run a backtest."}
        </pre>
      )}
    </div>
  );
}
