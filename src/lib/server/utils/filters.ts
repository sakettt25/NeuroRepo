// File filtering utility — skip non-essential files

const SKIP_DIRECTORIES = new Set([
  "node_modules",
  ".git",
  ".svn",
  ".hg",
  "dist",
  "build",
  "out",
  ".next",
  ".nuxt",
  ".output",
  "__pycache__",
  ".pytest_cache",
  ".mypy_cache",
  "venv",
  ".venv",
  "env",
  ".env",
  "vendor",
  "coverage",
  ".nyc_output",
  ".cache",
  ".parcel-cache",
  ".turbo",
  ".vercel",
  ".netlify",
  "target",            // Java/Rust build
  "bin",               // Compiled binaries
  "obj",               // .NET
  ".idea",
  ".vscode",
  ".vs",
  ".DS_Store",
]);

const SKIP_EXTENSIONS = new Set([
  // Images
  ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".ico", ".svg", ".webp", ".avif",
  // Fonts
  ".woff", ".woff2", ".ttf", ".eot", ".otf",
  // Archives
  ".zip", ".tar", ".gz", ".rar", ".7z",
  // Binary
  ".exe", ".dll", ".so", ".dylib", ".bin", ".dat",
  // Media
  ".mp3", ".mp4", ".avi", ".mov", ".wav", ".flac",
  // Documents
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt",
  // Lock files
  ".lock",
  // Maps
  ".map",
  // Minified bundles
  ".min.js", ".min.css",
]);

const SKIP_FILENAMES = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lockb",
  "composer.lock",
  "Gemfile.lock",
  "Cargo.lock",
  "poetry.lock",
  ".gitignore",
  ".gitattributes",
  ".editorconfig",
  ".prettierrc",
  ".eslintignore",
  "LICENSE",
  "LICENSE.md",
  "LICENSE.txt",
  "CHANGELOG.md",
  "CONTRIBUTING.md",
  ".npmrc",
  ".nvmrc",
  ".dockerignore",
  "Thumbs.db",
  ".DS_Store",
]);

const MAX_FILE_SIZE = 100 * 1024; // 100KB

/**
 * Check if a path segment should be skipped
 */
export function shouldSkipPath(path: string): boolean {
  const segments = path.split("/");

  // Check if any directory in path is in skip list
  for (const segment of segments) {
    if (SKIP_DIRECTORIES.has(segment)) return true;
    if (segment.startsWith(".") && segment !== ".") {
      // Skip most hidden directories, but allow some config files
      if (SKIP_DIRECTORIES.has(segment)) return true;
    }
  }

  return false;
}

/**
 * Check if a file should be skipped
 */
export function shouldSkipFile(filename: string, size?: number): boolean {
  // Check filename
  if (SKIP_FILENAMES.has(filename)) return true;

  // Check extension
  const ext = getExtension(filename);
  if (ext && SKIP_EXTENSIONS.has(ext)) return true;

  // Check double extensions (e.g., .min.js)
  const doubleExt = getDoubleExtension(filename);
  if (doubleExt && SKIP_EXTENSIONS.has(doubleExt)) return true;

  // Check size
  if (size !== undefined && size > MAX_FILE_SIZE) return true;

  return false;
}

/**
 * Check if a file is a code file we should parse
 */
export function isCodeFile(filename: string): boolean {
  const ext = getExtension(filename);
  const codeExtensions = new Set([
    ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs",
    ".py", ".pyw",
    ".java", ".kt", ".kts",
    ".go",
    ".rs",
    ".rb",
    ".php",
    ".cs",
    ".cpp", ".cc", ".c", ".h", ".hpp",
    ".swift",
    ".dart",
    ".vue", ".svelte",
    ".astro",
  ]);
  return ext ? codeExtensions.has(ext) : false;
}

/**
 * Check if a file is a config/metadata file we should index
 */
export function isConfigFile(filename: string): boolean {
  const configFiles = new Set([
    "package.json",
    "tsconfig.json",
    "next.config.js", "next.config.mjs", "next.config.ts",
    "vite.config.js", "vite.config.ts",
    "webpack.config.js",
    "rollup.config.js",
    "jest.config.js", "jest.config.ts",
    "vitest.config.ts",
    "tailwind.config.js", "tailwind.config.ts",
    ".eslintrc.js", ".eslintrc.json", "eslint.config.js",
    "Dockerfile", "docker-compose.yml", "docker-compose.yaml",
    "Makefile",
    "requirements.txt", "setup.py", "pyproject.toml",
    "Cargo.toml",
    "go.mod",
    "pom.xml", "build.gradle",
    "Gemfile",
  ]);

  return configFiles.has(filename);
}

function getExtension(filename: string): string | null {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1 || lastDot === 0) return null;
  return filename.slice(lastDot).toLowerCase();
}

function getDoubleExtension(filename: string): string | null {
  const parts = filename.split(".");
  if (parts.length >= 3) {
    return `.${parts[parts.length - 2]}.${parts[parts.length - 1]}`.toLowerCase();
  }
  return null;
}

/**
 * Get language from file extension
 */
export function getLanguageFromExt(filename: string): string {
  const ext = getExtension(filename);
  const langMap: Record<string, string> = {
    ".js": "javascript", ".jsx": "javascript",
    ".mjs": "javascript", ".cjs": "javascript",
    ".ts": "typescript", ".tsx": "typescript",
    ".py": "python", ".pyw": "python",
    ".java": "java", ".kt": "kotlin",
    ".go": "go",
    ".rs": "rust",
    ".rb": "ruby",
    ".php": "php",
    ".cs": "csharp",
    ".cpp": "cpp", ".cc": "cpp", ".c": "c", ".h": "c", ".hpp": "cpp",
    ".swift": "swift",
    ".dart": "dart",
    ".vue": "vue",
    ".svelte": "svelte",
    ".astro": "astro",
    ".html": "html",
    ".css": "css",
    ".scss": "scss",
    ".sass": "sass",
    ".less": "less",
    ".json": "json",
    ".yaml": "yaml", ".yml": "yaml",
    ".xml": "xml",
    ".md": "markdown",
    ".sql": "sql",
    ".sh": "shell", ".bash": "shell",
    ".ps1": "powershell",
    ".r": "r",
    ".lua": "lua",
    ".ex": "elixir", ".exs": "elixir",
    ".erl": "erlang",
    ".hs": "haskell",
    ".scala": "scala",
    ".clj": "clojure",
    ".graphql": "graphql", ".gql": "graphql",
    ".proto": "protobuf",
    ".toml": "toml",
    ".ini": "ini",
    ".env": "dotenv",
  };

  return ext ? (langMap[ext] || "plaintext") : "plaintext";
}
