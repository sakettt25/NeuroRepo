"use client";

import { useState, useCallback } from "react";
import { useStore } from "@/lib/store";
import { getFileContent, FileNode } from "@/lib/api";
import {
  ChevronRight, ChevronDown, File, Folder, FolderOpen,
  Search, FileCode, FileJson, FileText, FileImage,
  Settings, Package
} from "lucide-react";

const FILE_ICONS: Record<string, { icon: typeof File; color: string }> = {
  typescript: { icon: FileCode, color: "text-blue-400" },
  javascript: { icon: FileCode, color: "text-yellow-400" },
  json: { icon: FileJson, color: "text-amber-400" },
  markdown: { icon: FileText, color: "text-slate-400" },
  css: { icon: FileCode, color: "text-purple-400" },
  scss: { icon: FileCode, color: "text-pink-400" },
  html: { icon: FileCode, color: "text-orange-400" },
  python: { icon: FileCode, color: "text-green-400" },
  yaml: { icon: Settings, color: "text-red-400" },
  toml: { icon: Settings, color: "text-orange-300" },
};

function getFileIcon(node: FileNode) {
  if (node.type === "directory") return null;
  const name = node.name.toLowerCase();
  if (name === "package.json") return { icon: Package, color: "text-green-400" };
  if (name.includes("config") || name.includes("rc")) return { icon: Settings, color: "text-slate-400" };
  const lang = node.language || "";
  return FILE_ICONS[lang] || { icon: File, color: "text-slate-500" };
}

function TreeNode({ node, depth = 0 }: { node: FileNode; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 1);
  const { sessionId, activeFile, setActiveFile } = useStore();
  const isActive = activeFile === node.path;

  const handleClick = useCallback(async () => {
    if (node.type === "directory") {
      setExpanded(!expanded);
      return;
    }

    if (!sessionId) return;
    try {
      const file = await getFileContent(sessionId, node.path);
      setActiveFile(file.path, file.content, file.language);
    } catch (err) {
      console.error("Failed to load file:", err);
    }
  }, [node, expanded, sessionId, setActiveFile]);

  const iconData = getFileIcon(node);

  return (
    <div>
      <button
        onClick={handleClick}
        className={`w-full flex items-center gap-1 px-2 py-[3px] text-left text-[13px] hover:bg-white/5 transition-colors group ${
          isActive ? "bg-indigo-500/10 text-indigo-300" : "text-slate-300"
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {node.type === "directory" ? (
          <>
            {expanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            )}
            {expanded ? (
              <FolderOpen className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            ) : (
              <Folder className="w-4 h-4 text-slate-400 flex-shrink-0" />
            )}
          </>
        ) : (
          <>
            <span className="w-3.5 flex-shrink-0" />
            {iconData && <iconData.icon className={`w-4 h-4 ${iconData.color} flex-shrink-0`} />}
          </>
        )}
        <span className="truncate ml-1">{node.name}</span>
      </button>

      {node.type === "directory" && expanded && node.children && (
        <div>
          {[...node.children]
            .sort((a, b) => {
              if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
              return a.name.localeCompare(b.name);
            })
            .map((child) => (
              <TreeNode key={child.path} node={child} depth={depth + 1} />
            ))}
        </div>
      )}
    </div>
  );
}

export default function FileExplorer() {
  const { fileTree, analysis } = useStore();
  const [search, setSearch] = useState("");

  const filterTree = (nodes: FileNode[], query: string): FileNode[] => {
    if (!query) return nodes;
    return nodes.reduce<FileNode[]>((acc, node) => {
      if (node.name.toLowerCase().includes(query.toLowerCase())) {
        acc.push(node);
      } else if (node.children) {
        const filtered = filterTree(node.children, query);
        if (filtered.length > 0) {
          acc.push({ ...node, children: filtered });
        }
      }
      return acc;
    }, []);
  };

  const filtered = filterTree(fileTree, search);

  return (
    <>
      {/* Header */}
      <div className="px-3 py-2.5 panel-border-b flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Explorer</span>
          <span className="text-[10px] text-slate-600">{analysis?.totalFiles || 0} files</span>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search files..."
            className="w-full pl-8 pr-3 py-1.5 rounded-md bg-[#0a0a0f] border border-[#2a2a3a] text-xs text-slate-300 placeholder-slate-600 outline-none focus:border-indigo-500/30 transition-colors"
          />
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-1">
        {filtered.map((node) => (
          <TreeNode key={node.path} node={node} />
        ))}
        {filtered.length === 0 && (
          <div className="px-4 py-8 text-center text-xs text-slate-600">
            No files found
          </div>
        )}
      </div>
    </>
  );
}
