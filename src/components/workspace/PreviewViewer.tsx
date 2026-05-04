"use client";

import { useStore } from "@/lib/store";
import { Loader2, ExternalLink } from "lucide-react";
import { useState } from "react";

export default function PreviewViewer() {
  const { sandboxUrls } = useStore();
  const [isLoading, setIsLoading] = useState(true);

  if (!sandboxUrls || !sandboxUrls.stackblitz) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500 bg-[#0a0a0f]">
        <p className="text-sm font-medium mb-1">No live preview available</p>
        <p className="text-xs text-slate-600 mb-4">
          This project type does not support in-browser live preview.
        </p>
        {sandboxUrls?.githubDev && (
          <a
            href={sandboxUrls.githubDev}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors"
          >
            Open in GitHub.dev <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    );
  }

  // Use StackBlitz for live preview (CodeSandbox blocks iframes)
  const sourceUrl = sandboxUrls.stackblitz;
  const embedUrl = `${sandboxUrls.stackblitz}?embed=1&theme=dark&view=preview`;

  return (
    <div className="flex flex-col h-full relative bg-[#0a0a0f]">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 h-10 panel-border-b flex-shrink-0 bg-[#111118]">
        <span className="text-xs font-semibold text-slate-300 flex items-center gap-2">
          {isLoading && <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />}
          Live Sandbox Preview
        </span>
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
        >
          Open in new tab <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Iframe container */}
      <div className="flex-1 w-full h-full relative">
        <iframe
          src={embedUrl}
          className="absolute inset-0 w-full h-full border-0"
          title="Sandbox Preview"
          allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
          sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
          onLoad={() => setIsLoading(false)}
        />
      </div>
    </div>
  );
}
