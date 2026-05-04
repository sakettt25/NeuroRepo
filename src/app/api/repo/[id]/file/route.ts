import { NextResponse } from "next/server";
import { dataStore } from "@/lib/server/store";
import { fetchFileContent } from "@/lib/server/services/github.service";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await dataStore.getSession(id);
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const filePath = searchParams.get("path");
  if (!filePath) return NextResponse.json({ error: "path query param required" }, { status: 400 });

  // Check cache first
  let file = session.files.get(filePath);
  
  if (!file) {
    // If we haven't fetched it yet (e.g. it wasn't a code file), try fetching it now
    console.log(`  📄 Fetching lazy file: ${filePath}`);
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const { owner, name: repo } = session.repo;
    const branch = session.repo.defaultBranch;
    
    try {
      const fetchedFile = await fetchFileContent(owner, repo, filePath, branch, GITHUB_TOKEN);
      if (!fetchedFile) throw new Error("File not found or empty");
      
      file = fetchedFile;
      
      // Cache it for future requests
      session.files.set(filePath, file);
      await dataStore.saveSession(session);
    } catch (err) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
  }

  return NextResponse.json(file);
}
