"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import FileExplorer from "@/components/workspace/FileExplorer";
import CodeViewer from "@/components/workspace/CodeViewer";
import AIPanel from "@/components/workspace/AIPanel";
import WorkspaceHeader from "@/components/workspace/WorkspaceHeader";

export default function AnalyzePage() {
  const router = useRouter();
  const { sessionId, repo, analysis } = useStore();

  useEffect(() => {
    if (!sessionId) {
      router.push("/");
    }
  }, [sessionId, router]);

  if (!sessionId || !repo || !analysis) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="text-slate-400">Redirecting...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0f] overflow-hidden">
      {/* Top header bar */}
      <WorkspaceHeader />

      {/* Three-panel layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: File Explorer */}
        <div className="w-[280px] min-w-[220px] flex-shrink-0 panel-border-r bg-[#111118] overflow-hidden flex flex-col">
          <FileExplorer />
        </div>

        {/* Center: Code Viewer */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <CodeViewer />
        </div>

        {/* Right: AI Panel */}
        <div className="w-[380px] min-w-[320px] flex-shrink-0 panel-border-l bg-[#111118] overflow-hidden flex flex-col">
          <AIPanel />
        </div>
      </div>
    </div>
  );
}
