"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient, type Strategy, type StrategyConfig } from "@/lib/api-client";
import { useStrategyValidation } from "@/lib/hooks/use-strategy-validation";
import { ConsolePanel } from "@/components/strategy/console-panel";
import { MonacoEditor, type CodeMarker } from "@/components/strategy/monaco-editor";
import { ParamsEditor } from "@/components/strategy/params-editor";
import { TemplatePicker } from "@/components/strategy/template-picker";
import { ValidationBadge } from "@/components/strategy/validation-badge";

interface StrategyFormProps {
  mode: "create" | "edit";
  strategy?: Strategy;
}

function parseErrorLine(message: string): number {
  const match = message.match(/line (\d+)/i);
  return match ? Number(match[1]) : 1;
}

export function StrategyForm({ mode, strategy }: StrategyFormProps) {
  const router = useRouter();
  const { data: session } = useSession();

  const [name, setName] = useState(strategy?.name ?? "");
  const [description, setDescription] = useState(strategy?.description ?? "");
  const [code, setCode] = useState(strategy?.config.code ?? "");
  const [params, setParams] = useState<Record<string, unknown>>(strategy?.config.params ?? {});
  const [positionSize, setPositionSize] = useState(strategy?.config.position_size ?? 0.1);
  const [stopLoss, setStopLoss] = useState(strategy?.config.stop_loss ?? 0.05);
  const [isSaving, setIsSaving] = useState(false);

  const { valid, errors } = useStrategyValidation(code);

  useEffect(() => {
    if (mode !== "create" || code) return;
    apiClient
      .getStrategyTemplates()
      .then((templates) => {
        const blank = templates.find((t) => t.name === "Blank slate");
        if (blank) {
          setCode(blank.code);
          setParams(blank.default_params);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const markers: CodeMarker[] = useMemo(
    () => errors.map((message) => ({ line: parseErrorLine(message), message })),
    [errors]
  );

  async function handleSave() {
    if (!session?.accessToken) {
      toast.error("You must be signed in");
      return;
    }
    if (!name.trim()) {
      toast.error("Give the strategy a name");
      return;
    }
    if (!valid) {
      toast.error("Fix validation errors before saving");
      return;
    }

    const config: StrategyConfig = {
      code,
      params,
      position_size: positionSize,
      stop_loss: stopLoss,
    };

    setIsSaving(true);
    try {
      if (mode === "create") {
        const created = await apiClient.createStrategy(session.accessToken, {
          name,
          description: description || null,
          config,
        });
        toast.success("Strategy created");
        router.push(`/strategies/${created.id}`);
        router.refresh();
      } else if (strategy) {
        await apiClient.updateStrategy(session.accessToken, strategy.id, {
          name,
          description: description || null,
          config,
        });
        toast.success("Strategy saved");
        router.refresh();
      }
    } catch {
      toast.error("Failed to save strategy");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
      <div className="space-y-4">
        <Card className="space-y-3 p-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="position-size">Position size</Label>
              <Input
                id="position-size"
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={positionSize}
                onChange={(e) => setPositionSize(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stop-loss">Stop loss</Label>
              <Input
                id="stop-loss"
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={stopLoss}
                onChange={(e) => setStopLoss(Number(e.target.value))}
              />
            </div>
          </div>
        </Card>

        <ParamsEditor value={params} onChange={setParams} />

        <div className="flex items-center gap-2">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving…" : "Save strategy"}
          </Button>
          <ValidationBadge errors={errors} />
        </div>
      </div>

      <div className="space-y-4">
        {mode === "create" && <TemplatePicker onSelect={(c, p) => { setCode(c); setParams(p); }} />}

        <MonacoEditor value={code} onChange={setCode} onSave={handleSave} markers={markers} />

        <ConsolePanel />
      </div>
    </div>
  );
}
