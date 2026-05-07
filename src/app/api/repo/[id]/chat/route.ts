import { NextResponse } from "next/server";
import { dataStore } from "@/lib/server/store";
import { AnalysisSession } from "@/lib/server/types";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await dataStore.getSession(id);
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    const { message } = await req.json();
    if (!message) return NextResponse.json({ error: "message is required" }, { status: 400 });

    const response = generateRuleBasedAnswer(message, session);
    return NextResponse.json(response);
  } catch (err: any) {
    console.error("Chat API Error:", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}

function generateRuleBasedAnswer(question: string, session: AnalysisSession) {
  const q = question.toLowerCase();
  const { analysis, parsedFiles, graph } = session;
  const refs: { filePath: string; functionName?: string; lineStart?: number }[] = [];

  let response = "";

  if (q.includes("tech stack") || q.includes("technology") || q.includes("built with")) {
    response = `## Tech Stack\n\nThis project uses **${analysis.framework}** as its primary framework.\n\n**Technologies detected:**\n${analysis.techStack.map(t => `- ${t}`).join("\n")}\n\n**Primary language:** ${analysis.primaryLanguage}\n**Architecture:** ${analysis.architectureType}`;
  } else if (q.includes("architecture") || q.includes("structure") || q.includes("organized")) {
    response = `## Architecture\n\nThis is a **${analysis.architectureType}** architecture.\n\n**Design patterns:** ${analysis.designPatterns.join(", ") || "None detected"}\n\n**Key modules:**\n${analysis.keyModules.slice(0, 5).map(m => `- **${m.name}** (${m.path}): ${m.description}`).join("\n")}`;
    analysis.keyModules.slice(0, 3).forEach(m => refs.push({ filePath: m.path }));
  } else if (q.includes("entry") || q.includes("start") || q.includes("main")) {
    response = `## Entry Points\n\n${analysis.entryPoints.map(e => `- \`${e}\``).join("\n")}`;
    analysis.entryPoints.slice(0, 3).forEach(e => refs.push({ filePath: e }));
  } else if (q.includes("function") || q.includes("method")) {
    const allFns: { name: string; path: string; line: number }[] = [];
    for (const [path, parsed] of parsedFiles) {
      for (const fn of parsed.functions) {
        allFns.push({ name: fn.name, path, line: fn.startLine });
      }
    }
    response = `## Functions\n\nFound **${allFns.length}** functions across ${parsedFiles.size} files.\n\n**Most notable:**\n${allFns.slice(0, 10).map(f => `- \`${f.name}\` in \`${f.path}\` (line ${f.line})`).join("\n")}`;
    allFns.slice(0, 3).forEach(f => refs.push({ filePath: f.path, functionName: f.name, lineStart: f.line }));
  } else if (q.includes("import") || q.includes("depend")) {
    const depCount = graph.edges.filter(e => e.type === "imports").length;
    response = `## Dependencies\n\n**${depCount}** import relationships found.\n\n**Circular dependencies:** ${analysis.circularDeps.length > 0 ? analysis.circularDeps.map(c => c.join(" → ")).join("\n") : "None detected ✅"}`;
  } else if (q.includes("complexity") || q.includes("complex")) {
    response = `## Complexity Analysis\n\n**Overall complexity score:** ${analysis.complexityScore}/100\n**Total files:** ${analysis.totalFiles}\n**Total lines of code:** ${analysis.totalLOC.toLocaleString()}\n\n${analysis.complexityScore < 30 ? "The codebase has **low complexity** — well-organized and maintainable." : analysis.complexityScore < 60 ? "The codebase has **moderate complexity** — generally manageable but some areas could benefit from refactoring." : "The codebase has **high complexity** — consider breaking down large modules."}`;
  } else if (q.includes("security") || q.includes("vulnerab")) {
    if (analysis.securityFindings && analysis.securityFindings.length > 0) {
      response = `## Security Findings\n\n${analysis.securityFindings.map(f => `- **${f.severity?.toUpperCase() || 'UNKNOWN'}**: ${f.type} in \`${f.file}\`${f.line ? ` (line ${f.line})` : ''} — ${f.description}`).join("\n")}`;
      analysis.securityFindings.slice(0, 5).forEach(f => refs.push({ filePath: f.file, lineStart: f.line }));
    } else {
      response = "## Security\n\nNo immediate security issues detected in the codebase. ✅\n\n*Note: This is a basic static analysis. For thorough security auditing, consider using dedicated tools like Snyk or SonarQube.*";
    }
  } else {
    // General question - try to find relevant files
    const keywords = q.split(/\s+/).filter(w => w.length > 3);
    const relevantFiles: string[] = [];
    for (const path of parsedFiles.keys()) {
      if (keywords.some(k => path.toLowerCase().includes(k))) {
        relevantFiles.push(path);
      }
    }

    if (relevantFiles.length > 0) {
      response = `I found some files that might be relevant to your question:\n\n${relevantFiles.slice(0, 5).map(f => `- \`${f}\``).join("\n")}\n\n*For deeper AI-powered analysis, Phase 2 will add RAG-based Q&A with GPT-4o.*`;
      relevantFiles.slice(0, 3).forEach(f => refs.push({ filePath: f }));
    } else {
      response = `Here's what I know about this repository:\n\n- **Framework:** ${analysis.framework}\n- **Architecture:** ${analysis.architectureType}\n- **Files:** ${analysis.totalFiles}\n- **LOC:** ${analysis.totalLOC.toLocaleString()}\n\nTry asking about: tech stack, architecture, entry points, functions, dependencies, complexity, or security.`;
    }
  }

  return { response, references: refs, reasoning: "Rule-based analysis (Phase 1)" };
}
