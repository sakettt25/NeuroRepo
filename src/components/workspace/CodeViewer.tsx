"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { useStore } from "@/lib/store";
import { X, FileCode } from "lucide-react";
import DiagramViewer from "./DiagramViewer";
import Dashboard from "./Dashboard";
import PreviewViewer from "./PreviewViewer";

const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

const LANG_MAP: Record<string, string> = {
  javascript: "javascript", typescript: "typescript", python: "python",
  java: "java", go: "go", rust: "rust", ruby: "ruby", php: "php",
  csharp: "csharp", cpp: "cpp", c: "c", swift: "swift", dart: "dart",
  html: "html", css: "css", scss: "scss", json: "json", yaml: "yaml",
  xml: "xml", markdown: "markdown", sql: "sql", shell: "shell",
  vue: "html", svelte: "html", astro: "html", graphql: "graphql",
  toml: "ini", dotenv: "ini",
};

export default function CodeViewer() {
  const {
    activeFile, activeFileContent, activeFileLanguage,
    openFiles, setActiveFile, closeFile, activeView
  } = useStore();

  const monacoLang = useMemo(
    () => LANG_MAP[activeFileLanguage] || "plaintext",
    [activeFileLanguage]
  );

  // Show diagram, dashboard, or preview view
  if (activeView === "diagrams") return <DiagramViewer />;
  if (activeView === "dashboard") return <Dashboard />;
  if (activeView === "preview") return <PreviewViewer />;

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex items-center h-9 bg-[#111118] panel-border-b overflow-x-auto flex-shrink-0">
        {openFiles.map((file) => (
          <div
            key={file.path}
            className={`flex items-center gap-1.5 px-3 h-full text-xs border-r border-[#2a2a3a] cursor-pointer transition-colors group ${
              activeFile === file.path
                ? "bg-[#1a1a24] text-white border-t-2 border-t-indigo-500"
                : "text-slate-500 hover:text-slate-300 hover:bg-[#15151e] border-t-2 border-t-transparent"
            }`}
            onClick={async () => {
              if (activeFile !== file.path) {
                // Re-fetch the file or use cached
                const { getFileContent } = await import("@/lib/api");
                const { useStore } = await import("@/lib/store");
                const sessionId = useStore.getState().sessionId;
                if (sessionId) {
                  try {
                    const fc = await getFileContent(sessionId, file.path);
                    useStore.getState().setActiveFile(fc.path, fc.content, fc.language);
                  } catch {}
                }
              }
            }}
          >
            <FileCode className="w-3 h-3 flex-shrink-0" />
            <span className="truncate max-w-[120px]">{file.name}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeFile(file.path);
              }}
              className="ml-1 opacity-0 group-hover:opacity-100 hover:text-white transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0">
        {activeFile ? (
          <Editor
            height="100%"
            language={monacoLang}
            value={activeFileContent}
            theme="vs-dark"
            options={{
              readOnly: true,
              minimap: { enabled: true, scale: 2, showSlider: "mouseover" },
              fontSize: 13,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              lineHeight: 20,
              padding: { top: 12 },
              scrollBeyondLastLine: false,
              smoothScrolling: true,
              cursorBlinking: "smooth",
              cursorSmoothCaretAnimation: "on",
              renderLineHighlight: "all",
              bracketPairColorization: { enabled: true },
              guides: { bracketPairs: true, indentation: true },
              wordWrap: "off",
              folding: true,
            }}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-500">
            <FileCode className="w-16 h-16 mb-4 text-slate-700" />
            <p className="text-sm font-medium mb-1">No file selected</p>
            <p className="text-xs text-slate-600">
              Click a file in the explorer to view its contents
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
