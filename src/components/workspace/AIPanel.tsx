"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useStore } from "@/lib/store";
import { sendChatMessage, getFileContent } from "@/lib/api";
import {
  MessageSquare, Lightbulb, Map, Send, Loader2,
  FileCode, ChevronRight, Cpu, Layers, Package,
  Activity, ArrowRight, Sparkles, User, Bot, FileText,
  CheckCircle2, Circle, ArrowLeft
} from "lucide-react";
import ReactMarkdown from "react-markdown";

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
    } catch (err: any) {
      const errMsg = err?.message || "";
      let content = "Sorry, I encountered an error processing your question.";
      if (errMsg.includes("Session not found")) {
        content = "⚠️ Your analysis session has expired. Please go back to the home page and re-analyze the repository to start a new session.";
      } else if (errMsg) {
        content = `⚠️ Error: ${errMsg}`;
      }
      addChatMessage({
        id: `err-${Date.now()}`,
        role: "assistant",
        content,
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
          <div className="pt-8 px-2 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center mb-4 border border-indigo-500/30">
              <Sparkles className="w-6 h-6 text-indigo-400" />
            </div>
            <h3 className="text-sm font-semibold text-white mb-2">Ask about this codebase</h3>
            <p className="text-xs text-slate-400 mb-6 max-w-[200px]">
              Get architecture insights, find entry points, or understand dependencies.
            </p>
            <div className="grid grid-cols-1 gap-2 w-full">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="text-left px-3 py-2.5 rounded-lg bg-[#0a0a0f]/50 border border-[#2a2a3a] text-xs text-slate-300 hover:text-white hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <span>{s}</span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-indigo-400" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {chatMessages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            {/* Avatar */}
            <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center border ${
              msg.role === "user" 
                ? "bg-indigo-500/20 border-indigo-500/30 text-indigo-300" 
                : "bg-slate-800 border-slate-700 text-slate-300"
            }`}>
              {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            {/* Message Bubble */}
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                msg.role === "user"
                  ? "bg-indigo-600 text-white rounded-tr-sm"
                  : "bg-[#1a1a24] text-slate-200 border border-[#2a2a3a] rounded-tl-sm"
              }`}
            >
              <div className="prose prose-invert prose-sm max-w-none text-xs leading-relaxed prose-pre:bg-[#0a0a0f] prose-pre:border prose-pre:border-[#2a2a3a] prose-pre:p-2 prose-a:text-indigo-400">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
              
              {msg.references && msg.references.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-700/50 flex flex-wrap gap-2">
                  {msg.references.map((ref, i) => (
                    <button
                      key={i}
                      onClick={() => handleRefClick(ref.filePath)}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-indigo-500/10 hover:bg-indigo-500/20 text-[10px] text-indigo-300 transition-colors border border-indigo-500/20 group"
                    >
                      <FileText className="w-3 h-3 text-indigo-400 group-hover:text-indigo-300" />
                      <span className="truncate max-w-[150px]">{ref.filePath.split('/').pop() || ref.filePath}</span>
                      {ref.functionName && (
                        <>
                          <span className="text-slate-500 opacity-50">/</span>
                          <span className="text-slate-400 group-hover:text-slate-300 font-mono">{ref.functionName}()</span>
                        </>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div className="max-w-[85%] rounded-2xl rounded-tl-sm px-4 py-3 bg-[#1a1a24] border border-[#2a2a3a] flex items-center gap-2">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </span>
              <span className="text-xs text-slate-400 ml-1">Analyzing repository...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} className="h-2" />
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
            className="flex-1 px-4 py-2.5 rounded-xl bg-[#13131a] border border-[#2a2a3a] text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all shadow-inner"
            disabled={sending}
          />
          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="p-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/20 transition-all disabled:opacity-50 disabled:hover:bg-indigo-600 disabled:hover:shadow-none"
          >
            <Send className="w-4 h-4" />
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
      const { getFileContent } = await import("@/lib/api");
      const file = await getFileContent(sessionId, step.filePath);
      setActiveFile(file.path, file.content, file.language);
      setActiveStep(step.order);
    } catch {}
  };

  const handleNext = () => {
    if (activeStep < tour.length - 1) {
      handleStepClick(tour[activeStep + 1]);
    }
  };

  const handlePrev = () => {
    if (activeStep > 0) {
      handleStepClick(tour[activeStep - 1]);
    }
  };

  if (tour.length === 0) {
    return (
      <div className="p-4 flex flex-col items-center justify-center h-full text-slate-500 space-y-3">
        <Map className="w-10 h-10 opacity-20" />
        <p className="text-sm">No tour available</p>
      </div>
    );
  }

  const progressPercentage = Math.round(((activeStep + 1) / tour.length) * 100);

  return (
    <div className="flex flex-col h-full bg-[#0a0a0f]">
      {/* Sticky Header with Progress */}
      <div className="flex-shrink-0 p-4 border-b border-[#2a2a3a] bg-[#0a0a0f]/95 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Map className="w-4 h-4 text-indigo-400" />
            Guided Code Tour
          </h3>
          <span className="text-xs font-medium text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
            {activeStep + 1} of {tour.length}
          </span>
        </div>
        <div className="h-1.5 w-full bg-[#1a1a24] rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Steps List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 pb-12">
        {tour.map((step, index) => {
          const isActive = activeStep === step.order;
          const isCompleted = activeStep > step.order;
          
          return (
            <div key={step.order} className="relative">
              {/* Timeline connector line */}
              {index !== tour.length - 1 && (
                <div className={`absolute top-8 left-[27px] w-[2px] h-[calc(100%+8px)] -ml-[1px] transition-colors duration-300 z-0 ${isCompleted ? 'bg-indigo-500/50' : 'bg-[#2a2a3a]'}`} />
              )}
              
              <div 
                className={`group flex gap-3 p-3 rounded-xl border transition-all cursor-pointer relative z-10 ${
                  isActive 
                    ? "bg-[#13131a] border-indigo-500/40 shadow-[0_4px_20px_rgba(99,102,241,0.08)]" 
                    : "bg-transparent border-transparent hover:bg-[#13131a]/50"
                }`}
                onClick={() => handleStepClick(step)}
              >
                {/* Timeline Icon */}
                <div className="flex-shrink-0 mt-0.5">
                  {isActive ? (
                    <div className="w-[30px] h-[30px] rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/50 shadow-[0_0_10px_rgba(99,102,241,0.2)]">
                      <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse" />
                    </div>
                  ) : isCompleted ? (
                    <div className="w-[30px] h-[30px] rounded-full bg-indigo-500/90 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                  ) : (
                    <div className="w-[30px] h-[30px] rounded-full bg-[#1a1a24] flex items-center justify-center border border-[#2a2a3a] group-hover:border-[#3a3a4a] transition-colors">
                      <Circle className="w-2 h-2 text-slate-600 group-hover:text-slate-400 transition-colors" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h4 className={`text-sm font-medium mb-1 transition-colors ${isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                    {step.title}
                  </h4>
                  <p className={`text-xs leading-relaxed ${isActive ? 'text-slate-300' : 'text-slate-500'} ${!isActive && 'line-clamp-2'}`}>
                    {step.description}
                  </p>
                  
                  <div className={`flex items-center gap-1.5 mt-2.5 text-[10px] uppercase tracking-wider font-mono px-2 py-1 rounded w-fit transition-colors ${
                    isActive ? "bg-indigo-500/10 text-indigo-300 border border-indigo-500/20" : "bg-[#1a1a24] text-slate-500 group-hover:bg-[#2a2a3a] group-hover:text-slate-400"
                  }`}>
                    <FileCode className="w-3 h-3" />
                    <span className="truncate">{step.filePath.split('/').pop()}</span>
                  </div>

                  {/* Active Step Actions */}
                  {isActive && (
                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[#2a2a3a]">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                        disabled={activeStep === 0}
                        className="px-3 py-1.5 rounded text-xs font-medium bg-[#1a1a24] text-slate-300 hover:bg-[#2a2a3a] hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        <ArrowLeft className="w-3 h-3" /> Prev
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleNext(); }}
                        disabled={activeStep === tour.length - 1}
                        className="px-4 py-1.5 rounded text-xs font-medium bg-indigo-500 text-white hover:bg-indigo-600 transition-colors shadow-md shadow-indigo-500/20 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 ml-auto"
                      >
                        {activeStep === tour.length - 1 ? 'Finish' : 'Next'} <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
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
