// Knowledge Graph Builder — construct a graph of file/function/class relationships
import { KnowledgeGraph, GraphNode, GraphEdge, ParsedFile } from "../types";

export function buildKnowledgeGraph(parsedFiles: Map<string, ParsedFile>): KnowledgeGraph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const nodeIds = new Set<string>();

  // Create file nodes
  for (const [path, parsed] of parsedFiles) {
    const fileId = `file:${path}`;
    nodes.push({ id: fileId, label: path.split("/").pop() || path, type: "file", filePath: path, metadata: { loc: parsed.loc, language: parsed.language, complexity: parsed.complexity } });
    nodeIds.add(fileId);

    // Create function nodes
    for (const fn of parsed.functions) {
      const fnId = `fn:${path}:${fn.name}`;
      nodes.push({ id: fnId, label: fn.name, type: "function", filePath: path, metadata: { params: fn.params, isAsync: fn.isAsync, isExported: fn.isExported, startLine: fn.startLine } });
      nodeIds.add(fnId);
      edges.push({ source: fileId, target: fnId, type: "exports", label: "contains" });
    }

    // Create class nodes
    for (const cls of parsed.classes) {
      const clsId = `class:${path}:${cls.name}`;
      nodes.push({ id: clsId, label: cls.name, type: "class", filePath: path, metadata: { methods: cls.methods, extends: cls.extends, isExported: cls.isExported } });
      nodeIds.add(clsId);
      edges.push({ source: fileId, target: clsId, type: "exports", label: "contains" });
    }
  }

  // Create import edges (file-level dependencies)
  for (const [path, parsed] of parsedFiles) {
    const fileId = `file:${path}`;
    for (const imp of parsed.imports) {
      const resolvedPath = resolveImportPath(path, imp.source, parsedFiles);
      if (resolvedPath) {
        const targetId = `file:${resolvedPath}`;
        if (nodeIds.has(targetId)) {
          edges.push({ source: fileId, target: targetId, type: "imports", label: imp.specifiers.join(", ") || imp.source });
        }
      }
    }
  }

  // Create extends edges
  for (const [path, parsed] of parsedFiles) {
    for (const cls of parsed.classes) {
      if (cls.extends) {
        // Find the parent class
        for (const [otherPath, otherParsed] of parsedFiles) {
          const parent = otherParsed.classes.find(c => c.name === cls.extends);
          if (parent) {
            edges.push({ source: `class:${path}:${cls.name}`, target: `class:${otherPath}:${parent.name}`, type: "extends" });
            break;
          }
        }
      }
    }
  }

  return { nodes, edges };
}

function resolveImportPath(currentFile: string, importSource: string, files: Map<string, ParsedFile>): string | null {
  // Skip external packages
  if (!importSource.startsWith(".") && !importSource.startsWith("/") && !importSource.startsWith("@/")) return null;

  const currentDir = currentFile.split("/").slice(0, -1).join("/");
  let resolved: string;

  if (importSource.startsWith("@/")) {
    resolved = importSource.replace("@/", "src/");
  } else if (importSource.startsWith("./") || importSource.startsWith("../")) {
    const parts = currentDir.split("/");
    const importParts = importSource.split("/");
    for (const part of importParts) {
      if (part === ".") continue;
      else if (part === "..") parts.pop();
      else parts.push(part);
    }
    resolved = parts.join("/");
  } else {
    resolved = importSource;
  }

  // Try with extensions
  const extensions = ["", ".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.tsx", "/index.js", "/index.jsx"];
  for (const ext of extensions) {
    if (files.has(resolved + ext)) return resolved + ext;
  }
  return null;
}

/**
 * Find circular dependencies in the graph
 */
export function findCircularDeps(graph: KnowledgeGraph): string[][] {
  const cycles: string[][] = [];
  const adjacency = new Map<string, string[]>();

  for (const edge of graph.edges) {
    if (edge.type === "imports") {
      if (!adjacency.has(edge.source)) adjacency.set(edge.source, []);
      adjacency.get(edge.source)!.push(edge.target);
    }
  }

  const visited = new Set<string>();
  const stack = new Set<string>();
  const path: string[] = [];

  function dfs(node: string) {
    if (stack.has(node)) {
      const cycleStart = path.indexOf(node);
      if (cycleStart !== -1) {
        const cycle = path.slice(cycleStart).map(n => n.replace("file:", ""));
        if (cycle.length > 1) cycles.push(cycle);
      }
      return;
    }
    if (visited.has(node)) return;
    visited.add(node);
    stack.add(node);
    path.push(node);
    for (const neighbor of adjacency.get(node) || []) {
      dfs(neighbor);
    }
    path.pop();
    stack.delete(node);
  }

  for (const node of adjacency.keys()) dfs(node);
  return cycles;
}

/**
 * Find dead code (exported but never imported)
 */
export function findDeadExports(graph: KnowledgeGraph, parsedFiles: Map<string, ParsedFile>): string[] {
  const importedNames = new Set<string>();
  for (const edge of graph.edges) {
    if (edge.type === "imports" && edge.label) {
      edge.label.split(",").map(s => s.trim()).forEach(s => importedNames.add(s));
    }
  }

  const dead: string[] = [];
  for (const [path, parsed] of parsedFiles) {
    for (const exp of parsed.exports) {
      if (exp.name !== "default" && !importedNames.has(exp.name)) {
        // Check if it's an entry point (likely used externally)
        if (!path.includes("index.") && !path.includes("main.") && !path.includes("app.")) {
          dead.push(`${path}:${exp.name}`);
        }
      }
    }
  }
  return dead.slice(0, 20); // Limit output
}
