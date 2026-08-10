"use client";

import { useState } from "react";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ParamsEditorProps {
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
}

export function ParamsEditor({ value, onChange }: ParamsEditorProps) {
  const [draft, setDraft] = useState(() => JSON.stringify(value, null, 2));
  const [error, setError] = useState<string | null>(null);

  function commit() {
    try {
      const parsed = JSON.parse(draft);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        throw new Error("Params must be a JSON object");
      }
      setError(null);
      setDraft(JSON.stringify(parsed, null, 2));
      onChange(parsed);
    } catch {
      setError("Invalid JSON");
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="params">Params (JSON)</Label>
      <Textarea
        id="params"
        className="font-mono text-sm"
        rows={8}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
