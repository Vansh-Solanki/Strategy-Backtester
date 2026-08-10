"use client";

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import type { OnMount } from "@monaco-editor/react";
import type * as MonacoNS from "monaco-editor";

import { Skeleton } from "@/components/ui/skeleton";

const Editor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});

export interface CodeMarker {
  line: number;
  message: string;
}

interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void;
  markers?: CodeMarker[];
  height?: string | number;
  readOnly?: boolean;
}

export function MonacoEditor({
  value,
  onChange,
  onSave,
  markers = [],
  height = "480px",
  readOnly = false,
}: MonacoEditorProps) {
  const editorRef = useRef<MonacoNS.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof MonacoNS | null>(null);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    if (onSave) {
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, onSave);
    }
  };

  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;
    const model = editor.getModel();
    if (!model) return;

    monaco.editor.setModelMarkers(
      model,
      "strategy-validation",
      markers.map((m) => ({
        startLineNumber: m.line,
        endLineNumber: m.line,
        startColumn: 1,
        endColumn: model.getLineMaxColumn(m.line),
        message: m.message,
        severity: monaco.MarkerSeverity.Error,
      }))
    );
  }, [markers]);

  return (
    <div className="overflow-hidden rounded-md border" style={{ height }}>
      <Editor
        height="100%"
        language="python"
        theme="vs-dark"
        value={value}
        onChange={(v) => onChange(v ?? "")}
        onMount={handleMount}
        options={{
          minimap: { enabled: false },
          wordWrap: "off",
          fontSize: 13,
          lineNumbers: "on",
          readOnly,
          scrollBeyondLastLine: false,
        }}
      />
    </div>
  );
}
