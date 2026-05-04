"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { analyzeRepo } from "@/lib/api";
import {
  Brain, GitBranch, Code2, Network, MessageSquare,
  Zap, Search, ArrowRight, Loader2, AlertCircle,
  BarChart3, Shield, Route, Sparkles, ExternalLink,
  Terminal, GitFork, Star, Eye
} from "lucide-react";

const TYPEWRITER_WORDS = [
  "> Analyzing architecture patterns...",
  "> Tracing data flows and dependencies...",
  "> Generating Mermaid.js diagrams...",
  "> Detecting security vulnerabilities...",
  "> Initializing AI codebase assistant...",
];

// Floating code snippets for background ambiance
const CODE_SNIPPETS = [
  "import { analyze }",
  "const graph = buildKG()",
  "export default App",
  "async function parse()",
  "interface RepoNode",
  "type Framework =",
  "useEffect(() => {})",
  "return <Component />",
];

export default function LandingPage() {
  const router = useRouter();
  const { setSession, setLoading, setError, setRepoUrl, isLoading, error } = useStore();
  const [url, setUrl] = useState("");
  const [wordIndex, setWordIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Mouse tracking for glow effect
  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouse);
    return () => window.removeEventListener("mousemove", handleMouse);
  }, []);

  // Typewriter effect
  useEffect(() => {
    const word = TYPEWRITER_WORDS[wordIndex];
    const timeout = setTimeout(() => {
      if (!isDeleting) {
        if (charIndex < word.length) {
          setCharIndex(charIndex + 1);
        } else {
          setTimeout(() => setIsDeleting(true), 1500);
        }
      } else {
        if (charIndex > 0) {
          setCharIndex(charIndex - 1);
        } else {
          setIsDeleting(false);
          setWordIndex((wordIndex + 1) % TYPEWRITER_WORDS.length);
        }
      }
    }, isDeleting ? 30 : 60);
    return () => clearTimeout(timeout);
  }, [charIndex, isDeleting, wordIndex]);

  const handleAnalyze = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setRepoUrl(url);

    try {
      const data = await analyzeRepo(url.trim());
      setSession(data);
      router.push("/analyze");
    } catch (err: any) {
      setError(err.message || "Failed to analyze repository");
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoading) handleAnalyze();
  };

  const features = [
    { icon: Network, title: "Architecture Detection", desc: "Automatically detect monolith, microservices, MVC, and more", color: "from-indigo-500 to-indigo-600", iconColor: "text-indigo-400", bgGlow: "group-hover:shadow-indigo-500/20" },
    { icon: Code2, title: "Code Intelligence", desc: "AST-powered parsing of functions, classes, imports, and exports", color: "from-cyan-500 to-cyan-600", iconColor: "text-cyan-400", bgGlow: "group-hover:shadow-cyan-500/20" },
    { icon: BarChart3, title: "Interactive Diagrams", desc: "Mermaid.js architecture, dependency, and data flow visualizations", color: "from-emerald-500 to-emerald-600", iconColor: "text-emerald-400", bgGlow: "group-hover:shadow-emerald-500/20" },
    { icon: MessageSquare, title: "AI Chat", desc: "Ask questions about the codebase with real code references", color: "from-amber-500 to-amber-600", iconColor: "text-amber-400", bgGlow: "group-hover:shadow-amber-500/20" },
    { icon: Route, title: "Code Tours", desc: "Guided walkthroughs of key modules and execution flows", color: "from-pink-500 to-pink-600", iconColor: "text-pink-400", bgGlow: "group-hover:shadow-pink-500/20" },
    { icon: Shield, title: "Security Analysis", desc: "Detect hardcoded secrets, insecure patterns, and vulnerabilities", color: "from-red-500 to-red-600", iconColor: "text-red-400", bgGlow: "group-hover:shadow-red-500/20" },
  ];

  const stats = [
    { label: "Frameworks Supported", value: "20+", icon: GitFork },
    { label: "Diagram Types", value: "3", icon: BarChart3 },
    { label: "Code Patterns", value: "15+", icon: Eye },
    { label: "Analysis Speed", value: "<30s", icon: Zap },
  ];

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: "#050508" }}>
      {/* ── Animated Background Layers ── */}

      {/* Grid pattern */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Radial gradient orbs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full" style={{ background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)", animation: "float 8s ease-in-out infinite" }} />
        <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full" style={{ background: "radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)", animation: "float 10s ease-in-out infinite reverse" }} />
        <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full" style={{ background: "radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)", animation: "float 12s ease-in-out infinite" }} />
      </div>

      {/* Mouse follow glow */}
      <div
        className="fixed pointer-events-none z-0 transition-all duration-300 ease-out"
        style={{
          left: mousePos.x - 200,
          top: mousePos.y - 200,
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)",
        }}
      />

      {/* Floating code snippets */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {CODE_SNIPPETS.map((snippet, i) => (
          <div
            key={i}
            className="absolute font-mono text-xs text-white/[0.04] whitespace-nowrap select-none"
            style={{
              left: `${10 + (i * 12) % 80}%`,
              top: `${5 + (i * 15) % 85}%`,
              animation: `float ${6 + i * 2}s ease-in-out infinite`,
              animationDelay: `${i * 0.8}s`,
            }}
          >
            {snippet}
          </div>
        ))}
      </div>

      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50" style={{ background: "rgba(5,5,8,0.6)", backdropFilter: "blur(20px) saturate(150%)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="max-w-7xl mx-auto px-6 h-[100px] flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-5">
            <div className="relative w-[80px] h-[80px] flex items-center justify-center flex-shrink-0">
              {/* Soft glow behind the logo */}
              <div className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle, rgba(6,182,212,0.4) 0%, transparent 60%)", filter: "blur(12px)" }} />
              <Image src="/neurorepo-log.png" alt="NeuroRepo" width={100} height={100} className="relative z-10 object-contain w-full h-full drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]" />
            </div>
            <div className="flex flex-col pt-1">
              <span className="text-2xl font-extrabold tracking-tight text-white leading-none mb-1.5" style={{ textShadow: "0 0 20px rgba(255,255,255,0.1)" }}>NeuroRepo</span>
              <span className="text-[11px] font-mono font-medium text-[#06b6d4] tracking-[0.2em]">CODEBASE INTELLIGENCE</span>
            </div>
          </div>

          {/* GitHub */}
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm text-[#8b949e] hover:text-white hover:bg-white/[0.04] transition-all duration-200"
          >
            <GitBranch className="w-4 h-4" />
            <span className="hidden sm:inline">GitHub</span>
          </a>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pt-32 pb-16 relative z-10">
        <div className="max-w-4xl w-full text-center" style={{ animation: "fadeIn 0.6s ease-out forwards" }}>
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-10"
            style={{
              background: "rgba(99,102,241,0.08)",
              border: "1px solid rgba(99,102,241,0.2)",
              color: "#a5b4fc",
              animation: "fadeIn 0.5s ease-out 0.1s forwards",
              opacity: 0,
            }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            AI-Powered Codebase Intelligence
          </div>

          {/* Headline */}
          <h1
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight mb-8 leading-[0.95]"
            style={{ animation: "fadeIn 0.6s ease-out 0.15s forwards", opacity: 0 }}
          >
            <span className="text-white">Understand Any</span>
            <br />
            <span className="text-gradient">Codebase Instantly</span>
          </h1>

          {/* Subtitle */}
          <p
            className="text-lg md:text-xl text-[#8b949e] mb-4 max-w-2xl mx-auto leading-relaxed"
            style={{ animation: "fadeIn 0.6s ease-out 0.25s forwards", opacity: 0 }}
          >
            Drop a GitHub URL. Get architecture maps, dependency graphs, AI-powered Q&A, and security scans — all in under 30 seconds.
          </p>

          {/* Typewriter */}
          <div
            className="mb-12 h-7 flex items-center justify-center"
            style={{ animation: "fadeIn 0.6s ease-out 0.35s forwards", opacity: 0 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md" style={{ background: "rgba(63,185,80,0.06)", border: "1px solid rgba(63,185,80,0.1)" }}>
              <Terminal className="w-3.5 h-3.5 text-[#3fb950]" />
              <span className="font-mono text-sm text-[#3fb950]">
                {TYPEWRITER_WORDS[wordIndex].slice(0, charIndex)}
              </span>
              <span className="inline-block w-[7px] h-[17px] bg-[#3fb950] animate-pulse rounded-sm" />
            </div>
          </div>

          {/* ── Terminal Input ── */}
          <div className="max-w-2xl mx-auto" style={{ animation: "fadeIn 0.6s ease-out 0.45s forwards", opacity: 0 }}>
            <div
              className="rounded-2xl overflow-hidden text-left"
              style={{
                background: "#0d1117",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 25px 60px -15px rgba(0,0,0,0.5), 0 0 40px rgba(99,102,241,0.07)",
              }}
            >
              {/* Terminal titlebar */}
              <div className="flex items-center px-4 py-3 relative" style={{ background: "#161b22", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                  <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
                  <div className="w-3 h-3 rounded-full bg-[#28c840]" />
                </div>
                <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-xs font-mono text-[#484f58]">
                  <Terminal className="w-3 h-3" />
                  neurorepo
                </div>
              </div>
              {/* Terminal body */}
              <div className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <span className="font-mono text-xs text-[#484f58]">$</span>
                  <span className="font-mono text-xs text-[#8b949e]">neurorepo analyze --repo</span>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch gap-3">
                  <div className="flex-1 flex items-center gap-3 rounded-lg px-4 py-3" style={{ background: "#010409", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <GitBranch className="w-4 h-4 text-[#484f58] flex-shrink-0" />
                    <input
                      id="repo-url-input"
                      type="text"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="https://github.com/owner/repo"
                      className="flex-1 bg-transparent text-[#e6edf3] placeholder-[#484f58] outline-none font-mono text-sm"
                      disabled={isLoading}
                      autoComplete="off"
                      spellCheck="false"
                    />
                  </div>
                  <button
                    id="analyze-button"
                    onClick={handleAnalyze}
                    disabled={isLoading || !url.trim()}
                    className="flex items-center justify-center gap-2.5 px-7 py-3 rounded-lg font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                    style={{
                      background: isLoading ? "#238636" : "linear-gradient(135deg, #238636, #2ea043)",
                      color: "white",
                      boxShadow: !isLoading && url.trim() ? "0 0 20px rgba(35,134,54,0.3)" : "none",
                    }}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        Analyze
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mt-4 flex items-center justify-center gap-2 text-red-400 text-sm font-mono">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            {/* Quick Examples */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <span className="text-xs text-[#484f58] mr-1">Try:</span>
              {[
                "facebook/react",
                "vercel/next.js",
                "expressjs/express",
                "tailwindlabs/tailwindcss",
              ].map((repo) => (
                <button
                  key={repo}
                  onClick={() => setUrl(`https://github.com/${repo}`)}
                  className="group px-3 py-1 rounded-md text-xs font-mono transition-all duration-200"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    color: "#8b949e",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(99,102,241,0.3)";
                    e.currentTarget.style.color = "#a5b4fc";
                    e.currentTarget.style.background = "rgba(99,102,241,0.06)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                    e.currentTarget.style.color = "#8b949e";
                    e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                  }}
                >
                  {repo}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Stats Bar ── */}
        <div
          className="max-w-3xl w-full mt-20 grid grid-cols-2 sm:grid-cols-4 gap-4"
          style={{ animation: "fadeIn 0.6s ease-out 0.55s forwards", opacity: 0 }}
        >
          {stats.map((stat) => (
            <div key={stat.label} className="text-center px-4 py-5 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
              <stat.icon className="w-4 h-4 text-indigo-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white font-mono">{stat.value}</div>
              <div className="text-[11px] text-[#484f58] mt-1 uppercase tracking-wider">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* ── Features Grid ── */}
        <div className="max-w-6xl w-full mt-24">
          <div className="text-center mb-12" style={{ animation: "fadeIn 0.6s ease-out 0.6s forwards", opacity: 0 }}>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Everything You Need</h2>
            <p className="text-[#8b949e] text-base">Powerful analysis tools — zero configuration required.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className={`group relative rounded-xl p-6 transition-all duration-300 cursor-default ${feature.bgGlow}`}
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  animation: `fadeIn 0.5s ease-out ${0.65 + i * 0.08}s forwards`,
                  opacity: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                  e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                  e.currentTarget.style.boxShadow = "0 8px 30px -10px rgba(0,0,0,0.5)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                  e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {/* Icon with gradient bg */}
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4`} style={{ opacity: 0.9 }}>
                  <feature.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-[15px] font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-[#8b949e] leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Bottom Section ── */}
        <div className="mt-28 text-center" style={{ animation: "fadeIn 0.6s ease-out 1.2s forwards", opacity: 0 }}>
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm text-[#8b949e]">
              Paste any public GitHub URL to get started — no account required
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
