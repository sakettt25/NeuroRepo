import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { dataStore } from "@/lib/server/store";
import { parseGitHubUrl, fetchRepoMetadata, fetchFileTree, fetchMultipleFiles } from "@/lib/server/services/github.service";
import { parseAllFiles } from "@/lib/server/services/parser.service";
import { buildKnowledgeGraph } from "@/lib/server/services/graph.service";
import { generateDiagrams } from "@/lib/server/services/diagram.service";
import { analyzeRepository, generateCodeTour } from "@/lib/server/services/analysis.service";
import { generateSandboxUrls } from "@/lib/server/services/sandbox.service";
import { AnalysisSession } from "@/lib/server/types";
import { isCodeFile, isConfigFile } from "@/lib/server/utils/filters";

export const maxDuration = 60; // Allow long execution on Vercel
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { repoUrl, branch } = await req.json();
    if (!repoUrl) return NextResponse.json({ error: "repoUrl is required" }, { status: 400 });

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

    console.log(`\n🔍 Analyzing repository: ${repoUrl}`);
    const { owner, repo } = parseGitHubUrl(repoUrl);

    // 1. Fetch repo metadata
    console.log("  📋 Fetching metadata...");
    const repoMeta = await fetchRepoMetadata(owner, repo, GITHUB_TOKEN);
    const targetBranch = branch || repoMeta.defaultBranch;

    // 2. Fetch file tree
    console.log("  🌳 Fetching file tree...");
    const { tree: fileTree, flatFiles } = await fetchFileTree(owner, repo, targetBranch, GITHUB_TOKEN);

    // 3. Fetch file contents (code + config files only)
    const filesToFetch = flatFiles.filter((p: string) => {
      const name = p.split("/").pop() || "";
      return isCodeFile(name) || isConfigFile(name) || name === "README.md" || name.toLowerCase() === "readme.md";
    });

    console.log(`  📄 Fetching ${filesToFetch.length} code files...`);
    const files = await fetchMultipleFiles(owner, repo, filesToFetch, targetBranch, GITHUB_TOKEN);

    // 4. Parse package.json if available
    let packageJson: any = undefined;
    const pkgFile = files.get("package.json");
    if (pkgFile) {
      try { packageJson = JSON.parse(pkgFile.content); } catch {}
    }

    // 5. Parse all code files
    console.log("  🔬 Parsing code...");
    const parsedFiles = parseAllFiles(files);

    // 6. Build knowledge graph
    console.log("  🕸️ Building knowledge graph...");
    const graph = buildKnowledgeGraph(parsedFiles);

    // 7. Analyze repository
    console.log("  🧠 Analyzing architecture...");
    
    // Extract README content if available
    let readmeContent = "";
    const readmeFile = files.get("README.md") || files.get("readme.md") || files.get("Readme.md");
    if (readmeFile) {
      readmeContent = readmeFile.content;
    }

    const analysis = analyzeRepository(fileTree, parsedFiles, graph, packageJson, repoMeta.description, readmeContent);

    // 8. Generate diagrams
    console.log("  📊 Generating diagrams...");
    const diagrams = generateDiagrams(graph, analysis, parsedFiles);

    // 9. Generate sandbox URLs
    const sandboxUrls = generateSandboxUrls(owner, repo, analysis.framework, analysis.architectureType);

    // 10. Generate code tour
    const tour = generateCodeTour(analysis, parsedFiles, graph);

    // Save session
    const sessionId = uuidv4();
    const session: AnalysisSession = {
      id: sessionId,
      repoUrl,
      repo: repoMeta,
      fileTree,
      files,
      parsedFiles,
      graph,
      analysis,
      diagrams,
      sandboxUrls,
      tour,
      createdAt: new Date(),
    };

    await dataStore.saveSession(session);
    console.log(`  ✅ Analysis complete! Session: ${sessionId}\n`);

    return NextResponse.json({
      id: sessionId,
      repo: repoMeta,
      analysis,
      fileTree,
      diagrams,
      sandboxUrls,
      tour,
    });
  } catch (err: any) {
    console.error("Analysis error:", err);
    return NextResponse.json({ error: err.message || "Analysis failed" }, { status: 500 });
  }
}
