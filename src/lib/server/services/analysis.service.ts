// Analysis Service — framework detection, architecture analysis, complexity scoring
import { FileNode, ParsedFile, AnalysisResult, KnowledgeGraph, KeyModule, TourStep } from "../types";
import { detectProjectInfo, detectArchitecture } from "../utils/detector";
import { findCircularDeps, findDeadExports } from "./graph.service";
import { isConfigFile } from "../utils/filters";

export function analyzeRepository(
  fileTree: FileNode[],
  parsedFiles: Map<string, ParsedFile>,
  graph: KnowledgeGraph,
  files: Map<string, import("../types").FileContent>,
  packageJson?: any,
  repoDescription?: string,
  readmeContent?: string
): AnalysisResult {
  // Collect config file names
  const configFiles = collectConfigFiles(fileTree);

  // Detect project info
  const projectInfo = detectProjectInfo(fileTree, packageJson, configFiles);

  // Detect architecture
  const arch = detectArchitecture(fileTree, projectInfo.framework, projectInfo.projectType);

  // Calculate overall complexity
  const complexityScore = calculateComplexityScore(parsedFiles);

  // Find key modules
  const keyModules = identifyKeyModules(graph, parsedFiles);

  // Find entry points
  const entryPoints = findEntryPoints(parsedFiles, projectInfo.framework);

  // Count totals
  let totalLOC = 0;
  for (const parsed of parsedFiles.values()) totalLOC += parsed.loc;

  // Circular deps
  const circularDeps = findCircularDeps(graph);

  // Dead code
  const deadCode = findDeadExports(graph, parsedFiles);

  // Basic security scan
  const securityFindings = scanSecurity(files);

  // Generate project summary
  let goalDesc = "";
  let readmeSummary = readmeContent ? extractReadmeSummary(readmeContent) : null;

  if (readmeSummary) {
    goalDesc = ` According to its documentation, the project's goal is: "${readmeSummary}"`;
  } else if (repoDescription) {
    goalDesc = ` The primary goal of this project is: "${repoDescription}".`;
  } else if (packageJson && packageJson.description) {
    goalDesc = ` The primary goal of this project is: "${packageJson.description}".`;
  }

  const techString = projectInfo.techStack.length > 0 ? ` It utilizes key technologies like ${projectInfo.techStack.slice(0, 3).join(", ")}.` : "";
  const complexityDesc = complexityScore < 30 ? "It is relatively straightforward and maintainable" : complexityScore < 60 ? "It is moderately complex" : "It is highly complex";
  const summary = `This codebase is a ${projectInfo.primaryLanguage} project built on ${projectInfo.framework}.${goalDesc} ${arch.description} The project consists of ${parsedFiles.size} files and approximately ${totalLOC.toLocaleString()} lines of code.${techString} ${complexityDesc}.`;

  return {
    summary,
    primaryLanguage: projectInfo.primaryLanguage,
    languages: projectInfo.languages,
    framework: projectInfo.framework,
    frameworkVersion: projectInfo.frameworkVersion,
    architectureType: arch.type,
    designPatterns: arch.patterns,
    complexityScore,
    keyModules,
    entryPoints,
    totalFiles: parsedFiles.size,
    totalLOC: totalLOC,
    techStack: projectInfo.techStack,
    securityFindings,
    circularDeps,
    deadCode,
  };
}

function collectConfigFiles(nodes: FileNode[]): string[] {
  const configs: string[] = [];
  function walk(ns: FileNode[]) {
    for (const n of ns) {
      if (n.type === "file" && isConfigFile(n.name)) configs.push(n.name);
      if (n.children) walk(n.children);
    }
  }
  walk(nodes);
  return configs;
}

function extractReadmeSummary(readme: string): string | null {
  const lines = readme.split('\n');
  for (let line of lines) {
    line = line.trim();
    // Skip empty lines, headings, badges/images, html tags, blockquotes, and lists
    if (!line || line.startsWith('#') || line.startsWith('!') || line.startsWith('<') || line.startsWith('[') || line.startsWith('>') || line.startsWith('-') || line.startsWith('*')) {
      continue;
    }
    // Found the first valid text paragraph
    let summary = line;
    if (summary.length > 250) {
      summary = summary.substring(0, 247) + "...";
    }
    // Remove markdown bold/italic artifacts if any
    summary = summary.replace(/(\*\*|__|\*|_)/g, '');
    return summary;
  }
  return null;
}

function calculateComplexityScore(parsedFiles: Map<string, ParsedFile>): number {
  if (parsedFiles.size === 0) return 0;
  let totalComplexity = 0;
  let totalFunctions = 0;
  for (const parsed of parsedFiles.values()) {
    totalComplexity += parsed.complexity;
    totalFunctions += parsed.functions.length;
  }
  // Normalize: low=0-30, medium=30-60, high=60-100
  const avgComplexity = totalComplexity / parsedFiles.size;
  const fileFactor = Math.min(parsedFiles.size / 100, 1) * 30;
  const complexityFactor = Math.min(avgComplexity / 50, 1) * 40;
  const functionFactor = Math.min(totalFunctions / 200, 1) * 30;
  return Math.round(fileFactor + complexityFactor + functionFactor);
}

function identifyKeyModules(graph: KnowledgeGraph, parsedFiles: Map<string, ParsedFile>): KeyModule[] {
  // Count how many files import each file
  const dependents = new Map<string, number>();
  const dependencies = new Map<string, number>();

  for (const edge of graph.edges) {
    if (edge.type === "imports") {
      const target = edge.target.replace("file:", "");
      const source = edge.source.replace("file:", "");
      dependents.set(target, (dependents.get(target) || 0) + 1);
      dependencies.set(source, (dependencies.get(source) || 0) + 1);
    }
  }

  // Score files by importance
  const scored = [...parsedFiles.entries()].map(([path, parsed]) => {
    const deps = dependencies.get(path) || 0;
    const depnts = dependents.get(path) || 0;
    const score = depnts * 3 + deps + parsed.exports.length * 2 + (parsed.functions.length > 5 ? 5 : 0);
    return { path, parsed, deps, depnts, score };
  }).sort((a, b) => b.score - a.score);

  return scored.slice(0, 10).map(s => {
    const name = s.path.split("/").pop() || s.path;
    let description = `${s.parsed.functions.length} functions, ${s.parsed.classes.length} classes`;
    if (s.parsed.exports.length > 0) description += `, ${s.parsed.exports.length} exports`;
    const importance = s.depnts >= 5 ? "critical" as const : s.depnts >= 3 ? "high" as const : s.depnts >= 1 ? "medium" as const : "low" as const;
    return { name, path: s.path, description, importance, dependencies: s.deps, dependents: s.depnts };
  });
}

function findEntryPoints(parsedFiles: Map<string, ParsedFile>, framework: string): string[] {
  const entries: string[] = [];
  const entryPatterns = ["index.ts", "index.js", "main.ts", "main.js", "app.ts", "app.js", "server.ts", "server.js", "page.tsx", "page.jsx", "layout.tsx"];

  for (const path of parsedFiles.keys()) {
    const filename = path.split("/").pop() || "";
    if (entryPatterns.includes(filename)) entries.push(path);
  }

  // Framework-specific
  if (framework.includes("Next")) {
    for (const path of parsedFiles.keys()) {
      if (path.includes("app/") && (path.endsWith("page.tsx") || path.endsWith("layout.tsx"))) {
        if (!entries.includes(path)) entries.push(path);
      }
    }
  }

  return entries.slice(0, 10);
}

function scanSecurity(files: Map<string, import("../types").FileContent>): { type: string; severity: "critical" | "high" | "medium" | "low"; file: string; line?: number; description: string }[] {
  const findings: any[] = [];
  const patterns = [
    { regex: /['"](?:sk|pk|api[_-]?key|secret)[_-]?\w*['"]\s*[:=]\s*['"][A-Za-z0-9+/=_-]{20,}['"]/gi, type: "Hardcoded Secret", severity: "critical" as const, desc: "Potential hardcoded API key or secret" },
    { regex: /password\s*[:=]\s*['"][^'"]+['"]/gi, type: "Hardcoded Password", severity: "critical" as const, desc: "Hardcoded password detected" },
    { regex: /eval\s*\(/g, type: "Eval Usage", severity: "high" as const, desc: "Use of eval() is a security risk" },
    { regex: /innerHTML\s*=/g, type: "innerHTML Assignment", severity: "medium" as const, desc: "Direct innerHTML assignment may lead to XSS" },
    { regex: /dangerouslySetInnerHTML/g, type: "Dangerous HTML", severity: "medium" as const, desc: "dangerouslySetInnerHTML usage detected" },
    { regex: /crypto\.createHash\(['"]md5['"]\)/g, type: "Weak Cryptography", severity: "medium" as const, desc: "MD5 is a weak hashing algorithm" },
    { regex: /Math\.random\(\)/g, type: "Insecure Randomness", severity: "low" as const, desc: "Math.random() is not cryptographically secure" },
  ];

  for (const [path, file] of files) {
    // Only scan code files
    if (!["javascript", "typescript", "python"].includes(file.language)) continue;
    
    for (const pattern of patterns) {
      // Reset lastIndex for global regexes
      pattern.regex.lastIndex = 0;
      let match;
      while ((match = pattern.regex.exec(file.content)) !== null) {
        // Calculate line number
        const line = file.content.substring(0, match.index).split("\n").length;
        findings.push({
          type: pattern.type,
          severity: pattern.severity,
          file: path,
          line,
          description: pattern.desc
        });
      }
    }
  }

  // Limit findings to top 20 to avoid massive payloads
  return findings.slice(0, 20);
}

/**
 * Generate a code tour from analysis results
 */
export function generateCodeTour(
  analysis: AnalysisResult,
  parsedFiles: Map<string, ParsedFile>,
  graph: KnowledgeGraph
): TourStep[] {
  const steps: TourStep[] = [];
  let order = 0;

  // Step 1: Project overview via main entry point
  const mainEntry = analysis.entryPoints[0];
  if (mainEntry) {
    steps.push({
      title: "🏠 Entry Point",
      description: `This is the main entry point of the ${analysis.framework} application. The project is a ${analysis.architectureType} with ${analysis.totalFiles} files and ${analysis.totalLOC} lines of code.`,
      filePath: mainEntry,
      order: order++,
    });
  }

  // Step 2: Configuration
  const configFiles = [...parsedFiles.keys()].filter(p => p.includes("config") || p.endsWith("package.json"));
  if (configFiles[0]) {
    steps.push({
      title: "⚙️ Configuration",
      description: `Project configuration and dependencies. Tech stack: ${analysis.techStack.join(", ")}.`,
      filePath: configFiles[0],
      order: order++,
    });
  }

  // Step 3-N: Key modules
  for (const mod of analysis.keyModules.slice(0, 5)) {
    const parsed = parsedFiles.get(mod.path);
    steps.push({
      title: `📦 ${mod.name}`,
      description: `${mod.description}. This module is ${mod.importance} importance with ${mod.dependents} dependents.`,
      filePath: mod.path,
      lineStart: parsed?.functions[0]?.startLine,
      order: order++,
    });
  }

  // API/Routes
  const routeFiles = [...parsedFiles.keys()].filter(p => p.includes("route") || p.includes("api/") || p.includes("controller"));
  if (routeFiles[0]) {
    steps.push({
      title: "🔗 API Routes",
      description: "API endpoints and route handlers that define the application's interface.",
      filePath: routeFiles[0],
      order: order++,
    });
  }

  return steps;
}
