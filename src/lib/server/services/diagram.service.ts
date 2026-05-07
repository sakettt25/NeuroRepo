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
    lines.push(`  subgraph ${safeGroup}["📁 ${group}"]`);
    for (const file of files.slice(0, 10)) { // Limit per group
      const id = sanitizeId(file);
      const label = file.split("/").pop() || file;
      lines.push(`    ${id}["📄 ${label}"]`);
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
    
    let srcFile = "";
    let tgtFile = "";
    
    if (edge.source.startsWith("file:")) srcFile = edge.source.replace("file:", "");
    else continue;
    
    if (edge.target.startsWith("file:")) tgtFile = edge.target.replace("file:", "");
    else continue;
    
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
  lines.push("  classDef default fill:#1e1e2f,stroke:#6366f1,stroke-width:2px,color:#e2e8f0,rx:8,ry:8");
  lines.push("  classDef cluster fill:#0f172a,stroke:#475569,stroke-width:2px,color:#94a3b8,rx:10,ry:10");

  return lines.join("\n");
}

function generateDependencyDiagram(graph: KnowledgeGraph): string {
  const lines: string[] = ["graph LR"];

  // Show both internal file dependencies and external package dependencies
  const depEdges = graph.edges.filter(e => e.type === "imports" && e.source.startsWith("file:"));

  // Limit to most connected files/packages
  const connectivity = new Map<string, number>();
  for (const edge of depEdges) {
    connectivity.set(edge.source, (connectivity.get(edge.source) || 0) + 1);
    connectivity.set(edge.target, (connectivity.get(edge.target) || 0) + 1);
  }

  const topNodes = [...connectivity.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30) // Increased limit for better coverage
    .map(e => e[0]);
  const topSet = new Set(topNodes);

  if (topNodes.length === 0) {
    return `graph LR\n  empty["No dependencies found"]\n  style empty fill:#1e1e2f,stroke:#f43f5e,stroke-width:2px,color:#fff,rx:8,ry:8`;
  }

  // Add nodes with appropriate styling based on type
  const packageNodes: string[] = [];
  const fileNodes: string[] = [];

  for (const nodeId of topNodes) {
    if (nodeId.startsWith("package:")) {
      const label = nodeId.replace("package:", "");
      const id = sanitizeId(nodeId);
      lines.push(`  ${id}(["📦 ${label}"])`);
      packageNodes.push(id);
    } else {
      const filePath = nodeId.replace("file:", "");
      const label = filePath.split("/").pop() || filePath;
      const id = sanitizeId(nodeId);
      lines.push(`  ${id}["📄 ${label}"]`);
      fileNodes.push(id);
    }
  }

  // Add edges
  for (const edge of depEdges) {
    if (topSet.has(edge.source) && topSet.has(edge.target)) {
      const srcId = sanitizeId(edge.source);
      const tgtId = sanitizeId(edge.target);
      const label = edge.label ? `|"${truncate(edge.label, 20)}"|` : "";
      lines.push(`  ${srcId} -->${label} ${tgtId}`);
    }
  }

  lines.push("");
  lines.push("  classDef default fill:#1e1e2f,stroke:#0ea5e9,stroke-width:2px,color:#e2e8f0,rx:8,ry:8");
  lines.push("  classDef package fill:#2e1065,stroke:#a855f7,stroke-width:2px,color:#e9d5ff,rx:12,ry:12");
  
  if (packageNodes.length > 0) {
    lines.push(`  class ${packageNodes.join(",")} package`);
  }

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

  let layerCount = 0;

  // Build flow diagram
  if (categories.ui.length > 0) {
    lines.push('  subgraph UI["🖥️ User Interface"]');
    for (const f of categories.ui.slice(0, 8)) {
      lines.push(`    ${sanitizeId(f)}["✨ ${f.split("/").pop()}"]`);
    }
    lines.push("  end");
    layerCount++;
  }

  if (categories.api.length > 0) {
    lines.push('  subgraph API["⚡ API & Controllers"]');
    for (const f of categories.api.slice(0, 8)) {
      lines.push(`    ${sanitizeId(f)}["🔌 ${f.split("/").pop()}"]`);
    }
    lines.push("  end");
    layerCount++;
  }

  if (categories.service.length > 0) {
    lines.push('  subgraph SVC["🔧 Business Logic"]');
    for (const f of categories.service.slice(0, 8)) {
      lines.push(`    ${sanitizeId(f)}["⚙️ ${f.split("/").pop()}"]`);
    }
    lines.push("  end");
    layerCount++;
  }

  if (categories.data.length > 0) {
    lines.push('  subgraph DATA["💾 Data Access Layer"]');
    for (const f of categories.data.slice(0, 8)) {
      lines.push(`    ${sanitizeId(f)}["🗄️ ${f.split("/").pop()}"]`);
    }
    lines.push("  end");
    layerCount++;
  }

  if (layerCount === 0) {
    return `graph TD\n  empty["Not enough categorized files for Data Flow"]\n  style empty fill:#1e1e2f,stroke:#f43f5e,stroke-width:2px,color:#fff,rx:8,ry:8`;
  }

  // Add flow arrows between layers (using thick arrows)
  if (categories.ui.length > 0 && categories.api.length > 0) lines.push("  UI ==>|Requests| API");
  if (categories.api.length > 0 && categories.service.length > 0) lines.push("  API ==>|Uses| SVC");
  if (categories.service.length > 0 && categories.data.length > 0) lines.push("  SVC ==>|Reads/Writes| DATA");
  if (categories.api.length > 0 && categories.data.length > 0 && categories.service.length === 0) lines.push("  API ==>|Direct Data Access| DATA");

  lines.push("");
  lines.push("  classDef default fill:#1e1e2f,stroke:#10b981,stroke-width:2px,color:#e2e8f0,rx:6,ry:6");
  lines.push("  classDef cluster fill:#064e3b20,stroke:#10b98150,stroke-width:2px,color:#34d399,rx:10,ry:10");

  return lines.join("\n");
}

function sanitizeId(str: string): string {
  return str.replace(/[^a-zA-Z0-9]/g, "_").replace(/^_+/, "id_");
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + "..." : str;
}
