"use client";

import { useStore } from "@/lib/store";
import Image from "next/image";
import {
  Layers, Code2, FileCode, BarChart3, GitBranch,
  Shield, AlertTriangle, Package, Cpu, Activity,
  Boxes, Zap
} from "lucide-react";

function StatCard({ icon: Icon, label, value, color, sub }: {
  icon: typeof Code2; label: string; value: string | number; color: string; sub?: string;
}) {
  return (
    <div className="glass rounded-xl p-4 hover:border-indigo-500/20 transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <Icon className={`w-5 h-5 ${color}`} />
        {sub && <span className="text-[10px] text-slate-500">{sub}</span>}
      </div>
      <div className="text-lg sm:text-2xl font-bold text-white mb-0.5 break-words leading-tight" title={String(value)}>{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  );
}

function ComplexityGauge({ score }: { score: number }) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score < 30 ? "#10b981" : score < 60 ? "#f59e0b" : "#ef4444";
  const label = score < 30 ? "Low" : score < 60 ? "Moderate" : "High";

  return (
    <div className="flex flex-col items-center">
      <svg width="120" height="120" className="transform -rotate-90">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#1a1a24" strokeWidth="8" />
        <circle cx="60" cy="60" r={radius} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" className="transition-all duration-1000" />
      </svg>
      <div className="absolute mt-8 text-center">
        <div className="text-2xl font-bold" style={{ color }}>{score}</div>
        <div className="text-xs text-slate-400">{label}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { analysis, repo } = useStore();
  if (!analysis || !repo) return null;

  return (
    <div className="h-full overflow-y-auto p-6 bg-[#0a0a0f]">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-1">{repo.fullName}</h2>
          <p className="text-sm text-slate-400 mb-6">{repo.description || "No description provided."}</p>
          
          {analysis.summary && (
            <div className="glass rounded-xl p-5 border-l-2 border-l-indigo-500 bg-indigo-500/5">
              <h3 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Image src="/neurorepo-log.png" alt="NeuroRepo" width={16} height={16} className="object-contain" />
                AI Codebase Summary
              </h3>
              <p className="text-sm text-slate-200 leading-relaxed">
                {analysis.summary}
              </p>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <StatCard icon={FileCode} label="Total Files" value={analysis.totalFiles} color="text-indigo-400" />
          <StatCard icon={Code2} label="Lines of Code" value={analysis.totalLOC.toLocaleString()} color="text-cyan-400" />
          <StatCard icon={Layers} label="Architecture" value={analysis.architectureType} color="text-emerald-400" />
          <StatCard icon={Package} label="Framework" value={analysis.framework} color="text-amber-400" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Complexity */}
          <div className="glass rounded-xl p-6">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              Complexity Score
            </h3>
            <div className="flex justify-center relative">
              <ComplexityGauge score={analysis.complexityScore} />
            </div>
          </div>

          {/* Tech Stack */}
          <div className="glass rounded-xl p-6">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Boxes className="w-4 h-4 text-cyan-400" />
              Tech Stack
            </h3>
            <div className="flex flex-wrap gap-2">
              {analysis.techStack.map((tech) => (
                <span
                  key={tech}
                  className="px-2.5 py-1 rounded-md bg-[#1a1a24] text-xs text-slate-300 border border-[#2a2a3a]"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>

          {/* Languages */}
          <div className="glass rounded-xl p-6">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              Languages
            </h3>
            <div className="space-y-2">
              {analysis.languages.slice(0, 5).map((lang) => (
                <div key={lang.name} className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">{lang.name}</span>
                      <span className="text-slate-500">{lang.percentage}%</span>
                    </div>
                    <div className="h-1.5 bg-[#1a1a24] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-full transition-all duration-1000"
                        style={{ width: `${lang.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Key Modules */}
        <div className="mt-6 glass rounded-xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-amber-400" />
            Key Modules
          </h3>
          <div className="space-y-2">
            {analysis.keyModules.map((mod) => (
              <div
                key={mod.path}
                className="flex items-center justify-between p-3 rounded-lg bg-[#0a0a0f] border border-[#2a2a3a] hover:border-indigo-500/20 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    mod.importance === "critical" ? "bg-red-400" :
                    mod.importance === "high" ? "bg-amber-400" :
                    mod.importance === "medium" ? "bg-emerald-400" : "bg-slate-500"
                  }`} />
                  <div>
                    <div className="text-sm font-medium text-white">{mod.name}</div>
                    <div className="text-xs text-slate-500">{mod.path}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span>{mod.dependents} dependents</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                    mod.importance === "critical" ? "bg-red-500/15 text-red-400" :
                    mod.importance === "high" ? "bg-amber-500/15 text-amber-400" :
                    mod.importance === "medium" ? "bg-emerald-500/15 text-emerald-400" :
                    "bg-slate-500/15 text-slate-400"
                  }`}>
                    {mod.importance}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Design Patterns & Security */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {analysis.designPatterns.length > 0 && (
            <div className="glass rounded-xl p-6">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-purple-400" />
                Design Patterns
              </h3>
              <div className="flex flex-wrap gap-2">
                {analysis.designPatterns.map((p) => (
                  <span key={p} className="px-3 py-1 rounded-lg bg-purple-500/10 text-xs text-purple-300 border border-purple-500/20">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="glass rounded-xl p-6">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              Security Status
            </h3>
            {analysis.securityFindings.length === 0 ? (
              <div className="flex items-center gap-2 text-emerald-400 text-sm">
                <Zap className="w-4 h-4" />
                No issues detected
              </div>
            ) : (
              <div className="space-y-2">
                {analysis.securityFindings.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <AlertTriangle className={`w-3.5 h-3.5 ${
                      f.severity === "critical" ? "text-red-400" : "text-amber-400"
                    }`} />
                    <span className="text-slate-300">{f.description}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
