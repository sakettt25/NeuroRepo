"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { Network, GitBranch, ArrowRightLeft, Maximize2, Minimize2 } from "lucide-react";

export default function DiagramViewer() {
  const { diagrams, activeDiagram, setActiveDiagram } = useStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const diagramTypes = [
    { key: "architecture" as const, icon: Network, label: "Architecture" },
    { key: "dependencies" as const, icon: GitBranch, label: "Dependencies" },
    { key: "dataFlow" as const, icon: ArrowRightLeft, label: "Data Flow" },
  ];

  useEffect(() => {
    if (!containerRef.current || !diagrams) return;

    const mermaidCode = diagrams[activeDiagram];
    if (!mermaidCode) {
      setError("No diagram data available");
      return;
    }

    const renderDiagram = async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          themeVariables: {
            darkMode: true,
            background: "#0a0a0f",
            primaryColor: "#6366f1",
            primaryTextColor: "#e2e8f0",
            primaryBorderColor: "#6366f1",
            lineColor: "#4a4a5a",
            secondaryColor: "#1a1a24",
            tertiaryColor: "#13131a",
            fontFamily: "Inter, sans-serif",
            fontSize: "13px",
          },
          securityLevel: "loose",
          flowchart: { curve: "basis", padding: 20 },
        });

        if (containerRef.current) {
          containerRef.current.innerHTML = "";
          const id = `mermaid-${Date.now()}`;
          const { svg } = await mermaid.render(id, mermaidCode);
          containerRef.current.innerHTML = svg;

          // Style the SVG
          const svgEl = containerRef.current.querySelector("svg");
          if (svgEl) {
            svgEl.style.maxWidth = "100%";
            svgEl.style.height = "auto";
            svgEl.style.margin = "0 auto";
            svgEl.style.display = "block";
          }
          setError(null);
        }
      } catch (err: any) {
        console.error("Mermaid render error:", err);
        setError("Failed to render diagram. The diagram syntax may be too complex.");
        if (containerRef.current) {
          containerRef.current.innerHTML = `<pre class="text-xs text-slate-500 p-4 overflow-auto whitespace-pre-wrap">${mermaidCode}</pre>`;
        }
      }
    };

    renderDiagram();
  }, [diagrams, activeDiagram]);

  return (
    <div className={`flex flex-col h-full bg-[#0a0a0f] ${fullscreen ? "fixed inset-0 z-50" : ""}`}>
      {/* Controls */}
      <div className="flex items-center justify-between px-4 h-10 panel-border-b flex-shrink-0">
        <div className="flex items-center gap-1">
          {diagramTypes.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setActiveDiagram(key)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                activeDiagram === key
                  ? "bg-indigo-500/15 text-indigo-300"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setFullscreen(!fullscreen)}
          className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Diagram */}
      <div className="flex-1 overflow-auto p-8 flex items-center justify-center">
        {error && (
          <div className="text-sm text-amber-400 mb-4 text-center">{error}</div>
        )}
        <div ref={containerRef} className="max-w-full" />
        {!diagrams && (
          <div className="text-slate-500 text-sm">No diagrams available</div>
        )}
      </div>
    </div>
  );
}
