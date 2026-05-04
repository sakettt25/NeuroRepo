// Code Parser Service — AST extraction of functions, classes, imports
import * as acorn from "acorn";
import * as walk from "acorn-walk";
import { ParsedFile, FunctionInfo, ClassInfo, ImportInfo, ExportInfo } from "../types";
import { getLanguageFromExt } from "../utils/filters";

export function parseFile(path: string, content: string): ParsedFile {
  const filename = path.split("/").pop() || path;
  const language = getLanguageFromExt(filename);
  const loc = content.split("\n").length;
  const result: ParsedFile = { path, language, functions: [], classes: [], imports: [], exports: [], loc, complexity: 0 };

  try {
    if (["javascript", "typescript"].includes(language)) {
      parseJSTS(content, result);
    } else if (language === "python") {
      parsePython(content, result);
    } else {
      parseGeneric(content, result);
    }
  } catch {
    parseGeneric(content, result);
  }

  result.complexity = estimateComplexity(content);
  return result;
}

function stripTS(content: string): string {
  return content
    .replace(/:\s*[A-Za-z_$<>\[\]|&{}\s,.()"'`?!]+(?=[,)\]=;}\n])/g, "")
    .replace(/^\s*(?:export\s+)?interface\s+\w+[\s\S]*?^\s*}/gm, "")
    .replace(/^\s*(?:export\s+)?type\s+\w+\s*=[\s\S]*?;/gm, "")
    .replace(/^\s*(?:export\s+)?(?:const\s+)?enum\s+\w+\s*{[\s\S]*?}/gm, "")
    .replace(/\s+as\s+\w+[\[\]<>|&]*/g, "")
    .replace(/<[A-Za-z_$\s,extends\[\]|&{}="'?:]+>(?=\s*[\(])/g, "")
    .replace(/\s+implements\s+[\w\s,<>]*/g, "")
    .replace(/\bdeclare\s+/g, "")
    .replace(/\b(public|private|protected|readonly|abstract|override)\s+/g, "")
    .replace(/!\./g, ".")
    .replace(/\bsatisfies\s+\w+/g, "");
}

function parseJSTS(content: string, result: ParsedFile): void {
  let ast: acorn.Node;
  try {
    ast = acorn.parse(stripTS(content), {
      ecmaVersion: "latest", sourceType: "module",
      allowImportExportEverywhere: true, allowAwaitOutsideFunction: true,
      allowReturnOutsideFunction: true, allowHashBang: true, locations: true,
    });
  } catch {
    parseJSTSRegex(content, result);
    return;
  }

  walk.simple(ast, {
    FunctionDeclaration(node: any) {
      result.functions.push({
        name: node.id?.name || "anonymous",
        params: (node.params || []).map((p: any) => p.name || "param"),
        startLine: node.loc?.start?.line || 0, endLine: node.loc?.end?.line || 0,
        isAsync: node.async || false, isExported: false,
      });
    },
    VariableDeclaration(node: any) {
      for (const decl of node.declarations || []) {
        if (decl.init && (decl.init.type === "ArrowFunctionExpression" || decl.init.type === "FunctionExpression")) {
          result.functions.push({
            name: decl.id?.name || "anonymous",
            params: (decl.init.params || []).map((p: any) => p.name || "param"),
            startLine: node.loc?.start?.line || 0, endLine: node.loc?.end?.line || 0,
            isAsync: decl.init.async || false, isExported: false,
          });
        }
      }
    },
    ClassDeclaration(node: any) {
      const methods: string[] = [];
      const properties: string[] = [];
      if (node.body?.body) {
        for (const item of node.body.body) {
          if (item.type === "MethodDefinition") methods.push(item.key?.name || "method");
          else if (item.type === "PropertyDefinition") properties.push(item.key?.name || "prop");
        }
      }
      result.classes.push({
        name: node.id?.name || "AnonymousClass", methods, properties,
        startLine: node.loc?.start?.line || 0, endLine: node.loc?.end?.line || 0,
        isExported: false, extends: node.superClass?.name,
      });
    },
    ImportDeclaration(node: any) {
      const specifiers: string[] = [];
      let isDefault = false, isNamespace = false;
      for (const spec of node.specifiers || []) {
        if (spec.type === "ImportDefaultSpecifier") { specifiers.push(spec.local.name); isDefault = true; }
        else if (spec.type === "ImportNamespaceSpecifier") { specifiers.push(spec.local.name); isNamespace = true; }
        else specifiers.push(spec.imported?.name || spec.local?.name || "unknown");
      }
      result.imports.push({ source: node.source?.value || "", specifiers, isDefault, isNamespace, line: node.loc?.start?.line || 0 });
    },
    ExportNamedDeclaration(node: any) {
      if (node.declaration) {
        const d = node.declaration;
        if (d.type === "FunctionDeclaration") {
          const n = d.id?.name || "default";
          result.exports.push({ name: n, type: "function", line: node.loc?.start?.line || 0 });
          const fn = result.functions.find((f) => f.name === n);
          if (fn) fn.isExported = true;
        } else if (d.type === "ClassDeclaration") {
          const n = d.id?.name || "default";
          result.exports.push({ name: n, type: "class", line: node.loc?.start?.line || 0 });
          const cls = result.classes.find((c) => c.name === n);
          if (cls) cls.isExported = true;
        } else if (d.type === "VariableDeclaration") {
          for (const decl of d.declarations || []) {
            const n = decl.id?.name || "unknown";
            const t = decl.init && (decl.init.type === "ArrowFunctionExpression" || decl.init.type === "FunctionExpression") ? "function" as const : "variable" as const;
            result.exports.push({ name: n, type: t, line: node.loc?.start?.line || 0 });
            if (t === "function") { const fn = result.functions.find((f) => f.name === n); if (fn) fn.isExported = true; }
          }
        }
      }
      for (const spec of node.specifiers || []) {
        result.exports.push({ name: spec.exported?.name || "unknown", type: "re-export", line: node.loc?.start?.line || 0 });
      }
    },
    ExportDefaultDeclaration(node: any) {
      let name = "default";
      if (node.declaration?.id?.name) name = node.declaration.id.name;
      else if (node.declaration?.name) name = node.declaration.name;
      result.exports.push({ name, type: "default", line: node.loc?.start?.line || 0 });
    },
  });
}

function parseJSTSRegex(content: string, result: ParsedFile): void {
  let m;
  const funcR = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g;
  while ((m = funcR.exec(content)) !== null) {
    const line = content.slice(0, m.index).split("\n").length;
    result.functions.push({ name: m[1], params: m[2].split(",").map(p => p.trim().split(/[\s:]/)[0]).filter(Boolean), startLine: line, endLine: line, isAsync: m[0].includes("async"), isExported: m[0].includes("export") });
  }
  const arrowR = /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(?([^)]*)\)?\s*=>/g;
  while ((m = arrowR.exec(content)) !== null) {
    const line = content.slice(0, m.index).split("\n").length;
    result.functions.push({ name: m[1], params: m[2].split(",").map(p => p.trim().split(/[\s:]/)[0]).filter(Boolean), startLine: line, endLine: line, isAsync: m[0].includes("async"), isExported: m[0].includes("export") });
  }
  parseImportsRegex(content, result);
}

function parseImportsRegex(content: string, result: ParsedFile): void {
  let m;
  const importR = /import\s+(?:({[^}]+}|\*\s+as\s+\w+|\w+(?:\s*,\s*{[^}]+})?)\s+from\s+)?['"]([^'"]+)['"]/g;
  while ((m = importR.exec(content)) !== null) {
    const line = content.slice(0, m.index).split("\n").length;
    const ss = m[1] || ""; const specifiers: string[] = [];
    let isDefault = false, isNamespace = false;
    if (ss.includes("* as")) { isNamespace = true; const ns = ss.match(/\*\s+as\s+(\w+)/); if (ns) specifiers.push(ns[1]); }
    else if (ss.startsWith("{")) { specifiers.push(...ss.replace(/[{}]/g, "").split(",").map(s => s.trim().split(/\s+as\s+/).pop()!).filter(Boolean)); }
    else if (ss) { isDefault = true; specifiers.push(ss.split(",")[0].trim()); }
    result.imports.push({ source: m[2], specifiers, isDefault, isNamespace, line });
  }
}

function parsePython(content: string, result: ParsedFile): void {
  let m;
  const funcR = /^(\s*)(?:async\s+)?def\s+(\w+)\s*\(([^)]*)\)/gm;
  while ((m = funcR.exec(content)) !== null) {
    const line = content.slice(0, m.index).split("\n").length;
    result.functions.push({ name: m[2], params: m[3].split(",").map(p => p.trim().split(/[\s:=]/)[0]).filter(p => p && p !== "self" && p !== "cls"), startLine: line, endLine: line, isAsync: m[0].includes("async"), isExported: !m[2].startsWith("_") });
  }
  const classR = /^class\s+(\w+)(?:\(([^)]*)\))?/gm;
  while ((m = classR.exec(content)) !== null) {
    const line = content.slice(0, m.index).split("\n").length;
    result.classes.push({ name: m[1], methods: [], properties: [], startLine: line, endLine: line, isExported: !m[1].startsWith("_"), extends: m[2]?.split(",")[0]?.trim() });
  }
  const importFromR = /^from\s+(\S+)\s+import\s+(.+)$/gm;
  while ((m = importFromR.exec(content)) !== null) {
    const line = content.slice(0, m.index).split("\n").length;
    result.imports.push({ source: m[1], specifiers: m[2].split(",").map(s => s.trim().split(/\s+as\s+/).pop()!).filter(Boolean), isDefault: false, isNamespace: false, line });
  }
}

function parseGeneric(content: string, result: ParsedFile): void {
  let m;
  const funcR = /(?:public|private|protected|static|async)?\s*(?:function|func|fn|def)\s+(\w+)\s*\(([^)]*)\)/g;
  while ((m = funcR.exec(content)) !== null) {
    const match = m;
    const line = content.slice(0, match.index).split("\n").length;
    if (!result.functions.find(f => f.name === match[1])) {
      result.functions.push({ name: match[1], params: match[2] ? match[2].split(",").map(p => p.trim().split(/[\s:]/)[0]).filter(Boolean) : [], startLine: line, endLine: line, isAsync: match[0].includes("async"), isExported: match[0].includes("public") });
    }
  }
}

function estimateComplexity(content: string): number {
  let c = 1;
  [/\bif\b/g, /\belse\s+if\b/g, /\bfor\b/g, /\bwhile\b/g, /\bcatch\b/g, /&&/g, /\|\|/g, /\?[^?.]/g].forEach(p => { const ms = content.match(p); if (ms) c += ms.length; });
  return c;
}

export function parseAllFiles(files: Map<string, { path: string; content: string }>): Map<string, ParsedFile> {
  const results = new Map<string, ParsedFile>();
  for (const [path, file] of files) {
    try { results.set(path, parseFile(path, file.content)); } catch (err) { console.warn(`Parse failed: ${path}`); }
  }
  return results;
}
