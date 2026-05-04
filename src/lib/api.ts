const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface AnalyzeResponse {
  id: string;
  repo: RepoMetadata;
  analysis: AnalysisResult;
  fileTree: FileNode[];
  diagrams: DiagramSet;
  sandboxUrls: SandboxUrls;
  tour: TourStep[];
}

export interface RepoMetadata {
  owner: string; name: string; fullName: string; description: string;
  language: string; stars: number; forks: number; defaultBranch: string;
  url: string; createdAt: string; updatedAt: string;
}

export interface AnalysisResult {
  summary?: string;
  primaryLanguage: string;
  languages: { name: string; percentage: number; fileCount: number }[];
  framework: string; frameworkVersion?: string; architectureType: string;
  designPatterns: string[]; complexityScore: number;
  keyModules: { name: string; path: string; description: string; importance: string; dependencies: number; dependents: number }[];
  entryPoints: string[]; totalFiles: number; totalLOC: number;
  techStack: string[];
  securityFindings: { type: string; severity: string; file: string; description: string }[];
  circularDeps: string[][]; deadCode: string[];
}

export interface FileNode {
  name: string; path: string; type: "file" | "directory";
  children?: FileNode[]; size?: number; language?: string;
}

export interface FileContent {
  path: string; content: string; language: string; size: number;
}

export interface DiagramSet {
  architecture: string; dependencies: string; dataFlow: string;
}

export interface SandboxUrls {
  githubDev: string; stackblitz: string | null; codesandbox: string | null;
  recommended: string; projectType: string;
}

export interface TourStep {
  title: string; description: string; filePath: string;
  lineStart?: number; lineEnd?: number; order: number;
}

export interface ChatResponse {
  response: string;
  references: { filePath: string; functionName?: string; lineStart?: number }[];
  reasoning?: string;
}

export async function analyzeRepo(repoUrl: string): Promise<AnalyzeResponse> {
  const res = await fetch(`${API_BASE}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repoUrl }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Analysis failed" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function getFileContent(sessionId: string, path: string): Promise<FileContent> {
  const res = await fetch(`${API_BASE}/api/repo/${sessionId}/file?path=${encodeURIComponent(path)}`);
  if (!res.ok) throw new Error("File not found");
  return res.json();
}

export async function sendChatMessage(sessionId: string, message: string): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/api/repo/${sessionId}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) throw new Error("Chat failed");
  return res.json();
}

export async function getDiagrams(sessionId: string): Promise<DiagramSet> {
  const res = await fetch(`${API_BASE}/api/repo/${sessionId}/diagrams`);
  if (!res.ok) throw new Error("Diagrams not found");
  return res.json();
}
