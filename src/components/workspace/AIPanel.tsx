"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useStore } from "@/lib/store";
import { sendChatMessage, getFileContent } from "@/lib/api";
import {
  MessageSquare, Lightbulb, Map, Send, Loader2,
  FileCode, ChevronRight, Cpu, Layers, Package,
  Activity, ArrowRight, Sparkles
} from "lucide-react";

function ChatTab() {
  const { sessionId, chatMessages, addChatMessage, setActiveFile } = useStore();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || !sessionId || sending) return;
    const msg = input.trim();
    setInput("");

    addChatMessage({
      id: `user-${Date.now()}`,
      role: "user",
      content: msg,
      timestamp: new Date(),
    });

    setSending(true);
    try {
      const res = await sendChatMessage(sessionId, msg);
      addChatMessage({
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: res.response,
        references: res.references,
        timestamp: new Date(),
      });
    } catch {
      addChatMessage({
        id: `err-${Date.now()}`,
        role: "assistant",
        content: "Sorry, I encountered an error processing your question.",
        timestamp: new Date(),
      });
    }
    setSending(false);
  }, [input, sessionId, sending, addChatMessage]);

  const handleRefClick = async (filePath: string) => {
    if (!sessionId) return;
    try {
      const file = await getFileContent(sessionId, filePath);
      setActiveFile(file.path, file.content, file.language);
    } catch {}
  };

  const suggestions = [
    "What's the tech stack?",
    "Explain the architecture",
    "Show me the entry points",
    "List all functions",
    "Check for security issues",
    "How complex is this codebase?",
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {chatMessages.length === 0 && (
          <div className="pt-8 px-2">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <span className="text-sm font-medium text-white">Ask about this codebase</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="text-left px-3 py-2 rounded-lg bg-[#0a0a0f] border border-[#2a2a3a] text-xs text-slate-400 hover:text-white hover:border-indigo-500/30 transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {chatMessages.map((msg) => (
          <div key={msg.id} className={`${msg.role === "user" ? "flex justify-end" : ""}`}>
            <div
              className={`max-w-[90%] rounded-xl px-3 py-2 text-sm ${
                msg.role === "user"
                  ? "bg-indigo-500/15 text-indigo-200 border border-indigo-500/20"
                  : "bg-[#1a1a24] text-slate-300 border border-[#2a2a3a]"
              }`}
            >
              <div className="whitespace-pre-wrap text-xs leading-relaxed">{msg.content}</div>
              {msg.references && msg.references.length > 0 && (
                <div className="mt-2 pt-2 border-t border-[#2a2a3a] space-y-1">
                  {msg.references.map((ref, i) => (
                    <button
                      key={i}
                      onClick={() => handleRefClick(ref.filePath)}
                      className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      <FileCode className="w-3 h-3" />
                      {ref.filePath}
                      {ref.functionName && <span className="text-slate-500">→ {ref.functionName}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex items-center gap-2 text-xs text-slate-400 px-2">
            <Loader2 className="w-3 h-3 animate-spin" />
            Analyzing...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 panel-border-t flex-shrink-0">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask about the code..."
            className="flex-1 px-3 py-2 rounded-lg bg-[#0a0a0f] border border-[#2a2a3a] text-xs text-slate-300 placeholder-slate-600 outline-none focus:border-indigo-500/30 transition-colors"
            disabled={sending}
          />
          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="p-2 rounded-lg bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25 transition-colors disabled:opacity-30"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function InsightsTab() {
  const { analysis } = useStore();
  if (!analysis) return null;

  const insights = [
    { icon: Package, label: "Framework", value: analysis.framework, color: "text-indigo-400" },
    { icon: Layers, label: "Architecture", value: analysis.architectureType, color: "text-cyan-400" },
    { icon: Activity, label: "Complexity", value: `${analysis.complexityScore}/100`, color: analysis.complexityScore < 30 ? "text-emerald-400" : analysis.complexityScore < 60 ? "text-amber-400" : "text-red-400" },
    { icon: FileCode, label: "Files", value: analysis.totalFiles.toString(), color: "text-slate-400" },
    { icon: Cpu, label: "LOC", value: analysis.totalLOC.toLocaleString(), color: "text-slate-400" },
  ];

  return (
    <div className="p-3 space-y-3 overflow-y-auto">
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
        Quick Insights
      </div>

      {insights.map((item) => (
        <div key={item.label} className="flex items-center justify-between p-3 rounded-lg bg-[#0a0a0f] border border-[#2a2a3a]">
          <div className="flex items-center gap-2">
            <item.icon className={`w-4 h-4 ${item.color}`} />
            <span className="text-xs text-slate-400">{item.label}</span>
          </div>
          <span className="text-xs font-medium text-white">{item.value}</span>
        </div>
      ))}

      {analysis.techStack.length > 0 && (
        <div className="p-3 rounded-lg bg-[#0a0a0f] border border-[#2a2a3a]">
          <div className="text-xs text-slate-400 mb-2">Tech Stack</div>
          <div className="flex flex-wrap gap-1.5">
            {analysis.techStack.map((t) => (
              <span key={t} className="px-2 py-0.5 rounded text-[10px] bg-[#1a1a24] text-slate-300 border border-[#2a2a3a]">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {analysis.designPatterns.length > 0 && (
        <div className="p-3 rounded-lg bg-[#0a0a0f] border border-[#2a2a3a]">
          <div className="text-xs text-slate-400 mb-2">Design Patterns</div>
          <div className="flex flex-wrap gap-1.5">
            {analysis.designPatterns.map((p) => (
              <span key={p} className="px-2 py-0.5 rounded text-[10px] bg-purple-500/10 text-purple-300 border border-purple-500/20">
                {p}
              </span>
            ))}
          </div>
        </div>
      )}

      {analysis.circularDeps.length > 0 && (
        <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
          <div className="text-xs text-amber-400 mb-1">⚠️ Circular Dependencies</div>
          {analysis.circularDeps.slice(0, 3).map((cycle, i) => (
            <div key={i} className="text-[10px] text-slate-400 mt-1">
              {cycle.join(" → ")}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TourTab() {
  const { tour, sessionId, setActiveFile } = useStore();
  const [activeStep, setActiveStep] = useState(0);

  const handleStepClick = async (step: typeof tour[0]) => {
    if (!sessionId) return;
    try {
      const file = await getFileContent(sessionId, step.filePath);
      setActiveFile(file.path, file.content, file.language);
      setActiveStep(step.order);
    } catch {}
  };

  return (
    <div className="p-3 space-y-2 overflow-y-auto">
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
        Guided Code Tour
      </div>

      {tour.length === 0 && (
        <div className="text-xs text-slate-600 text-center py-8">
          No tour steps available
        </div>
      )}

      {tour.map((step) => (
        <button
          key={step.order}
          onClick={() => handleStepClick(step)}
          className={`w-full text-left p-3 rounded-lg border transition-all ${
            activeStep === step.order
              ? "bg-indigo-500/10 border-indigo-500/30"
              : "bg-[#0a0a0f] border-[#2a2a3a] hover:border-indigo-500/20"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono text-indigo-400">
              {String(step.order + 1).padStart(2, "0")}
            </span>
            <span className="text-xs font-medium text-white">{step.title}</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed ml-6">{step.description}</p>
          <div className="flex items-center gap-1 mt-1.5 ml-6 text-[10px] text-indigo-400/60">
            <FileCode className="w-3 h-3" />
            {step.filePath}
          </div>
        </button>
      ))}
    </div>
  );
}

export default function AIPanel() {
  const { activePanel, setActivePanel } = useStore();

  const tabs = [
    { key: "chat" as const, icon: MessageSquare, label: "Chat" },
    { key: "insights" as const, icon: Lightbulb, label: "Insights" },
    { key: "tour" as const, icon: Map, label: "Tour" },
  ];

  return (
    <>
      {/* Tab headers */}
      <div className="flex items-center h-9 panel-border-b flex-shrink-0">
        {tabs.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setActivePanel(key)}
            className={`flex items-center gap-1.5 px-4 h-full text-xs font-medium transition-colors border-b-2 ${
              activePanel === key
                ? "text-indigo-300 border-indigo-500 bg-indigo-500/5"
                : "text-slate-500 border-transparent hover:text-slate-300"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {activePanel === "chat" && <ChatTab />}
        {activePanel === "insights" && <InsightsTab />}
        {activePanel === "tour" && <TourTab />}
      </div>
    </>
  );
}
