// Diagram Generator — produces Mermaid.js syntax from knowledge graph + analysis
import { KnowledgeGraph, AnalysisResult, ParsedFile, DiagramSet } from "../types";

export function generateDiagrams(
  graph: KnowledgeGraph,
  analysis: AnalysisResult,
  parsedFiles: Map<string, ParsedFile>
): DiagramSet {
  return {
    architecture: generateArchitectureDiagram(graph, analysis),
    dependencies: generateDependencyDiagram(graph),
    dataFlow: generateDataFlowDiagram(graph, analysis, parsedFiles),
  };
}

function generateArchitectureDiagram(graph: KnowledgeGraph, analysis: AnalysisResult): string {
  const lines: string[] = ["graph TB"];

  // Group files by directory (top-level)
  const groups = new Map<string, string[]>();
  const fileNodes = graph.nodes.filter(n => n.type === "file");

  for (const node of fileNodes) {
    const parts = node.filePath.split("/");
    const group = parts.length > 1 ? parts[0] : "root";
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push(node.filePath);
  }

  // Create subgraphs for each directory
  let subIdx = 0;
  for (const [group, files] of groups) {
    if (files.length === 0) continue;
    const safeGroup = sanitizeId(group);
    lines.push(`  subgraph ${safeGroup}["${group}"]`);
    for (const file of files.slice(0, 10)) { // Limit per group
      const id = sanitizeId(file);
      const label = file.split("/").pop() || file;
      lines.push(`    ${id}["${label}"]`);
    }
    if (files.length > 10) {
      lines.push(`    ${safeGroup}_more["... +${files.length - 10} more"]`);
    }
    lines.push("  end");
    subIdx++;
  }

  // Add key edges (only between groups)
  const addedEdges = new Set<string>();
  for (const edge of graph.edges) {
    if (edge.type !== "imports") continue;
    const srcFile = edge.source.replace("file:", "");
    const tgtFile = edge.target.replace("file:", "");
    const srcGroup = srcFile.split("/")[0];
    const tgtGroup = tgtFile.split("/")[0];
    if (srcGroup !== tgtGroup) {
      const edgeKey = `${srcGroup}->${tgtGroup}`;
      if (!addedEdges.has(edgeKey)) {
        addedEdges.add(edgeKey);
        lines.push(`  ${sanitizeId(srcGroup)} --> ${sanitizeId(tgtGroup)}`);
      }
    }
  }

  // Style
  lines.push("");
  lines.push("  classDef default fill:#1a1a2e,stroke:#6366f1,stroke-width:1px,color:#e2e8f0");

  return lines.join("\n");
}

function generateDependencyDiagram(graph: KnowledgeGraph): string {
  const lines: string[] = ["graph LR"];

  // Only show file-level import edges
  const fileEdges = graph.edges.filter(e => e.type === "imports" && e.source.startsWith("file:") && e.target.startsWith("file:"));

  // Limit to most connected files
  const connectivity = new Map<string, number>();
  for (const edge of fileEdges) {
    connectivity.set(edge.source, (connectivity.get(edge.source) || 0) + 1);
    connectivity.set(edge.target, (connectivity.get(edge.target) || 0) + 1);
  }

  const topFiles = [...connectivity.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(e => e[0]);
  const topSet = new Set(topFiles);

  // Add nodes
  for (const fileId of topFiles) {
    const filePath = fileId.replace("file:", "");
    const id = sanitizeId(filePath);
    const label = filePath.split("/").pop() || filePath;
    lines.push(`  ${id}["${label}"]`);
  }

  // Add edges
  for (const edge of fileEdges) {
    if (topSet.has(edge.source) && topSet.has(edge.target)) {
      const srcId = sanitizeId(edge.source.replace("file:", ""));
      const tgtId = sanitizeId(edge.target.replace("file:", ""));
      const label = edge.label ? `|"${truncate(edge.label, 20)}"|` : "";
      lines.push(`  ${srcId} -->${label} ${tgtId}`);
    }
  }

  lines.push("");
  lines.push("  classDef default fill:#1a1a2e,stroke:#06b6d4,stroke-width:1px,color:#e2e8f0");

  return lines.join("\n");
}

function generateDataFlowDiagram(
  graph: KnowledgeGraph,
  analysis: AnalysisResult,
  parsedFiles: Map<string, ParsedFile>
): string {
  const lines: string[] = ["graph TD"];

  // Find entry points and API routes
  const entryFiles = [...parsedFiles.entries()].filter(([path]) => {
    return path.includes("route") || path.includes("api/") || path.includes("controller") ||
      path.includes("handler") || path.includes("page") || path.includes("index.");
  });

  // Categorize files
  const categories = {
    ui: [] as string[],
    api: [] as string[],
    service: [] as string[],
    data: [] as string[],
    config: [] as string[],
  };

  for (const [path] of parsedFiles) {
    if (path.includes("component") || path.includes("page") || path.includes("view") || path.includes("layout")) {
      categories.ui.push(path);
    } else if (path.includes("route") || path.includes("api/") || path.includes("controller") || path.includes("handler")) {
      categories.api.push(path);
    } else if (path.includes("service") || path.includes("lib/") || path.includes("utils/") || path.includes("helper")) {
      categories.service.push(path);
    } else if (path.includes("model") || path.includes("schema") || path.includes("db") || path.includes("migration")) {
      categories.data.push(path);
    } else {
      categories.config.push(path);
    }
  }

  // Build flow diagram
  if (categories.ui.length > 0) {
    lines.push('  subgraph UI["🖥️ UI Layer"]');
    for (const f of categories.ui.slice(0, 5)) {
      lines.push(`    ${sanitizeId(f)}["${f.split("/").pop()}"]`);
    }
    lines.push("  end");
  }

  if (categories.api.length > 0) {
    lines.push('  subgraph API["⚡ API Layer"]');
    for (const f of categories.api.slice(0, 5)) {
      lines.push(`    ${sanitizeId(f)}["${f.split("/").pop()}"]`);
    }
    lines.push("  end");
  }

  if (categories.service.length > 0) {
    lines.push('  subgraph SVC["🔧 Service Layer"]');
    for (const f of categories.service.slice(0, 5)) {
      lines.push(`    ${sanitizeId(f)}["${f.split("/").pop()}"]`);
    }
    lines.push("  end");
  }

  if (categories.data.length > 0) {
    lines.push('  subgraph DATA["💾 Data Layer"]');
    for (const f of categories.data.slice(0, 5)) {
      lines.push(`    ${sanitizeId(f)}["${f.split("/").pop()}"]`);
    }
    lines.push("  end");
  }

  // Add flow arrows between layers
  if (categories.ui.length > 0 && categories.api.length > 0) lines.push("  UI --> API");
  if (categories.api.length > 0 && categories.service.length > 0) lines.push("  API --> SVC");
  if (categories.service.length > 0 && categories.data.length > 0) lines.push("  SVC --> DATA");
  if (categories.api.length > 0 && categories.data.length > 0 && categories.service.length === 0) lines.push("  API --> DATA");

  lines.push("");
  lines.push("  classDef default fill:#1a1a2e,stroke:#10b981,stroke-width:1px,color:#e2e8f0");

  return lines.join("\n");
}

function sanitizeId(str: string): string {
  return str.replace(/[^a-zA-Z0-9]/g, "_").replace(/^_+/, "f_");
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + "..." : str;
}
