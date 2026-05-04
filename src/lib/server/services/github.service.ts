// GitHub Service — fetch repo metadata, file tree, and file contents

import { RepoMetadata, FileNode, FileContent } from "../types";
import { shouldSkipPath, shouldSkipFile, getLanguageFromExt, isCodeFile, isConfigFile } from "../utils/filters";

const GITHUB_API = "https://api.github.com";

interface GitHubTreeItem {
  path: string;
  mode: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
  url: string;
}

/**
 * Parse a GitHub URL into owner and repo name
 */
export function parseGitHubUrl(url: string): { owner: string; repo: string } {
  // Support formats:
  // https://github.com/owner/repo
  // https://github.com/owner/repo.git
  // github.com/owner/repo
  // owner/repo

  let cleanUrl = url.trim().replace(/\.git$/, "").replace(/\/$/, "");

  // Remove protocol
  cleanUrl = cleanUrl.replace(/^https?:\/\//, "");

  // Remove github.com
  cleanUrl = cleanUrl.replace(/^github\.com\//, "");

  const parts = cleanUrl.split("/").filter(Boolean);

  if (parts.length < 2) {
    throw new Error(`Invalid GitHub URL: ${url}. Expected format: github.com/owner/repo`);
  }

  return {
    owner: parts[0],
    repo: parts[1],
  };
}

/**
 * Build headers for GitHub API requests
 */
function getHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "NeuroRepo/1.0",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Fetch with retry and rate limit handling
 */
async function fetchWithRetry(
  url: string,
  headers: Record<string, string>,
  retries = 3
): Promise<any> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const response = await fetch(url, { headers });

    if (response.status === 403) {
      const rateLimitRemaining = response.headers.get("x-ratelimit-remaining");
      if (rateLimitRemaining === "0") {
        const resetTime = response.headers.get("x-ratelimit-reset");
        const waitMs = resetTime
          ? (parseInt(resetTime) * 1000 - Date.now()) + 1000
          : 60000;
        console.warn(`Rate limited. Waiting ${Math.round(waitMs / 1000)}s...`);
        if (waitMs < 120000) {
          await new Promise((r) => setTimeout(r, waitMs));
          continue;
        }
      }
      throw new Error("GitHub API rate limit exceeded. Provide a GITHUB_TOKEN for higher limits.");
    }

    if (response.status === 404) {
      throw new Error(`Repository not found: ${url}`);
    }

    if (!response.ok) {
      if (attempt < retries - 1) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}

/**
 * Fetch repository metadata
 */
export async function fetchRepoMetadata(
  owner: string,
  repo: string,
  token?: string
): Promise<RepoMetadata> {
  const data = await fetchWithRetry(
    `${GITHUB_API}/repos/${owner}/${repo}`,
    getHeaders(token)
  );

  return {
    owner: data.owner.login,
    name: data.name,
    fullName: data.full_name,
    description: data.description || "",
    language: data.language || "Unknown",
    stars: data.stargazers_count,
    forks: data.forks_count,
    defaultBranch: data.default_branch,
    url: data.html_url,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Fetch file tree recursively using Git Trees API
 */
export async function fetchFileTree(
  owner: string,
  repo: string,
  branch: string,
  token?: string
): Promise<{ tree: FileNode[]; flatFiles: string[] }> {
  const headers = getHeaders(token);

  // Get branch info to find tree SHA
  const branchData = await fetchWithRetry(
    `${GITHUB_API}/repos/${owner}/${repo}/branches/${branch}`,
    headers
  );

  const treeSha = branchData.commit.commit.tree.sha;

  // Fetch recursive tree
  const treeData = await fetchWithRetry(
    `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`,
    headers
  );

  if (treeData.truncated) {
    console.warn("Repository tree was truncated. Some files may be missing.");
  }

  // Filter and build tree structure
  const items: GitHubTreeItem[] = treeData.tree || [];
  const flatFiles: string[] = [];

  // Build nested tree from flat list
  const root: FileNode[] = [];
  const dirMap = new Map<string, FileNode>();

  // Sort items so directories come first
  const sortedItems = items.sort((a: GitHubTreeItem, b: GitHubTreeItem) => {
    if (a.type !== b.type) return a.type === "tree" ? -1 : 1;
    return a.path.localeCompare(b.path);
  });

  for (const item of sortedItems) {
    if (shouldSkipPath(item.path)) continue;

    const pathParts = item.path.split("/");
    const name = pathParts[pathParts.length - 1];

    if (item.type === "blob") {
      if (shouldSkipFile(name, item.size)) continue;
      flatFiles.push(item.path);
    }

    const node: FileNode = {
      name,
      path: item.path,
      type: item.type === "tree" ? "directory" : "file",
      size: item.size,
      language: item.type === "blob" ? getLanguageFromExt(name) : undefined,
    };

    if (item.type === "tree") {
      node.children = [];
      dirMap.set(item.path, node);
    }

    // Find parent
    const parentPath = pathParts.slice(0, -1).join("/");
    if (parentPath && dirMap.has(parentPath)) {
      dirMap.get(parentPath)!.children!.push(node);
    } else if (!parentPath) {
      root.push(node);
    }
  }

  return { tree: root, flatFiles };
}

/**
 * Fetch a single file's content
 */
export async function fetchFileContent(
  owner: string,
  repo: string,
  path: string,
  branch: string,
  token?: string
): Promise<FileContent> {
  const headers = getHeaders(token);
  const data = await fetchWithRetry(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${branch}`,
    headers
  );

  let content: string;
  if (data.encoding === "base64") {
    content = Buffer.from(data.content, "base64").toString("utf-8");
  } else {
    content = data.content;
  }

  const filename = path.split("/").pop() || path;

  return {
    path,
    content,
    language: getLanguageFromExt(filename),
    size: data.size,
    encoding: "utf-8",
  };
}

/**
 * Fetch multiple files (batch with concurrency control)
 */
export async function fetchMultipleFiles(
  owner: string,
  repo: string,
  paths: string[],
  branch: string,
  token?: string,
  concurrency = 5,
  maxFiles = 200
): Promise<Map<string, FileContent>> {
  const files = new Map<string, FileContent>();

  // Prioritize code and config files
  const prioritized = paths.sort((a, b) => {
    const aName = a.split("/").pop() || a;
    const bName = b.split("/").pop() || b;
    const aIsCode = isCodeFile(aName);
    const bIsCode = isCodeFile(bName);
    const aIsConfig = isConfigFile(aName);
    const bIsConfig = isConfigFile(bName);

    if (aIsConfig && !bIsConfig) return -1;
    if (!aIsConfig && bIsConfig) return 1;
    if (aIsCode && !bIsCode) return -1;
    if (!aIsCode && bIsCode) return 1;
    return 0;
  });

  const toFetch = prioritized.slice(0, maxFiles);
  console.log(`Fetching ${toFetch.length} files (of ${paths.length} total)...`);

  // Process in batches
  for (let i = 0; i < toFetch.length; i += concurrency) {
    const batch = toFetch.slice(i, i + concurrency);
    const results = await Promise.allSettled(
      batch.map((path) => fetchFileContent(owner, repo, path, branch, token))
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        files.set(result.value.path, result.value);
      } else {
        console.warn(`Failed to fetch file: ${result.reason}`);
      }
    }

    // Small delay between batches to avoid rate limits
    if (i + concurrency < toFetch.length) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  return files;
}
