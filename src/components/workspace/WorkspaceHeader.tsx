"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { useStore } from "@/lib/store";
import {
  ArrowLeft, ExternalLink, Play, Code2,
  LayoutDashboard, Network, FileCode
} from "lucide-react";

export default function WorkspaceHeader() {
  const router = useRouter();
  const { repo, sandboxUrls, activeView, setActiveView } = useStore();

  if (!repo) return null;

  return (
    <header className="h-12 bg-[#111118] panel-border-b flex items-center justify-between px-4 flex-shrink-0">
      {/* Left: Back + repo info */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-[#2a2a3a]" />

        <div className="flex items-center gap-2">
          <Image src="/neurorepo-log.png" alt="NeuroRepo" width={18} height={18} className="object-contain" />
          <span className="text-sm font-semibold text-white">{repo.fullName}</span>
          <span className="text-xs text-slate-500">({repo.language})</span>
        </div>
      </div>

      {/* Center: View toggles */}
      <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[#0a0a0f]">
        {([
          { key: "code" as const, icon: FileCode, label: "Code" },
          { key: "diagrams" as const, icon: Network, label: "Diagrams" },
          { key: "dashboard" as const, icon: LayoutDashboard, label: "Dashboard" }
        ]).map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setActiveView(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeView === key
                ? "bg-[#1a1a24] text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Right: Sandbox buttons */}
      <div className="flex items-center gap-2">
        {sandboxUrls?.stackblitz && (
          <a
            href={sandboxUrls.stackblitz}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
            title="Open in StackBlitz"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Open Sandbox</span>
            <ExternalLink className="w-3 h-3 opacity-70" />
          </a>
        )}
        {sandboxUrls?.codesandbox && !sandboxUrls?.stackblitz && (
          <a
            href={sandboxUrls.codesandbox}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
            title="Open in CodeSandbox"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Open Sandbox</span>
            <ExternalLink className="w-3 h-3 opacity-70" />
          </a>
        )}
        <a
          href={sandboxUrls?.githubDev || `https://github.dev/${repo.fullName}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors"
          title="Open in GitHub.dev"
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>GitHub.dev</span>
          <ExternalLink className="w-3 h-3 opacity-70" />
        </a>
        <a
          href={repo.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </header>
  );
}
