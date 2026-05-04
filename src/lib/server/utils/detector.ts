// Language & Framework Detection Utility

import { FileNode } from "../types";

interface DetectionResult {
  primaryLanguage: string;
  languages: { name: string; percentage: number; fileCount: number }[];
  framework: string;
  frameworkVersion?: string;
  projectType: string;
  techStack: string[];
}

/**
 * Detect languages, framework, and tech stack from file tree + package data
 */
export function detectProjectInfo(
  fileTree: FileNode[],
  packageJson?: any,
  configFiles?: string[]
): DetectionResult {
  // Count files by language
  const langCounts = new Map<string, number>();
  countLanguages(fileTree, langCounts);

  const totalFiles = [...langCounts.values()].reduce((a, b) => a + b, 0);
  const languages = [...langCounts.entries()]
    .map(([name, fileCount]) => ({
      name,
      percentage: Math.round((fileCount / totalFiles) * 100),
      fileCount,
    }))
    .sort((a, b) => b.fileCount - a.fileCount);

  const primaryLanguage = languages[0]?.name || "unknown";

  // Detect framework
  const { framework, frameworkVersion, projectType, techStack } = detectFramework(
    packageJson,
    configFiles || [],
    fileTree,
    primaryLanguage
  );

  return {
    primaryLanguage,
    languages,
    framework,
    frameworkVersion,
    projectType,
    techStack,
  };
}

function countLanguages(nodes: FileNode[], counts: Map<string, number>) {
  for (const node of nodes) {
    if (node.type === "file" && node.language && node.language !== "plaintext") {
      const lang = normalizeLanguage(node.language);
      counts.set(lang, (counts.get(lang) || 0) + 1);
    }
    if (node.children) {
      countLanguages(node.children, counts);
    }
  }
}

function normalizeLanguage(lang: string): string {
  const map: Record<string, string> = {
    javascript: "JavaScript",
    typescript: "TypeScript",
    python: "Python",
    java: "Java",
    kotlin: "Kotlin",
    go: "Go",
    rust: "Rust",
    ruby: "Ruby",
    php: "PHP",
    csharp: "C#",
    cpp: "C++",
    c: "C",
    swift: "Swift",
    dart: "Dart",
    vue: "Vue",
    svelte: "Svelte",
    astro: "Astro",
    html: "HTML",
    css: "CSS",
    scss: "SCSS",
    json: "JSON",
    yaml: "YAML",
    markdown: "Markdown",
    shell: "Shell",
    sql: "SQL",
  };
  return map[lang] || lang;
}

function detectFramework(
  packageJson: any,
  configFiles: string[],
  fileTree: FileNode[],
  primaryLanguage: string
): { framework: string; frameworkVersion?: string; projectType: string; techStack: string[] } {
  const techStack: string[] = [];
  let framework = "None detected";
  let frameworkVersion: string | undefined;
  let projectType = "general";

  if (!packageJson) {
    // Non-JS project detection
    if (configFiles.includes("requirements.txt") || configFiles.includes("pyproject.toml")) {
      techStack.push("Python");
      projectType = "python-project";

      if (configFiles.includes("manage.py") || hasPath(fileTree, "manage.py")) {
        framework = "Django";
        projectType = "web-app";
      } else if (configFiles.includes("setup.py") || configFiles.includes("pyproject.toml")) {
        framework = "Python Package";
        projectType = "library";
      }
    }

    if (configFiles.includes("go.mod")) {
      techStack.push("Go");
      framework = "Go Module";
      projectType = "go-project";
    }

    if (configFiles.includes("Cargo.toml")) {
      techStack.push("Rust");
      framework = "Rust/Cargo";
      projectType = "rust-project";
    }

    if (configFiles.includes("pom.xml") || configFiles.includes("build.gradle")) {
      techStack.push("Java");
      projectType = "java-project";
      if (configFiles.includes("pom.xml")) framework = "Maven";
      if (configFiles.includes("build.gradle")) framework = "Gradle";
    }

    return { framework, frameworkVersion, projectType, techStack };
  }

  // JavaScript/TypeScript project analysis
  const deps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  // Detect meta-frameworks first
  if (deps["next"]) {
    framework = "Next.js";
    frameworkVersion = deps["next"];
    projectType = "fullstack-web-app";
    techStack.push("Next.js", "React");
  } else if (deps["nuxt"] || deps["nuxt3"]) {
    framework = "Nuxt.js";
    frameworkVersion = deps["nuxt"] || deps["nuxt3"];
    projectType = "fullstack-web-app";
    techStack.push("Nuxt.js", "Vue");
  } else if (deps["@remix-run/node"] || deps["remix"]) {
    framework = "Remix";
    projectType = "fullstack-web-app";
    techStack.push("Remix", "React");
  } else if (deps["astro"]) {
    framework = "Astro";
    projectType = "static-site";
    techStack.push("Astro");
  } else if (deps["gatsby"]) {
    framework = "Gatsby";
    projectType = "static-site";
    techStack.push("Gatsby", "React");
  }
  // Frontend frameworks
  else if (deps["react"] || deps["react-dom"]) {
    framework = "React";
    frameworkVersion = deps["react"];
    projectType = "frontend-app";
    techStack.push("React");

    if (deps["vite"]) techStack.push("Vite");
    if (deps["react-scripts"]) {
      techStack.push("Create React App");
    }
  } else if (deps["vue"]) {
    framework = "Vue.js";
    frameworkVersion = deps["vue"];
    projectType = "frontend-app";
    techStack.push("Vue.js");
  } else if (deps["svelte"] || deps["@sveltejs/kit"]) {
    framework = deps["@sveltejs/kit"] ? "SvelteKit" : "Svelte";
    projectType = deps["@sveltejs/kit"] ? "fullstack-web-app" : "frontend-app";
    techStack.push(framework);
  } else if (deps["@angular/core"]) {
    framework = "Angular";
    frameworkVersion = deps["@angular/core"];
    projectType = "frontend-app";
    techStack.push("Angular");
  }
  // Backend frameworks
  else if (deps["express"]) {
    framework = "Express.js";
    frameworkVersion = deps["express"];
    projectType = "api-server";
    techStack.push("Express.js", "Node.js");
  } else if (deps["fastify"]) {
    framework = "Fastify";
    projectType = "api-server";
    techStack.push("Fastify", "Node.js");
  } else if (deps["koa"]) {
    framework = "Koa";
    projectType = "api-server";
    techStack.push("Koa", "Node.js");
  } else if (deps["@nestjs/core"]) {
    framework = "NestJS";
    projectType = "api-server";
    techStack.push("NestJS", "Node.js");
  } else if (deps["hono"]) {
    framework = "Hono";
    projectType = "api-server";
    techStack.push("Hono");
  }

  // Detect additional tech stack items
  if (deps["typescript"]) techStack.push("TypeScript");
  if (deps["tailwindcss"]) techStack.push("Tailwind CSS");
  if (deps["prisma"] || deps["@prisma/client"]) techStack.push("Prisma");
  if (deps["mongoose"] || deps["mongodb"]) techStack.push("MongoDB");
  if (deps["pg"] || deps["@prisma/client"]) techStack.push("PostgreSQL");
  if (deps["redis"] || deps["ioredis"]) techStack.push("Redis");
  if (deps["graphql"] || deps["@apollo/server"]) techStack.push("GraphQL");
  if (deps["socket.io"]) techStack.push("Socket.IO");
  if (deps["jest"] || deps["vitest"] || deps["mocha"]) techStack.push("Testing");
  if (deps["docker-compose"] || configFiles.includes("Dockerfile")) techStack.push("Docker");
  if (deps["eslint"]) techStack.push("ESLint");
  if (deps["prettier"]) techStack.push("Prettier");
  if (deps["storybook"] || deps["@storybook/react"]) techStack.push("Storybook");
  if (deps["zustand"]) techStack.push("Zustand");
  if (deps["redux"] || deps["@reduxjs/toolkit"]) techStack.push("Redux");
  if (deps["trpc"] || deps["@trpc/server"]) techStack.push("tRPC");
  if (deps["drizzle-orm"]) techStack.push("Drizzle ORM");

  // Deduplicate
  return {
    framework,
    frameworkVersion: frameworkVersion?.replace(/[\^~>=<]/g, ""),
    projectType,
    techStack: [...new Set(techStack)],
  };
}

function hasPath(nodes: FileNode[], targetPath: string): boolean {
  for (const node of nodes) {
    if (node.path === targetPath || node.name === targetPath) return true;
    if (node.children && hasPath(node.children, targetPath)) return true;
  }
  return false;
}

/**
 * Detect architecture pattern
 */
export function detectArchitecture(
  fileTree: FileNode[],
  framework: string,
  projectType: string
): { type: string; patterns: string[]; description: string } {
  const patterns: string[] = [];
  const flatPaths = flattenPaths(fileTree);

  // Check for monorepo indicators
  const isMonorepo =
    flatPaths.some((p) => p.startsWith("packages/")) ||
    flatPaths.some((p) => p.startsWith("apps/")) ||
    flatPaths.some((p) => p.includes("lerna.json")) ||
    flatPaths.some((p) => p.includes("turbo.json"));

  if (isMonorepo) {
    patterns.push("Monorepo");
  }

  // Check for microservices
  const hasMultipleServices =
    flatPaths.filter((p) => p.match(/^services\/[^/]+\/package\.json$/)).length > 1;
  if (hasMultipleServices) {
    patterns.push("Microservices");
  }

  // Check for MVC pattern
  const hasMVC =
    (flatPaths.some((p) => p.includes("/controllers/") || p.includes("/controller/")) &&
      flatPaths.some((p) => p.includes("/models/") || p.includes("/model/"))) ||
    flatPaths.some((p) => p.includes("/views/") || p.includes("/view/"));
  if (hasMVC) {
    patterns.push("MVC");
  }

  // Check for layered architecture
  const hasLayers =
    flatPaths.some((p) => p.includes("/routes/") || p.includes("/api/")) &&
    flatPaths.some((p) => p.includes("/services/") || p.includes("/service/")) &&
    (flatPaths.some((p) => p.includes("/models/") || p.includes("/schemas/")) ||
      flatPaths.some((p) => p.includes("/repositories/") || p.includes("/dal/")));
  if (hasLayers) {
    patterns.push("Layered Architecture");
  }

  // Check for component-based (React/Vue/Svelte)
  const hasComponents =
    flatPaths.filter((p) => p.includes("/components/")).length > 3;
  if (hasComponents) {
    patterns.push("Component-Based");
  }

  // Check for feature-based modules
  const hasFeatures =
    flatPaths.some((p) => p.includes("/features/") || p.includes("/modules/"));
  if (hasFeatures) {
    patterns.push("Feature-Based Modules");
  }

  // Determine architecture type
  let type = "Monolith";
  if (isMonorepo) type = "Monorepo";
  else if (hasMultipleServices) type = "Microservices";
  else if (projectType === "fullstack-web-app") type = "Full-Stack Monolith";
  else if (projectType === "api-server") type = "API Server";
  else if (projectType === "frontend-app") type = "Single-Page Application";
  else if (projectType === "static-site") type = "Static Site";

  const description = generateArchDescription(type, framework, patterns);

  return { type, patterns, description };
}

function flattenPaths(nodes: FileNode[]): string[] {
  const paths: string[] = [];
  for (const node of nodes) {
    paths.push(node.path);
    if (node.children) {
      paths.push(...flattenPaths(node.children));
    }
  }
  return paths;
}

function generateArchDescription(
  type: string,
  framework: string,
  patterns: string[]
): string {
  const patternStr = patterns.length > 0 ? ` using ${patterns.join(", ")} patterns` : "";

  const descriptions: Record<string, string> = {
    "Monorepo": `This is a monorepo architecture containing multiple packages or applications${patternStr}. The codebase is organized to share code across projects while maintaining separate deployment units.`,
    "Microservices": `This is a microservices architecture with independently deployable services${patternStr}. Each service handles a specific domain and communicates through defined interfaces.`,
    "Full-Stack Monolith": `This is a full-stack ${framework} application${patternStr}. Both frontend and backend logic coexist in a single deployable unit, typical of modern meta-framework applications.`,
    "API Server": `This is a backend API server built with ${framework}${patternStr}. It exposes REST or GraphQL endpoints and handles business logic, data access, and external integrations.`,
    "Single-Page Application": `This is a single-page application built with ${framework}${patternStr}. The frontend handles routing and rendering client-side, communicating with backend APIs for data.`,
    "Static Site": `This is a static site built with ${framework}${patternStr}. Pages are pre-rendered at build time for optimal performance and SEO.`,
    "Monolith": `This is a monolithic application${patternStr}. All code resides in a single codebase and is deployed as one unit.`,
  };

  return descriptions[type] || `A ${type} project built with ${framework}${patternStr}.`;
}
