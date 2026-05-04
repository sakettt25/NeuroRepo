// Sandbox Service — generate smart sandbox/preview URLs
import { SandboxUrls } from "../types";

export function generateSandboxUrls(owner: string, repo: string, framework: string, projectType: string): SandboxUrls {
  const githubDev = `https://github.dev/${owner}/${repo}`;
  let stackblitz: string | null = null;
  let codesandbox: string | null = null;
  let recommended: "githubDev" | "stackblitz" | "codesandbox" = "githubDev";

  // Smart sandbox selection based on framework/project type
  const webFrameworks = ["Next.js", "React", "Vue.js", "Nuxt.js", "Svelte", "SvelteKit", "Angular", "Astro", "Gatsby", "Remix"];

  if (webFrameworks.includes(framework)) {
    stackblitz = `https://stackblitz.com/github/${owner}/${repo}`;
    recommended = "stackblitz";
    
    // Provide CodeSandbox as a secondary external option
    codesandbox = `https://codesandbox.io/s/github/${owner}/${repo}`;
  }

  // Backend-only projects default to GitHub.dev
  if (["api-server", "go-project", "rust-project", "java-project", "python-project"].includes(projectType)) {
    recommended = "githubDev";
  }

  return { githubDev, stackblitz, codesandbox, recommended, projectType };
}
