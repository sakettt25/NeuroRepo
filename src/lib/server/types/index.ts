// NeuroRepo Backend — TypeScript Type Definitions

// ─── Repository Types ────────────────────────────────────

export interface RepoMetadata {
  owner: string;
  name: string;
  fullName: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  defaultBranch: string;
  url: string;
  createdAt: string;
  updatedAt: string;
}

export interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
  size?: number;
  language?: string;
}

export interface FileContent {
  path: string;
  content: string;
  language: string;
  size: number;
  encoding: string;
}

// ─── Parsing Types ───────────────────────────────────────

export interface ParsedFile {
  path: string;
  language: string;
  functions: FunctionInfo[];
  classes: ClassInfo[];
  imports: ImportInfo[];
  exports: ExportInfo[];
  loc: number;
  complexity: number;
}

export interface FunctionInfo {
  name: string;
  params: string[];
  startLine: number;
  endLine: number;
  isAsync: boolean;
  isExported: boolean;
}

export interface ClassInfo {
  name: string;
  methods: string[];
  properties: string[];
  startLine: number;
  endLine: number;
  isExported: boolean;
  extends?: string;
  implements?: string[];
}

export interface ImportInfo {
  source: string;
  specifiers: string[];
  isDefault: boolean;
  isNamespace: boolean;
  line: number;
}

export interface ExportInfo {
  name: string;
  type: "function" | "class" | "variable" | "default" | "re-export";
  line: number;
}

// ─── Knowledge Graph Types ───────────────────────────────

export interface GraphNode {
  id: string;
  label: string;
  type: "file" | "function" | "class" | "module" | "route";
  filePath: string;
  metadata?: Record<string, any>;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: "imports" | "calls" | "extends" | "implements" | "exports";
  label?: string;
}

export interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// ─── Analysis Types ──────────────────────────────────────

export interface AnalysisResult {
  summary: string;
  primaryLanguage: string;
  languages: LanguageStat[];
  framework: string;
  frameworkVersion?: string;
  architectureType: string;
  designPatterns: string[];
  complexityScore: number;
  keyModules: KeyModule[];
  entryPoints: string[];
  totalFiles: number;
  totalLOC: number;
  techStack: string[];
  securityFindings: SecurityFinding[];
  circularDeps: string[][];
  deadCode: string[];
}

export interface LanguageStat {
  name: string;
  percentage: number;
  fileCount: number;
}

export interface KeyModule {
  name: string;
  path: string;
  description: string;
  importance: "critical" | "high" | "medium" | "low";
  dependencies: number;
  dependents: number;
}

export interface SecurityFinding {
  type: string;
  severity: "critical" | "high" | "medium" | "low";
  file: string;
  line?: number;
  description: string;
}

// ─── Diagram Types ───────────────────────────────────────

export interface DiagramSet {
  architecture: string;
  dependencies: string;
  dataFlow: string;
}

// ─── Sandbox Types ───────────────────────────────────────

export interface SandboxUrls {
  githubDev: string;
  stackblitz: string | null;
  codesandbox: string | null;
  recommended: "githubDev" | "stackblitz" | "codesandbox";
  projectType: string;
}

// ─── Code Tour Types ─────────────────────────────────────

export interface TourStep {
  title: string;
  description: string;
  filePath: string;
  lineStart?: number;
  lineEnd?: number;
  order: number;
}

// ─── Chat Types ──────────────────────────────────────────

export interface ChatRequest {
  message: string;
  conversationId?: string;
}

export interface ChatResponse {
  response: string;
  references: FileReference[];
  reasoning?: string;
}

export interface FileReference {
  filePath: string;
  functionName?: string;
  lineStart?: number;
  lineEnd?: number;
}

// ─── Session Types ───────────────────────────────────────

export interface AnalysisSession {
  id: string;
  repoUrl: string;
  repo: RepoMetadata;
  fileTree: FileNode[];
  files: Map<string, FileContent>;
  parsedFiles: Map<string, ParsedFile>;
  graph: KnowledgeGraph;
  analysis: AnalysisResult;
  diagrams: DiagramSet;
  sandboxUrls: SandboxUrls;
  tour: TourStep[];
  createdAt: Date;
}

// ─── API Response Types ──────────────────────────────────

export interface AnalyzeResponse {
  id: string;
  repo: RepoMetadata;
  analysis: AnalysisResult;
  fileTree: FileNode[];
  diagrams: DiagramSet;
  sandboxUrls: SandboxUrls;
  tour: TourStep[];
}

// ─── Data Store Interface ────────────────────────────────

export interface IDataStore {
  saveSession(session: AnalysisSession): Promise<void>;
  getSession(id: string): Promise<AnalysisSession | null>;
  deleteSession(id: string): Promise<void>;
  listSessions(): Promise<{ id: string; repoUrl: string; createdAt: Date }[]>;
}
