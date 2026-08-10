"use client";

import { useEffect, useState } from "react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiClient, type StrategyTemplate } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { MonacoEditor } from "@/components/strategy/monaco-editor";

interface TemplatePickerProps {
  onSelect: (code: string, defaultParams: Record<string, unknown>) => void;
}

export function TemplatePicker({ onSelect }: TemplatePickerProps) {
  const [templates, setTemplates] = useState<StrategyTemplate[]>([]);
  const [previewName, setPreviewName] = useState<string | null>(null);

  useEffect(() => {
    apiClient.getStrategyTemplates().then(setTemplates).catch(() => setTemplates([]));
  }, []);

  const preview = templates.find((t) => t.name === previewName) ?? null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <Card
            key={template.name}
            className={cn(
              "cursor-pointer p-3 transition-colors hover:border-primary",
              previewName === template.name && "border-primary"
            )}
            onClick={() => setPreviewName(template.name)}
          >
            <p className="text-sm font-medium">{template.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">{template.description}</p>
          </Card>
        ))}
      </div>

      {preview && (
        <div className="space-y-2 rounded-md border p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{preview.name} preview</p>
            <Button size="sm" onClick={() => onSelect(preview.code, preview.default_params)}>
              Load into editor
            </Button>
          </div>
          <MonacoEditor value={preview.code} onChange={() => {}} height="200px" readOnly />
        </div>
      )}
    </div>
  );
}
